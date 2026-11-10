/**
 * RED APPLE GYM MANAGEMENT SYSTEM — APPLICATION CONTROLLER
 */

const GymModule = {
  currentTab: 'dashboard',
  data: {
    members: [],
    attendance: [],
    trainers: [],
    payments: [],
    expenses: [],
    workouts: [],
    diets: []
  },

  isFeatureAllowed(featureKey) {
    if (!AppState.gymLicense || !AppState.gymLicense.valid) return true; // fallback
    const features = AppState.gymLicense.features || {};
    return features[featureKey] !== false;
  },

  setTab(tabName) {
    this.currentTab = tabName;
    const tabs = ['dashboard', 'members', 'attendance', 'trainers', 'fees', 'workouts', 'diet', 'expenses', 'analytics', 'settings'];
    
    tabs.forEach(t => {
      const btn = document.getElementById(`gym-tab-btn-${t}`);
      const content = document.getElementById(`gym-tab-${t}`);
      if (btn && content) {
        if (t === tabName) {
          btn.className = "px-3.5 py-1.5 rounded-lg text-[13px] font-medium bg-red-500/15 border border-red-500/35 text-red-300 transition-colors";
          content.classList.remove('hidden');
        } else {
          btn.className = "px-3.5 py-1.5 rounded-lg text-[13px] font-medium bg-[#080c15] hover:bg-[#121c33] border border-[#1a263f] hover:border-[#273859] text-slate-300 transition-colors";
          content.classList.add('hidden');
        }
      }
    });

    // Check feature permission lock
    this.enforceFeatureLock(tabName);

    if (tabName === 'members') this.loadMembers();
    if (tabName === 'attendance') this.loadAttendance();
    if (tabName === 'trainers') this.loadTrainers();
    if (tabName === 'fees') this.loadFees();
    if (tabName === 'workouts') this.loadWorkouts();
    if (tabName === 'diet') this.loadDiet();
    if (tabName === 'expenses') this.loadExpenses();
    if (tabName === 'analytics') this.loadAnalytics();
  },

  enforceFeatureLock(tabName) {
    const lockMap = {
      'members': 'members',
      'attendance': 'attendance',
      'trainers': 'trainers',
      'fees': 'fees',
      'workouts': 'workouts',
      'diet': 'diet',
      'expenses': 'reports',
      'analytics': 'analytics'
    };

    const featureKey = lockMap[tabName];
    if (featureKey && !this.isFeatureAllowed(featureKey)) {
      const content = document.getElementById(`gym-tab-${tabName}`);
      if (content) {
        content.innerHTML = `
          <div class="locked-feature-banner rounded-2xl p-8 text-center my-6">
            <div class="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h3 class="text-[18px] font-bold text-slate-100">Module Access Restricted</h3>
            <p class="text-slate-400 text-[13px] max-w-md mx-auto mt-1">
              The <strong>${tabName.toUpperCase()}</strong> module has been disabled by the Super Admin in your subscription license policy (Key: ${AppState.gymLicense?.license_key || 'RAG-PRO-2026-001'}).
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
    const res = await apiRequest('/api/gym/dashboard');
    if (!res || !res.success) return;

    document.getElementById('gym-stat-members').innerText = res.metrics.total_members || 0;
    document.getElementById('gym-stat-active').innerText = res.metrics.active_members || 0;
    document.getElementById('gym-stat-attendance').innerText = res.metrics.today_attendance || 0;
    document.getElementById('gym-stat-revenue').innerText = '₹' + (res.metrics.monthly_revenue || 0).toLocaleString();
    document.getElementById('gym-stat-pending').innerText = '₹' + (res.metrics.pending_fees || 0).toLocaleString();

    // Today's attendance list preview
    const attList = document.getElementById('gym-dashboard-attendance-list');
    if (attList) {
      attList.innerHTML = (res.attendance_today || []).map(a => `
        <div class="flex items-center justify-between py-2 border-b border-[#1a263f] last:border-b-0 text-[12px]">
          <div>
            <div class="font-medium text-slate-200">${a.name}</div>
            <div class="text-slate-400 text-[11px] font-mono">${a.member_code} • ${a.method}</div>
          </div>
          <div class="text-right">
            <span class="text-emerald-400 font-mono text-[11px]">${a.check_in}</span>
            <div class="text-slate-500 text-[10px]">${a.check_out}</div>
          </div>
        </div>
      `).join('');
    }
  },

  async loadMembers() {
    if (!this.isFeatureAllowed('members')) return;
    const res = await apiRequest('/api/gym/members');
    if (!res || !res.success) return;
    this.data.members = res.members;

    const tbody = document.getElementById('gym-members-table-body');
    if (!tbody) return;

    tbody.innerHTML = res.members.map(m => {
      const statusClass = m.status === 'ACTIVE' 
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
        : m.status === 'EXPIRING'
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
        : 'bg-rose-500/10 text-rose-400 border-rose-500/25';

      return `
        <tr class="hover:bg-[#121c32]/60 transition-colors text-[13px]">
          <td class="py-3 px-4 font-mono font-semibold text-slate-300">${m.member_code}</td>
          <td class="py-3 px-4">
            <div class="font-medium text-slate-100">${m.full_name}</div>
            <div class="text-[11px] text-slate-400">${m.phone} • Blood: ${m.blood_group}</div>
          </td>
          <td class="py-3 px-4 text-slate-300">${m.membership_type}</td>
          <td class="py-3 px-4 text-slate-400 text-[12px]">${m.assigned_trainer}</td>
          <td class="py-3 px-4 text-slate-300 text-[12px]">${m.end_date}</td>
          <td class="py-3 px-4 font-mono ${m.pending_fee > 0 ? 'text-amber-400 font-semibold' : 'text-emerald-400'}">
            ₹${m.paid_fee.toLocaleString()} 
            ${m.pending_fee > 0 ? `<span class="text-rose-400 text-[11px] block">Pending: ₹${m.pending_fee}</span>` : ''}
          </td>
          <td class="py-3 px-4"><span class="px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusClass}">${m.status}</span></td>
          <td class="py-3 px-4 text-right">
            <button onclick="GymModule.deleteMember('${m.id}')" data-tooltip="Delete" class="w-7 h-7 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 inline-flex items-center justify-center">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  async handleAddMember(e) {
    e.preventDefault();
    const name = document.getElementById('gym-mem-name').value;
    const phone = document.getElementById('gym-mem-phone').value;
    const email = document.getElementById('gym-mem-email').value;
    const gender = document.getElementById('gym-mem-gender').value;
    const blood = document.getElementById('gym-mem-blood').value;
    const plan = document.getElementById('gym-mem-plan').value;
    const trainer = document.getElementById('gym-mem-trainer').value;
    const totalFee = document.getElementById('gym-mem-totalfee').value;
    const paidFee = document.getElementById('gym-mem-paidfee').value;

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 12);

    const res = await apiRequest('/api/gym/members', 'POST', {
      full_name: name,
      phone: phone,
      email: email,
      gender: gender,
      blood_group: blood,
      membership_type: plan,
      assigned_trainer: trainer,
      total_fee: totalFee,
      paid_fee: paidFee,
      end_date: endDate.toISOString().slice(0, 10)
    });

    if (res && res.success) {
      showToast(`Registered member: ${name}`, 'success');
      closeModal('modal-gym-add-member');
      this.loadMembers();
      this.loadDashboard();
    }
  },

  async deleteMember(id) {
    if (!confirm('Are you sure you want to remove this member?')) return;
    const res = await apiRequest(`/api/gym/members/${id}`, 'DELETE');
    if (res && res.success) {
      showToast('Member removed', 'info');
      this.loadMembers();
      this.loadDashboard();
    }
  },

  async loadAttendance() {
    if (!this.isFeatureAllowed('attendance')) return;
    const res = await apiRequest('/api/gym/attendance');
    if (!res || !res.success) return;

    const tbody = document.getElementById('gym-attendance-table-body');
    if (!tbody) return;

    tbody.innerHTML = res.attendance.map(a => `
      <tr class="hover:bg-[#121c32]/60 transition-colors text-[13px]">
        <td class="py-3 px-4 font-mono text-emerald-400 font-semibold">${a.member_code}</td>
        <td class="py-3 px-4 font-medium text-slate-100">${a.name}</td>
        <td class="py-3 px-4 font-mono text-slate-300">${a.check_in}</td>
        <td class="py-3 px-4 text-slate-400">${a.check_out}</td>
        <td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 font-mono">${a.method}</span></td>
      </tr>
    `).join('');
  },

  async recordAttendance() {
    const code = prompt('Enter Member Code to Check-In (e.g. RAG-M-0101):', 'RAG-M-0101');
    if (!code) return;

    const member = (this.data.members || []).find(m => m.member_code === code);
    const memberName = member ? member.full_name : 'Walk-in Athlete';

    const res = await apiRequest('/api/gym/attendance', 'POST', {
      member_code: code,
      name: memberName,
      method: 'Biometric Scan'
    });

    if (res && res.success) {
      showToast(`Check-in recorded for ${memberName}`, 'success');
      this.loadAttendance();
      this.loadDashboard();
    }
  },

  async loadTrainers() {
    if (!this.isFeatureAllowed('trainers')) return;
    const res = await apiRequest('/api/gym/trainers');
    if (!res || !res.success) return;

    const container = document.getElementById('gym-trainers-container');
    if (!container) return;

    container.innerHTML = res.trainers.map(t => `
      <div class="bg-[#0d1526] border border-[#1a263f] rounded-xl p-5 shadow-sm">
        <div class="flex items-center justify-between pb-3 border-b border-[#1a263f]">
          <h3 class="text-[16px] font-bold text-slate-100">${t.trainer_name}</h3>
          <span class="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400">${t.status}</span>
        </div>
        <div class="mt-3 space-y-1.5 text-[12px] text-slate-300">
          <div class="text-red-400 font-semibold">${t.specialty}</div>
          <div>Active Trainees: <strong>${t.active_clients} members</strong></div>
          <div>Salary: <strong>₹${t.monthly_salary.toLocaleString()} / mo</strong></div>
          <div class="text-slate-400 font-mono">${t.phone}</div>
        </div>
      </div>
    `).join('');
  },

  async loadFees() {
    if (!this.isFeatureAllowed('fees')) return;
    const res = await apiRequest('/api/gym/payments');
    if (!res || !res.success) return;

    const tbody = document.getElementById('gym-fees-table-body');
    if (!tbody) return;

    tbody.innerHTML = res.payments.map(p => `
      <tr class="hover:bg-[#121c32]/60 transition-colors text-[13px]">
        <td class="py-3 px-4 font-mono font-semibold text-emerald-400">${p.receipt_no}</td>
        <td class="py-3 px-4 font-medium text-slate-100">${p.member_name}</td>
        <td class="py-3 px-4 font-bold text-slate-100">₹${p.amount.toLocaleString()}</td>
        <td class="py-3 px-4 text-slate-400 text-[12px]">${p.date}</td>
        <td class="py-3 px-4 text-slate-300">${p.mode}</td>
        <td class="py-3 px-4"><span class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400">${p.status}</span></td>
      </tr>
    `).join('');
  },

  async loadWorkouts() {
    if (!this.isFeatureAllowed('workouts')) return;
    const res = await apiRequest('/api/gym/workouts');
    if (!res || !res.success) return;

    const container = document.getElementById('gym-workouts-container');
    if (!container) return;

    container.innerHTML = res.workouts.map(w => `
      <div class="bg-[#0d1526] border border-[#1a263f] rounded-xl p-5 shadow-sm">
        <div class="flex items-center justify-between pb-2">
          <h4 class="text-[16px] font-bold text-slate-100">${w.title}</h4>
          <span class="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300">${w.level}</span>
        </div>
        <p class="text-[12px] text-slate-400 mt-2">${w.summary}</p>
        <div class="mt-3 text-[11px] text-emerald-400 font-semibold font-mono">Schedule: ${w.days_per_week} Days/Week Routine</div>
      </div>
    `).join('');
  },

  async loadDiet() {
    if (!this.isFeatureAllowed('diet')) return;
    const res = await apiRequest('/api/gym/diets');
    if (!res || !res.success) return;

    const container = document.getElementById('gym-diets-container');
    if (!container) return;

    container.innerHTML = res.diets.map(d => `
      <div class="bg-[#0d1526] border border-[#1a263f] rounded-xl p-5 shadow-sm">
        <div class="flex items-center justify-between pb-2">
          <h4 class="text-[16px] font-bold text-slate-100">${d.title}</h4>
          <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/15 text-red-300">${d.goal}</span>
        </div>
        <div class="text-[20px] font-extrabold text-slate-100 mt-2">${d.calories} <span class="text-[12px] text-slate-400 font-normal">kcal / day</span></div>
        <div class="text-[11px] font-mono text-emerald-400 mt-1">${d.macros}</div>
        <div class="mt-3 p-3 rounded-lg bg-[#080c15] border border-[#1a263f] text-[11px] text-slate-300 leading-relaxed">
          ${d.schedule}
        </div>
      </div>
    `).join('');
  },

  async loadExpenses() {
    if (!this.isFeatureAllowed('reports')) return;
    const res = await apiRequest('/api/gym/expenses');
    if (!res || !res.success) return;

    const tbody = document.getElementById('gym-expenses-table-body');
    if (!tbody) return;

    tbody.innerHTML = res.expenses.map(e => `
      <tr class="hover:bg-[#121c32]/60 transition-colors text-[13px]">
        <td class="py-3 px-4 font-medium text-slate-100">${e.title}</td>
        <td class="py-3 px-4 text-slate-300"><span class="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300">${e.category}</span></td>
        <td class="py-3 px-4 font-bold text-rose-400">₹${e.amount.toLocaleString()}</td>
        <td class="py-3 px-4 text-slate-400 text-[12px]">${e.date}</td>
        <td class="py-3 px-4 text-slate-300">${e.approved_by}</td>
      </tr>
    `).join('');
  },

  async loadAnalytics() {
    if (!this.isFeatureAllowed('analytics')) return;
    // Analytics view loaded
  }
};

