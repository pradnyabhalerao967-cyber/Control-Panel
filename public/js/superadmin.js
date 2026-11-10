/**
 * CENTRAL SUPER ADMIN CONTROLLER & DYNAMIC FEATURE MATRIX
 */

const SuperAdminModule = {
  currentTab: 'dashboard',
  data: {
    metrics: {},
    licenses: [],
    customers: [],
    plans: [],
    auditLogs: []
  },

  setTab(tabName) {
    this.currentTab = tabName;
    const tabs = ['dashboard', 'licenses', 'features', 'customers', 'plans', 'audit'];
    tabs.forEach(t => {
      const btn = document.getElementById(`sa-tab-btn-${t}`);
      const content = document.getElementById(`sa-tab-${t}`);
      if (btn && content) {
        if (t === tabName) {
          btn.className = "px-3.5 py-1.5 rounded-lg text-[13px] font-medium bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 transition-colors";
          content.classList.remove('hidden');
        } else {
          btn.className = "px-3.5 py-1.5 rounded-lg text-[13px] font-medium bg-[#080c15] hover:bg-[#121c33] border border-[#1a263f] hover:border-[#273859] text-slate-300 transition-colors";
          content.classList.add('hidden');
        }
      }
    });

    if (tabName === 'licenses') this.loadLicenses();
    if (tabName === 'features') this.loadFeatureMatrix();
    if (tabName === 'customers') this.loadCustomers();
    if (tabName === 'plans') this.loadPlans();
    if (tabName === 'audit') this.loadAuditLogs();
  },

  async loadDashboard() {
    const res = await apiRequest('/api/superadmin/dashboard');
    if (!res || !res.success) return;

    this.data.metrics = res.metrics;
    this.data.licenses = res.licenses;
    this.data.customers = res.customers;

    // Render Metrics Cards
    document.getElementById('sa-total-apps').innerText = res.metrics.total_apps || 2;
    document.getElementById('sa-total-customers').innerText = res.metrics.total_customers || 0;
    document.getElementById('sa-active-licenses').innerText = res.metrics.active_licenses || 0;
    document.getElementById('sa-expired-licenses').innerText = res.metrics.expired_licenses || 0;
    document.getElementById('sa-suspended-licenses').innerText = res.metrics.suspended_licenses || 0;
    document.getElementById('sa-std-customers').innerText = res.metrics.standard_customers || 0;
    document.getElementById('sa-pro-customers').innerText = res.metrics.pro_customers || 0;
    document.getElementById('sa-mrr').innerText = '₹' + (res.metrics.monthly_revenue_mrr || 0).toLocaleString();
    document.getElementById('sa-arr').innerText = '₹' + (res.metrics.annual_projected_arr || 0).toLocaleString();

    // Render Recent Activities
    const actContainer = document.getElementById('sa-recent-activities');
    if (actContainer) {
      actContainer.innerHTML = (res.recent_activities || []).map(act => `
        <div class="flex items-start justify-between gap-3 py-2.5 border-b border-[#162137] last:border-b-0 text-[12px]">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
            <div>
              <span class="font-medium text-slate-200">${act.action.replace(/_/g, ' ')}</span>
              <p class="text-slate-400 text-[11px]">${act.details}</p>
            </div>
          </div>
          <span class="text-slate-500 font-mono text-[10px] shrink-0">${new Date(act.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
        </div>
      `).join('');
    }

    // Render Expiration Alerts
    const alertContainer = document.getElementById('sa-expiration-alerts');
    if (alertContainer) {
      const expiringList = (res.licenses || []).filter(l => {
        const days = Math.ceil((new Date(l.expiration_date) - new Date()) / (1000*60*60*24));
        return days <= 30;
      });

      if (expiringList.length === 0) {
        alertContainer.innerHTML = `<div class="text-slate-400 text-[12px] py-4 text-center">No licenses expiring in the next 30 days.</div>`;
      } else {
        alertContainer.innerHTML = expiringList.map(l => `
          <div class="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 mb-2 text-[12px]">
            <div>
              <div class="font-semibold text-amber-300 font-mono">${l.license_key}</div>
              <div class="text-slate-300 text-[11px]">${l.customer_name}</div>
            </div>
            <div class="text-right">
              <span class="text-amber-400 font-medium">Expires ${l.expiration_date}</span>
              <button onclick="SuperAdminModule.openExtendModal('${l.id}')" class="block ml-auto mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30">Extend</button>
            </div>
          </div>
        `).join('');
      }
    }

    // Initialize Interactive Charts
    this.renderCharts();
  },

  revenueChartInstance: null,
  tierChartInstance: null,

  renderCharts() {
    if (typeof Chart === 'undefined') return;

    // 1. Revenue Growth Chart
    const revCanvas = document.getElementById('saRevenueChart');
    if (revCanvas) {
      if (this.revenueChartInstance) this.revenueChartInstance.destroy();
      const ctx = revCanvas.getContext('2d');
      this.revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026'],
          datasets: [
            {
              label: 'Red Apple Gym Subscriptions',
              data: [4999, 4999, 7498, 7498, 7498, 9998],
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.35,
              fill: true
            },
            {
              label: 'Bhalerao Medical Subscriptions',
              data: [2999, 5998, 5998, 8997, 8997, 10498],
              borderColor: '#0284c7',
              backgroundColor: 'rgba(2, 132, 199, 0.1)',
              tension: 0.35,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#64748b', font: { size: 10 } }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: {
                color: '#64748b',
                font: { size: 10 },
                callback: (val) => '₹' + val.toLocaleString()
              }
            }
          }
        }
      });
    }

    // 2. Plan Tier Distribution Chart
    const tierCanvas = document.getElementById('saTierChart');
    if (tierCanvas) {
      if (this.tierChartInstance) this.tierChartInstance.destroy();
      const ctxTier = tierCanvas.getContext('2d');
      this.tierChartInstance = new Chart(ctxTier, {
        type: 'doughnut',
        data: {
          labels: ['Pro Tier', 'Standard Tier', 'Custom Tier'],
          datasets: [{
            data: [2, 1, 1],
            backgroundColor: ['#10b981', '#64748b', '#8b5cf6'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
            }
          },
          cutout: '72%'
        }
      });
    }
  },

  async loadLicenses() {
    const res = await apiRequest('/api/licenses');
    if (!res || !res.success) return;
    this.data.licenses = res.licenses;

    const tbody = document.getElementById('sa-licenses-table-body');
    if (!tbody) return;

    tbody.innerHTML = res.licenses.map(l => {
      const statusBadge = l.status === 'ACTIVE'
        ? `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-indicator"></span>Active</span>`
        : l.status === 'EXPIRED'
        ? `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25">Expired</span>`
        : `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/25">Suspended</span>`;

      const appBadge = l.business_type === 'RED_APPLE_GYM'
        ? `<span class="px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">Red Apple Gym</span>`
        : `<span class="px-2 py-0.5 rounded text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">Bhalerao Medical</span>`;

      return `
        <tr class="hover:bg-[#121c32]/60 transition-colors text-[13px]">
          <td class="py-3 px-4 font-mono font-semibold text-emerald-400 select-all">${l.license_key}</td>
          <td class="py-3 px-4 font-medium text-slate-100">${l.customer_name}</td>
          <td class="py-3 px-4">${appBadge}</td>
          <td class="py-3 px-4 text-slate-300 font-medium">${l.plan_tier}</td>
          <td class="py-3 px-4">${statusBadge}</td>
          <td class="py-3 px-4 text-slate-300">${l.expiration_date}</td>
          <td class="py-3 px-4 text-slate-400 font-mono text-[11px]">${l.cluster_node}</td>
          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="SuperAdminModule.openExtendModal('${l.id}')" data-tooltip="Extend Expiry" class="px-2.5 py-1 rounded bg-[#080c15] hover:bg-emerald-500/15 border border-[#1a263f] hover:border-emerald-500/30 text-slate-300 hover:text-emerald-300 text-[11px] font-medium">Extend</button>
              ${l.status === 'ACTIVE' 
                ? `<button onclick="SuperAdminModule.toggleLicenseStatus('${l.id}', 'SUSPENDED')" data-tooltip="Suspend License" class="px-2 py-1 rounded bg-[#080c15] hover:bg-rose-500/15 border border-[#1a263f] hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-[11px]">Suspend</button>`
                : `<button onclick="SuperAdminModule.toggleLicenseStatus('${l.id}', 'ACTIVE')" data-tooltip="Activate License" class="px-2 py-1 rounded bg-[#080c15] hover:bg-emerald-500/15 border border-[#1a263f] hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 text-[11px]">Activate</button>`
              }
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  async loadFeatureMatrix() {
    const res = await apiRequest('/api/licenses');
    if (!res || !res.success) return;
    this.data.licenses = res.licenses;

    const container = document.getElementById('sa-feature-matrix-container');
    if (!container) return;

    container.innerHTML = res.licenses.map(lic => {
      const isGym = lic.business_type === 'RED_APPLE_GYM';
      const features = lic.features || {};

      const featureList = isGym ? [
        { key: 'members', label: 'Member Management' },
        { key: 'attendance', label: 'Attendance Tracking' },
        { key: 'fees', label: 'Fees & Payments' },
        { key: 'trainers', label: 'Trainers & Staff' },
        { key: 'workouts', label: 'Workout Schedules' },
        { key: 'diet', label: 'Custom Diet Plans' },
        { key: 'reports', label: 'Income & Expense Reports' },
        { key: 'analytics', label: 'Advanced Analytics' }
      ] : [
        { key: 'patients', label: 'Patient Management' },
        { key: 'appointments', label: 'Appointments Queue' },
        { key: 'billing', label: 'Billing & GST Invoices' },
        { key: 'prescriptions', label: 'Clinical Prescriptions' },
        { key: 'inventory', label: 'Medicine Stock & Batch' },
        { key: 'suppliers', label: 'Wholesale Suppliers' },
        { key: 'reports', label: 'Sales & Inventory Reports' },
        { key: 'analytics', label: 'Advanced Analytics' }
      ];

      return `
        <div class="bg-[#0d1526] border border-[#1a263f] rounded-xl p-5 mb-4 shadow-sm">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#1a263f] gap-2">
            <div>
              <div class="flex items-center gap-2.5">
                <span class="font-mono font-bold text-emerald-400 text-[14px]">${lic.license_key}</span>
                <span class="px-2 py-0.5 rounded text-[11px] font-medium ${isGym ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'}">${isGym ? 'Red Apple Gym' : 'Bhalerao Medical'}</span>
                <span class="text-slate-400 text-[12px] font-medium">(${lic.plan_tier} Plan)</span>
              </div>
              <h4 class="text-[13px] font-medium text-slate-200 mt-1">${lic.customer_name}</h4>
            </div>
            <div class="text-[11px] text-slate-400">
              Changes apply instantly to connected instances
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
            ${featureList.map(f => {
              const enabled = features[f.key] !== false;
              return `
                <div class="flex items-center justify-between p-3 rounded-lg bg-[#080c15] border border-[#1a263f] text-[12px]">
                  <div>
                    <span class="font-medium ${enabled ? 'text-slate-200' : 'text-slate-500 line-through'}">${f.label}</span>
                    <div class="text-[10px] ${enabled ? 'text-emerald-400' : 'text-rose-400'}">${enabled ? 'Enabled' : 'Disabled'}</div>
                  </div>
                  <label class="switch">
                    <input type="checkbox" ${enabled ? 'checked' : ''} onchange="SuperAdminModule.toggleFeature('${lic.id}', '${f.key}', this.checked)">
                    <span class="slider"></span>
                  </label>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  async toggleFeature(licenseId, featureKey, isEnabled) {
    const res = await apiRequest('/api/features/toggle', 'POST', {
      license_id: licenseId,
      feature_key: featureKey,
      enabled: isEnabled
    });

    if (res && res.success) {
      showToast(`Feature '${featureKey}' is now ${isEnabled ? 'ACTIVE' : 'LOCKED'} on license`, isEnabled ? 'success' : 'danger');
      // If currently active app is affected, reload
      if (AppState.activeApp === 'gym') verifyAppLicense('RED_APPLE_GYM', 'RAG-PRO-2026-001');
      if (AppState.activeApp === 'medical') verifyAppLicense('BHALERAO_MEDICAL', 'BM-STD-2026-002');
    }
  },

  async toggleLicenseStatus(licenseId, newStatus) {
    const res = await apiRequest('/api/licenses/update', 'PUT', {
      license_id: licenseId,
      status: newStatus
    });
    if (res && res.success) {
      showToast(`License status updated to ${newStatus}`, newStatus === 'ACTIVE' ? 'success' : 'danger');
      this.loadLicenses();
    }
  },

  async loadCustomers() {
    const res = await apiRequest('/api/customers');
    if (!res || !res.success) return;
    this.data.customers = res.customers;

    const tbody = document.getElementById('sa-customers-table-body');
    if (!tbody) return;

    tbody.innerHTML = res.customers.map(c => `
      <tr class="hover:bg-[#121c32]/60 transition-colors text-[13px]">
        <td class="py-3 px-4 font-medium text-slate-100">${c.customer_name}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[11px] font-medium ${c.business_type === 'RED_APPLE_GYM' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'}">
            ${c.business_type === 'RED_APPLE_GYM' ? 'Red Apple Gym' : 'Bhalerao Medical'}
          </span>
        </td>
        <td class="py-3 px-4 text-slate-300">${c.contact_person}</td>
        <td class="py-3 px-4 text-slate-400 text-[12px]">${c.email}<br>${c.phone}</td>
        <td class="py-3 px-4 text-slate-300 font-mono text-[12px]">${c.license_key || 'None'}</td>
        <td class="py-3 px-4"><span class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400">${c.current_plan}</span></td>
        <td class="py-3 px-4 text-right">
          <button onclick="SuperAdminModule.openLicenseModalForCustomer('${c.id}')" class="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium">Issue Key</button>
        </td>
      </tr>
    `).join('');
  },

  async loadPlans() {
    const res = await apiRequest('/api/plans');
    if (!res || !res.success) return;
    this.data.plans = res.plans;

    const container = document.getElementById('sa-plans-container');
    if (!container) return;

    container.innerHTML = res.plans.map(p => `
      <div class="bg-[#0d1526] border border-[#1a263f] rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between pb-2">
            <span class="font-mono text-[11px] text-emerald-400 font-semibold uppercase">${p.tier} TIER</span>
            <span class="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">${p.business_type}</span>
          </div>
          <h3 class="text-[18px] font-bold text-slate-100">${p.plan_name}</h3>
          <p class="text-[12px] text-slate-400 mt-1">${p.description}</p>
          <div class="mt-4 pb-3 border-b border-[#1a263f]">
            <span class="text-[26px] font-extrabold text-slate-100">₹${p.monthly_price.toLocaleString()}</span>
            <span class="text-slate-400 text-[12px]">/ month</span>
            <div class="text-[11px] text-slate-500 mt-0.5">Annual billing: ₹${p.annual_price.toLocaleString()}/yr</div>
          </div>
          <div class="mt-3 space-y-1.5 text-[12px] text-slate-300">
            <div class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Max User Accounts: <strong>${p.max_users}</strong></span>
            </div>
            <div class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Allowed Modules: ${p.allowed_modules.length}</span>
            </div>
          </div>
        </div>
        <div class="mt-5 pt-3 border-t border-[#1a263f]">
          <button class="w-full py-2 rounded-lg bg-[#080c15] hover:bg-[#141f38] border border-[#1a263f] text-slate-300 text-[12px] font-medium transition-colors">
            Configure Entitlements
          </button>
        </div>
      </div>
    `).join('');
  },

  async loadAuditLogs() {
    const res = await apiRequest('/api/audit-logs');
    if (!res || !res.success) return;

    const tbody = document.getElementById('sa-audit-table-body');
    if (!tbody) return;

    tbody.innerHTML = res.logs.map(log => `
      <tr class="hover:bg-[#121c32]/60 transition-colors text-[12px]">
        <td class="py-2.5 px-4 font-mono text-slate-400">${new Date(log.timestamp).toLocaleString()}</td>
        <td class="py-2.5 px-4 font-medium text-slate-200">${log.user}</td>
        <td class="py-2.5 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">${log.action}</span></td>
        <td class="py-2.5 px-4 text-slate-300">${log.details}</td>
        <td class="py-2.5 px-4 font-mono text-slate-500 text-[11px]">${log.ip}</td>
      </tr>
    `).join('');
  },

  openGenerateModal() {
    // Populate customer dropdown
    const sel = document.getElementById('sa-gen-customer-select');
    if (sel && this.data.customers) {
      sel.innerHTML = this.data.customers.map(c => `
        <option value="${c.id}" data-type="${c.business_type}">${c.customer_name} (${c.business_type})</option>
      `).join('');
    }
    openModal('modal-sa-generate-license');
  },

  openLicenseModalForCustomer(customerId) {
    this.openGenerateModal();
    const sel = document.getElementById('sa-gen-customer-select');
    if (sel) sel.value = customerId;
  },

  async handleGenerateLicense(e) {
    e.preventDefault();
    const customerId = document.getElementById('sa-gen-customer-select').value;
    const businessType = document.getElementById('sa-gen-app-type').value;
    const planTier = document.getElementById('sa-gen-plan-tier').value;
    const durationMonths = document.getElementById('sa-gen-duration').value;

    const res = await apiRequest('/api/licenses/generate', 'POST', {
      customer_id: customerId,
      business_type: businessType,
      plan_tier: planTier,
      duration_months: durationMonths
    });

    if (res && res.success) {
      showToast(`Generated license key: ${res.license.license_key}`, 'success');
      closeModal('modal-sa-generate-license');
      this.loadDashboard();
      this.loadLicenses();
    }
  },

  openExtendModal(licenseId) {
    const lic = (this.data.licenses || []).find(l => l.id === licenseId);
    if (!lic) return;
    document.getElementById('sa-extend-target-id').value = licenseId;
    document.getElementById('sa-extend-key-display').innerText = lic.license_key;
    document.getElementById('sa-extend-cur-expiry').innerText = lic.expiration_date;
    openModal('modal-sa-extend-license');
  },

  async confirmExtend(days) {
    const licenseId = document.getElementById('sa-extend-target-id').value;
    const res = await apiRequest('/api/licenses/update', 'PUT', {
      license_id: licenseId,
      extend_days: days
    });

    if (res && res.success) {
      showToast(`Extended license ${res.license.license_key} by +${days} days`, 'success');
      closeModal('modal-sa-extend-license');
      this.loadDashboard();
      this.loadLicenses();
    }
  },

  openAddCustomerModal() {
    openModal('modal-sa-add-customer');
  },

  async handleAddCustomer(e) {
    e.preventDefault();
    const name = document.getElementById('sa-cust-name').value;
    const type = document.getElementById('sa-cust-type').value;
    const contact = document.getElementById('sa-cust-contact').value;
    const email = document.getElementById('sa-cust-email').value;
    const phone = document.getElementById('sa-cust-phone').value;
    const city = document.getElementById('sa-cust-city').value;
    const plan = document.getElementById('sa-cust-plan').value;

    const res = await apiRequest('/api/customers', 'POST', {
      customer_name: name,
      business_type: type,
      contact_person: contact,
      email: email,
      phone: phone,
      city: city,
      current_plan: plan
    });

    if (res && res.success) {
      showToast(`Registered customer: ${name}`, 'success');
      closeModal('modal-sa-add-customer');
      this.loadCustomers();
    }
  }
};

