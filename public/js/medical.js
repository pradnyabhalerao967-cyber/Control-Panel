/**
 * BHALERAO MEDICAL MANAGEMENT SYSTEM — APPLICATION CONTROLLER
 */

const MedicalModule = {
  currentTab: 'dashboard',
  data: {
    patients: [],
    appointments: [],
    doctors: [],
    inventory: [],
    billing: [],
    prescriptions: [],
    suppliers: []
  },

  isFeatureAllowed(featureKey) {
    if (!AppState.medicalLicense || !AppState.medicalLicense.valid) return true;
    const features = AppState.medicalLicense.features || {};
    return features[featureKey] !== false;
  },

  setTab(tabName) {
    this.currentTab = tabName;
    const tabs = ['dashboard', 'patients', 'appointments', 'doctors', 'billing', 'prescriptions', 'inventory', 'expiry', 'suppliers', 'reports', 'settings'];
    
    tabs.forEach(t => {
      const btn = document.getElementById(`med-tab-btn-${t}`);
      const content = document.getElementById(`med-tab-${t}`);
      if (btn && content) {
        if (t === tabName) {
          btn.className = "px-3.5 py-1.5 rounded-lg text-[13px] font-medium bg-sky-500/15 border border-sky-500/35 text-sky-300 transition-colors";
          content.classList.remove('hidden');
        } else {
          btn.className = "px-3.5 py-1.5 rounded-lg text-[13px] font-medium bg-[#080c15] hover:bg-[#121c33] border border-[#1a263f] hover:border-[#273859] text-slate-300 transition-colors";
          content.classList.add('hidden');
        }
      }
    });

    this.enforceFeatureLock(tabName);

    if (tabName === 'patients') this.loadPatients();
    if (tabName === 'appointments') this.loadAppointments();
    if (tabName === 'doctors') this.loadDoctors();
    if (tabName === 'billing') this.loadBilling();
    if (tabName === 'prescriptions') this.loadPrescriptions();
    if (tabName === 'inventory') this.loadInventory();
    if (tabName === 'expiry') this.loadExpiry();
    if (tabName === 'suppliers') this.loadSuppliers();
  },

  enforceFeatureLock(tabName) {
    const lockMap = {
      'patients': 'patients',
      'appointments': 'appointments',
      'billing': 'billing',
      'prescriptions': 'prescriptions',
      'inventory': 'inventory',
      'expiry': 'inventory',
      'suppliers': 'suppliers',
      'reports': 'reports'
    };

    const featureKey = lockMap[tabName];
    if (featureKey && !this.isFeatureAllowed(featureKey)) {
      const content = document.getElementById(`med-tab-${tabName}`);
      if (content) {
        content.innerHTML = `
          <div class="locked-feature-banner rounded-2xl p-8 text-center my-6">
            <div class="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h3 class="text-[18px] font-bold text-slate-100">Medical Clinical Module Locked</h3>
            <p class="text-slate-400 text-[13px] max-w-md mx-auto mt-1">
              The <strong>${tabName.toUpperCase()}</strong> module has been disabled by the Super Admin in your centralized license agreement (Key: ${AppState.medicalLicense?.license_key || 'BM-STD-2026-002'}).
            </p>
            <div class="mt-4">
              <button onclick="switchApp('superadmin')" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-medium">
                Open Super Admin Feature Matrix
              </button>
            </div>
          </div>
        `;
      }
    }
  },

  async loadDashboard() {
    const res = await apiRequest('/api/medical/dashboard');
    if (!res || !res.success) return;

    document.getElementById('med-stat-patients').innerText = res.metrics.total_patients || 0;
    document.getElementById('med-stat-appointments').innerText = res.metrics.today_appointments || 0;
    document.getElementById('med-stat-inventory').innerText = res.metrics.total_inventory_items || 0;
    document.getElementById('med-stat-lowstock').innerText = res.metrics.low_stock_items || 0;
    document.getElementById('med-stat-sales').innerText = '₹' + (res.metrics.total_sales_revenue || 0).toLocaleString();

    // Render appointments list
    const aptList = document.getElementById('med-dashboard-appointments-list');
    if (aptList) {
      aptList.innerHTML = (res.appointments || []).map(a => `
        <div class="flex items-center justify-between py-2 border-b border-[#1a263f] last:border-b-0 text-[12px]">
          <div>
            <div class="font-medium text-slate-200">#${a.token_no} — ${a.patient_name}</div>
            <div class="text-slate-400 text-[11px]">${a.doctor_name} • ${a.reason}</div>
          </div>
          <div class="text-right">
            <span class="text-sky-400 font-mono text-[11px]">${a.time}</span>
            <div class="text-emerald-400 font-medium text-[10px]">${a.status}</div>
          </div>
        </div>
      `).join('');
    }

    // Render low stock alerts
    const lowStockContainer = document.getElementById('med-dashboard-lowstock-list');
    if (lowStockContainer) {
      lowStockContainer.innerHTML = (res.low_stock_medicines || []).map(m => `
        <div class="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 mb-2 text-[12px]">
          <div>
            <div class="font-semibold text-rose-300">${m.medicine_name}</div>
            <div class="text-slate-400 text-[11px]">Batch: ${m.batch_number} • Rack: ${m.rack}</div>
          </div>
          <div class="text-right">
            <span class="text-rose-400 font-bold">${m.stock_quantity} left</span>
            <div class="text-slate-400 text-[10px]">Min: ${m.min_alert}</div>
          </div>
        </div>
      `).join('');
    }
  },

  async loadPatients() {
    if (!this.isFeatureAllowed('patients')) return;
    const res = await apiRequest('/api/medical/patients');
    if (!res || !res.success) return;
    this.data.patients = res.patients;

    const tbody = document.getElementById('med-patients-table-body');
    if (!tbody) return;

    tbody.innerHTML = res.patients.map(p => `
      <tr class="hover:bg-[#121c32]/60 transition-colors text-[13px]">
        <td class="py-3 px-4 font-mono font-semibold text-sky-400">${p.patient_code}</td>
        <td class="py-3 px-4">
          <div class="font-medium text-slate-100">${p.full_name}</div>
          <div class="text-slate-400 text-[11px]">${p.age} yrs • ${p.gender} • Blood: ${p.blood_group}</div>
        </td>
        <td class="py-3 px-4 text-slate-300">${p.phone}</td>
        <td class="py-3 px-4 text-rose-300 font-medium text-[12px]">${p.allergies}</td>
        <td class="py-3 px-4 text-slate-300 text-[12px]">${p.chronic_conditions}</td>
        <td class="py-3 px-4 text-slate-400 text-[12px]">${p.emergency_contact}</td>
        <td class="py-3 px-4"><span class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400">${p.status}</span></td>
      </tr>
    `).join('');
  },

  async handleAddPatient(e) {
    e.preventDefault();
    const name = document.getElementById('med-pat-name').value;
    const age = document.getElementById('med-pat-age').value;
    const gender = document.getElementById('med-pat-gender').value;
    const phone = document.getElementById('med-pat-phone').value;
    const blood = document.getElementById('med-pat-blood').value;
    const allergies = document.getElementById('med-pat-allergies').value;
    const conditions = document.getElementById('med-pat-conditions').value;
    const emergency = document.getElementById('med-pat-emergency').value;

    const res = await apiRequest('/api/medical/patients', 'POST', {
      full_name: name,
      age: age,
      gender: gender,
      phone: phone,
      blood_group: blood,
      allergies: allergies,
      chronic_conditions: conditions,
      emergency_contact: emergency
    });

    if (res && res.success) {
      showToast(`Registered patient: ${name}`, 'success');
      closeModal('modal-med-add-patient');
      this.loadPatients();
      this.loadDashboard();
    }
  },

  async loadAppointments() {
    if (!this.isFeatureAllowed('appointments')) return;
    const res = await apiRequest('/api/medical/appointments');
    if (!res || !res.success) return;

    const tbody = document.getElementById('med-appointments-table-body');
    if (!tbody) return;

    tbody.innerHTML = res.appointments.map(a => `
      <tr class="hover:bg-[#121c32]/60 transition-colors text-[13px]">
        <td class="py-3 px-4 font-mono font-bold text-sky-400">#${a.token_no}</td>
        <td class="py-3 px-4 font-medium text-slate-100">${a.patient_name}</td>
        <td class="py-3 px-4 text-slate-300">${a.doctor_name}</td>
        <td class="py-3 px-4 text-slate-400 font-mono text-[12px]">${a.date} • ${a.time}</td>
        <td class="py-3 px-4 text-slate-300 text-[12px]">${a.reason}</td>
        <td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400">${a.status}</span></td>
      </tr>
    `).join('');
  },

  async handleAddAppointment(e) {
    e.preventDefault();
    const patient = document.getElementById('med-apt-patient').value;
    const doctor = document.getElementById('med-apt-doctor').value;
    const date = document.getElementById('med-apt-date').value;
    const time = document.getElementById('med-apt-time').value;
    const reason = document.getElementById('med-apt-reason').value;

    const res = await apiRequest('/api/medical/appointments', 'POST', {
      patient_name: patient,
      doctor_name: doctor,
      date: date,
      time: time,
      reason: reason
    });

    if (res && res.success) {
      showToast(`Booked appointment token #${res.appointment.token_no}`, 'success');
      closeModal('modal-med-add-appointment');
      this.loadAppointments();
      this.loadDashboard();
    }
  },

  async loadDoctors() {
    const res = await apiRequest('/api/medical/doctors');
    if (!res || !res.success) return;

    const container = document.getElementById('med-doctors-container');
    if (!container) return;

    container.innerHTML = res.doctors.map(d => `
      <div class="bg-[#0d1526] border border-[#1a263f] rounded-xl p-5 shadow-sm">
        <div class="flex items-center justify-between pb-3 border-b border-[#1a263f]">
          <h3 class="text-[16px] font-bold text-slate-100">${d.doctor_name}</h3>
          <span class="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400">${d.status}</span>
        </div>
        <div class="mt-3 space-y-1.5 text-[12px] text-slate-300">
          <div class="text-sky-400 font-semibold">${d.specialty}</div>
          <div class="text-slate-400 text-[11px]">${d.qualification}</div>
          <div>Consultation Fee: <strong>₹${d.consultation_fee}</strong></div>
          <div class="text-slate-400 font-mono">${d.phone}</div>
        </div>
      </div>
    `).join('');
  },

  async loadInventory() {
    if (!this.isFeatureAllowed('inventory')) return;
    const res = await apiRequest('/api/medical/inventory');
    if (!res || !res.success) return;
    this.data.inventory = res.inventory;

    const tbody = document.getElementById('med-inventory-table-body');
    if (!tbody) return;

    tbody.innerHTML = res.inventory.map(m => {
      const isLow = m.stock_quantity <= m.min_alert;
      return `
        <tr class="hover:bg-[#121c32]/60 transition-colors text-[13px]">
          <td class="py-3 px-4">
            <div class="font-medium text-slate-100">${m.medicine_name}</div>
            <div class="text-[11px] text-slate-400">Rack: ${m.rack}</div>
          </td>
          <td class="py-3 px-4 text-slate-300"><span class="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300">${m.category}</span></td>
          <td class="py-3 px-4 font-mono text-slate-400 text-[12px]">${m.batch_number}</td>
          <td class="py-3 px-4 font-mono font-bold ${isLow ? 'text-rose-400' : 'text-emerald-400'}">
            ${m.stock_quantity}
            ${isLow ? '<span class="text-[10px] block text-rose-400 font-normal">Low Stock</span>' : ''}
          </td>
          <td class="py-3 px-4 font-mono text-slate-300">₹${m.mrp.toFixed(2)}</td>
          <td class="py-3 px-4 font-mono text-slate-300 text-[12px]">${m.expiry_date}</td>
        </tr>
      `;
    }).join('');
  },

  async handleAddMedicine(e) {
    e.preventDefault();
    const name = document.getElementById('med-inv-name').value;
    const category = document.getElementById('med-inv-cat').value;
    const batch = document.getElementById('med-inv-batch').value;
    const qty = document.getElementById('med-inv-qty').value;
    const minAlert = document.getElementById('med-inv-minalert').value;
    const purchase = document.getElementById('med-inv-purchase').value;
    const mrp = document.getElementById('med-inv-mrp').value;
    const expiry = document.getElementById('med-inv-expiry').value;
    const rack = document.getElementById('med-inv-rack').value;

    const res = await apiRequest('/api/medical/inventory', 'POST', {
      medicine_name: name,
      category: category,
      batch_number: batch,
      stock_quantity: qty,
      min_alert: minAlert,
      purchase_price: purchase,
      mrp: mrp,
      expiry_date: expiry,
      rack: rack
    });

    if (res && res.success) {
      showToast(`Added medicine stock: ${name}`, 'success');
      closeModal('modal-med-add-medicine');
      this.loadInventory();
      this.loadDashboard();
    }
  },

  async loadExpiry() {
    if (!this.isFeatureAllowed('inventory')) return;
    const res = await apiRequest('/api/medical/inventory');
    if (!res || !res.success) return;

    const container = document.getElementById('med-expiry-container');
    if (!container) return;

    const today = new Date();
    container.innerHTML = res.inventory.map(m => {
      const exp = new Date(m.expiry_date);
      const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
      const isCritical = diffDays <= 30;

      return `
        <div class="bg-[#0d1526] border ${isCritical ? 'border-amber-500/40' : 'border-[#1a263f]'} rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div class="font-bold text-slate-100">${m.medicine_name}</div>
            <div class="text-[11px] text-slate-400 font-mono mt-0.5">Batch: ${m.batch_number} • Stock: ${m.stock_quantity} units</div>
          </div>
          <div class="text-right">
            <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold ${isCritical ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}">
              ${diffDays > 0 ? `${diffDays} Days Left` : 'EXPIRED'}
            </span>
            <div class="text-[11px] text-slate-500 mt-1 font-mono">${m.expiry_date}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  async loadBilling() {
    if (!this.isFeatureAllowed('billing')) return;
    const res = await apiRequest('/api/medical/billing');
    if (!res || !res.success) return;

    const tbody = document.getElementById('med-billing-table-body');
    if (!tbody) return;

    tbody.innerHTML = res.billing.map(b => `
      <tr class="hover:bg-[#121c32]/60 transition-colors text-[13px]">
        <td class="py-3 px-4 font-mono font-semibold text-emerald-400">${b.invoice_no}</td>
        <td class="py-3 px-4 font-medium text-slate-100">${b.patient_name}</td>
        <td class="py-3 px-4 font-mono font-bold text-slate-100">₹${b.grand_total.toLocaleString()}</td>
        <td class="py-3 px-4 text-slate-400 font-mono text-[11px]">GST: ₹${b.gst}</td>
        <td class="py-3 px-4 text-slate-300 text-[12px]">${b.date}</td>
        <td class="py-3 px-4 text-slate-300">${b.payment_mode}</td>
        <td class="py-3 px-4"><span class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400">${b.status}</span></td>
      </tr>
    `).join('');
  },

  async handleAddInvoice(e) {
    e.preventDefault();
    const patient = document.getElementById('med-bill-patient').value;
    const subtotal = parseFloat(document.getElementById('med-bill-subtotal').value) || 1000;
    const gstRate = 0.12;
    const gst = Math.round(subtotal * gstRate);
    const total = subtotal + gst;
    const mode = document.getElementById('med-bill-mode').value;

    const res = await apiRequest('/api/medical/billing', 'POST', {
      patient_name: patient,
      subtotal: subtotal,
      gst: gst,
      grand_total: total,
      payment_mode: mode,
      items: [
        { name: "Consultation / Pharmacy Prescription Dispensation", qty: 1, rate: subtotal }
      ]
    });

    if (res && res.success) {
      showToast(`Generated GST invoice ${res.invoice.invoice_no} (₹${total})`, 'success');
      closeModal('modal-med-add-invoice');
      this.loadBilling();
      this.loadDashboard();
    }
  },

  async loadPrescriptions() {
    if (!this.isFeatureAllowed('prescriptions')) return;
    const res = await apiRequest('/api/medical/prescriptions');
    if (!res || !res.success) return;

    const container = document.getElementById('med-prescriptions-container');
    if (!container) return;

    container.innerHTML = res.prescriptions.map(rx => `
      <div class="bg-[#0d1526] border border-[#1a263f] rounded-xl p-5 shadow-sm mb-4">
        <div class="flex items-center justify-between pb-3 border-b border-[#1a263f]">
          <div>
            <span class="font-mono font-bold text-sky-400 text-[14px]">${rx.rx_number}</span>
            <h4 class="text-[16px] font-semibold text-slate-100 mt-0.5">${rx.patient_name}</h4>
          </div>
          <div class="text-right text-[12px] text-slate-400">
            <div>${rx.doctor_name}</div>
            <div class="text-[11px] font-mono">${rx.date}</div>
          </div>
        </div>
        <div class="mt-3">
          <div class="text-[12px] font-medium text-amber-300">Diagnosis: ${rx.diagnosis}</div>
          <div class="mt-2.5 p-3 rounded-lg bg-[#080c15] border border-[#1a263f] text-[12px] space-y-1 text-slate-200">
            <div class="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Prescribed Medicines & Dosages:</div>
            ${rx.medicines.map(m => `<div class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span><span>${m}</span></div>`).join('')}
          </div>
          <div class="text-[11px] text-slate-400 italic mt-2">Notes: ${rx.clinical_notes}</div>
        </div>
      </div>
    `).join('');
  },

  async loadSuppliers() {
    if (!this.isFeatureAllowed('suppliers')) return;
    const res = await apiRequest('/api/medical/suppliers');
    if (!res || !res.success) return;

    const container = document.getElementById('med-suppliers-container');
    if (!container) return;

    container.innerHTML = res.suppliers.map(s => `
      <div class="bg-[#0d1526] border border-[#1a263f] rounded-xl p-5 shadow-sm">
        <h4 class="text-[16px] font-bold text-slate-100">${s.supplier_name}</h4>
        <div class="mt-2 space-y-1 text-[12px] text-slate-300">
          <div>DL Number: <span class="font-mono text-emerald-400">${s.dl_number}</span></div>
          <div>GSTIN: <span class="font-mono text-sky-400">${s.gstin}</span></div>
          <div>Location: ${s.city}</div>
          <div>Payment Terms: <span class="font-semibold text-slate-200">${s.terms}</span></div>
          <div class="text-slate-400">${s.phone} • ${s.email}</div>
        </div>
      </div>
    `).join('');
  }
};

