package com.centralerp.controlpanel.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.centralerp.controlpanel.R
import com.centralerp.controlpanel.data.model.License
import com.centralerp.controlpanel.databinding.ItemLicenseCardBinding

class LicenseAdapter(
    private val onExtendClicked: (License) -> Unit,
    private val onToggleStatusClicked: (License) -> Unit,
    private val onManageModulesClicked: (License) -> Unit,
    private val onDeleteClicked: (License) -> Unit
) : ListAdapter<License, LicenseAdapter.LicenseViewHolder>(DiffCallback) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): LicenseViewHolder {
        val binding = ItemLicenseCardBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return LicenseViewHolder(binding)
    }

    override fun onBindViewHolder(holder: LicenseViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class LicenseViewHolder(private val binding: ItemLicenseCardBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(license: License) {
            val context = itemView.context

            // Enterprise Name
            binding.tvCustomerName.text = license.customerName

            // License Key
            binding.tvLicenseKey.text = license.licenseKey

            // Copy Key Action
            binding.btnCopyKey.setOnClickListener {
                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newPlainText("License Key", license.licenseKey)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(context, "Copied: ${license.licenseKey}", Toast.LENGTH_SHORT).show()
            }

            // Sector Badge
            if (license.isMedical) {
                binding.tvSectorBadge.text = "🏥 Medical"
                binding.tvSectorBadge.setBackgroundResource(R.drawable.bg_badge_medical)
                binding.tvSectorBadge.setTextColor(ContextCompat.getColor(context, R.color.badge_medical_text))
            } else {
                binding.tvSectorBadge.text = "🏋️ Gym"
                binding.tvSectorBadge.setBackgroundResource(R.drawable.bg_badge_gym)
                binding.tvSectorBadge.setTextColor(ContextCompat.getColor(context, R.color.badge_gym_text))
            }

            // Plan Tier Badge
            binding.tvPlanBadge.text = license.planTier.uppercase()

            // Status Badge & Action Button
            if (license.isActive) {
                if (license.isExpiringSoon) {
                    binding.tvStatusBadge.text = "● Expiring Soon"
                    binding.tvStatusBadge.setBackgroundResource(R.drawable.bg_badge_expiring)
                    binding.tvStatusBadge.setTextColor(ContextCompat.getColor(context, R.color.status_expiring_text))
                } else {
                    binding.tvStatusBadge.text = "● Active"
                    binding.tvStatusBadge.setBackgroundResource(R.drawable.bg_badge_active)
                    binding.tvStatusBadge.setTextColor(ContextCompat.getColor(context, R.color.status_active_text))
                }
                binding.btnToggleStatus.text = "Deactivate"
                val deactivateColor = ContextCompat.getColor(context, R.color.status_deactivated_text)
                binding.btnToggleStatus.setTextColor(deactivateColor)
                binding.btnToggleStatus.iconTint = ColorStateList.valueOf(deactivateColor)
            } else {
                binding.tvStatusBadge.text = "● Deactivated"
                binding.tvStatusBadge.setBackgroundResource(R.drawable.bg_badge_deactivated)
                binding.tvStatusBadge.setTextColor(ContextCompat.getColor(context, R.color.status_deactivated_text))
                binding.btnToggleStatus.text = "Activate"
                val activateColor = ContextCompat.getColor(context, R.color.status_active_text)
                binding.btnToggleStatus.setTextColor(activateColor)
                binding.btnToggleStatus.iconTint = ColorStateList.valueOf(activateColor)
            }

            // Days Left & Expiration
            if (license.daysLeft > 0) {
                binding.tvDaysLeft.text = "${license.daysLeft} days left"
                binding.tvDaysLeft.setTextColor(ContextCompat.getColor(context, R.color.erp_accent))
            } else {
                binding.tvDaysLeft.text = "Expired"
                binding.tvDaysLeft.setTextColor(ContextCompat.getColor(context, R.color.status_deactivated_text))
            }
            binding.tvExpiryDate.text = "Expires ${license.expirationDate}"

            // Modules count
            val activeModules = license.activeModulesCount
            val totalModules = license.totalModulesCount
            binding.tvModulesCount.text = "$activeModules/$totalModules Modules"

            // Workstations
            val pcCount = license.workstationCount
            binding.tvWorkstations.text = if (pcCount == 1) "1 PC" else "$pcCount PCs"

            // Action listeners
            binding.btnExtend.setOnClickListener { onExtendClicked(license) }
            binding.btnToggleStatus.setOnClickListener { onToggleStatusClicked(license) }
            binding.btnModules.setOnClickListener { onManageModulesClicked(license) }
            binding.btnDelete.setOnClickListener { onDeleteClicked(license) }
        }
    }

    companion object DiffCallback : DiffUtil.ItemCallback<License>() {
        override fun areItemsTheSame(oldItem: License, newItem: License): Boolean {
            return oldItem.licenseKey == newItem.licenseKey
        }

        override fun areContentsTheSame(oldItem: License, newItem: License): Boolean {
            return oldItem == newItem
        }
    }
}
