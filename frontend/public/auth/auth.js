// ============================================================
// CareerIQ AI — auth.js  (Firebase Compat SDK, no modules)
// ============================================================

(function () {
  // Firebase config
  const firebaseConfig = {
    apiKey: "AIzaSyBf2yI-zylLxYVW1TrhSBMeT1Cf2drqvzg",
    authDomain: "career-iq-ai.firebaseapp.com",
    projectId: "career-iq-ai",
    storageBucket: "career-iq-ai.firebasestorage.app",
    messagingSenderId: "554829620784",
    appId: "1:554829620784:web:787e5918ff3f149334aff5",
    measurementId: "G-1SD3X3J1NC"
  };

  // Avoid double-init
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  const isAdminEmail = (email) => {
    if (!email) return false;
    return email.toLowerCase().trim() === 'admin.careeriqai@gmail.com';
  };

  // ---- Storage (localStorage helpers) ----
  const Storage = {
    get: (k) => { try { return JSON.parse(localStorage.getItem('careeriq_' + k)); } catch { return null; } },
    set: (k, v) => localStorage.setItem('careeriq_' + k, JSON.stringify(v)),
    remove: (k) => localStorage.removeItem('careeriq_' + k)
  };

  // ---- Session state ----
  let currentSession = Storage.get('session');
  let _authResolved = false;
  let _authResolve;
  const authReady = new Promise(res => { _authResolve = res; });

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const email = user.email || '';
      const domain = email.includes('@') ? email.split('@')[1] : null;
      let role = isAdminEmail(email) ? 'admin' : 'user';
      let displayName = '';
      let name = '';
      try {
        const snap = await db.collection('users').doc(user.uid).get();
        if (snap.exists) {
          if (snap.data().role) role = snap.data().role;
          if (snap.data().name) name = snap.data().name;
          if (snap.data().displayName) displayName = snap.data().displayName;
        }
      } catch (e) { }
      if (isAdminEmail(email)) {
        role = 'admin';
      }
      currentSession = {
        user: {
          id: user.uid, uid: user.uid,
          email: user.email,
          name: name,
          displayName: displayName,
          picture: user.photoURL,
          domain, role,
          verified: user.emailVerified
        }
      };
      Storage.set('session', currentSession);
    } else {
      currentSession = null;
      Storage.remove('session');
    }
    if (!_authResolved) { _authResolved = true; _authResolve(currentSession); }
  });

  // ---- Path helper ----
  const getBaseUrl = () => {
    let href = window.location.href.split('?')[0].split('#')[0];
    href = href.replace(/\/auth\/.*$/, '').replace(/\/onboarding\/.*$/, '').replace(/\/admin\/.*$/, '');
    if (href.endsWith('.html')) {
      href = href.substring(0, href.lastIndexOf('/'));
    }
    return href.replace(/\/$/, '');
  };

  // ---- Domain Management ----
  const FALLBACK_DOMAINS = [
    { id: '1', domain: 'vit.ac.in', is_active: true, org_name: 'Vellore Institute of Technology', org_logo: '🏛️' },
    { id: '2', domain: 'vitstudent.ac.in', is_active: true, org_name: 'VIT Student Portal', org_logo: '🎓' },
    { id: '3', domain: 'vitapstudent.ac.in', is_active: true, org_name: 'VIT-AP Student Portal', org_logo: '🎓' }
  ];

  const getDomains = async () => {
    try {
      const snap = await db.collection('allowed_domains').orderBy('createdAt', 'desc').get();
      if (snap.empty) return FALLBACK_DOMAINS;
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('getDomains fallback:', e.message);
      return FALLBACK_DOMAINS;
    }
  };

  const addDomain = async (domain, orgName = '') => {
    try {
      const existing = await db.collection('allowed_domains').where('domain', '==', domain).get();
      if (!existing.empty) return { error: 'Domain already exists' };
      const ref = await db.collection('allowed_domains').add({
        domain, org_name: orgName, org_logo: '🏢',
        is_active: true, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      // (audit log disabled)
      return { data: { id: ref.id, domain, org_name: orgName, is_active: true } };
    } catch (e) { return { error: e.message }; }
  };

  const toggleDomain = async (id) => {
    try {
      const ref = db.collection('allowed_domains').doc(id);
      const snap = await ref.get();
      if (!snap.exists) return;
      await ref.update({ is_active: !snap.data().is_active });
    } catch (e) { console.error(e); }
  };

  const removeDomain = async (id) => {
    try { await db.collection('allowed_domains').doc(id).delete(); } catch (e) { console.error(e); }
  };

  const validateDomain = async (email) => {
    if (!email || !email.includes('@')) return { allowed: false, reason: 'Invalid email' };
    if (isAdminEmail(email)) {
      return { allowed: true, domain: { domain: 'gmail.com', org_name: 'CareerIQ AI Admin', org_logo: '👑' } };
    }
    const domain = email.split('@')[1].toLowerCase();
    try {
      const domains = await getDomains();
      const match = domains.find(d => d.domain.toLowerCase() === domain && d.is_active);
      if (match) return { allowed: true, domain: match };
      return { allowed: false, reason: 'unauthorized_domain', email, domain };
    } catch (e) {
      return { allowed: false, reason: 'validation_error', error: e };
    }
  };

  const getOrgBranding = async (email) => {
    const res = await validateDomain(email);
    if (!res.domain) return null;
    return { name: res.domain.org_name, logo: res.domain.org_logo, domain: res.domain.domain };
  };

  // ---- Audit Log (disabled — no longer stored in Firestore) ----
  const AuditLog = {
    add: async () => {}, // no-op
  };

  // ---- Session ----
  const Session = {
    get: () => currentSession,
    getUser: () => currentSession ? currentSession.user : null,
    isValid: () => !!currentSession,
    destroy: async () => {
      await auth.signOut();
      currentSession = null;
      Storage.remove('session');
    }
  };

  const showMockGoogleModal = (context) => {
    const modal = document.getElementById('googleMockModal');
    const input = document.getElementById('googleMockEmail');
    const cancel = document.getElementById('googleMockCancel');
    const confirm = document.getElementById('googleMockConfirm');
    
    if (!modal) return;
    modal.classList.remove('hidden');
    if (input) input.focus();
    
    const close = () => {
      modal.classList.add('hidden');
      if (input) input.value = '';
    };
    
    if (cancel) {
      cancel.onclick = close;
    }
    
    if (confirm) {
      confirm.onclick = async () => {
        const email = input.value.trim().toLowerCase();
        if (!email) {
          Toast.show('Email is required', 'error');
          return;
        }
        
        close();
        
        const validation = await validateDomain(email);
        if (!validation.allowed) {
          window.location.href = getBaseUrl() + '/auth/access-denied.html?email=' + encodeURIComponent(email);
          return;
        }
        
        Toast.show('Simulating Google Sign-In...', 'info');
        
        let uid = 'mock_google_user_' + btoa(email).substring(0, 10);
        let name = email.split('@')[0];
        let displayName = name;
        let role = isAdminEmail(email) ? 'admin' : 'user';
        
        try {
          const snap = await db.collection('users').doc(uid).get();
          const existing = snap.exists ? snap.data() : null;
          const userDoc = {
            email,
            domain: validation.domain.domain, org: validation.domain.org_name,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
          };
          if (existing) {
            name = existing.name || name;
            displayName = existing.displayName || displayName;
            role = existing.role || role;
          } else {
            userDoc.name = name;
            userDoc.displayName = displayName;
          }
          if (isAdminEmail(email)) {
            userDoc.role = 'admin';
            role = 'admin';
          }
          await db.collection('users').doc(uid).set(userDoc, { merge: true });
        } catch(e) {}
        
        currentSession = {
          user: {
            id: uid, uid: uid,
            email, name, displayName,
            picture: null,
            domain: validation.domain.domain,
            role,
            verified: true
          }
        };
        Storage.set('session', currentSession);
        if (!_authResolved) { _authResolved = true; _authResolve(currentSession); }
        
        const redirectRole = currentSession.user.role;
        if (redirectRole === 'admin' || redirectRole === 'super_admin') {
          smoothRedirect(getBaseUrl() + '/admin/index.html', 'Welcome Admin! Loading dashboard…');
        } else {
          try {
            const profileSnap = await db.collection('user_profiles').doc(uid).get();
            const hasCompleted = profileSnap.exists && profileSnap.data().onboarding_complete;
            const dest = getBaseUrl() + '/' + (hasCompleted ? 'dashboard/index.html' : 'onboarding/index.html');
            const msg = hasCompleted ? 'Welcome back! Loading dashboard…' : 'Setting up your profile…';
            smoothRedirect(dest, msg);
          } catch(err) {
            smoothRedirect(getBaseUrl() + '/dashboard/index.html', 'Loading your dashboard…');
          }
        }
      };
    }
  };

  // ---- Google Auth ----
  const handleGoogleAuth = async (context = 'login') => {
    // If running locally via file:/// protocol, fall back to mock modal to allow testing
    if (window.location.protocol === 'file:') {
      showMockGoogleModal(context);
      return;
    }

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await auth.signInWithPopup(provider);
      const email = result.user.email.toLowerCase();
      const uid = result.user.uid;

      const validation = await validateDomain(email);
      if (!validation.allowed) {
        await auth.signOut();
        window.location.href = getBaseUrl() + '/auth/access-denied.html?email=' + encodeURIComponent(email);
        return;
      }

      // (audit log disabled)
      try {
        const snap = await db.collection('users').doc(uid).get();
        const existing = snap.exists ? snap.data() : null;
        const userDoc = {
          email,
          domain: validation.domain.domain, org: validation.domain.org_name,
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        };
        // Do not auto-populate name and displayName for Google Auth
        // Users will be prompted to fill this during onboarding
        if (isAdminEmail(email)) {
          userDoc.role = 'admin';
        }
        await db.collection('users').doc(uid).set(userDoc, { merge: true });
      } catch (e) { }

      // Check onboarding
      try {
        let role = 'user';
        if (isAdminEmail(email)) {
          role = 'admin';
        } else {
          try {
            const userSnap = await db.collection('users').doc(uid).get();
            if (userSnap.exists && userSnap.data().role) role = userSnap.data().role;
          } catch(e) {}
        }
        if (role === 'admin' || role === 'super_admin') {
          smoothRedirect(getBaseUrl() + '/admin/index.html', 'Welcome Admin! Loading dashboard…');
          return;
        }

        const profileSnap = await db.collection('user_profiles').doc(uid).get();
        const hasCompleted = profileSnap.exists && profileSnap.data().onboarding_complete;
        const dest = getBaseUrl() + '/' + (hasCompleted ? 'dashboard/index.html' : 'onboarding/index.html');
        const msg = hasCompleted ? 'Welcome back! Loading dashboard…' : 'Setting up your profile…';
        smoothRedirect(dest, msg);
      } catch (e) {
        smoothRedirect(getBaseUrl() + '/dashboard/index.html', 'Loading your dashboard…');
      }
    } catch (err) {
      if (err.code === 'auth/operation-not-supported-in-this-environment') {
        showMockGoogleModal(context);
      } else if (err.code !== 'auth/popup-closed-by-user') {
        throw err;
      }
    }
  };

  // ---- Email Auth ----
  const handleEmailAuth = async (email, password, isSignup = false, name = '', phone = '', displayName = '') => {
    const validation = await validateDomain(email);
    if (!validation.allowed) {
      window.location.href = getBaseUrl() + '/auth/access-denied.html?email=' + encodeURIComponent(email);
      return { ok: false };
    }

    let cred;
    if (isSignup) {
      cred = await auth.createUserWithEmailAndPassword(email, password);
      
      const targetDisplayName = displayName || (isAdminEmail(email) ? 'Admin' : '') || name || email.split('@')[0];
      try {
        await cred.user.updateProfile({ displayName: targetDisplayName });
      } catch(e) {}

      if (!isAdminEmail(email)) {
        const baseUrl = getBaseUrl();
        if (baseUrl.startsWith('http')) {
          const actionCodeSettings = {
            url: baseUrl + '/auth/verify-email.html',
            handleCodeInApp: false
          };
          await cred.user.sendEmailVerification(actionCodeSettings);
        } else {
          await cred.user.sendEmailVerification();
        }
      }
    } else {
      try {
        cred = await auth.signInWithEmailAndPassword(email, password);
      } catch (err) {
        // Re-throw – admin account must be created via Firebase Console
        throw err;
      }
    }

    // (audit log disabled)
    try {
      const userData = {
        email,
        domain: validation.domain.domain,
        org: validation.domain.org_name,
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (isAdminEmail(email)) {
        userData.role = 'admin';
      }
      
      if (isSignup) {
        if (name) {
          userData.name = name;
        }
        if (displayName || name) {
          userData.displayName = displayName || name;
        }
        if (phone) userData.phone = phone;
      }

      await db.collection('users').doc(cred.user.uid).set(userData, { merge: true });
    } catch (e) { }
    
    let role = 'user';
    if (isAdminEmail(email)) {
      role = 'admin';
    } else {
      try {
        const userSnap = await db.collection('users').doc(cred.user.uid).get();
        if (userSnap.exists && userSnap.data().role) role = userSnap.data().role;
      } catch (e) { }
    }
    return { ok: true, role };
  };

  // ---- RBAC ----
  const RBAC = {
    PERMISSIONS: {
      'admin:domains': ['super_admin', 'admin'],
      'admin:users': ['super_admin'],
      'admin:audit_logs': ['super_admin', 'admin'],
      'dashboard': ['super_admin', 'admin', 'user']
    },
    can: (user, perm) => {
      if (!user) return false;
      return (RBAC.PERMISSIONS[perm] || []).includes(user.role || 'user');
    },
    isAdmin: (user) => user && ['super_admin', 'admin'].includes(user.role)
  };

  const ProtectedRoute = {
    guard: async (options = {}) => {
      await authReady;
      const { permission = 'dashboard', redirectTo = getBaseUrl() + '/auth/login.html' } = options;
      if (!Session.isValid()) { window.location.href = redirectTo; return false; }
      
      const user = Session.getUser();
      // If email is not verified, redirect to verification page (unless it is an admin/super_admin)
      const fbUser = auth.currentUser;
      if (fbUser && !fbUser.emailVerified && user.role !== 'admin' && user.role !== 'super_admin') {
        window.location.href = getBaseUrl() + '/auth/verify-email.html';
        return false;
      }

      if (permission && !RBAC.can(user, permission)) {
        window.location.href = getBaseUrl() + '/auth/access-denied.html'; return false;
      }
      return true;
    }
  };

  const RateLimit = { check: () => ({ allowed: true }), increment: () => { }, reset: () => { } };

  // ---- Theme ----
  const Theme = {
    init: () => {
      const saved = localStorage.getItem('careeriq-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', saved);
      document.querySelectorAll('#themeToggle').forEach(btn => {
        btn.removeEventListener('click', Theme.toggle);
        btn.addEventListener('click', Theme.toggle);
      });
    },
    toggle: () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('careeriq-theme', next);
      window.dispatchEvent(new Event('themeChanged'));
    }
  };

  // ---- Toast ----
  const Toast = {
    _el: null,
    init: () => {
      Toast._el = document.getElementById('toastContainer');
      if (!Toast._el) {
        Toast._el = document.createElement('div');
        Toast._el.id = 'toastContainer';
        Toast._el.className = 'toast-container';
        document.body.appendChild(Toast._el);
      }
    },
    show: (msg, type = 'info', dur = 3500) => {
      if (!Toast._el) Toast.init();
      
      // Intercept generic "Failed to fetch" errors caused by Render server sleeping
      if (typeof msg === 'string' && msg.toLowerCase().includes('failed to fetch')) {
        msg = 'Failed to fetch. Server is busy, please try again in 15 seconds.';
        dur = 6000;
      }
      const svgIcons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
      };
      const t = document.createElement('div');
      t.className = 'toast toast-' + type;
      t.innerHTML = '<span class="toast-icon">' + (svgIcons[type] || svgIcons.info) + '</span><span class="toast-body">' + msg + '</span>';
      Toast._el.appendChild(t);
      setTimeout(() => { t.classList.add('toast-exit'); setTimeout(() => t.remove(), 280); }, dur);
    }
  };

  // ---- Validator ----
  const Validator = {
    rules: {
      required: (v) => v && v.trim() ? null : 'This field is required',
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Invalid email address',
      minLength: (min) => (v) => (v && v.length >= min) ? null : 'Minimum ' + min + ' characters required',
      password: (v) => (!v || v.length < 8) ? 'Password must be at least 8 characters' : null,
      match: (other) => (v) => v === other ? null : 'Passwords do not match'
    },
    validate: (field, value, rules) => {
      for (const r of rules) { const e = r(value); if (e) return e; }
      return null;
    },
    showError: (el, msg) => {
      el.classList.add('error'); el.classList.remove('success');
      let errEl = el.closest('.form-group') && el.closest('.form-group').querySelector('.form-error');
      if (!errEl) { errEl = document.createElement('div'); errEl.className = 'form-error'; el.after(errEl); }
      errEl.innerHTML = '<span>⚠️</span> ' + msg;
    },
    clearError: (el) => {
      el.classList.remove('error'); el.classList.add('success');
      const e = el.closest('.form-group') && el.closest('.form-group').querySelector('.form-error');
      if (e) e.remove();
    },
    passwordStrength: (pw) => {
      if (!pw) return { score: 0, label: '' };
      let s = 0;
      if (pw.length >= 8) s++;
      if (pw.length >= 12) s++;
      if (/[A-Z]/.test(pw)) s++;
      if (/[0-9]/.test(pw)) s++;
      if (/[^A-Za-z0-9]/.test(pw)) s++;
      return { score: s, label: ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][s] || 'Very Strong' };
    }
  };

  // Smooth redirect with overlay
  const smoothRedirect = (url, message = 'Redirecting…', delay = 900) => {
    // Show a brief toast then overlay
    const overlay = document.createElement('div');
    overlay.className = 'redirect-overlay';
    overlay.innerHTML = '<div class="redirect-spinner"></div><span class="redirect-text">' + message + '</span>';
    document.body.appendChild(overlay);
    setTimeout(() => { window.location.href = url; }, delay);
  };

  // ---- Expose globally ----
  window.CareerIQAuth = {
    getDomains, addDomain, toggleDomain, removeDomain, validateDomain, getOrgBranding,
    handleGoogleAuth, handleEmailAuth,
    Session, AuditLog, RBAC, ProtectedRoute, RateLimit, Theme, Toast, Validator, Storage,
    authReady, auth, db, smoothRedirect, getBaseUrl
  };

  // Init theme + toast immediately (DOM may not exist yet if script is in <head>)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { Theme.init(); Toast.init(); });
  } else {
    Theme.init(); Toast.init();
  }

  // Fire ready event AFTER current call stack clears so other <script> tags can add listeners
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent('CareerIQAuthReady'));
  }, 0);
})();

