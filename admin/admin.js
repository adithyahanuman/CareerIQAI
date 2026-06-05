/**
 * CareerIQ AI — Admin Panel JavaScript
 * Firebase Integrated & Fully Aligned
 */

const AdminPanel = {
  currentTab: 'dashboard',
  domainToDelete: null,
  domains: [],
  users: [],
  usageProfiles: [],
  unsubscribers: [],

  async init() {
    // 1. Auth & Role Check
    await CareerIQAuth.authReady;
    
    const session = CareerIQAuth.Session.get();
    if (!session) {
      window.location.href = '../auth/login.html';
      return;
    }
    
    // Check if admin
    if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
      window.location.href = `../auth/access-denied.html?email=${encodeURIComponent(session.user.email)}&reason=not_admin`;
      return;
    }

    // Set user initials in header avatar
    const initials = session.user.name ? session.user.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : 'A';
    const avatarEl = document.getElementById('userAvatar');
    if (avatarEl) avatarEl.textContent = initials;

    // 2. Setup Tabs
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    this.switchTab(hash);

    document.querySelectorAll('.admin-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });

    // 3. Setup Button Event Handlers
    const setupBtn = (id, handler) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', handler);
    };

    setupBtn('logoutBtn', () => this.logout());
    setupBtn('cancelAddDomain', () => this.closeAddModal());
    setupBtn('cancelDeleteDomain', () => this.closeDeleteModal());
    setupBtn('confirmDeleteDomain', () => this.confirmDelete());
    setupBtn('refreshStatsBtn', () => this.loadUsageStats());

    // Hook up quick actions
    setupBtn('qaAddDomain', () => this.openAddModal());
    setupBtn('qaViewUsage', () => this.switchTab('usage'));
    setupBtn('qaManageDomains', () => this.switchTab('domains'));

    // Handle add domain form submit
    const form = document.getElementById('addDomainForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.addDomain();
      });
    }
    
    // Open modal buttons
    document.querySelectorAll('.btn-add').forEach(btn => {
      btn.addEventListener('click', () => this.openAddModal());
    });

    // 4. Load initial data & Setup Real-time Listeners
    this.setupListeners();
    this.setupSearch();
  },

  switchTab(tabName) {
    this.currentTab = tabName;
    window.location.hash = tabName;

    // Update nav links
    document.querySelectorAll('.admin-nav-link').forEach(link => {
      if (link.dataset.tab === tabName) {
        link.classList.add('active');
        link.setAttribute('aria-selected', 'true');
      } else {
        link.classList.remove('active');
        link.setAttribute('aria-selected', 'false');
      }
    });

    // Update panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      if (panel.id === `panel-${tabName}`) {
        panel.style.display = 'block';
        panel.classList.add('active');
      } else {
        panel.style.display = 'none';
        panel.classList.remove('active');
      }
    });
  },

  setupListeners() {
    const db = window.CareerIQAuth.db;

    // 1. Domains (Real-time listener)
    this.unsubscribers.push(
      db.collection('allowed_domains').orderBy('createdAt', 'desc').onSnapshot(snap => {
        this.domains = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        this.renderDomainTable(document.getElementById('domainSearch')?.value || '');
        this.renderStats();
      }, err => console.error('Error listening to domains:', err))
    );

    // 2. Users
    this.fetchUsersStatic();

    // 3. Usage stats (loaded on demand & on init)
    this.loadUsageStats();
  },

  async fetchUsersStatic() {
    const db = window.CareerIQAuth.db;
    try {
      const snap = await db.collection('users').get();
      let fetchedUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort in memory by lastLogin (handle missing fields safely)
      fetchedUsers.sort((a, b) => {
        let t1 = a.lastLogin ? (a.lastLogin.toMillis ? a.lastLogin.toMillis() : new Date(a.lastLogin).getTime()) : 0;
        let t2 = b.lastLogin ? (b.lastLogin.toMillis ? b.lastLogin.toMillis() : new Date(b.lastLogin).getTime()) : 0;
        return t2 - t1;
      });
      this.users = fetchedUsers;
      this.renderUsersTable(document.getElementById('userSearch')?.value || '');
      this.renderStats();
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  },

  async refreshData() {
    await this.fetchUsersStatic();
    await this.loadUsageStats();
    CareerIQAuth.Toast.show('Data refreshed', 'success');
  },

  async loadUsageStats() {
    const icon = document.getElementById('refreshStatsIcon');
    if (icon) { icon.classList.add('refreshing'); setTimeout(() => icon.classList.remove('refreshing'), 500); }

    const db = window.CareerIQAuth.db;
    try {
      const snap = await db.collection('user_profiles').get();
      this.usageProfiles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.renderUsageStats();
    } catch (err) {
      console.error('Error loading usage stats:', err);
      CareerIQAuth.Toast.show('Failed to load usage stats: ' + err.message, 'error');
    }
  },

  renderUsageStats() {
    const profiles = this.usageProfiles || [];
    const withResume   = profiles.filter(p => !!p.resumeName);
    const completed    = profiles.filter(p => !!p.onboarding_complete);

    // Find most recent upload
    let lastUploadStr = '—';
    const withDate = withResume
      .filter(p => !!p.resumeExtractedAt)
      .sort((a, b) => new Date(b.resumeExtractedAt) - new Date(a.resumeExtractedAt));
    if (withDate.length > 0) {
      lastUploadStr = this.formatDate(withDate[0].resumeExtractedAt);
    }

    // Summary cards
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('statTotalUploads',    withResume.length);
    set('statUsersWithResume', withResume.length);
    set('statProfilesComplete', completed.length);
    set('statLastUpload',      lastUploadStr);

    // Badge on tab
    const badge = document.getElementById('usageCountBadge');
    if (badge) badge.textContent = profiles.length + ' users';

    // Per-user table
    const tbody  = document.getElementById('usageTableBody');
    const table  = document.getElementById('usageTable');
    const empty  = document.getElementById('usageEmptyState');
    if (!tbody) return;

    if (profiles.length === 0) {
      tbody.innerHTML = '';
      if (table) table.style.display = 'none';
      if (empty) empty.style.display = 'flex';
      return;
    }

    if (table) table.style.display = 'table';
    if (empty) empty.style.display = 'none';

    // Sort: users with resume first, then by upload date desc
    const sorted = [...profiles].sort((a, b) => {
      if (!!b.resumeName !== !!a.resumeName) return !!b.resumeName ? 1 : -1;
      const da = a.resumeExtractedAt ? new Date(a.resumeExtractedAt).getTime() : 0;
      const db2 = b.resumeExtractedAt ? new Date(b.resumeExtractedAt).getTime() : 0;
      return db2 - da;
    });

    tbody.innerHTML = sorted.map(p => {
      const hasResume  = !!p.resumeName;
      const isComplete = !!p.onboarding_complete;
      const uploadDate = p.resumeExtractedAt ? this.formatDate(p.resumeExtractedAt) : '—';
      const resumeBadge = hasResume
        ? `<span class="status-badge status-active">✅ Uploaded</span>`
        : `<span class="status-badge" style="background:rgba(239,68,68,0.1);color:var(--red);border:1px solid rgba(239,68,68,0.2);">Not uploaded</span>`;
      const completeBadge = isComplete
        ? `<span class="status-badge status-active">Complete</span>`
        : `<span class="status-badge" style="background:rgba(255,255,255,0.05);color:var(--text-muted);">Pending</span>`;

      return `
        <tr>
          <td><div style="font-weight:600">${p.fullName || p.displayName || '—'}</div></td>
          <td style="font-size:12px;color:var(--text-muted);">${p.email || '—'}</td>
          <td>${resumeBadge}</td>
          <td style="font-size:12px;">${uploadDate}</td>
          <td>${completeBadge}</td>
        </tr>`;
    }).join('');
  },

  renderStats() {
    const domains = this.domains || [];
    const users   = this.users   || [];
    const profiles = this.usageProfiles || [];
    const withResume = profiles.filter(p => !!p.resumeName).length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('statTotalUsers',   users.length);
    set('statTotalDomains', domains.length);
    set('statBlocked',      withResume);  // repurpose blocked stat to show upload count

    // Recent activity on dashboard (show recent resume uploads)
    const list = document.getElementById('recentActivityList');
    if (list) {
      const recent = profiles
        .filter(p => p.resumeExtractedAt)
        .sort((a, b) => new Date(b.resumeExtractedAt) - new Date(a.resumeExtractedAt))
        .slice(0, 5);

      list.innerHTML = recent.map(p => `
        <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:13px;">${p.fullName || p.displayName || 'User'} — <b>Resume Uploaded</b></span>
          <span style="font-size:12px;color:var(--text-muted);">${this.formatDate(p.resumeExtractedAt)}</span>
        </div>
      `).join('') || '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:12px;">No uploads yet</div>';
    }
  },

  renderDomainTable(filter = '') {
    const tbody = document.getElementById('domainTableBody');
    if (!tbody) return;

    let domains = this.domains || [];
    const badge = document.getElementById('domainCountBadge');
    if (badge) badge.textContent = domains.length;

    if (filter) {
      const f = filter.toLowerCase();
      domains = domains.filter(d => (d.domain && d.domain.toLowerCase().includes(f)) || (d.org_name && d.org_name.toLowerCase().includes(f)));
    }

    const emptyState = document.getElementById('domainEmptyState');
    const table = document.getElementById('domainTable');
    
    if (domains.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      if (table) table.style.display = 'none';
      return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    if (table) table.style.display = 'table';

    tbody.innerHTML = domains.map(d => `
      <tr>
        <td><span class="domain-text">@${d.domain}</span></td>
        <td>${d.org_name || '-'} ${d.org_logo || ''}</td>
        <td>
          <span class="status-badge ${d.is_active ? 'status-active' : 'status-inactive'}">
            ${d.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>${this.formatDate(d.createdAt || d.created_at)}</td>
        <td>
          <div class="table-actions">
            <button class="table-action-btn" onclick="window.AdminPanel.toggleDomain('${d.id}')">
              ${d.is_active ? 'Disable' : 'Enable'}
            </button>
            <button class="table-action-btn danger" onclick="window.AdminPanel.openDeleteModal('${d.id}', '${d.domain}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  },


  renderUsersTable(filter = '') {
    const tbody = document.getElementById('userTableBody');
    const emptyState = document.getElementById('userEmptyState');
    const badge = document.getElementById('userCountBadge');
    const table = document.getElementById('userTable');
    
    if (!tbody) return;

    let users = this.users || [];
    if (badge) badge.textContent = users.length;

    if (filter) {
      const f = filter.toLowerCase();
      users = users.filter(u => (u.name && u.name.toLowerCase().includes(f)) || (u.email && u.email.toLowerCase().includes(f)));
    }

    if (users.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      if (table) table.style.display = 'none';
      return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    if (table) table.style.display = 'table';

    tbody.innerHTML = users.map(u => {
      const roleBadge = u.role === 'admin' || u.role === 'super_admin' 
        ? `<span class="status-badge status-active">Admin</span>`
        : `<span class="status-badge" style="background: rgba(255,255,255,0.1); color: var(--text-secondary);">User</span>`;
        
      const currentUser = CareerIQAuth.Session.getUser();
      const canToggle = currentUser && (currentUser.role === 'super_admin' || (currentUser.role === 'admin' && u.role !== 'super_admin' && u.id !== currentUser.uid));

      let actionHtml = '-';
      if (canToggle) {
        actionHtml = `
          <button class="table-action-btn" onclick="window.AdminPanel.toggleUserRole('${u.id}', '${u.role}')">
            ${u.role === 'admin' ? 'Demote to User' : 'Make Admin'}
          </button>
        `;
      }

      return `
        <tr>
          <td>
            <div style="font-weight:600;">${u.name || '-'}</div>
            <div style="font-size:12px;color:var(--text-muted);">${u.email}</div>
          </td>
          <td>${roleBadge}</td>
          <td><span class="domain-text">@${u.domain || '-'}</span></td>
          <td>${this.formatDate(u.lastLogin)}</td>
          <td>
            <div class="table-actions">${actionHtml}</div>
          </td>
        </tr>
      `;
    }).join('');
  },

  async toggleUserRole(uid, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await window.CareerIQAuth.db.collection('users').doc(uid).set({ role: newRole }, { merge: true });
      CareerIQAuth.Toast.show('User role updated to ' + newRole, 'success');
      
      // Update local copy immediately for responsive feedback
      const uIdx = this.users.findIndex(u => u.id === uid);
      if (uIdx !== -1) {
        this.users[uIdx].role = newRole;
        this.renderUsersTable(document.getElementById('userSearch')?.value || '');
        this.renderStats();
      }
    } catch(err) {
      CareerIQAuth.Toast.show('Failed to update role: ' + err.message, 'error');
    }
  },

  setupSearch() {
    const input = document.getElementById('domainSearch');
    if (input) input.addEventListener('input', e => this.renderDomainTable(e.target.value));

    const userSearch = document.getElementById('userSearch');
    if (userSearch) userSearch.addEventListener('input', e => this.renderUsersTable(e.target.value));
  },

  // Modals
  openAddModal() {
    const modal = document.getElementById('addDomainModal');
    if (modal) modal.classList.remove('hidden');
    const input = document.getElementById('newDomainInput');
    if (input) input.focus();
  },

  closeAddModal() {
    const modal = document.getElementById('addDomainModal');
    if (modal) modal.classList.add('hidden');
    const inputDomain = document.getElementById('newDomainInput');
    if (inputDomain) inputDomain.value = '';
    const inputOrg = document.getElementById('newOrgInput');
    if (inputOrg) inputOrg.value = '';
  },

  async addDomain() {
    const domainEl = document.getElementById('newDomainInput');
    const orgEl = document.getElementById('newOrgInput');
    const domain = domainEl ? domainEl.value.trim().toLowerCase().replace('@', '') : '';
    const org = orgEl ? orgEl.value.trim() : '';

    if (!domain) {
      CareerIQAuth.Toast.show('Domain is required', 'error');
      return;
    }
    if (!domain.includes('.')) {
      CareerIQAuth.Toast.show('Invalid domain format', 'error');
      return;
    }

    const res = await CareerIQAuth.addDomain(domain, org);
    if (res.error) {
      CareerIQAuth.Toast.show(res.error, 'error');
      return;
    }

    CareerIQAuth.Toast.show(`Added domain @${domain}`, 'success');
    this.closeAddModal();
  },

  openDeleteModal(id, domain) {
    this.domainToDelete = id;
    const disp = document.getElementById('deleteDomainDisplay');
    if (disp) disp.textContent = `@${domain}`;
    const modal = document.getElementById('deleteModal');
    if (modal) modal.classList.remove('hidden');
  },

  closeDeleteModal() {
    this.domainToDelete = null;
    const modal = document.getElementById('deleteModal');
    if (modal) modal.classList.add('hidden');
  },

  async confirmDelete() {
    if (this.domainToDelete) {
      await CareerIQAuth.removeDomain(this.domainToDelete);
      CareerIQAuth.Toast.show('Domain deleted', 'success');
      this.closeDeleteModal();
    }
  },

  async toggleDomain(id) {
    await CareerIQAuth.toggleDomain(id);
    CareerIQAuth.Toast.show('Domain status updated', 'success');
  },

  async logout() {
    await CareerIQAuth.Session.destroy();
    window.location.href = '../auth/login.html';
  },

  // Utils
  formatDate(dateObj) {
    if (!dateObj) return '-';
    let d = dateObj;
    if (d && typeof d.toDate === 'function') {
      d = d.toDate();
    } else if (typeof d === 'string' || typeof d === 'number') {
      d = new Date(d);
    }
    if (!(d instanceof Date) || isNaN(d.getTime())) return '-';
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  },

  formatUserAgent(ua) {
    if (!ua) return 'Unknown';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  }
};

window.AdminPanel = AdminPanel;

const initApp = () => {
  if (typeof window.CareerIQAuth !== 'undefined') {
    AdminPanel.init();
  }
};

if (window.CareerIQAuth) {
  initApp();
} else {
  document.addEventListener('CareerIQAuthReady', initApp);
}
