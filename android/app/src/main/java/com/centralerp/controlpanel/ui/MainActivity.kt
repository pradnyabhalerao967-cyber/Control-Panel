package com.centralerp.controlpanel.ui

import android.app.Dialog
import android.content.res.ColorStateList
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.ArrayAdapter
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.centralerp.controlpanel.R
import com.centralerp.controlpanel.data.api.SupabaseClient
import com.centralerp.controlpanel.data.model.License
import com.centralerp.controlpanel.databinding.ActivityMainBinding
import com.centralerp.controlpanel.databinding.DialogCreateLicenseBinding
import com.centralerp.controlpanel.databinding.DialogManageModulesBinding
import com.google.android.material.materialswitch.MaterialSwitch
import com.google.android.material.snackbar.Snackbar
import com.google.gson.JsonObject
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.Random

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var adapter: LicenseAdapter

    private var allLicenses: List<License> = emptyList()
    private var selectedSector: String = "ALL" // "ALL", "MEDICAL", "GYM"
    private var selectedStatus: String = "ALL" // "ALL", "ACTIVE", "EXPIRING", "DEACTIVATED"
    private var searchQuery: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupRecyclerView()
        setupListeners()
        loadLicensesFromSupabase()
    }

    private fun setupRecyclerView() {
        adapter = LicenseAdapter(
            onExtendClicked = { license -> extendLicense(license, 30) },
            onToggleStatusClicked = { license -> toggleLicenseStatus(license) },
            onManageModulesClicked = { license -> showManageModulesDialog(license) },
            onDeleteClicked = { license -> confirmDeleteLicense(license) }
        )
        binding.recyclerViewLicenses.layoutManager = LinearLayoutManager(this)
        binding.recyclerViewLicenses.adapter = adapter
    }

    private fun setupListeners() {
        // Pull to refresh
        binding.swipeRefresh.setOnRefreshListener {
            loadLicensesFromSupabase()
        }

        // Header refresh icon
        binding.btnRefresh.setOnClickListener {
            binding.swipeRefresh.isRefreshing = true
            loadLicensesFromSupabase()
        }

        // Sector tabs
        binding.tabAllApps.setOnClickListener { setSectorFilter("ALL") }
        binding.tabMedical.setOnClickListener { setSectorFilter("MEDICAL") }
        binding.tabGym.setOnClickListener { setSectorFilter("GYM") }

        // Status chips
        binding.chipFilterAll.setOnClickListener { setStatusFilter("ALL") }
        binding.chipFilterActive.setOnClickListener { setStatusFilter("ACTIVE") }
        binding.chipFilterExpiring.setOnClickListener { setStatusFilter("EXPIRING") }
        binding.chipFilterDeactivated.setOnClickListener { setStatusFilter("DEACTIVATED") }

        // Search text watcher
        binding.etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                searchQuery = s?.toString()?.trim() ?: ""
                applyFilters()
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        // FAB: Create License Key
        binding.fabCreateLicense.setOnClickListener {
            showCreateLicenseDialog()
        }
    }

    private fun loadLicensesFromSupabase() {
        binding.progressBar.visibility = if (allLicenses.isEmpty()) View.VISIBLE else View.GONE

        lifecycleScope.launch {
            val result = SupabaseClient.getLicenses()
            binding.swipeRefresh.isRefreshing = false
            binding.progressBar.visibility = View.GONE

            result.onSuccess { licenses ->
                allLicenses = licenses
                updateStats(licenses)
                applyFilters()
            }.onFailure { error ->
                showSnackbar("Error connecting to Supabase: ${error.localizedMessage}")
            }
        }
    }

    private fun updateStats(licenses: List<License>) {
        val total = licenses.size
        val active = licenses.count { it.isActive }
        val deactivated = licenses.count { !it.isActive }
        val expiring = licenses.count { it.isExpiringSoon }

        binding.tvStatTotal.text = total.toString()
        binding.tvStatActive.text = active.toString()
        binding.tvStatDeactivated.text = deactivated.toString()
        binding.tvStatExpiring.text = expiring.toString()

        val medCount = licenses.count { it.isMedical }
        val gymCount = licenses.count { !it.isMedical }
        binding.tabMedical.text = "🏥 Medical ($medCount)"
        binding.tabGym.text = "🏋️ Gym ($gymCount)"
    }

    private fun setSectorFilter(sector: String) {
        selectedSector = sector
        val activeBg = R.drawable.bg_chip_selected
        val inactiveBg = R.drawable.bg_chip_unselected
        val activeTextColor = ContextCompat.getColor(this, R.color.erp_bg)
        val inactiveTextColor = ContextCompat.getColor(this, R.color.erp_text_secondary)

        fun updateTab(tab: TextView, isSelected: Boolean) {
            tab.setBackgroundResource(if (isSelected) activeBg else inactiveBg)
            tab.setTextColor(if (isSelected) activeTextColor else inactiveTextColor)
        }

        updateTab(binding.tabAllApps, sector == "ALL")
        updateTab(binding.tabMedical, sector == "MEDICAL")
        updateTab(binding.tabGym, sector == "GYM")

        applyFilters()
    }

    private fun setStatusFilter(status: String) {
        selectedStatus = status
        val activeBg = R.drawable.bg_chip_selected
        val inactiveBg = R.drawable.bg_chip_unselected
        val activeTextColor = ContextCompat.getColor(this, R.color.erp_bg)
        val inactiveTextColor = ContextCompat.getColor(this, R.color.erp_text_secondary)

        fun updateChip(chip: TextView, isSelected: Boolean) {
            chip.setBackgroundResource(if (isSelected) activeBg else inactiveBg)
            chip.setTextColor(if (isSelected) activeTextColor else inactiveTextColor)
        }

        updateChip(binding.chipFilterAll, status == "ALL")
        updateChip(binding.chipFilterActive, status == "ACTIVE")
        updateChip(binding.chipFilterExpiring, status == "EXPIRING")
        updateChip(binding.chipFilterDeactivated, status == "DEACTIVATED")

        applyFilters()
    }

    private fun applyFilters() {
        var filtered = allLicenses

        // 1. Sector Filter
        filtered = when (selectedSector) {
            "MEDICAL" -> filtered.filter { it.isMedical }
            "GYM" -> filtered.filter { !it.isMedical }
            else -> filtered
        }

        // 2. Status Filter
        filtered = when (selectedStatus) {
            "ACTIVE" -> filtered.filter { it.isActive }
            "EXPIRING" -> filtered.filter { it.isExpiringSoon }
            "DEACTIVATED" -> filtered.filter { !it.isActive }
            else -> filtered
        }

        // 3. Search Filter
        if (searchQuery.isNotEmpty()) {
            val q = searchQuery.lowercase(Locale.ROOT)
            filtered = filtered.filter {
                it.customerName.lowercase(Locale.ROOT).contains(q) ||
                it.licenseKey.lowercase(Locale.ROOT).contains(q) ||
                it.businessType.lowercase(Locale.ROOT).contains(q) ||
                it.planTier.lowercase(Locale.ROOT).contains(q)
            }
        }

        adapter.submitList(filtered)
        binding.layoutEmpty.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
    }

    // ── Extend License (+30 Days) ────────────────────────────────────────────
    private fun extendLicense(license: License, daysToAdd: Int) {
        binding.progressBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            val result = SupabaseClient.extendValidity(license.licenseKey, license.daysLeft, daysToAdd)
            binding.progressBar.visibility = View.GONE
            result.onSuccess { updatedLicense ->
                showSnackbar("Extended ${license.customerName} by $daysToAdd days! (Expires ${updatedLicense.expirationDate})")
                loadLicensesFromSupabase()
            }.onFailure { error ->
                showSnackbar("Failed to extend license: ${error.localizedMessage}")
            }
        }
    }

    // ── Toggle License Status (Active <-> Deactivated) ────────────────────────
    private fun toggleLicenseStatus(license: License) {
        val newStatus = if (license.isActive) "Deactivated" else "Active"
        binding.progressBar.visibility = View.VISIBLE

        lifecycleScope.launch {
            val result = SupabaseClient.updateStatus(license.licenseKey, newStatus)
            binding.progressBar.visibility = View.GONE
            result.onSuccess {
                showSnackbar("${license.customerName} marked as $newStatus")
                loadLicensesFromSupabase()
            }.onFailure { error ->
                showSnackbar("Failed to update status: ${error.localizedMessage}")
            }
        }
    }

    // ── Manage Remote Modules Dialog ─────────────────────────────────────────
    private fun showManageModulesDialog(license: License) {
        val dialog = Dialog(this)
        val dialogBinding = DialogManageModulesBinding.inflate(layoutInflater)
        dialog.setContentView(dialogBinding.root)
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        dialogBinding.tvDialogTitle.text = "Modules: ${license.customerName}"
        dialogBinding.tvDialogSubtitle.text = "${license.businessType} ERP • Key: ${license.licenseKey}"

        val modulesList = if (license.isMedical) {
            listOf("billing", "inventory", "patients", "pharmacy", "reports")
        } else {
            listOf("members", "trainers", "billing", "reports", "diet", "attendance", "packages", "notifications")
        }

        val moduleSwitches = mutableMapOf<String, MaterialSwitch>()
        val container = dialogBinding.layoutModulesContainer
        container.removeAllViews()

        for (moduleKey in modulesList) {
            val switch = MaterialSwitch(this).apply {
                val displayName = moduleKey.replaceFirstChar { it.uppercase() }
                text = displayName
                setTextColor(ContextCompat.getColor(context, R.color.erp_text_primary))
                isChecked = license.features[moduleKey] ?: false
                thumbTintList = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.erp_accent))
                trackTintList = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.erp_card_elevated))
            }
            moduleSwitches[moduleKey] = switch
            container.addView(switch)
        }

        dialogBinding.btnCancelModules.setOnClickListener { dialog.dismiss() }
        dialogBinding.btnSaveModules.setOnClickListener {
            val updatedFeatures = mutableMapOf<String, Boolean>()
            for ((key, switch) in moduleSwitches) {
                updatedFeatures[key] = switch.isChecked
            }

            dialog.dismiss()
            binding.progressBar.visibility = View.VISIBLE

            lifecycleScope.launch {
                val result = SupabaseClient.updateFeatures(license.licenseKey, updatedFeatures)
                binding.progressBar.visibility = View.GONE
                result.onSuccess {
                    showSnackbar("Updated remote module permissions in Supabase!")
                    loadLicensesFromSupabase()
                }.onFailure { error ->
                    showSnackbar("Failed to update modules: ${error.localizedMessage}")
                }
            }
        }

        dialog.show()
    }

    // ── Create New License Dialog ────────────────────────────────────────────
    private fun showCreateLicenseDialog() {
        val dialog = Dialog(this)
        val dialogBinding = DialogCreateLicenseBinding.inflate(layoutInflater)
        dialog.setContentView(dialogBinding.root)
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        val plans = arrayOf("PRO", "STANDARD", "ENTERPRISE")
        val spinnerAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, plans)
        dialogBinding.spinnerPlan.adapter = spinnerAdapter

        dialogBinding.btnQuick30.setOnClickListener { dialogBinding.etDaysValidity.setText("30") }
        dialogBinding.btnQuick365.setOnClickListener { dialogBinding.etDaysValidity.setText("365") }

        dialogBinding.btnCancel.setOnClickListener { dialog.dismiss() }
        dialogBinding.btnDeploy.setOnClickListener {
            val name = dialogBinding.etCustomerName.text.toString().trim()
            if (name.isEmpty()) {
                dialogBinding.etCustomerName.error = "Name required"
                return@setOnClickListener
            }

            val isMedical = dialogBinding.rbMedical.isChecked
            val sector = if (isMedical) "Medical" else "Gym"
            val plan = dialogBinding.spinnerPlan.selectedItem.toString()
            val days = dialogBinding.etDaysValidity.text.toString().toIntOrNull() ?: 30
            val workstations = dialogBinding.etWorkstations.text.toString().toIntOrNull() ?: 1

            // Generate Expiration Date
            val cal = Calendar.getInstance()
            cal.add(Calendar.DAY_OF_YEAR, days)
            val df = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val expirationDate = df.format(cal.time)

            // Generate License Key
            val licenseKey = generateLicenseKey(isMedical, plan)

            // Features Map
            val featuresMap = mutableMapOf<String, Boolean>()
            featuresMap["billing"] = dialogBinding.cbBilling.isChecked
            featuresMap["inventory"] = dialogBinding.cbInventory.isChecked
            featuresMap["patients"] = dialogBinding.cbPatients.isChecked
            featuresMap["pharmacy"] = dialogBinding.cbPharmacy.isChecked
            featuresMap["reports"] = dialogBinding.cbReports.isChecked
            featuresMap["members"] = dialogBinding.cbMembers.isChecked
            featuresMap["attendance"] = dialogBinding.cbAttendance.isChecked
            featuresMap["packages"] = dialogBinding.cbPackages.isChecked

            val countersJson = JsonObject().apply {
                addProperty("workstations", workstations)
            }

            val now = SupabaseClient.getIsoTimestamp()
            val newLicense = License(
                licenseKey = licenseKey,
                customerName = name,
                businessType = sector,
                planTier = plan,
                status = "Active",
                expirationDate = expirationDate,
                daysLeft = days,
                counters = countersJson,
                features = featuresMap,
                createdAt = now,
                updatedAt = now
            )

            dialog.dismiss()
            binding.progressBar.visibility = View.VISIBLE

            lifecycleScope.launch {
                val result = SupabaseClient.createLicense(newLicense)
                binding.progressBar.visibility = View.GONE
                result.onSuccess {
                    showSnackbar("✅ Deployed $licenseKey to Supabase Cloud!")
                    loadLicensesFromSupabase()
                }.onFailure { error ->
                    showSnackbar("Failed to deploy license: ${error.localizedMessage}")
                }
            }
        }

        dialog.show()
    }

    private fun generateLicenseKey(isMedical: Boolean, plan: String): String {
        val chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        val rnd = Random()
        fun rndBlock(len: Int) = (1..len).map { chars[rnd.nextInt(chars.length)] }.joinToString("")

        return if (isMedical) {
            "CARE-${rndBlock(4)}-${rndBlock(4)}-${rndBlock(4)}-2B26"
        } else {
            val year = Calendar.getInstance().get(Calendar.YEAR)
            val tier = if (plan.equals("PRO", ignoreCase = true)) "PRO" else "STD"
            "RAG-$tier-$year-${rndBlock(4)}-${rnd.nextInt(9000) + 1000}"
        }
    }

    // ── Delete License Confirmation ──────────────────────────────────────────
    private fun confirmDeleteLicense(license: License) {
        AlertDialog.Builder(this)
            .setTitle("Delete License")
            .setMessage("Are you sure you want to permanently remove ${license.customerName} (${license.licenseKey}) from Supabase?")
            .setPositiveButton("Delete") { _, _ ->
                binding.progressBar.visibility = View.VISIBLE
                lifecycleScope.launch {
                    val result = SupabaseClient.deleteLicense(license.licenseKey)
                    binding.progressBar.visibility = View.GONE
                    result.onSuccess {
                        showSnackbar("Deleted ${license.licenseKey} from Supabase")
                        loadLicensesFromSupabase()
                    }.onFailure { error ->
                        showSnackbar("Error deleting: ${error.localizedMessage}")
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showSnackbar(message: String) {
        Snackbar.make(binding.root, message, Snackbar.LENGTH_LONG)
            .setBackgroundTint(ContextCompat.getColor(this, R.color.erp_card_elevated))
            .setTextColor(ContextCompat.getColor(this, R.color.erp_text_primary))
            .show()
    }
}

