package com.centralerp.controlpanel.data.model

import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.annotations.SerializedName

data class License(
    @SerializedName("id")
    var id: String? = null,

    @SerializedName("license_key")
    var licenseKey: String = "",

    @SerializedName("customer_name")
    var customerName: String = "",

    @SerializedName("business_type")
    var businessType: String = "Medical", // "Medical" or "Gym"

    @SerializedName("plan_tier")
    var planTier: String = "PRO", // "STANDARD", "PRO", "ENTERPRISE"

    @SerializedName("status")
    var status: String = "Active", // "Active" or "Deactivated"

    @SerializedName("expiration_date")
    var expirationDate: String = "",

    @SerializedName("days_left")
    var daysLeft: Int = 30,

    @SerializedName("counters")
    var counters: JsonElement? = null,

    @SerializedName("features")
    var features: MutableMap<String, Boolean> = mutableMapOf(),

    @SerializedName("created_at")
    var createdAt: String? = null,

    @SerializedName("updated_at")
    var updatedAt: String? = null
) {
    val isMedical: Boolean
        get() = businessType.equals("Medical", ignoreCase = true)

    val isActive: Boolean
        get() = status.equals("Active", ignoreCase = true)

    val isExpiringSoon: Boolean
        get() = daysLeft in 1..15

    val isExpired: Boolean
        get() = daysLeft <= 0

    val workstationCount: Int
        get() {
            return try {
                if (counters != null) {
                    if (counters!!.isJsonObject) {
                        counters!!.asJsonObject.get("workstations")?.asInt ?: 1
                    } else if (counters!!.isJsonPrimitive && counters!!.asJsonPrimitive.isString) {
                        val str = counters!!.asString
                        if (str.contains("workstations")) {
                            val regex = """"workstations"\s*:\s*(\d+)""".toRegex()
                            regex.find(str)?.groupValues?.get(1)?.toIntOrNull() ?: 1
                        } else 1
                    } else 1
                } else 1
            } catch (e: Exception) {
                1
            }
        }

    val activeModulesCount: Int
        get() = features.count { it.value }

    val totalModulesCount: Int
        get() = if (isMedical) 6 else 8
}

