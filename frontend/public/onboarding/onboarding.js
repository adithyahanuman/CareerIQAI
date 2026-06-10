/**
 * CareerIQ AI — Onboarding Wizard Logic
 *
 * 🔵 [FIREBASE]:
 * await setDoc(doc(db, 'user_profiles', uid), data, { merge: true });
 */



class ChipInput {
  constructor(wrapperId, hiddenInputId, suggestions = []) {
    this.wrapper = document.getElementById(wrapperId);
    if (!this.wrapper) return;
    this.hiddenInput = document.getElementById(hiddenInputId);
    this.chips = [];
    this.suggestions = suggestions;
    this.init();
  }

  init() {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'chip-text-input';
    input.placeholder = this.wrapper.dataset.placeholder || 'Type and press Enter...';
    this.wrapper.appendChild(input);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = input.value.trim().replace(/,$/, '');
        if (val) this.add(val);
        input.value = '';
      } else if (e.key === 'Backspace' && input.value === '' && this.chips.length > 0) {
        this.remove(this.chips.length - 1);
      }
    });

    const suggestionsContainer = this.wrapper.nextElementSibling;
    if (suggestionsContainer && suggestionsContainer.classList.contains('chip-suggestions')) {
      suggestionsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip-suggestion-badge')) {
          this.add(e.target.textContent);
          e.target.style.opacity = '0.5';
          e.target.style.pointerEvents = 'none';
        }
      });
    }
  }

  add(value) {
    if (this.chips.includes(value)) return;
    this.chips.push(value);
    this.render();
    if (window.OnboardingWizard) window.OnboardingWizard.saveData();
  }

  remove(index) {
    this.chips.splice(index, 1);
    this.render();
    if (window.OnboardingWizard) window.OnboardingWizard.saveData();
  }

  loadValues(values) {
    if (!Array.isArray(values)) return;
    this.chips = values;
    this.render();
  }

  getValues() {
    return this.chips;
  }

  render() {
    this.wrapper.querySelectorAll('.chip').forEach(c => c.remove());
    const input = this.wrapper.querySelector('.chip-text-input');
    this.chips.forEach((chip, index) => {
      const el = document.createElement('div');
      el.className = 'chip';
      el.innerHTML = `<span>${chip}</span><span class="chip-remove" onclick="event.stopPropagation()">&times;</span>`;
      el.querySelector('.chip-remove').addEventListener('click', () => this.remove(index));
      this.wrapper.insertBefore(el, input);
    });

    if (this.hiddenInput) {
      this.hiddenInput.value = JSON.stringify(this.chips);
    }
  }
}

const OnboardingWizard = {
  currentStep: 1,
  totalSteps: 3,
  data: {},
  chipInputs: {},
  saveTimeout: null,
  user: null,

  async init() {
    // 1. Auth Check
    const session = CareerIQAuth.Session.get();
    if (!session) {
      window.location.href = '../auth/login.html';
      return;
    }
    this.user = session.user;

    const urlParams = new URLSearchParams(window.location.search);
    const isEditing = urlParams.get('edit') === 'true';

    // 2. Load saved data from Firestore
    try {
      const { db } = window.CareerIQAuth;
      const profileSnap = await db.collection('user_profiles').doc(this.user.uid).get();

      if (profileSnap.exists) {
        this.data = profileSnap.data();
        // If already completed and not in edit mode, go to dashboard
        if (!isEditing && this.data.onboarding_complete) {
          window.location.href = '../dashboard.html';
          return;
        }
      } else {
        this.data = {};
      }

      // Auto-copy signup data if profile not yet created
      if (!this.data.fullName) {
        const userSnap = await db.collection('users').doc(this.user.uid).get();
        if (userSnap.exists) {
          const udata = userSnap.data();
          this.data.fullName    = udata.name        || this.user.name        || '';
          this.data.displayName = udata.displayName || this.user.displayName || '';
          if (udata.phone) this.data.phone = udata.phone;
        } else {
          this.data.fullName    = this.user.name        || '';
          this.data.displayName = this.user.displayName || '';
        }
      }

      // Strip any legacy "resumeFile" fake-path value that may have been saved
      if (this.data.resumeFile) {
        delete this.data.resumeFile;
      }

    } catch (e) {
      console.error('Failed to load profile from Firestore:', e);
      this.data = {};
    }

    // 3. Setup complex inputs (chips, file upload) FIRST so chipInputs map is ready
    this.setupComplexInputs();

    // 3.5. Setup dynamic branch dropdown
    this.setupBranchDropdown();

    // 4. Pre-fill form with saved data (now chipInputs is ready)
    this.populateForm();

    // 5. Setup navigation buttons
    this.setupNavigation();

    // 6. Update progress bar / dots
    this.updateProgressUI();

    // 7. Setup auto-save AFTER form is populated (prevents blanks triggering autosave)
    this.setupAutoSave();
  },

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────

  setupNavigation() {
    document.querySelectorAll('.btn-next').forEach(btn => {
      btn.addEventListener('click', () => {
        console.log('[Onboarding] Next clicked, currentStep =', this.currentStep);
        try {
          if (this.validateStep(this.currentStep)) {
            this.collectStepData(this.currentStep);
            this.goToStep(this.currentStep + 1);
          }
        } catch (err) {
          console.error('[Onboarding] Error advancing step:', err);
          CareerIQAuth.Toast.show('Error: ' + err.message, 'error');
        }
      });
    });

    document.querySelectorAll('.btn-back-step').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          this.collectStepData(this.currentStep);
          this.goToStep(this.currentStep - 1);
        } catch (err) {
          console.error('[Onboarding] Error going back:', err);
        }
      });
    });

    const skipBtn = document.querySelector('.onboarding-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        CareerIQAuth.Toast.show('Skipping setup. Redirecting to Dashboard...', 'info');
        try {
          this.data.onboarding_complete = true;
          await this.saveData();
        } catch (err) {
          console.warn('[Onboarding] Could not save skip state:', err);
        }
        setTimeout(() => { window.location.href = '../dashboard.html'; }, 800);
      });
    }
  },

  goToStep(n) {
    console.log('[Onboarding] goToStep:', n);
    if (n < 1) n = 1;
    if (n > this.totalSteps) {
      this.complete();
      return;
    }

    const currentCard = document.getElementById(`step${this.currentStep}`);
    const nextCard    = document.getElementById(`step${n}`);

    if (!currentCard || !nextCard) {
      console.error('[Onboarding] Missing step card elements for steps', this.currentStep, 'and', n);
      CareerIQAuth.Toast.show('Navigation error: step cards not found.', 'error');
      return;
    }

    currentCard.classList.add('leaving');
    setTimeout(() => {
      currentCard.style.display = 'none';
      currentCard.classList.remove('leaving');
      nextCard.style.display = 'block';
      this.currentStep = n;
      this.updateProgressUI();
      if (n === this.totalSteps) this.renderSummary();
    }, 300);
  },

  updateProgressUI() {
    const textEl = document.querySelector('.progress-current');
    if (textEl) textEl.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;

    const barEl = document.querySelector('.progress-bar-fill');
    if (barEl) barEl.style.width = `${(this.currentStep / this.totalSteps) * 100}%`;

    document.querySelectorAll('.step-dot').forEach((dot, i) => {
      dot.className = 'step-dot';
      if (i + 1 === this.currentStep)      dot.classList.add('active');
      else if (i + 1 < this.currentStep)   dot.classList.add('completed');
    });
  },

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  validateStep(n) {
    // Step 3 (Resume): only check that a file was selected
    if (n === 3) {
      if (!this.data.resumeName) {
        CareerIQAuth.Toast.show('Please upload your CV / Resume to continue.', 'error');
        const zone = document.getElementById('resumeUploadZone');
        if (zone) zone.classList.add('error');
        return false;
      }
      return true;
    }

    // All other steps: check required fields
    const card = document.getElementById(`step${n}`);
    if (!card) return true;

    let isValid = true;
    card.querySelectorAll('[required]').forEach(input => {
      // Skip file inputs — browsers don't expose their values for security
      if (input.type === 'file') return;
      const val = (input.value || '').trim();
      if (!val) {
        isValid = false;
        input.classList.add('error');
        const clear = () => { input.classList.remove('error'); input.removeEventListener('input', clear); };
        input.addEventListener('input', clear);
      }
    });

    if (!isValid) CareerIQAuth.Toast.show('Please fill in all required fields.', 'error');
    return isValid;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DATA COLLECTION & SAVING
  // ─────────────────────────────────────────────────────────────────────────

  collectStepData(n) {
    const card = document.getElementById(`step${n}`);
    if (!card) return;

    // Text inputs, selects, textareas — exclude radio, checkbox, file, and chip inputs
    card.querySelectorAll(
      'input:not([type="radio"]):not([type="checkbox"]):not([type="file"]):not(.chip-text-input), select, textarea'
    ).forEach(el => {
      if (el.id) this.data[el.id] = el.value;
    });

    // Radio buttons
    card.querySelectorAll('input[type="radio"]:checked').forEach(r => {
      if (r.name) this.data[r.name] = r.value;
    });

    // Checkboxes (grouped by name)
    const groups = {};
    card.querySelectorAll('input[type="checkbox"]').forEach(c => {
      if (!c.name) return;
      if (!groups[c.name]) groups[c.name] = [];
      if (c.checked) groups[c.name].push(c.value);
    });
    Object.assign(this.data, groups);

    // Chip inputs
    Object.keys(this.chipInputs).forEach(k => {
      this.data[k] = this.chipInputs[k].getValues();
    });

    // Never store the fake file path
    delete this.data.resumeFile;

    this.saveData();
  },

  async saveData() {
    if (!this.user) return;
    try {
      const { db } = window.CareerIQAuth;

      // Build a clean copy — never store the file input's fake path
      const payload = { ...this.data };
      delete payload.resumeFile;

      // Handle custom course/branch overrides for the stored values
      if (payload.course === 'Other' && payload.courseCustom) {
        payload.course = payload.courseCustom;
      }
      if (payload.branch === 'Other' && payload.branchCustom) {
        payload.branch = payload.branchCustom;
      }

      await db.collection('user_profiles').doc(this.user.uid).set(payload, { merge: true });

      // Keep the users collection in sync for name / displayName / phone
      const userUpdates = {};
      if (payload.fullName)    userUpdates.name        = payload.fullName;
      if (payload.displayName) userUpdates.displayName = payload.displayName;
      if (payload.phone)       userUpdates.phone       = payload.phone;

      if (Object.keys(userUpdates).length > 0) {
        await db.collection('users').doc(this.user.uid).set(userUpdates, { merge: true });
        const fbUser = firebase.auth().currentUser;
        if (fbUser && payload.displayName && fbUser.displayName !== payload.displayName) {
          try { await fbUser.updateProfile({ displayName: payload.displayName }); } catch (_) {}
        }
      }

      // Sync with PostgreSQL
      const fbUser = firebase.auth().currentUser;
      if (fbUser) {
        const token = await fbUser.getIdToken();
        const pgPayload = {
          full_name: payload.fullName || null,
          phone: payload.phone || null,
          course: payload.course || null,
          branch: payload.branch || null,
          year_of_study: payload.yearOfStudy || null,
          gpa: payload.gpa || null
        };
        
        const pgRes = await fetch('http://localhost:5000/api/students/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(pgPayload)
        });
        if (!pgRes.ok) {
          console.warn('[Onboarding] PostgreSQL sync failed:', pgRes.statusText);
        } else {
          console.log('[Onboarding] PostgreSQL sync successful.');
        }
      }

      console.log('[Onboarding] Data saved to Firebase:', Object.keys(payload));
    } catch (e) {
      console.error('[Onboarding] Failed to save to Firebase:', e);
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AUTO-SAVE
  // ─────────────────────────────────────────────────────────────────────────

  setupAutoSave() {
    // Exclude file inputs — they cannot be read by JS for security reasons
    document.querySelectorAll('input:not([type="file"]), select, textarea').forEach(input => {
      input.addEventListener('change', () => this.triggerAutoSave());
      input.addEventListener('input',  () => this.triggerAutoSave());
    });
  },

  triggerAutoSave() {
    const inds = document.querySelectorAll('.autosave-indicator');
    inds.forEach(i => {
      i.className = 'autosave-indicator saving';
      i.innerHTML = '<div class="autosave-dot"></div> Saving...';
    });

    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.collectStepData(this.currentStep);
      inds.forEach(i => {
        i.className = 'autosave-indicator saved';
        i.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Saved';
      });
      setTimeout(() => {
        inds.forEach(i => { i.className = 'autosave-indicator'; i.innerHTML = ''; });
      }, 2000);
    }, 1000);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FORM PRE-FILL
  // ─────────────────────────────────────────────────────────────────────────

  populateForm() {
    const SKIP_IDS = new Set(['resumeFile', 'courseCustom', 'branchCustom']); // never try to set value on file inputs

    // Pre-populate branches if course is already saved
    if (this.data.course && this.updateBranchOptions) {
      const isCustomCourse = !['B.Tech', 'Integrated M.Tech', 'M.Tech', 'MCA', 'MBA', 'B.Sc', 'M.Sc', 'Ph.D'].includes(this.data.course);
      const courseVal = isCustomCourse ? 'Other' : this.data.course;
      
      this.updateBranchOptions(courseVal, this.data.branch);
      
      if (isCustomCourse) {
        const customCourseInput = document.getElementById('courseCustom');
        if (customCourseInput) customCourseInput.value = this.data.course;
      }
      
      const customBranchInput = document.getElementById('branchCustom');
      if (customBranchInput && this.data.branch) {
        const selectBranch = document.getElementById('branch');
        let hasOption = false;
        if (selectBranch) {
          for (let i = 0; i < selectBranch.options.length; i++) {
            if (selectBranch.options[i].value === this.data.branch) {
              hasOption = true;
              break;
            }
          }
        }
        if (!hasOption && this.data.branch && this.data.branch !== 'Other') {
          customBranchInput.value = this.data.branch;
        }
      }
    }

    // Text inputs, selects, textareas
    Object.keys(this.data).forEach(key => {
      if (SKIP_IDS.has(key)) return;
      try {
        const el = document.getElementById(key);
        if (!el) return;
        if (el.type === 'file') return;           // safety: never touch file inputs
        if (el.type === 'radio')    return;        // handled separately
        if (el.type === 'checkbox') return;        // handled separately
        el.value = this.data[key] != null ? this.data[key] : '';
      } catch (e) {
        console.warn('[Onboarding] populateForm field error for key:', key, e);
      }
    });

    // Radio buttons
    Object.keys(this.data).forEach(key => {
      const val = this.data[key];
      if (typeof val !== 'string' || val.length > 200) return;
      try {
        // Escape special CSS selector characters in the value
        const escapedVal = CSS.escape ? CSS.escape(val) : val.replace(/['"\\]/g, '\\$&');
        const radio = document.querySelector(`input[type="radio"][name="${key}"][value="${escapedVal}"]`);
        if (radio) radio.checked = true;
      } catch (e) {
        console.warn('[Onboarding] populateForm radio error for key:', key, e);
      }
    });

    // Checkboxes
    Object.keys(this.data).forEach(key => {
      const val = this.data[key];
      if (!Array.isArray(val)) return;
      val.forEach(v => {
        if (typeof v !== 'string' || v.length > 200) return;
        try {
          const escapedV = CSS.escape ? CSS.escape(v) : v.replace(/['"\\]/g, '\\$&');
          const cb = document.querySelector(`input[type="checkbox"][name="${key}"][value="${escapedV}"]`);
          if (cb) cb.checked = true;
        } catch (e) {
          console.warn('[Onboarding] populateForm checkbox error for key:', key, e);
        }
      });
    });

    // Chip inputs (chipInputs must be set up before calling this)
    Object.keys(this.chipInputs).forEach(key => {
      if (Array.isArray(this.data[key])) {
        try { this.chipInputs[key].loadValues(this.data[key]); } catch (e) {}
      }
    });

    // Restore resume file display if one was previously uploaded
    if (this.data.resumeName) {
      const fileZone        = document.getElementById('resumeUploadZone');
      const fileInfo        = document.getElementById('fileInfo');
      const fileNameDisplay = document.getElementById('fileNameDisplay');
      if (fileZone && fileInfo && fileNameDisplay) {
        const label = this.data.resumeText
          ? this.data.resumeName + ' ✅ Uploaded'
          : this.data.resumeName;
        fileNameDisplay.textContent = label;
        fileZone.classList.add('hidden');
        fileInfo.classList.remove('hidden');
      }
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // COMPLEX INPUTS (File Upload, Photo)
  // ─────────────────────────────────────────────────────────────────────────

  setupComplexInputs() {
    const fileZone        = document.getElementById('resumeUploadZone');
    const fileInput       = document.getElementById('resumeFile');
    const fileInfo        = document.getElementById('fileInfo');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const removeBtn       = document.getElementById('btnRemoveFile');

    if (fileZone && fileInput) {
      fileZone.addEventListener('click', () => fileInput.click());

      fileZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileZone.classList.add('dragover');
      });
      fileZone.addEventListener('dragleave', () => fileZone.classList.remove('dragover'));

      fileZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          this.handleFileSelection(e.dataTransfer.files[0], fileInput, fileZone, fileInfo, fileNameDisplay);
        }
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
          this.handleFileSelection(fileInput.files[0], fileInput, fileZone, fileInfo, fileNameDisplay);
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (fileInput) fileInput.value = '';
        if (fileZone)  fileZone.classList.remove('hidden');
        if (fileInfo)  fileInfo.classList.add('hidden');
        delete this.data.resumeName;
        delete this.data.resumeText;
        delete this.data.resumeExtractedAt;
        this.saveData();
      });
    }


  },

  async handleFileSelection(file, fileInput, fileZone, fileInfo, fileNameDisplay) {
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      CareerIQAuth.Toast.show('File is too large (max 5 MB)', 'error');
      if (fileInput) fileInput.value = '';
      return;
    }

    // Show "extracting" state immediately
    fileNameDisplay.textContent = file.name + ' (Uploading...)';
    fileZone.classList.add('hidden');
    fileInfo.classList.remove('hidden');
    fileZone.classList.remove('error');

    const submitBtn = document.getElementById('finalSubmitBtn');
    if (submitBtn) submitBtn.disabled = true;

    // Store the name right away (so validate step 3 passes even if extraction is slow)
    this.data.resumeName = file.name;

    try {
      if (window.ResumeExtractor) {
        console.log('[Onboarding] Starting PDF extraction...');
        const result = await window.ResumeExtractor.extractFromFile(file);
        if (result && result.raw_text && result.raw_text.trim().length > 0) {
          this.data.resumeText        = result.raw_text;
          this.data.resumeExtractedAt = new Date().toISOString();
          fileNameDisplay.textContent = file.name + ' ✅ Uploaded';
          CareerIQAuth.Toast.show('Resume uploaded successfully!', 'success');
          console.log('[Onboarding] Extraction done. Characters:', result.raw_text.length);
        } else {
          fileNameDisplay.textContent = file.name + ' ✅ Uploaded';
          CareerIQAuth.Toast.show('Resume uploaded (no text found — may be image-based).', 'warning');
          console.warn('[Onboarding] Extraction returned empty text.');
        }
      } else {
        console.error('[Onboarding] window.ResumeExtractor is not defined!');
        CareerIQAuth.Toast.show('Extractor not loaded — resume saved by name only.', 'warning');
        fileNameDisplay.textContent = file.name;
      }
    } catch (err) {
      console.error('[Onboarding] Extraction error:', err);
      CareerIQAuth.Toast.show('Upload failed: ' + err.message, 'error');
      fileNameDisplay.textContent = file.name;
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }

    // Save everything (resumeName + resumeText if extracted)
    await this.saveData();
    console.log('[Onboarding] Resume data saved. resumeText length:', (this.data.resumeText || '').length);
  },

  setupBranchDropdown() {
    const COURSE_BRANCHES = {
      "B.Tech": [
        "Computer Science and Engineering (CSE)",
        "CSE (Artificial Intelligence and Machine Learning)",
        "CSE (Data Science)",
        "CSE (Information Security)",
        "CSE (Internet of Things - IoT)",
        "CSE (Block Chain Technology)",
        "CSE (Bioinformatics)",
        "CSE (Business Systems)",
        "CSE (Artificial Intelligence and Data Engineering)",
        "CSE (Artificial Intelligence and Robotics)",
        "CSE (Cyber Physical Systems)",
        "CSE (Cyber Security)",
        "CSE (Quantum Computing)",
        "Information Technology (IT)",
        "Electrical and Electronics Engineering (EEE)",
        "Electronics and Communication Engineering (ECE)",
        "Electronics Engineering (VLSI Design and Technology)",
        "Electronics and Computer Engineering",
        "Electronics and Instrumentation Engineering (EIE)",
        "Mechanical Engineering (ME)",
        "Mechanical Engineering (Automotive Engineering)",
        "Mechanical Engineering (Manufacturing Engineering)",
        "Civil Engineering (CE)",
        "Civil Engineering (with L&T)",
        "Chemical Engineering (ChE)",
        "Biotechnology (BT)",
        "Bioengineering",
        "Fashion Technology",
        "Other"
      ],
      "Integrated M.Tech": [
        "Software Engineering",
        "Computer Science and Engineering (Data Science)",
        "Computer Science and Engineering (Secure Systems)",
        "CSE (in collaboration with Virtusa)",
        "Other"
      ],
      "M.Tech": [
        "Computer Science and Engineering (CSE)",
        "CSE (Big Data Analytics)",
        "CSE (Information Security)",
        "CSE (Artificial Intelligence and Machine Learning)",
        "Software Engineering",
        "VLSI Design",
        "Embedded Systems",
        "Communication Engineering",
        "Power Electronics and Drives",
        "Control and Automation",
        "CAD/CAM",
        "Manufacturing Engineering",
        "Mechatronics",
        "Automotive Electronics",
        "Smart Mobility",
        "Construction Technology & Management",
        "Biotechnology",
        "Nanotechnology",
        "Other"
      ],
      "MCA": [
        "Master of Computer Applications (General)",
        "Other"
      ],
      "MBA": [
        "Master of Business Administration (General)",
        "MBA (Business Analytics)",
        "MBA (Human Resources)",
        "MBA (Finance)",
        "MBA (Marketing)",
        "Other"
      ],
      "B.Sc": [
        "Computer Science",
        "Computer Science with Data Analytics",
        "Multimedia and Animation",
        "Visual Communication",
        "Catering and Hotel Management",
        "Fashion Design",
        "Agriculture (Hons)",
        "Other"
      ],
      "M.Sc": [
        "Applied Microbiology",
        "Biomedical Genetics",
        "Biotechnology",
        "Chemistry",
        "Physics",
        "Data Science",
        "Business Statistics",
        "Food Science and Technology",
        "Computational Statistics & Data Analytics",
        "Other"
      ],
      "Ph.D": [
        "Engineering",
        "Sciences",
        "Management",
        "Humanities",
        "Other"
      ],
      "Other": [
        "Other"
      ]
    };

    const courseSelect = document.getElementById('course');
    const branchSelect = document.getElementById('branch');
    const branchContainer = document.getElementById('branchContainer');
    const courseCustomContainer = document.getElementById('courseCustomContainer');
    const courseCustomInput = document.getElementById('courseCustom');
    const branchCustomContainer = document.getElementById('branchCustomContainer');
    const branchCustomInput = document.getElementById('branchCustom');

    if (!courseSelect || !branchSelect) return;

    const updateBranchOptions = (selectedCourse, preSelectedBranch = '') => {
      // Toggle course custom container
      if (selectedCourse === 'Other') {
        courseCustomContainer.style.display = 'block';
        courseCustomInput.required = true;
      } else {
        courseCustomContainer.style.display = 'none';
        courseCustomInput.required = false;
        courseCustomInput.value = '';
      }

      // Populate branches
      if (!selectedCourse || !COURSE_BRANCHES[selectedCourse]) {
        branchSelect.innerHTML = '<option value="">Select your branch</option>';
        branchContainer.style.display = 'none';
        branchSelect.required = false;
        branchSelect.value = '';
        
        branchCustomContainer.style.display = 'none';
        branchCustomInput.required = false;
        branchCustomInput.value = '';
      } else {
        const branches = COURSE_BRANCHES[selectedCourse];
        let html = '<option value="">Select your branch</option>';
        branches.forEach(b => {
          html += `<option value="${b}">${b}</option>`;
        });
        branchSelect.innerHTML = html;
        branchContainer.style.display = 'block';
        branchSelect.required = true;

        if (preSelectedBranch) {
          if (branches.includes(preSelectedBranch)) {
            branchSelect.value = preSelectedBranch;
            branchCustomContainer.style.display = 'none';
            branchCustomInput.required = false;
            branchCustomInput.value = '';
          } else {
            branchSelect.value = 'Other';
            branchCustomContainer.style.display = 'block';
            branchCustomInput.required = true;
            branchCustomInput.value = preSelectedBranch;
          }
        } else {
          branchSelect.value = '';
          branchCustomContainer.style.display = 'none';
          branchCustomInput.required = false;
          branchCustomInput.value = '';
        }
      }
    };

    courseSelect.addEventListener('change', () => {
      updateBranchOptions(courseSelect.value);
      this.triggerAutoSave();
    });

    branchSelect.addEventListener('change', () => {
      if (branchSelect.value === 'Other') {
        branchCustomContainer.style.display = 'block';
        branchCustomInput.required = true;
      } else {
        branchCustomContainer.style.display = 'none';
        branchCustomInput.required = false;
        branchCustomInput.value = '';
      }
      this.triggerAutoSave();
    });

    // Expose this method so populateForm can use it
    this.updateBranchOptions = updateBranchOptions;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY (Step 3 preview)
  // ─────────────────────────────────────────────────────────────────────────

  renderSummary() {
    const sName  = document.getElementById('summaryName');
    const sRole  = document.getElementById('summaryRole');
    const sSkills= document.getElementById('summarySkills');
    const sLoc   = document.getElementById('summaryLocation');

    if (sName)  sName.textContent  = this.data.fullName    || 'Awesome User';
    if (sRole)  sRole.textContent  = this.data.course      || this.data.jobTitle || 'Career Explorer';
    if (sLoc)   sLoc.textContent   = this.data.currentLocation || 'Earth';
    if (sSkills && Array.isArray(this.data.techSkills)) {
      sSkills.innerHTML = this.data.techSkills.slice(0, 3)
        .map(s => `<span class="chip">${s}</span>`).join('') +
        (this.data.techSkills.length > 3 ? `<span class="chip">+${this.data.techSkills.length - 3}</span>` : '');
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // COMPLETION
  // ─────────────────────────────────────────────────────────────────────────

  async complete() {
    const btn = document.getElementById('finalSubmitBtn');
    if (btn) { btn.classList.add('loading'); btn.disabled = true; }

    this.collectStepData(this.currentStep);
    this.data.onboarding_complete = true;
    await this.saveData();

    CareerIQAuth.Toast.show('Profile created successfully! Redirecting...', 'success');
    setTimeout(() => { window.location.href = '../dashboard.html'; }, 1500);
  }
};

window.OnboardingWizard = OnboardingWizard;
