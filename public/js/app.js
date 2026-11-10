/**
 * CENTRALIZED SAAS MANAGEMENT PLATFORM — CORE ENGINE & ROUTER
 */

// Global State
const AppState = {
  activeApp: 'superadmin', // 'superadmin' | 'gym' | 'medical'
  activeTab: 'dashboard',  // sub-tab in current app
  user: {
    name: 'Pradnya Bhalerao',
    role: 'SUPER_ADMIN',
    app_access: 'ALL'
  },
  gymLicense: null,
  medicalLicense: null,
  isDarkMode: true
};

// API Fetch Helper with error handling
async function apiRequest(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }
    const res = await fetch(endpoint, options);
    const result = await res.json();
    return result;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    showToast(`API Connection Error: ${err.message}`, 'danger');
    return null;
  }
}

// Toast Notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const isSuccess = type === 'success';
  const isDanger = type === 'danger';

  const borderClass = isSuccess 
    ? 'border-emerald-500/40 text-emerald-300' 
    : isDanger 
    ? 'border-rose-500/40 text-rose-300' 
    : 'border-sky-500/40 text-sky-300';

  const iconSvg = isSuccess 
    ? `<svg class="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
    : isDanger
    ? `<svg class="w-4 h-4 text-rose-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
    : `<svg class="w-4 h-4 text-sky-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

  toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl text-[13px] bg-[#0d1526] ${borderClass} transition-all duration-200 transform translate-y-2 opacity-0`;
  toast.innerHTML = `
    ${iconSvg}
    <span class="font-medium">${message}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// Seamless App Switcher (Single Sign-On SSO)
async function switchApp(appKey) {
  AppState.activeApp = appKey;
  AppState.activeTab = 'dashboard';

  // Update URL Hash without reload
  window.location.hash = appKey;

  // Update Top Bar active indicator
  const appTabs = ['superadmin', 'gym', 'medical'];
  appTabs.forEach(app => {
    const btn = document.getElementById(`nav-app-${app}`);
    const badge = document.getElementById(`active-pill-${app}`);
    if (btn) {
      if (app === appKey) {
        btn.classList.add('bg-[#141f38]', 'text-white', 'border-emerald-500/40');
        btn.classList.remove('text-slate-400', 'border-transparent');
        if (badge) badge.classList.remove('hidden');
      } else {
        btn.classList.remove('bg-[#141f38]', 'text-white', 'border-emerald-500/40');
        btn.classList.add('text-slate-400', 'border-transparent');
        if (badge) badge.classList.add('hidden');
      }
    }
  });

  // Hide all main containers
  document.getElementById('view-superadmin').classList.add('hidden');
  document.getElementById('view-gym').classList.add('hidden');
  document.getElementById('view-medical').classList.add('hidden');

  // Show active view
  const activeContainer = document.getElementById(`view-${appKey}`);
  if (activeContainer) {
    activeContainer.classList.remove('hidden');
  }

  // Update App Header Banner
  updateAppHeaderBanner();

  // Load and refresh respective data
  if (appKey === 'superadmin') {
    SuperAdminModule.loadDashboard();
    SuperAdminModule.setTab('dashboard');
  } else if (appKey === 'gym') {
    await verifyAppLicense('RED_APPLE_GYM', 'RAG-PRO-2026-001');
    GymModule.loadDashboard();
    GymModule.setTab('dashboard');
  } else if (appKey === 'medical') {
    await verifyAppLicense('BHALERAO_MEDICAL', 'BM-STD-2026-002');
    MedicalModule.loadDashboard();
    MedicalModule.setTab('dashboard');
  }

  showToast(`Switched to ${appKey === 'superadmin' ? 'Super Admin Control Center' : appKey === 'gym' ? 'Red Apple Gym' : 'Bhalerao Medical'} (SSO Active)`, 'info');
}

// Verify License Online with Central KMS
async function verifyAppLicense(businessType, licenseKey) {
  const result = await apiRequest('/api/license/verify', 'POST', {
    app: businessType,
    license_key: licenseKey
  });

  if (businessType === 'RED_APPLE_GYM') {
    AppState.gymLicense = result;
    updateLicenseBanner('gym', result);
  } else {
    AppState.medicalLicense = result;
    updateLicenseBanner('medical', result);
  }

  return result;
}

// Update License status banner inside application
function updateLicenseBanner(app, lic) {
  const banner = document.getElementById(`${app}-license-status-badge`);
  if (!banner) return;

  if (lic && lic.valid) {
    banner.innerHTML = `
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-indicator"></span>
      <span class="font-mono font-semibold text-emerald-400">${lic.license_key}</span>
      <span class="text-slate-400 text-[11px]">(${lic.plan_tier} • Valid to ${lic.expiration_date})</span>
    `;
  } else {
    banner.innerHTML = `
      <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
      <span class="font-semibold text-rose-400">${lic ? lic.status : 'UNLICENSED'}</span>
      <span class="text-slate-400 text-[11px]">${lic ? lic.error : 'License required'}</span>
    `;
  }
}

// Update Top App Title Banner
function updateAppHeaderBanner() {
  const titleEl = document.getElementById('current-app-title');
  const subEl = document.getElementById('current-app-sub');
  const iconEl = document.getElementById('current-app-icon');

  if (AppState.activeApp === 'superadmin') {
    titleEl.innerText = "Central Super Admin Control Center";
    subEl.innerText = "Master Multi-Tenant Governance • Red Apple Gym + Bhalerao Medical";
    iconEl.className = "w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400";
    iconEl.innerHTML = `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
  } else if (AppState.activeApp === 'gym') {
    titleEl.innerText = "Red Apple Gym Management System";
    subEl.innerText = "Member Profiles, Attendance, Trainers, Fees & Facility Operations";
    iconEl.className = "w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400";
    iconEl.innerHTML = `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 5v14M18 5v14M2 9h4M18 9h4M2 15h4M18 15h4M6 12h12"/></svg>`;
  } else if (AppState.activeApp === 'medical') {
    titleEl.innerText = "Bhalerao Medical Management System";
    subEl.innerText = "Patients, Appointments, Billing, Multi-Batch Pharmacy & Prescriptions";
    iconEl.className = "w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400";
    iconEl.innerHTML = `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>`;
  }
}

// Light / Dark Mode Toggle
function toggleTheme() {
  AppState.isDarkMode = !AppState.isDarkMode;
  const html = document.documentElement;
  if (AppState.isDarkMode) {
    html.classList.add('dark');
    html.classList.remove('light');
    showToast("Dark Mode Enabled", "info");
  } else {
    html.classList.remove('dark');
    html.classList.add('light');
    showToast("Light Mode Enabled", "info");
  }
}

// Modal helper: Open & Close
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('hidden');
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('hidden');
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
  // Check hash route
  const hash = window.location.hash.replace('#', '');
  if (hash === 'gym' || hash === 'medical') {
    switchApp(hash);
  } else {
    switchApp('superadmin');
  }

  // Keyboard shortcut: Escape to close modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModals = document.querySelectorAll('.fixed:not(.hidden)');
      openModals.forEach(m => {
        if (m.id !== 'toastContainer') m.classList.add('hidden');
      });
    }
  });
});

