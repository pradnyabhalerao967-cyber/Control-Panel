package com.centralerp.controlpanel.data.api

import com.centralerp.controlpanel.data.model.License
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonObject
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

object SupabaseClient {

    const val PROJECT_ID = "ntrcrrcehrclogpqawzn"
    const val REGION = "South Asia (Mumbai)"
    const val SUPABASE_URL = "https://ntrcrrcehrclogpqawzn.supabase.co"

    // Supabase Cloud Configuration
    const val SUPABASE_KEY = "sb_publishable_5Usi0DkA_ikbnGCXoKK2qA_9QENQ-jv"
    const val SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5Usi0DkA_ikbnGCXoKK2qA_9QENQ-jv"

    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
    val gson: Gson = GsonBuilder().serializeNulls().create()

    private val httpClient: OkHttpClient by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .addInterceptor { chain ->
                val original = chain.request()
                val requestBuilder = original.newBuilder()
                    .header("apikey", SUPABASE_KEY)
                    .header("Authorization", "Bearer $SUPABASE_KEY")
                    .header("Content-Type", "application/json")
                chain.proceed(requestBuilder.build())
            }
            .addInterceptor(logging)
            .build()
    }

    /**
     * Fetch all licenses ordered by creation date descending
     */
    suspend fun getLicenses(): Result<List<License>> = withContext(Dispatchers.IO) {
        try {
            val url = "$SUPABASE_URL/rest/v1/licenses?select=*&order=created_at.desc"
            val request = Request.Builder().url(url).get().build()
            val response = httpClient.newCall(request).execute()

            if (!response.isSuccessful) {
                val errorBody = response.body?.string() ?: "HTTP ${response.code}"
                return@withContext Result.failure(Exception("Failed to fetch licenses: $errorBody"))
            }

            val body = response.body?.string() ?: "[]"
            val type = object : TypeToken<List<License>>() {}.type
            val licenses: List<License> = gson.fromJson(body, type)
            Result.success(licenses)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Create a new license in Supabase
     */
    suspend fun createLicense(license: License): Result<License> = withContext(Dispatchers.IO) {
        try {
            val url = "$SUPABASE_URL/rest/v1/licenses"
            val jsonPayload = gson.toJson(license)
            val requestBody = jsonPayload.toRequestBody(JSON_MEDIA_TYPE)

            val request = Request.Builder()
                .url(url)
                .header("Prefer", "return=representation")
                .post(requestBody)
                .build()

            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""

            if (!response.isSuccessful) {
                return@withContext Result.failure(Exception("Supabase insert error: $responseBody"))
            }

            val type = object : TypeToken<List<License>>() {}.type
            val insertedList: List<License> = gson.fromJson(responseBody, type)
            val inserted = insertedList.firstOrNull() ?: license
            Result.success(inserted)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Update license status (Active <-> Deactivated)
     */
    suspend fun updateStatus(licenseKey: String, newStatus: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val url = "$SUPABASE_URL/rest/v1/licenses?license_key=eq.$licenseKey"
            val updateJson = JsonObject().apply {
                addProperty("status", newStatus)
                addProperty("updated_at", getIsoTimestamp())
            }
            val request = Request.Builder()
                .url(url)
                .patch(updateJson.toString().toRequestBody(JSON_MEDIA_TYPE))
                .build()

            val response = httpClient.newCall(request).execute()
            if (!response.isSuccessful) {
                val err = response.body?.string() ?: "HTTP ${response.code}"
                return@withContext Result.failure(Exception(err))
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Extend license validity by X days
     */
    suspend fun extendValidity(licenseKey: String, currentDaysLeft: Int, daysToAdd: Int): Result<License> = withContext(Dispatchers.IO) {
        try {
            val newDays = currentDaysLeft + daysToAdd
            val calendar = Calendar.getInstance()
            calendar.add(Calendar.DAY_OF_YEAR, newDays)
            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val newExpiration = dateFormat.format(calendar.time)

            val url = "$SUPABASE_URL/rest/v1/licenses?license_key=eq.$licenseKey"
            val updateJson = JsonObject().apply {
                addProperty("days_left", newDays)
                addProperty("expiration_date", newExpiration)
                addProperty("status", "Active")
                addProperty("updated_at", getIsoTimestamp())
            }

            val request = Request.Builder()
                .url(url)
                .header("Prefer", "return=representation")
                .patch(updateJson.toString().toRequestBody(JSON_MEDIA_TYPE))
                .build()

            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""

            if (!response.isSuccessful) {
                return@withContext Result.failure(Exception(responseBody))
            }

            val type = object : TypeToken<List<License>>() {}.type
            val updatedList: List<License> = gson.fromJson(responseBody, type)
            val updated = updatedList.firstOrNull() ?: throw Exception("Empty response on update")
            Result.success(updated)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Update features map in Supabase
     */
    suspend fun updateFeatures(licenseKey: String, features: Map<String, Boolean>): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val url = "$SUPABASE_URL/rest/v1/licenses?license_key=eq.$licenseKey"
            val updateJson = JsonObject().apply {
                add("features", gson.toJsonTree(features))
                addProperty("updated_at", getIsoTimestamp())
            }

            val request = Request.Builder()
                .url(url)
                .patch(updateJson.toString().toRequestBody(JSON_MEDIA_TYPE))
                .build()

            val response = httpClient.newCall(request).execute()
            if (!response.isSuccessful) {
                val err = response.body?.string() ?: "HTTP ${response.code}"
                return@withContext Result.failure(Exception(err))
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Delete a license from Supabase
     */
    suspend fun deleteLicense(licenseKey: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val url = "$SUPABASE_URL/rest/v1/licenses?license_key=eq.$licenseKey"
            val request = Request.Builder().url(url).delete().build()
            val response = httpClient.newCall(request).execute()

            if (!response.isSuccessful) {
                val err = response.body?.string() ?: "HTTP ${response.code}"
                return@withContext Result.failure(Exception(err))
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getIsoTimestamp(): String {
        val df = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        return df.format(Date())
    }
}

