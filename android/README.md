# Central ERP License Dashboard — Android App (Medical + Gym)

A native Android application built for Android Studio that connects directly to the Supabase Cloud PostgreSQL database (`ntrcrrcehrclogpqawzn` in South Asia / Mumbai).

---

## 🚀 How to Open in Android Studio

1. Open **Android Studio**.
2. Click **File** ➔ **Open...**
3. Navigate to either of these paths:
   - `C:\Users\PRADNYA\OneDrive\Desktop\ControlPanelApp`
   - or `C:\Users\PRADNYA\AndroidStudioProjects\ControlPanelApp`
4. Click **OK**. Android Studio will automatically sync the Gradle files and load the project.
5. Select an Emulator or connected Android phone and click the **Run (Green Play)** button!

---

## ⚡ Direct Database Connection (Supabase Cloud)

The app connects directly to your Supabase project without any intermediate proxy:
- **Project ID**: `ntrcrrcehrclogpqawzn`
- **Region**: South Asia (Mumbai)
- **Supabase URL**: `https://ntrcrrcehrclogpqawzn.supabase.co`
- **Service Role Secret Key**: Configured in `SupabaseClient.kt`
- **Table**: `public.licenses`

### Supported Real-Time Actions:
1. **Live License Registry**: Fetches all medical and gym licenses ordered by `created_at DESC`.
2. **Deploy License Key**: Generates cryptographic license keys (`CARE-XXXX-XXXX-XXXX-2B26` for Medical, `RAG-PRO-2026-XXXX-XXXX` for Gym) and inserts them directly into Supabase.
3. **1-Tap Extend (+30 Days)**: Adds 30 days to the license validity and updates `days_left` and `expiration_date` in Supabase.
4. **Instant Remote Lock/Unlock**: Toggle status between **Active** and **Deactivated** in 1 click.
5. **Granular Remote Module Access**: Configure module permissions (Billing, Inventory, Patients, Pharmacy, Reports, Members, Attendance, Trainers, etc.) stored in the `features` JSON column.
6. **1-Tap Key Copy**: Instant clipboard copy with toast feedback.
7. **Delete License**: Permanent deletion with confirmation dialog.

---

## 🎨 Design & Architecture

- **UI Framework**: Modern Android Material Design 3 (matching Central ERP dark obsidian aesthetic).
- **Networking**: OkHttp 4 + Retrofit/Gson + Kotlin Coroutines with full background threading.
- **Architecture**: Clean MVVM-ready structure (`data/model`, `data/api`, `ui/`).

