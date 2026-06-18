window.COLORS = {
  success: '#22c55e', // Green (80-100)
  warning: '#f59e0b', // Amber (60-79)
  orange:  '#f97316', // Orange (40-59)
  danger:  '#ef4444', // Red (0-39)
  chart:   ['#3b82f6', '#14b8a6', '#8b5cf6', '#f97316', '#ec4899', '#22c55e'], // Multi-color palette
  radar: {
    fill: 'rgba(99, 102, 241, 0.3)', // Indigo
    border: '#6366f1'
  },
  getScoreColor: function(s) {
    if (s >= 80) return this.success;
    if (s >= 60) return this.warning;
    if (s >= 40) return this.orange;
    return this.danger;
  }
};

const initApp = async () => {
      // Proactively wake up Render server on dashboard load
      fetch("https://careeriqai.onrender.com/health").catch(() => {});

      const { Session, ProtectedRoute, db } = window.CareerIQAuth;

      // Setup Navigation and Toggle actions
      const menuItems = document.querySelectorAll('.menu-item');
      const pageViews = document.querySelectorAll('.page-view');
      const sidebar = document.getElementById('sidebar');
      const sidebarOverlay = document.getElementById('sidebarOverlay');
      const menuToggle = document.getElementById('menuToggle');

      // Sidebar Tab Switching Logic
      const switchTab = (targetId) => {
        menuItems.forEach(item => {
          if(item.dataset.target === targetId) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });

        pageViews.forEach(view => {
          if(view.id === `page-${targetId}`) {
            view.classList.add('active');
          } else {
            view.classList.remove('active');
          }
        });

        // Auto-close sidebar on mobile after clicking
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
      };

      menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
          const target = item.dataset.target;
          if (target) {
            e.preventDefault();
            window.location.hash = target;
            switchTab(target);
          }
        });
      });

      // Handle Hash Navigation on load / hash change
      const handleHashChange = () => {
        const hash = window.location.hash.substring(1);
        if (hash) {
          const matchedView = document.getElementById(`page-${hash}`);
          if (matchedView) {
            switchTab(hash);
            return;
          }
        }
        switchTab('home'); // Default fallback
      };

      window.addEventListener('hashchange', handleHashChange);
      handleHashChange();

      // Mobile Menu Toggle Listeners
      if (menuToggle) {
        menuToggle.addEventListener('click', () => {
          sidebar.classList.add('open');
          sidebarOverlay.classList.add('open');
        });
      }

      if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
          sidebar.classList.remove('open');
          sidebarOverlay.classList.remove('open');
        });
      }

      // 1. Instantly display user info from cached session if available (0ms loading lag)
      const cachedUser = Session.getUser();
      if (cachedUser) {
        let displayName = cachedUser.displayName || cachedUser.name || cachedUser.email.split('@')[0];
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

        document.getElementById('userNameDisplay').textContent = displayName;
        document.getElementById('welcomeNameDisplay').textContent = displayName;
        document.getElementById('userEmailDisplay').textContent = cachedUser.email;
        document.getElementById('userAvatar').textContent = displayName.charAt(0).toUpperCase();
        const dn = document.getElementById('dropdownName');
        const de = document.getElementById('dropdownEmail');
        if (dn) dn.textContent = displayName;
        if (de) de.textContent = cachedUser.email;

        if (cachedUser.role === 'admin' || cachedUser.role === 'super_admin') {
          const adminBtn = document.getElementById('adminLink');
          if (adminBtn) adminBtn.style.display = 'inline-flex';
        }
      }

      // 2. Perform security/redirect guard asynchronously
      const isAllowed = await ProtectedRoute.guard({ permission: 'dashboard', redirectTo: 'auth/login.html' });
      if (!isAllowed) return;

      const user = Session.getUser();
      let displayName = user.displayName || user.name || user.email.split('@')[0];
      let profileData = null;
      let pgResume = null;

      try {
        const profileSnap = await db.collection("user_profiles").doc(user.uid).get();
        if (profileSnap.exists) {
          profileData = profileSnap.data();
          if (profileData.displayName) {
            displayName = profileData.displayName;
          } else if (profileData.fullName) {
            displayName = profileData.fullName;
          }
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }

      // Fetch active resume from PostgreSQL
      try {
        const token = await firebase.auth().currentUser.getIdToken();
        const res = await fetch('https://careeriqai.onrender.com/api/resumes/my/active', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const json = await res.json();
          pgResume = json.data;
        }
      } catch (err) {
        console.error('Failed to fetch active resume from PostgreSQL:', err);
      }

      // Capitalize the first letter of the display name
      if (displayName) {
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      }

      // Update DOM with final verified profile data
      document.getElementById('userNameDisplay').textContent = displayName;
      document.getElementById('welcomeNameDisplay').textContent = displayName;
      document.getElementById('userEmailDisplay').textContent = user.email;
      document.getElementById('userAvatar').textContent = displayName.charAt(0).toUpperCase();
      // Update dropdown header
      const dropdownName = document.getElementById('dropdownName');
      const dropdownEmail = document.getElementById('dropdownEmail');
      if (dropdownName) dropdownName.textContent = displayName;
      if (dropdownEmail) dropdownEmail.textContent = user.email;

      // Interactive Dashboard Updates based on Profile (null-guarded for new HTML)
      if (profileData && profileData.onboarding_complete) {
        // GPA / CGPA
        const gpaEl = document.getElementById('gpaDisplay');
        if (gpaEl && profileData.gpa) gpaEl.textContent = profileData.gpa;

        // Welcome Subtitle (new HTML uses piqWelcomeSub)
        const subtitleText = profileData.course
          ? `Ready to conquer your goals in ${profileData.course} (${profileData.yearOfStudy || 'Student'})?`
          : 'Ready to conquer your goals?';
        const subEl = document.querySelector('.welcome-subtitle') || document.getElementById('piqWelcomeSub');
        if (subEl) subEl.textContent = subtitleText;

        // Legacy stats-grid (may not exist in new HTML)
        const statVal = document.querySelector('.stats-grid .stat-card:nth-child(1) .stat-value');
        if (statVal) statVal.textContent = '100%';
      }

      // Show admin link if admin
      if (user.role === 'admin' || user.role === 'super_admin') {
        const adminBtn = document.getElementById('adminLink');
        if (adminBtn) adminBtn.style.display = 'inline-flex';
      }


      // ───────────────────────────────────────────────────────────────────────
      // RESTORE ON PAGE LOAD — show Analyze btn if resume text is saved but not analyzed
      // ───────────────────────────────────────────────────────────────────────
      if (profileData && profileData.resumeText &&
          profileData.resumeText.trim().length > 50 &&
          !pgResume?.overall_analysis) {
        document.getElementById('savedResumeName').textContent =
          '📄 ' + (profileData.resumeName || 'resume.pdf') + ' (saved)';
        const aBtn = document.getElementById('analyzeResumeBtn');
        if (aBtn) aBtn.style.display = 'inline-flex';
        // Also show analyze btn in RA tab empty state
        const aBtnRA = document.getElementById('analyzeResumeBtnRA');
        if (aBtnRA) aBtnRA.style.display = 'inline-flex';
        const aBtnInAnalysis = document.getElementById('analyzeResumeBtnInAnalysis');
        if (aBtnInAnalysis) aBtnInAnalysis.style.display = 'inline-flex';
      }


      // ═══════════════════════════════════════════════════════════════════════
      // PROFILE DROPDOWN
      // ═══════════════════════════════════════════════════════════════════════
      const userProfileToggle = document.getElementById('userProfileToggle');
      const profileDropdown   = document.getElementById('profileDropdown');

      if (userProfileToggle && profileDropdown) {
        userProfileToggle.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = profileDropdown.classList.contains('open');
          profileDropdown.classList.toggle('open', !isOpen);
          userProfileToggle.classList.toggle('open', !isOpen);
        });
        document.addEventListener('click', (e) => {
          if (!userProfileToggle.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.remove('open');
            userProfileToggle.classList.remove('open');
          }
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // LOGOUT
      // ═══════════════════════════════════════════════════════════════════════
      document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
          await Session.destroy();
          window.location.href = '../auth/login.html';
        } catch (err) {
          window.location.href = '../auth/login.html';
        }
      });

      // ═══════════════════════════════════════════════════════════════════════
      // ANALYZE FROM FIRESTORE — reads stored text → calls Gemini → renders
      // ═══════════════════════════════════════════════════════════════════════
      const analyzeFromFirestore = async () => {
        const uid = user.uid;

        // Show loading on ALL analyze buttons
        const allAnalyzeBtns = [
          document.getElementById('analyzeResumeBtn'),
          document.getElementById('analyzeResumeBtnRA'),
          document.getElementById('analyzeResumeBtnInAnalysis'),
        ].filter(Boolean);

        allAnalyzeBtns.forEach(btn => {
          btn.dataset.origHtml = btn.innerHTML;
          btn.innerHTML = '<span class="upload-spinner"></span>Analyzing…';
          btn.disabled = true;
          btn.style.display = 'inline-flex';
        });

        try {
          const snap = await db.collection('user_profiles').doc(uid).get();
          if (!snap.exists) throw new Error('No profile found. Please upload a resume first.');

          const pd         = snap.data();
          const resumeText = pd.resumeText;
          const resumeName = pd.resumeName || 'resume.pdf';

          if (!resumeText || resumeText.trim().length < 50)
            throw new Error('No resume text found. Please upload a PDF resume first.');

          // Fast path: if we have an active resume loaded with an analysis, skip calling the AI again.
          // (If a new file was uploaded, pgResume would have been set to null in handleFileUpload).
          if (pgResume && (pgResume.overall_analysis || pgResume.analysis)) {
            populateResumeAnalysisTab(pgResume);

            allAnalyzeBtns.forEach(btn => { btn.style.display = 'none'; });
            const savedEl = document.getElementById('savedResumeName');
            if (savedEl) savedEl.textContent = '';

            if (window.CareerIQAuth && window.CareerIQAuth.Toast) {
              window.CareerIQAuth.Toast.show('✅ Analysis already stored. Showing your existing results!', 'success', 5000);
            }
            return;
          }

          // Call backend — cache is used if analysis already exists for same filename
          const token = await firebase.auth().currentUser.getIdToken();
          const analysis = await window.GeminiClient.analyzeResume(resumeText, token, resumeName);

          pgResume = analysis;

          populateResumeAnalysisTab(pgResume);

          // Hide all analyze buttons after success
          allAnalyzeBtns.forEach(btn => { btn.style.display = 'none'; });
          const savedEl = document.getElementById('savedResumeName');
          if (savedEl) savedEl.textContent = '';

          if (window.CareerIQAuth && window.CareerIQAuth.Toast) {
            window.CareerIQAuth.Toast.show(
              '✅ Analysis complete! See your score on the dashboard and detailed report in "Resume Analysis".',
              'success',
              6000
            );
          }


          // Reset benchmarking tab so it re-fetches for the new resume.
          // The backend fires a new benchmark job after every analysis.
          // Without this reset, the tab shows stale in-memory results.
          setTimeout(function() {
            if (typeof window.benchRun === 'function') {
              window.benchRun();
            } else if (typeof window.initBenchmarking === 'function') {
              window.initBenchmarking();
            }
          }, 2000);

        } catch (err) {
          console.error('Analysis failed:', err);
          if (window.CareerIQAuth && window.CareerIQAuth.Toast) {
            window.CareerIQAuth.Toast.show('⚠️ ' + (err.message || 'Analysis failed. Make sure the backend is running.'), 'error', 6000);
          }
        } finally {
          // Restore button states (keep display as-is — success path sets display:none)
          allAnalyzeBtns.forEach(btn => {
            if (btn.dataset.origHtml) btn.innerHTML = btn.dataset.origHtml;
            btn.disabled = false;
          });
        }
      };

      const analyzeResumeBtn = document.getElementById('analyzeResumeBtn');
      if (analyzeResumeBtn) analyzeResumeBtn.addEventListener('click', analyzeFromFirestore);

      // ═══════════════════════════════════════════════════════════════════════
      // RESUME ANALYSIS TAB — load existing data from database into full view
      // ═══════════════════════════════════════════════════════════════════════
      const raEmptyState   = document.getElementById('raEmptyState');
      const raAnalysisWrap = document.getElementById('raAnalysisWrap');

      // Wire secondary analyze buttons to the main analyze function
      const aBtnRA = document.getElementById('analyzeResumeBtnRA');
      if (aBtnRA) aBtnRA.addEventListener('click', () => analyzeFromFirestore());
      const aBtnInAnalysis = document.getElementById('analyzeResumeBtnInAnalysis');
      if (aBtnInAnalysis) aBtnInAnalysis.addEventListener('click', () => analyzeFromFirestore());

      // ── Chart registry to avoid duplicate chart instances ──────────────────
      const RA_CHARTS = {};
      function raCreateChart(id, config) {
        if (RA_CHARTS[id]) { try { RA_CHARTS[id].destroy(); } catch(e) {} }
        const canvas = document.getElementById(id);
        if (!canvas) return;
        RA_CHARTS[id] = new Chart(canvas.getContext('2d'), config);
        return RA_CHARTS[id];
      }
      const RA_PALETTE = window.COLORS.chart;
      const RA_SECTION_META = [
        { key:'contact',          label:'Contact',          icon:'📇', max:2 },
        { key:'summary',          label:'Summary',          icon:'📝', max:2 },
        { key:'experience',       label:'Experience',       icon:'💼', max:20 },
        { key:'education',        label:'Education',        icon:'🎓', max:20 },
        { key:'skills',           label:'Skills',           icon:'⚡', max:20 },
        { key:'projects',         label:'Projects',         icon:'🚀', max:20 },
        { key:'formatting',       label:'Formatting',       icon:'📄', max:6 },
        { key:'certifications',   label:'Certs',            icon:'🏅', max:20 },
        { key:'extracurriculars', label:'Extracurriculars', icon:'🌐', max:20 },
      ];
      function raGaugeColor(s) { return window.COLORS.getScoreColor(s); }
      function raProgColor(p) { return window.COLORS.getScoreColor(p); }
      function raHeatBg(p) {
        if (p>=80) return 'rgba(34, 197, 94, 0.15)'; // success bg
        if (p>=60) return 'rgba(245, 158, 11, 0.15)'; // warning bg
        if (p>=40) return 'rgba(249, 115, 22, 0.15)'; // orange bg
        return 'rgba(239, 68, 68, 0.15)'; // danger bg
      }
      function raScore(sec, sectionKey) {
        if (!sec) return { score:0, max:0, grade:'—', issues:[], suggestion:null };
        const scoreKey = Object.keys(sec).find(k => k.endsWith('_score'));
        const maxKey   = Object.keys(sec).find(k => k.endsWith('_max'));
        const gradeKey = Object.keys(sec).find(k => k.endsWith('_grade'));
        const sugKey   = Object.keys(sec).find(k => k.endsWith('_suggestions'));
        return {
          score: sec[scoreKey] ?? 0, max: sec[maxKey] ?? 0,
          grade: sec[gradeKey] ?? '—', issues: sec.issues ?? [],
          suggestion: sec[sugKey] ? sec[sugKey][0] : null
        };
      }
      function raHtmlLegend(containerId, items) {
        const el = document.getElementById(containerId); if (!el) return;
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const valColor = isLight ? '#1a1218' : '#ffffff';
        el.innerHTML = items.map(item => {
          return `<div class="ra-legend-item"><span class="ra-legend-dot" style="background:${item.color}"></span><span>${item.label}</span><span style="margin-left:auto;color:${valColor};font-weight:500">${item.value}</span></div>`;
        }).join('');
      }
      function raChartOpts(extra={}) {
        const { plugins, layout, ...rest } = extra;
        return { responsive:true, maintainAspectRatio:false, resizeDelay:100,
          plugins:{ legend:{display:false}, ...plugins },
          layout:{ padding:{top:4,right:8,bottom:4,left:16}, ...layout }, ...rest };
      }
      function raAxisStyle() {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const gridColor = isLight ? 'rgba(194, 24, 91, 0.08)' : 'rgba(244, 165, 176, 0.08)';
        const tickColor = isLight ? '#1a1218' : '#ffffff';
        return {
          grid:{ color: gridColor },
          ticks:{ color: tickColor, font:{family:"'Hanken Grotesk', sans-serif",size:10}, maxRotation:0, autoSkip:false }
        };
      }

      const populateResumeAnalysisTab = (resume) => {
        window._populateResumeAnalysisTab = populateResumeAnalysisTab;
        // ── PlacementIQ Dashboard bridge ──
        window._piqResumeData = resume;
        if (window.PlacementIQ && typeof window.PlacementIQ.populate === 'function') {
          window.PlacementIQ.populate(resume);
        }
        // Also show Analyze button in RA tab if resume text exists but no analysis
        const analyzeInAnalysis = document.getElementById('analyzeResumeBtnInAnalysis');
        if (analyzeInAnalysis) {
          analyzeInAnalysis.style.display = 'none'; // analysis done, hide btn
        }

        // Determine data source — check for master analysis columns first
        const hasOverall = resume && (resume.overall_analysis || (resume.analysis && resume.analysis.overall));
        const hasMasterAnalysis = resume && resume.overall_analysis;

        if (!hasOverall) {
          raEmptyState.style.display = '';
          raAnalysisWrap.style.display = 'none';
          return;
        }
        raEmptyState.style.display = 'none';
        raAnalysisWrap.style.display = 'flex';

        // Pull data from dedicated columns (new) or from legacy analysis blob
        const D = {
          contact:          resume.contact_analysis          || resume.analysis?.contact          || {},
          summary:          resume.summary_analysis          || resume.analysis?.summary          || {},
          experience:       resume.experience_analysis       || resume.analysis?.experience       || {},
          education:        resume.education_analysis        || resume.analysis?.education        || {},
          skills:           resume.skills_analysis           || resume.analysis?.skills           || {},
          projects:         resume.projects_analysis         || resume.analysis?.projects         || {},
          formatting:       resume.formatting_analysis       || resume.analysis?.formatting       || {},
          certifications:   resume.certifications_analysis   || resume.analysis?.certifications   || {},
          extracurriculars: resume.extracurriculars_analysis || resume.analysis?.extracurriculars || {},
          overall:          resume.overall_analysis          || resume.analysis?.overall          || {},
          action_plan:      resume.action_plan_analysis      || resume.analysis?.action_plan      || {},
          completeness:     resume.completeness_analysis     || resume.analysis?.resume_completeness || {},
          confidence:       resume.confidence_analysis       || resume.analysis?.analysis_confidence || {},
        };

        const ov = D.overall;
        const score = ov.overall_score ?? 0;
        const color = raGaugeColor(score);

        // subtitle
        const el_sub = document.getElementById('raSubtitle');
        if (el_sub && resume.file_name) el_sub.textContent = `📄 ${resume.file_name} · ${new Date().toLocaleDateString()}`;

        // ── HERO ────────────────────────────────────────────────────────────
        // Gauge
        const circumference = 2 * Math.PI * 80;
        const gaugeOffset   = circumference - (score / 100) * circumference;
        const gaugeFill     = document.getElementById('raGaugeFill');
        if (gaugeFill) {
          gaugeFill.style.stroke = color;
          gaugeFill.style.strokeDasharray  = circumference;
          gaugeFill.style.strokeDashoffset = circumference;
          setTimeout(() => { gaugeFill.style.strokeDashoffset = gaugeOffset; }, 100);
        }
        const el_grade = document.getElementById('raGaugeGrade');
        if (el_grade) { el_grade.textContent = ov.letter_grade || '—'; el_grade.style.color = color; }
        const el_lbl = document.getElementById('raGaugeLabel');
        if (el_lbl) el_lbl.textContent = `${score} / 100`;
        const heroEl = document.getElementById('raHero');
        if (heroEl) heroEl.style.borderTopColor = color;

        // Badges
        const readinessMap = { ready:'ra-badge-green', almost_ready:'ra-badge-amber', not_ready:'ra-badge-rose', highly_competitive:'ra-badge-blue' };
        const readinessCls = readinessMap[ov.internship_readiness] || 'ra-badge-gray';
        const el_badges = document.getElementById('raHeroBadges');
        if (el_badges) el_badges.innerHTML = `
          <span class="ra-badge ${readinessCls}">● ${(ov.internship_readiness||'').replace(/_/g,' ')}</span>
          <span class="ra-badge ra-badge-blue">↑ ${ov.percentile_estimate||''}</span>
          <span class="ra-badge ra-badge-purple">${ov.letter_grade||''} overall</span>`;

        const el_name = document.getElementById('raHeroName');
        if (el_name) el_name.textContent = ov.grade_label || '';
        const el_verdict = document.getElementById('raHeroVerdict');
        if (el_verdict) el_verdict.textContent = ov.one_line_verdict || '';

        const rc = D.completeness;
        const el_stats = document.getElementById('raHeroStats');
        if (el_stats) el_stats.innerHTML = `
          <div class="ra-hero-stat"><div class="ra-hero-stat-val" style="color:${color}">${score}</div><div class="ra-hero-stat-lbl">Overall Score</div></div>
          <div class="ra-hero-stat"><div class="ra-hero-stat-val">${ov.raw_score || 0}</div><div class="ra-hero-stat-lbl">Raw Points</div></div>
          <div class="ra-hero-stat"><div class="ra-hero-stat-val" style="color:${window.COLORS.getScoreColor(rc.completeness_score || 0)}">${rc.completeness_score || 0}%</div><div class="ra-hero-stat-lbl">Completeness</div></div>
          <div class="ra-hero-stat"><div class="ra-hero-stat-val">${D.projects.total_projects || 0}</div><div class="ra-hero-stat-lbl">Projects</div></div>`;

                    // Hero insights from action plan critical fixes
                    const el_insights = document.getElementById("raHeroInsights");
                    if (el_insights && D.action_plan.critical_fixes) {
                        el_insights.innerHTML = D.action_plan.critical_fixes
                            .slice(0, 3)
                            .map(
                                (f) =>
                                    `<div class="ra-insight" style="--insight-c:${f.severity === "critical" ? "#ef4444" : "#f59e0b"}">
              <strong>${f.fix}</strong>${f.action}</div>`,
                            )
                            .join("");
                    }

                    // ── ANALYTICS OVERVIEW ──────────────────────────────────────────────
                    const breakdown = ov.score_breakdown || {};
                    const secLabels = [],
                        secRaw = [],
                        secMax = [],
                        secPct = [], secColors = [];
                        RA_SECTION_META.forEach((m, i) => {
                        secLabels.push(m.label);
                        const r = breakdown[m.key] ?? 0;
                        secRaw.push(r);
                        secMax.push(m.max);
                        const pct = Math.round((r / m.max) * 100) || 0;
                        secPct.push(pct);
                        secColors.push(window.COLORS.getScoreColor(pct));
                    });

                    // Hero Top Sections chart
                    const sortedSecs = secLabels.map((l, i) => ({ l, v: secPct[i], c: secColors[i] }))
                        .sort((a, b) => b.v - a.v).slice(0, 4);
                    raCreateChart("raChartHeroTop", {
                        type: "bar",
                        data: {
                            labels: sortedSecs.map(s => s.l.length > 10 ? s.l.slice(0, 9) + "…" : s.l),
                            datasets: [{ data: sortedSecs.map(s => s.v), backgroundColor: sortedSecs.map(s => s.c), borderRadius: 5 }]
                        },
                        options: raChartOpts({
                            indexAxis: "y",
                            scales: {
                                x: { min: 0, max: 100, display: false },
                                y: { ...raAxisStyle(), grid: { display: false }, ticks: { font: { size: 9 } } }
                            }
                        })
                    });

                    const ac = D.confidence;
                    const el_asub = document.getElementById("raAnalyticsSub");
                    if (el_asub)
                        el_asub.textContent = `${secLabels.length} sections · ${ac.confidence_score || 0}% confidence`;

                    // Metric strip
                    const el_strip = document.getElementById("raMetricStrip");
                    if (el_strip) {
                        const metrics = [
                            { v: score, l: 'Overall', c: color },
                            { v: ov.raw_score || 0, l: 'Raw Pts', c: '#3b82f6' },
                            { v: (rc.completeness_score || 0) + '%', l: 'Complete', c: '#8b5cf6' },
                            { v: D.projects.total_projects || 0, l: 'Projects', c: '#14b8a6' },
                            { v: D.skills.total_skills_count || 0, l: 'Skills', c: '#ef4444' },
                        ];
                        el_strip.innerHTML = metrics
                            .map(
                                (m) =>
                                    `<div class="ra-metric-cell" style="--mc-accent:${m.c}">
              <div class="ra-metric-val" style="color:${m.c}">${m.v}</div>
              <div class="ra-metric-lbl">${m.l}</div></div>`,
                            )
                            .join("");
                    }

                    // Score pie chart
                    raCreateChart("raChartScorePie", {
                        type: "doughnut",
                        data: {
                            labels: secLabels,
                            datasets: [
                                {
                                    data: secRaw,
                                    backgroundColor: RA_PALETTE,
                                    borderColor: 'transparent',
                                    borderWidth: 2,
                                },
                            ],
                        },
                        options: raChartOpts({ cutout: "60%" }),
                    });
                    raHtmlLegend(
                        "raLegendScorePie",
                        secLabels.map((l, i) => ({
                            label: l,
                            value: secRaw[i] + " pts",
                            color: RA_PALETTE[i % RA_PALETTE.length],
                        })),
                    );

                    // Section bars chart
                    const sbCanvas = document.getElementById("raChartSectionBars");
                    if (sbCanvas) sbCanvas.parentElement.style.height = Math.max(140, secLabels.length * 32) + "px";
                    raCreateChart("raChartSectionBars", {
                        type: "bar",
                        data: {
                            labels: secLabels,
                            datasets: [
                                {
                                    data: secPct,
                                    backgroundColor: secColors.map(
                                        (c) => c + "99",
                                    ),
                                    borderColor: secColors,
                                    borderWidth: 1,
                                    borderRadius: 6,
                                },
                            ],
                        },
                        options: raChartOpts({
                            indexAxis: "y",
                            scales: {
                                x: { min: 0, max: 100, ...raAxisStyle() },
                                y: {
                                    ...raAxisStyle(),
                                    grid: { display: false },
                                },
                            },
                        }),
                    });



                    // ── SCORE BREAKDOWN ─────────────────────────────────────────────────
                    const avg = Math.round(
                        secPct.reduce((a, b) => a + b, 0) / secPct.length,
                    );
                    const el_bsub = document.getElementById("raBreakdownSub");
                    if (el_bsub)
                        el_bsub.textContent = `Avg ${avg}% across 9 sections`;

                    // Heatmap
                    const el_hm = document.getElementById("raHeatmap");
                    if (el_hm)
                        el_hm.innerHTML = secLabels
                            .map(
                                (l, i) =>
                                    `<div class="ra-heatmap-cell" style="background:${raHeatBg(secPct[i])};border-color:${secColors[i]}44" title="${l}: ${secPct[i]}%">
            <span>${secPct[i]}%</span><span style="font-size:14px; margin: 2px 0;">${RA_SECTION_META[i].icon}</span><span style="font-size:10px; font-weight:500; text-align:center; word-break: break-word;">${l}</span></div>`,
                            )
                            .join("");

                    const _isLight = document.documentElement.getAttribute('data-theme') === 'light';
                    const _radarGrid = _isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
                    const _ptBorder = _isLight ? '#ffffff' : '#1a1218';
                    const _ptLabel  = _isLight ? '#1a1218' : '#ffffff';
                    // Radar
                    raCreateChart("raRadarChart", {
                        type: "radar",
                        data: {
                            labels: secLabels,
                            datasets: [
                                {
                                    data: secPct,
                                    backgroundColor: window.COLORS.radar.fill,
                                    borderColor: window.COLORS.radar.border,
                                    borderWidth: 2,
                                    pointBackgroundColor: secColors,
                                    pointRadius: 5,
                                    pointBorderColor: _ptBorder,
                                    pointBorderWidth: 1,
                                },
                            ],
                        },
                        options: raChartOpts({
                            layout: { padding: 8 },
                            scales: {
                                r: {
                                    min: 0,
                                    max: 100,
                                    ticks: {
                                        stepSize: 25,
                                        color: _isLight ? '#1a1218' : '#ffffff',
                                        backdropColor: "transparent",
                                        font: { size: 9 },
                                    },
                                    grid: { color: _radarGrid },
                                    angleLines: { color: _radarGrid },
                                    pointLabels: {
                                        color: _ptLabel,
                                        font: { size: 9, weight: "500" },
                                        padding: 8,
                                    },
                                },
                            },
                        }),
                    });

                    // Bars earned vs max
                    raCreateChart("raChartRadarBars", {
                        type: "bar",
                        data: {
                            labels: secLabels,
                            datasets: [
                                {
                                    label: "Earned",
                                    data: secRaw,
                                    backgroundColor: secColors.map(
                                        (c) => c + "cc",
                                    ),
                                    borderRadius: 4,
                                },
                                {
                                    label: 'Remaining',
                                    data: secMax.map((m, i) => m - secRaw[i]),
                                    backgroundColor: _isLight ? 'rgba(194, 24, 91, 0.06)' : 'rgba(244, 165, 176, 0.06)',
                                    borderRadius: 4,
                                },
                            ],
                        },
                        options: raChartOpts({
                            scales: {
                                x: {
                                    stacked: true,
                                    ...raAxisStyle(),
                                    grid: { display: false },
                                },
                                y: { stacked: true, ...raAxisStyle() },
                            },
                        }),
                    });

                    // ── SECTION SCORE CARDS ─────────────────────────────────────────────
                    const el_scgrid = document.getElementById("raScoreGrid");
                    if (el_scgrid) {
                        el_scgrid.innerHTML = "";
                        RA_SECTION_META.forEach((meta, idx) => {
                            const secData = D[meta.key] || {};
                            const {
                                score: sc,
                                max: mx,
                                grade: gr,
                                issues,
                                suggestion,
                            } = raScore(secData);
                            const p = mx ? Math.round((sc / mx) * 100) : 0;
                            const card = document.createElement("div");
                            card.className = "ra-card ra-score-card";
                            const cAcc = window.COLORS.getScoreColor(p);
                            card.style.setProperty("--sc-accent", cAcc);
                            card.innerHTML = `
              <div class="ra-sc-header">
                <span class="ra-sc-title">
                  <span class="ra-sc-icon" style="background:${cAcc}18;border-color:${cAcc}35">${meta.icon}</span>
                  ${meta.label}
                </span>
                <span class="ra-badge" style="background:${cAcc}18;color:${cAcc};border-color:${cAcc}35">${gr}</span>
              </div>
              <div class="ra-sc-meta">
                <span>${sc} / ${mx} pts</span>
                <span class="ra-sc-pct" style="color:${cAcc}">${p}%</span>
              </div>
              <div class="ra-prog-bar" style="height:7px">
                <div class="ra-prog-fill" style="width:0%;background:${cAcc}" data-w="${p}"></div>
              </div>
              <div class="ra-sc-foot">
                <div class="ra-sc-stat"><b style="color:${cAcc}">${sc}</b>earned</div>
                <div class="ra-sc-stat"><b>${mx - sc}</b>to gain</div>
                <div class="ra-sc-stat"><b>${issues.length}</b>issues</div>
              </div>
              ${issues
                  .slice(0, 2)
                  .map((i) => `<span class="ra-issue-chip">${i.issue}</span>`)
                  .join("")}
              ${suggestion ? `<div class="ra-tip-line">${suggestion}</div>` : ""}`;
                            el_scgrid.appendChild(card);
                        });
                        const el_scsub =
                            document.getElementById("raSectionScoreSub");
                        if (el_scsub)
                            el_scsub.textContent = `9 sections · avg ${avg}%`;
                        // animate bars
                        setTimeout(() => {
                            el_scgrid
                                .querySelectorAll("[data-w]")
                                .forEach((el) => {
                                    el.style.width = el.dataset.w + "%";
                                });
                        }, 150);
                    }

                    // ── SKILLS ──────────────────────────────────────────────────────────
                    const sk = D.skills;
                    const el_skSub = document.getElementById("raSkillsSub");
                    if (el_skSub)
                        el_skSub.textContent = `${sk.total_skills_count || 0} skills · grade ${sk.skills_grade || "—"}`;
                    const el_skTip = document.getElementById("raSkillsTip");
                    if (el_skTip && sk.skills_suggestions)
                        el_skTip.innerHTML = `<strong>Tip:</strong> ${sk.skills_suggestions[0] || ""}`;

                    const catLabels = [
                        "Technical",
                        "Frameworks",
                        "Tools",
                        "Soft Skills",
                    ];
                    const catData = [
                        sk.technical_skills?.length || 0,
                        sk.frameworks_and_libraries?.length || 0,
                        sk.tools_and_platforms?.length || 0,
                        sk.soft_skills?.length || 0,
                    ];
                    const catColors = ['#3b82f6', '#14b8a6', '#8b5cf6', '#f97316'];
                    raCreateChart("raChartSkillsCat", {
                        type: "doughnut",
                        data: {
                            labels: catLabels,
                            datasets: [
                                {
                                    data: catData,
                                    backgroundColor: catColors,
                                    borderColor: "transparent",
                                    borderWidth: 2,
                                },
                            ],
                        },
                        options: raChartOpts({ cutout: "55%" }),
                    });
                    raHtmlLegend(
                        "raLegendSkillsCat",
                        catLabels.map((l, i) => ({
                            label: l,
                            value: catData[i],
                            color: catColors[i],
                        })),
                    );

                    const allSk = [
                        ...(sk.technical_skills || []),
                        ...(sk.frameworks_and_libraries || []),
                        ...(sk.tools_and_platforms || []),
                        ...(sk.soft_skills || []),
                    ];
                    const wEvidence =
                        allSk.length -
                        (sk.skills_without_evidence?.length || 0) -
                        (sk.too_basic_flagged?.length || 0);
                    const noEv = sk.skills_without_evidence?.length || 0,
                        basic = sk.too_basic_flagged?.length || 0;
                    raCreateChart("raChartSkillsEv", {
                        type: "bar",
                        data: {
                            labels: [
                                "With Evidence",
                                "No Evidence",
                                "Too Basic",
                            ],
                            datasets: [
                                {
                                    data: [wEvidence, noEv, basic],
                                    backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                                    borderRadius: 8,
                                },
                            ],
                        },
                        options: raChartOpts({
                            scales: {
                                x: {
                                    ...raAxisStyle(),
                                    grid: { display: false },
                                },
                                y: { ...raAxisStyle(), ticks: { stepSize: 1 } },
                            },
                        }),
                    });

                    const el_skRows = document.getElementById("raSkillsRows");
                    if (el_skRows) {
                        el_skRows.innerHTML = "";
                        [
                            ["Technical", sk.technical_skills],
                            ["Frameworks", sk.frameworks_and_libraries],
                            ["Tools", sk.tools_and_platforms],
                            ["Soft Skills", sk.soft_skills],
                        ].forEach(([lbl, items]) => {
                            if (!items || !items.length) return;
                            const div = document.createElement("div");
                            div.className = "ra-skills-row";
                            const pills = items
                                .map((s) => {
                                    let cls = "ra-pill";
                                    if (sk.skills_without_evidence?.includes(s))
                                        cls += " ra-pill-amber";
                                    if (sk.too_basic_flagged?.includes(s))
                                        cls += " ra-pill-red";
                                    return `<span class="${cls}">${s}</span>`;
                                })
                                .join("");
                            div.innerHTML = `<div class="ra-skills-row-lbl">${lbl}</div><div class="ra-pills">${pills}</div>`;
                            el_skRows.appendChild(div);
                        });
                    }

                    // ── PROJECTS ────────────────────────────────────────────────────────
                    const pr = D.projects;
                    const el_prSub = document.getElementById("raProjSub");
                    if (el_prSub)
                        el_prSub.textContent = `${pr.total_projects || 0} projects · grade ${pr.projects_grade || "—"}`;
                    const el_prTip = document.getElementById("raProjTip");
                    if (el_prTip && pr.projects_suggestions)
                        el_prTip.innerHTML = `<strong>Tip:</strong> ${pr.projects_suggestions[0] || ""}`;

                    const projList = pr.projects || [];
                    const projNames = projList.map((p) => p.name || "Project");
                    const projScores = projList.map(
                        (p) => p.project_score || 0,
                    );
                    raCreateChart("raChartProjBar", {
                        type: "bar",
                        data: {
                            labels: projNames.map((n) =>
                                n.length > 16 ? n.slice(0, 14) + "…" : n,
                            ),
                            datasets: [
                                {
                                    data: projScores,
                                    backgroundColor: projScores.map((_, i) => window.COLORS.chart[i % window.COLORS.chart.length]),
                                    borderRadius: 8,
                                },
                            ],
                        },
                        options: raChartOpts({
                            scales: {
                                x: {
                                    ...raAxisStyle(),
                                    grid: { display: false },
                                },
                                y: { min: 0, max: 10, ...raAxisStyle() },
                            },
                        }),
                    });

                    const withLink = projList.filter((p) => p.has_link).length;
                    const withOutcome = projList.filter(
                        (p) => p.has_outcome,
                    ).length;
                    const tutorial = projList.filter(
                        (p) => p.is_tutorial_level,
                    ).length;
                    raCreateChart("raChartProjHealth", {
                        type: "doughnut",
                        data: {
                            labels: ["Has Link", "Has Outcome", "Tutorial"],
                            datasets: [
                                {
                                    data: [withLink, withOutcome, tutorial],
                                    backgroundColor: [
                                        window.COLORS.chart[0],
                                        window.COLORS.chart[1],
                                        window.COLORS.chart[2]
                                    ],
                                    borderColor: "transparent",
                                    borderWidth: 2,
                                },
                            ],
                        },
                        options: raChartOpts({ cutout: "58%" }),
                    });
                    raHtmlLegend("raLegendProjHealth", [
                        {
                            label: "Has Link",
                            value: withLink,
                            color: window.COLORS.chart[0],
                        },
                        {
                            label: "Has Outcome",
                            value: withOutcome,
                            color: window.COLORS.chart[1],
                        },
                        {
                            label: "Tutorial",
                            value: tutorial,
                            color: window.COLORS.chart[2],
                        },
                    ]);

                    const el_prgrid = document.getElementById("raProjGrid");
                    if (el_prgrid) {
                        el_prgrid.innerHTML = "";
                        projList.forEach((p, i) => {
                            const complexMap = {
                                basic: "ra-badge-gray",
                                intermediate: "ra-badge-amber",
                                advanced: "ra-badge-blue",
                                impressive: "ra-badge-green",
                            };
                            const techPills = (p.technologies || [])
                                .map((t) => `<span class="ra-pill">${t}</span>`)
                                .join("");
                            const card = document.createElement("div");
                            card.className = "ra-proj-card";
                            card.innerHTML = `
              <div class="ra-proj-rank">Project ${i + 1} · ${p.type || "personal"}</div>
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem">
                <span class="ra-proj-name">${p.name || "Project"}</span>
                <span class="ra-badge ${complexMap[p.complexity] || "ra-badge-gray"}">${p.complexity || "—"}</span>
              </div>
              <div class="ra-pills">${techPills}</div>
              <span class="ra-pill ${p.description_quality === "excellent" ? "ra-pill-green" : p.description_quality === "good" ? "ra-pill-green" : p.description_quality === "fair" ? "ra-pill-amber" : "ra-pill-red"}">${p.description_quality || "—"}</span>
              <div class="ra-proj-flags">
                <span>${p.has_link ? "✅" : "❌"} GitHub link</span>
                <span>${p.has_outcome ? "✅" : "❌"} Outcome</span>
              </div>
              <div style="display:flex;align-items:center;gap:0.5rem;font-size:11px;color:var(--ra-muted)">
                <span>Score</span>
                <div class="ra-prog-bar" style="flex:1"><div class="ra-prog-fill" style="width:${(p.project_score || 0) * 10}%;background:#3b82f6"></div></div>
                <span>${p.project_score || 0}/10</span>
              </div>`;
                            el_prgrid.appendChild(card);
                        });
                    }

                    // ── EXPERIENCE ──────────────────────────────────────────────────────
                    const ex = D.experience;
                    const el_exSub = document.getElementById("raExpSub");
                    if (el_exSub)
                        el_exSub.textContent = `${(ex.roles || []).length} roles · ${ex.internship_count || 0} internship · grade ${ex.experience_grade || "—"}`;
                    const el_exTip = document.getElementById("raExpTip");
                    if (el_exTip && ex.experience_suggestions)
                        el_exTip.innerHTML = `<strong>Tip:</strong> ${ex.experience_suggestions[0] || ""}`;

                    const roles = ex.roles || [];
                    const roleNames = roles.map((r) => r.job_title || "Role");
                    const roleScores = roles.map((r) => r.role_score || 0);
                    const roleDurations = roles.map(
                        (r) => r.duration_months || 0,
                    );
                    const dotMap = {
                        active: "#3b82f6",
                        mostly_observation: "#f59e0b",
                        unclear: "#ef4444",
                    };
                    raCreateChart("raChartExpScores", {
                        type: "bar",
                        data: {
                            labels: roleNames,
                            datasets: [
                                {
                                    data: roleScores,
                                    backgroundColor: roles.map(
                                        (r) =>
                                            dotMap[r.contribution_quality] ||
                                            "#3b82f6",
                                    ),
                                    borderRadius: 6,
                                },
                            ],
                        },
                        options: raChartOpts({
                            scales: {
                                x: {
                                    ...raAxisStyle(),
                                    grid: { display: false },
                                },
                                y: { min: 0, max: 10, ...raAxisStyle() },
                            },
                        }),
                    });
                    raCreateChart("raChartExpDuration", {
                        type: "bar",
                        data: {
                            labels: roleNames,
                            datasets: [
                                {
                                    data: roleDurations,
                                    backgroundColor: window.COLORS.chart[0],
                                    borderColor: window.COLORS.chart[0],
                                    borderWidth: 1,
                                    borderRadius: 6,
                                },
                            ],
                        },
                        options: raChartOpts({
                            scales: {
                                x: {
                                    ...raAxisStyle(),
                                    grid: { display: false },
                                },
                                y: { ...raAxisStyle(), ticks: { stepSize: 1 } },
                            },
                        }),
                    });

                    const el_tl = document.getElementById("raTimeline");
                    if (el_tl) {
                        el_tl.innerHTML = "";
                        if (roles.length === 0 && ex.no_experience_note) {
                            el_tl.innerHTML = `<div class="ra-section-tip"><strong>Note:</strong> ${ex.no_experience_note}</div>`;
                        } else {
                            roles.forEach((role) => {
                                const dotColor =
                                    dotMap[role.contribution_quality] ||
                                    "#c5c6ca";
                                const item = document.createElement("div");
                                item.className = "ra-tl-item";
                                item.innerHTML = `
                <div class="ra-tl-dot" style="background:${dotColor}"></div>
                <div class="ra-tl-body">
                  <div class="ra-tl-header">
                    <span style="font-weight:500">${role.job_title || "Role"}</span>
                    <span style="color:var(--ra-muted)">@ ${role.company || ""}</span>
                    <span class="ra-badge ra-badge-blue">${(role.type || "").replace(/_/g, " ")}</span>
                    <span class="ra-badge ra-badge-gray">${role.duration_months || 0} mo</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.4rem;font-size:11px;color:var(--ra-muted)">
                    <span>Role score</span>
                    <div class="ra-prog-bar" style="width:120px"><div class="ra-prog-fill" style="width:${(role.role_score || 0) * 10}%;background:${dotColor}"></div></div>
                    <span>${role.role_score || 0}/10</span>
                  </div>
                </div>`;
                                el_tl.appendChild(item);
                            });
                        }
                    }

                    // ── EDUCATION ──────────────────────────────────────────────────────
                    const ed = D.education;
                    const eduEntries = ed.education_entries || [];
                    const el_eduSub = document.getElementById("raEduSub");
                    if (el_eduSub)
                        el_eduSub.textContent = `${eduEntries.length} institution(s) · grade ${ed.education_grade || "—"}`;
                    if (eduEntries.length > 0) {
                        const first = eduEntries[0];
                        raCreateChart("raChartEduCoverage", {
                            type: "bar",
                            data: {
                                labels: ["Coursework", "Tools", "GPA×10"],
                                datasets: [
                                    {
                                        data: [
                                            (first.relevant_coursework || [])
                                                .length,
                                            (first.tools_in_coursework || [])
                                                .length,
                                            Math.round(
                                                parseFloat(first.gpa || 0) * 10,
                                            ),
                                        ],
                                        backgroundColor: [
                                            "#3b82f6",
                                            "#3b82f6",
                                            "#8b5cf6",
                                        ],
                                        borderRadius: 8,
                                    },
                                ],
                            },
                            options: raChartOpts({
                                scales: {
                                    x: {
                                        ...raAxisStyle(),
                                        grid: { display: false },
                                    },
                                    y: { ...raAxisStyle() },
                                },
                            }),
                        });
                    }
                    const el_eduEnt = document.getElementById("raEduEntries");
                    if (el_eduEnt) {
                        el_eduEnt.innerHTML = "";
                        eduEntries.forEach((e) => {
                            const gpaMap = {
                                "strong (8.5+)": "ra-badge-green",
                                "good (8.0-6.5)": "ra-badge-blue",
                                "average (6.49-4.99)": "ra-badge-amber",
                                not_listed: "ra-badge-gray",
                            };
                            const div = document.createElement("div");
                            div.style.cssText =
                                "display:flex;flex-direction:column;gap:0.6rem;";
                            div.innerHTML = `
              <div style="font-size:15px;font-weight:500">${e.institution || "Institution"}</div>
              <div style="color:var(--ra-muted);font-size:12px">${e.degree_type || ""} in ${e.field_of_study || ""} · ${e.graduation_year || "Expected unknown"}</div>
              <div style="display:flex;flex-wrap:wrap;gap:0.35rem;">
                ${e.gpa ? `<span class="ra-badge ${gpaMap[e.gpa_assessment] || "ra-badge-gray"}">GPA ${e.gpa}</span>` : ""}
                ${(e.relevant_coursework || [])
                    .slice(0, 6)
                    .map((c) => `<span class="ra-pill">${c}</span>`)
                    .join("")}
                ${(e.tools_in_coursework || [])
                    .slice(0, 4)
                    .map(
                        (t) =>
                            `<span class="ra-pill ra-pill-green">${t}</span>`,
                    )
                    .join("")}
              </div>
              ${e.specialization_or_minor ? `<div style="font-size:11px;color:var(--ra-muted)">📚 ${e.specialization_or_minor}</div>` : ""}
              ${ed.education_suggestions ? `<div class="ra-section-tip"><strong>Tip:</strong> ${ed.education_suggestions[0]}</div>` : ""}`;
                            el_eduEnt.appendChild(div);
                        });
                    }

                    // ── CERTIFICATIONS & ACHIEVEMENTS ──────────────────────────────────
                    const ct = D.certifications;
                    const ex2 = D.extracurriculars;
                    const el_certSub = document.getElementById("raCertSub");
                    if (el_certSub)
                        el_certSub.textContent = `Grade ${ct.certifications_grade || "—"} certs · Grade ${ex2.extracurricular_grade || "—"} extras`;

                    const relMap = {};
                    (ct.certifications_found || []).forEach((c) => {
                        const k = c.relevance.replace(/_/g, " ");
                        relMap[k] = (relMap[k] || 0) + 1;
                    });
                    const relLabels = Object.keys(relMap),
                        relData = Object.values(relMap);
                    const relColors = relLabels.map((l) =>
                        l.includes("highly")
                            ? "#3b82f6"
                            : l.includes("somewhat")
                              ? "#f59e0b"
                              : "#ef4444",
                    );
                    raCreateChart("raChartCertRel", {
                        type: "pie",
                        data: {
                            labels: relLabels,
                            datasets: [
                                {
                                    data: relData,
                                    backgroundColor: relColors,
                                    borderColor: "transparent",
                                    borderWidth: 2,
                                },
                            ],
                        },
                        options: raChartOpts(),
                    });
                    raHtmlLegend(
                        "raLegendCertRel",
                        relLabels.map((l, i) => ({
                            label: l,
                            value: relData[i],
                            color: relColors[i],
                        })),
                    );

                    const acts = ex2.activities || [];
                    raCreateChart("raChartExtraBar", {
                        type: "bar",
                        data: {
                            labels: acts.map((a) =>
                                ((a.activity_name || "Activity").length > 14 ? (a.activity_name || "Activity").slice(0, 13) + "…" : (a.activity_name || "Activity")),
                            ),
                            datasets: [
                                {
                                    data: acts.map(
                                        (a) => a.activity_score || 0,
                                    ),
                                    backgroundColor: acts.map((a) =>
                                        a.is_leadership ? "#8b5cf6" : "#3b82f6",
                                    ),
                                    borderRadius: 6,
                                },
                            ],
                        },
                        options: raChartOpts({
                            indexAxis: "y",
                            scales: {
                                x: { min: 0, max: 10, ...raAxisStyle() },
                                y: {
                                    ...raAxisStyle(),
                                    grid: { display: false },
                                },
                            },
                        }),
                    });

                    const el_cag = document.getElementById("raCertAchieveGrid");
                    if (el_cag) {
                        el_cag.innerHTML = "";
                        // Certifications column
                        const col1 = document.createElement("div");
                        col1.innerHTML =
                            '<div style="font-size:13px;font-weight:600;color:var(--ra-text);margin-bottom:1rem">🏅 Certifications</div>';
                        (ct.certifications_found || []).forEach((c) => {
                            const relCls =
                                c.relevance === "highly_relevant"
                                    ? "ra-badge-green"
                                    : c.relevance === "somewhat_relevant"
                                      ? "ra-badge-amber"
                                      : "ra-badge-gray";
                            col1.innerHTML += `<div class="ra-cert-card">
              <div class="ra-cert-name">${c.name || ""}</div>
              <div class="ra-cert-meta">
                <span class="ra-badge ${relCls}">${(c.relevance || "").replace(/_/g, " ")}</span>
                <span>by ${c.issuer || ""}</span>${c.year ? `<span>${c.year}</span>` : ""}
              </div></div>`;
                        });
                        if (
                            !ct.certifications_found?.length &&
                            ct.no_certifications_note
                        )
                            col1.innerHTML += `<div class="ra-section-tip">${ct.no_certifications_note}</div>`;
                        el_cag.appendChild(col1);
                        // Achievements column
                        const col2 = document.createElement("div");
                        col2.innerHTML =
                            '<div style="font-size:13px;font-weight:600;color:var(--ra-text);margin-bottom:1rem">🏆 Achievements</div>';
                        if (ct.most_impressive_achievement)
                            col2.innerHTML += `<div style="background:rgba(255, 179, 176, 0.08);border:1px solid rgba(255, 179, 176, 0.3);border-radius:12px;padding:0.8rem;margin-bottom:0.75rem;display:flex;gap:0.55rem;align-items:flex-start">
              <span style="font-size:20px">⭐</span><div><div style="font-weight:500;font-size:13px">${ct.most_impressive_achievement}</div></div></div>`;
                        (ct.achievements_found || []).forEach((a) => {
                            col2.innerHTML += `<div class="ra-achieve-item">
              <span class="ra-achieve-icon">${a.type === "competition_win" ? "🥇" : a.type === "academic_award" ? "🎖️" : "🌟"}</span>
              <div><div class="ra-achieve-title">${a.title || ""}</div>
                <div class="ra-achieve-meta">${a.scale || ""} ${a.year ? `· ${a.year}` : ""}</div></div></div>`;
                        });
                        if (
                            !ct.achievements_found?.length &&
                            ct.no_achievements_note
                        )
                            col2.innerHTML += `<div class="ra-section-tip">${ct.no_achievements_note}</div>`;
                        el_cag.appendChild(col2);
                    }

                    // ── FORMATTING & ATS ─────────────────────────────────────────────────
                    const fm = D.formatting;
                    const el_fmtSub = document.getElementById("raFmtSub");
                    if (el_fmtSub)
                        el_fmtSub.textContent = `ATS Risk: ${fm.ats_risk_level || "—"} · grade ${fm.formatting_grade || "—"}`;

                    const strong = (fm.strong_verbs_found || []).length,
                        weak = (fm.weak_verbs_found || []).length,
                        filler = (fm.filler_phrases || []).length;
                    const _vBorder = 'transparent';
                    raCreateChart("raChartFmtVerbs", {
                        type: "doughnut",
                        data: {
                            labels: ["Strong Verbs", "Weak Verbs", "Filler"],
                            datasets: [
                                {
                                    data: [strong, weak, filler],
                                    backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                                    borderColor: _vBorder,
                                    borderWidth: 2,
                                },
                            ],
                        },
                        options: raChartOpts({ cutout: "55%" }),
                    });
                    raHtmlLegend("raLegendFmtVerbs", [
                        { label: "Strong", value: strong, color: "#3b82f6" },
                        { label: "Weak", value: weak, color: "#f59e0b" },
                        { label: "Filler", value: filler, color: "#ef4444" },
                    ]);

                    const atsV =
                        { low: 85, medium: 50, high: 20, critical: 10 }[
                            fm.ats_risk_level
                        ] || 50;
                    const atsC =
                        fm.ats_risk_level === "low"
                            ? "#3b82f6"
                            : fm.ats_risk_level === "medium"
                              ? "#f59e0b"
                              : "#ef4444";
                    const _gaugeBg =
                        document.documentElement.getAttribute("data-theme") ===
                        "light"
                            ? "rgba(244, 165, 176, 0.08)"
                            : "rgba(255,255,255,0.06)";
                    raCreateChart("raChartAtsGauge", {
                        type: "doughnut",
                        data: {
                            labels: ["Health", "Risk"],
                            datasets: [
                                {
                                    data: [atsV, 100 - atsV],
                                    backgroundColor: [atsC, _gaugeBg],
                                    borderWidth: 0,
                                },
                            ],
                        },
                        options: raChartOpts({
                            cutout: "72%",
                            circumference: 180,
                            rotation: -90,
                        }),
                    });

                    const el_fmtC = document.getElementById("raFmtContent");
                    if (el_fmtC) {
                        const atsMap = {
                            low: "ra-ats-low",
                            medium: "ra-ats-medium",
                            high: "ra-ats-high",
                            critical: "ra-ats-high",
                        };
                        el_fmtC.innerHTML = `<div class="ra-ats-banner ${atsMap[fm.ats_risk_level] || "ra-ats-medium"}">
            ATS Risk: <strong>${(fm.ats_risk_level || "unknown").toUpperCase()}</strong> · Page Count: ${fm.page_count || "—"}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
            <div><div style="font-size:11px;color:var(--ra-muted);margin-bottom:0.4rem">✅ Strong Verbs</div><div class="ra-pills">${(fm.strong_verbs_found || []).map((v) => `<span class="ra-pill ra-pill-green">${v}</span>`).join("") || "None found"}</div></div>
            <div><div style="font-size:11px;color:var(--ra-muted);margin-bottom:0.4rem">⚠️ Weak Verbs</div><div class="ra-pills">${(fm.weak_verbs_found || []).map((v) => `<span class="ra-pill ra-pill-amber">${v}</span>`).join("") || "None found"}</div></div>
          </div>
          ${fm.filler_phrases?.length ? `<div style="margin-bottom:0.75rem"><div style="font-size:11px;color:var(--ra-muted);margin-bottom:0.4rem">🚫 Filler Phrases</div><div class="ra-pills">${fm.filler_phrases.map((v) => `<span class="ra-pill ra-pill-red">${v}</span>`).join("")}</div></div>` : ""}
          ${fm.formatting_suggestions ? `<div class="ra-section-tip"><strong>Tip:</strong> ${fm.formatting_suggestions[0]}</div>` : ""}`;
                    }

                    // ── ACTION PLAN ─────────────────────────────────────────────────────
                    const ap = D.action_plan;
                    const el_apSub = document.getElementById("raActionSub");
                    if (el_apSub)
                        el_apSub.textContent = `${(ap.critical_fixes || []).length} critical · ${(ap.quick_wins || []).length} quick wins`;

                    const sevCounts = {};
                    if ((ap.critical_fixes || []).length > 0) sevCounts["Critical"] = ap.critical_fixes.length;
                    if ((ap.quick_wins || []).length > 0) sevCounts["Quick Wins"] = ap.quick_wins.length;
                    if ((ap.this_week || []).length > 0) sevCounts["This Week"] = ap.this_week.length;
                    if ((ap.long_term_suggestions || []).length > 0) sevCounts["Long Term"] = ap.long_term_suggestions.length;
                    
                    const sevL = Object.keys(sevCounts);
                    const sevD = Object.values(sevCounts);
                    const sevColors = sevL.map((s) =>
                        s === "Critical" ? "#ef4444" :
                        s === "Quick Wins" ? "#f59e0b" :
                        s === "This Week" ? "#3b82f6" :
                        "#8b5cf6"
                    );
                    raCreateChart("raChartActionSev", {
                        type: "pie",
                        data: {
                            labels: sevL,
                            datasets: [
                                {
                                    data: sevD,
                                    backgroundColor: sevColors,
                                    borderColor: "transparent",
                                    borderWidth: 2,
                                },
                            ],
                        },
                        options: raChartOpts(),
                    });
                    raHtmlLegend(
                        "raLegendActionSev",
                        sevL.map((l, i) => ({
                            label: l,
                            value: sevD[i],
                            color: sevColors[i],
                        })),
                    );

                    const gains = (ap.quick_wins || []).map(
                        (w) => parseInt(w.expected_score_gain) || 1,
                    );
                    const gainLabels = (ap.quick_wins || []).map(w => { let a = w.action || ""; return a.length > 16 ? a.slice(0, 15) + "…" : a; });
                    const qwCanvas = document.getElementById("raChartQuickWins");
                    if (qwCanvas) qwCanvas.parentElement.style.height = Math.max(140, gains.length * 32) + "px";
                    raCreateChart("raChartQuickWins", {
                        type: "bar",
                        data: {
                            labels: gainLabels,
                            datasets: [
                                {
                                    data: gains,
                                    backgroundColor: window.COLORS.chart[0],
                                    borderRadius: 6,
                                },
                            ],
                        },
                        options: raChartOpts({
                            indexAxis: "y",
                            scales: {
                                x: { ...raAxisStyle(), ticks: { stepSize: 1 } },
                                y: {
                                    ...raAxisStyle(),
                                    grid: { display: false },
                                },
                            },
                        }),
                    });

                    // Action plan tabs
                    const el_tabBar = document.getElementById("raTabBar");
                    const el_tabPanels = document.getElementById("raTabPanels");
                    if (el_tabBar && el_tabPanels) {
                        const tabs = [
                            {
                                id: "critical",
                                label: `🔴 Critical (${(ap.critical_fixes || []).length})`,
                            },
                            {
                                id: "qw",
                                label: `⚡ Quick Wins (${(ap.quick_wins || []).length})`,
                            },
                            {
                                id: "week",
                                label: `📅 This Week (${(ap.this_week_improvements || []).length})`,
                            },
                            {
                                id: "long",
                                label: `🚀 Long Term (${(ap.long_term_suggestions || []).length})`,
                            },
                        ];
                        el_tabBar.innerHTML = tabs
                            .map(
                                (t, i) =>
                                    `<button class="ra-tab-btn${i === 0 ? " active" : ""}" data-tab="${t.id}">${t.label}</button>`,
                            )
                            .join("");
                        el_tabPanels.innerHTML = `
            <div class="ra-tab-panel active" id="raTp-critical">${(ap.critical_fixes || []).map((f) => `<div class="ra-fix-card"><div class="ra-fix-header"><span class="ra-fix-title">${f.fix || ""}</span><div style="display:flex;gap:0.35rem"><span class="ra-badge ${f.severity === "critical" ? "ra-badge-rose" : "ra-badge-amber"}">${f.severity || ""}</span><span class="ra-time-chip">⏱ ${f.time_to_fix || ""}</span></div></div><div style="font-size:12px;color:var(--ra-muted)">${f.action || ""}</div></div>`).join("") || '<div class="ra-section-tip">No critical fixes — great job! 🎉</div>'}</div>
            <div class="ra-tab-panel" id="raTp-qw">${(ap.quick_wins || []).map((w) => `<div class="ra-qw-row"><span style="font-size:12px;flex:1">${w.action || ""}</span><div style="display:flex;gap:0.5rem;align-items:center"><span class="ra-gain">${w.expected_score_gain || ""}</span><span class="ra-time-chip">${w.time_to_fix || ""}</span></div></div>`).join("") || "No quick wins listed."}</div>
            <div class="ra-tab-panel" id="raTp-week">${(ap.this_week_improvements || []).map((w) => `<div class="ra-week-card"><div class="ra-week-tag">${w.section || ""}</div><div style="font-weight:500;font-size:13px;margin-bottom:0.3rem">${w.improvement || ""}</div><div style="font-size:11px;color:var(--ra-muted);margin-bottom:0.5rem">${w.why_it_matters || ""}</div>${w.example ? `<div style="font-size:11px"><span style="color:var(--ra-rose)">${w.example.split("→")[0] || ""}</span><span style="color:var(--ra-muted)"> → </span><span style="color:var(--ra-emerald)">${w.example.split("→")[1] || ""}</span></div>` : ""}</div>`).join("") || "No weekly improvements listed."}</div>
            <div class="ra-tab-panel" id="raTp-long">${(ap.long_term_suggestions || []).map((s) => `<div class="ra-lt-card"><span class="ra-tl-badge">${s.timeline || ""}</span><div><div style="font-weight:500;font-size:13px;margin-bottom:0.3rem">${s.suggestion || ""}</div><div style="font-size:11px;color:var(--ra-muted)">${s.impact || ""}</div></div></div>`).join("") || "No long-term suggestions listed."}</div>`;

                        el_tabBar
                            .querySelectorAll(".ra-tab-btn")
                            .forEach((btn) => {
                                btn.addEventListener("click", () => {
                                    el_tabBar
                                        .querySelectorAll(".ra-tab-btn")
                                        .forEach((b) =>
                                            b.classList.remove("active"),
                                        );
                                    el_tabPanels
                                        .querySelectorAll(".ra-tab-panel")
                                        .forEach((p) =>
                                            p.classList.remove("active"),
                                        );
                                    btn.classList.add("active");
                                    const panel = document.getElementById(
                                        "raTp-" + btn.dataset.tab,
                                    );
                                    if (panel) panel.classList.add("active");
                                });
                            });
                    }

                    // ── COMPLETENESS ────────────────────────────────────────────────────
                    const rc2 = D.completeness;
                    const el_compSub = document.getElementById("raCompSub");
                    if (el_compSub)
                        el_compSub.textContent = `${rc2.completeness_score || 0}% complete · grade ${rc2.completeness_grade || "—"}`;

                    const comp = (rc2.sections_complete || []).length,
                        miss = (rc2.sections_missing || []).length,
                        under = (rc2.sections_underdeveloped || []).length;
                    raCreateChart("raChartCompStatus", {
                        type: "doughnut",
                        data: {
                            labels: ["Complete", "Missing", "Underdeveloped"],
                            datasets: [
                                {
                                    data: [comp, miss, under],
                                    backgroundColor: [
                                        "#3b82f6",
                                        "#ef4444",
                                        "#f59e0b",
                                    ],
                                    borderColor: "transparent",
                                    borderWidth: 2,
                                },
                            ],
                        },
                        options: raChartOpts({ cutout: "60%" }),
                    });
                    raHtmlLegend("raLegendCompStatus", [
                        { label: "Complete", value: comp, color: "#3b82f6" },
                        { label: "Missing", value: miss, color: "#ef4444" },
                        {
                            label: "Underdeveloped",
                            value: under,
                            color: window.COLORS.chart[0],
                        },
                    ]);

                    const densityMap = {
                        sparse: 25,
                        thin: 40,
                        adequate: 55,
                        full: 75,
                        overpacked: 95,
                    };
                    const impactMap = {
                        low: 25,
                        moderate: 55,
                        high: 85,
                        critical: 95,
                    };
                    raCreateChart("raChartDensity", {
                        type: "bar",
                        data: {
                            labels: ["Completeness", "Density", "Impact"],
                            datasets: [
                                {
                                    data: [
                                        rc2.completeness_score || 0,
                                        densityMap[rc2.resume_density] || 50,
                                        impactMap[
                                            rc2.missing_sections_impact
                                        ] || 50,
                                    ],
                                    backgroundColor: [
                                        "#3b82f6",
                                        "#3b82f6",
                                        "#f59e0b",
                                    ],
                                    borderRadius: 8,
                                },
                            ],
                        },
                        options: raChartOpts({
                            scales: {
                                x: {
                                    ...raAxisStyle(),
                                    grid: { display: false },
                                },
                                y: { min: 0, max: 100, ...raAxisStyle() },
                            },
                        }),
                    });

                    const el_compC = document.getElementById("raCompContent");
                    if (el_compC) {
                        el_compC.innerHTML = `
            <div class="ra-comp-cols">
              <div><div class="ra-comp-col-title">✅ Complete</div>${(rc2.sections_complete || []).map((s) => '<div class="ra-comp-item"><span>✅</span><span>' + s + '</span></div>').join("") || "None"}</div>
              <div><div class="ra-comp-col-title">❌ Missing</div>${(rc2.sections_missing || []).map((s) => '<div class="ra-comp-item"><span>❌</span><span>' + s + '</span></div>').join("") || "None"}</div>
              <div><div class="ra-comp-col-title">⚠️ Underdeveloped</div>${(rc2.sections_underdeveloped || []).map((s) => '<div class="ra-comp-item"><span>⚠️</span><span><strong>' + s.section + '</strong>: ' + s.reason + '</span></div>').join("") || "None"}</div>
            </div>
            ${rc2.completeness_note ? `<div class="ra-comp-note">${rc2.completeness_note}</div>` : ""}`;
                    }

                    // ── STRENGTHS & GAPS ─────────────────────────────────────────────────
                    const el_sg = document.getElementById("raStrengthsGrid");
                    if (el_sg && ap.strengths_to_highlight) {
                        el_sg.innerHTML = `
            <div class="ra-card ra-panel-s">
              <div style="font-size:13px;font-weight:600;color:var(--ra-emerald);margin-bottom:0.75rem">💪 Key Strengths</div>
              <ul class="ra-panel-list">${(ap.strengths_to_highlight || []).map((s) => `<li><span>✅</span><span>${s}</span></li>`).join("")}</ul>
            </div>
            <div class="ra-card ra-panel-g">
              <div style="font-size:13px;font-weight:600;color:var(--ra-rose);margin-bottom:0.75rem">🎯 Biggest Gaps</div>
              <ul class="ra-panel-list">${(ap.biggest_gaps || []).map((s) => `<li><span>❌</span><span>${s}</span></li>`).join("")}</ul>
            </div>`;
                    }

                    // ── RECOMMENDATIONS ──────────────────────────────────────────────────
                    const el_recs = document.getElementById("raRecsContent");
                    if (el_recs && ap) {
                        const roles2 = (ap.recommended_internship_roles || [])
                            .map(
                                (r) =>
                                    `<button class="ra-role-btn">${r}</button>`,
                            )
                            .join("");
                        const certs = (ap.recommended_certifications || [])
                            .map(
                                (c) =>
                                    `<div class="ra-cert-rec-card"><span style="font-size:16px;color:var(--ra-blue)">📜</span><span style="font-weight:500;font-size:12px">${c}</span></div>`,
                            )
                            .join("");
                        el_recs.innerHTML = `
            <div class="ra-roles-pills">${roles2}</div>
            <div class="ra-certs-rec-grid">${certs}</div>
            ${ap.encouragement ? `<div class="ra-encouragement">${ap.encouragement}</div>` : ""}
            ${D.confidence.confidence_score ? `<div style="margin-top:1rem;display:flex;justify-content:flex-end"><span class="ra-confidence-badge">🛡️ <span style="color:${window.COLORS.getScoreColor(D.confidence.confidence_score)}">Analysis Confidence: ${D.confidence.confidence_score}%</span> · ${D.confidence.extraction_quality || ""}</span></div>` : ""}`;
                    }

                    // ── OVERALL CHANGES REQUIRED ─────────────────────────────────────────
                    (function buildOverallChanges() {
                        var el_list  = document.getElementById('raChangesList');
                        var el_sub   = document.getElementById('raOverallChangesSub');
                        var el_intro = document.getElementById('raChangesIntro');
                        var el_wrap  = document.getElementById('raChangesExpandWrap');
                        var el_btn   = document.getElementById('raChangesExpandBtn');
                        if (!el_list) return;

                        var seen = {}; // dedup by normalised text
                        var allChanges = [];

                        function normalise(t) { return (t || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

                        function push(item) {
                            var key = normalise(item.text);
                            if (!key || seen[key]) return;
                            seen[key] = true;
                            allChanges.push(item);
                        }

                        // ── 1. ACTION PLAN (highest priority) ───────────────
                        (ap.critical_fixes || []).forEach(function(f) {
                            push({ text: f.fix || f.action || '',
                                detail: (f.action && f.fix && f.action !== f.fix) ? f.action : '',
                                section: f.section || '', time: f.time_to_fix || '',
                                icon: '🔴', tagClass: 'ra-change-tag-critical', tagLabel: 'Critical' });
                        });

                        (ap.quick_wins || []).forEach(function(w) {
                            push({ text: w.action || '',
                                detail: w.expected_score_gain ? ('+' + w.expected_score_gain + ' pts expected') : '',
                                section: w.section || '', time: w.time_to_fix || '',
                                icon: '⚡', tagClass: 'ra-change-tag-quick', tagLabel: 'Quick Win' });
                        });

                        (ap.this_week_improvements || []).forEach(function(w) {
                            push({ text: w.improvement || w.action || '',
                                detail: w.why_it_matters || '',
                                section: w.section || '', time: '',
                                icon: '📅', tagClass: 'ra-change-tag-weekly', tagLabel: 'This Week' });
                        });

                        (ap.long_term_suggestions || []).forEach(function(s) {
                            var txt = typeof s === 'string' ? s : (s.suggestion || s.action || String(s));
                            push({ text: txt, detail: '', section: '', time: '',
                                icon: '🚀', tagClass: 'ra-change-tag-longterm', tagLabel: 'Long Term' });
                        });

                        (ap.biggest_gaps || []).forEach(function(g) {
                            push({ text: g, detail: '', section: 'Gap', time: '',
                                icon: '⚠️', tagClass: 'ra-change-tag-critical', tagLabel: 'Gap' });
                        });

                        // ── 2. SECTION ISSUES (problems found in the resume) ─
                        var sectionIssues = [
                            { data: D.contact,          label: 'Contact' },
                            { data: D.summary,          label: 'Summary' },
                            { data: D.experience,       label: 'Experience' },
                            { data: D.education,        label: 'Education' },
                            { data: D.skills,           label: 'Skills' },
                            { data: D.projects,         label: 'Projects' },
                            { data: D.formatting,       label: 'Formatting' },
                            { data: D.certifications,   label: 'Certifications' },
                            { data: D.extracurriculars, label: 'Extracurriculars' }
                        ];
                        sectionIssues.forEach(function(sec) {
                            (sec.data.issues || []).forEach(function(iss) {
                                var txt = typeof iss === 'string' ? iss : (iss.issue || '');
                                push({ text: txt, detail: '', section: sec.label, time: '',
                                    icon: '❌', tagClass: 'ra-change-tag-issue', tagLabel: 'Issue' });
                            });
                        });

                        // ── 3. SECTION SUGGESTIONS ─────────────────────────
                        var sectionSuggestions = [
                            { arr: D.contact.contact_suggestions,              label: 'Contact' },
                            { arr: D.summary.summary_suggestions,              label: 'Summary' },
                            { arr: D.experience.experience_suggestions,        label: 'Experience' },
                            { arr: D.education.education_suggestions,          label: 'Education' },
                            { arr: D.skills.skills_suggestions,                label: 'Skills' },
                            { arr: D.projects.projects_suggestions,            label: 'Projects' },
                            { arr: D.formatting.formatting_suggestions,        label: 'Formatting' },
                            { arr: D.certifications.certifications_suggestions,label: 'Certifications' },
                            { arr: D.certifications.achievements_suggestions,  label: 'Achievements' },
                            { arr: D.extracurriculars.extracurricular_suggestions, label: 'Extracurriculars' }
                        ];
                        sectionSuggestions.forEach(function(sec) {
                            (sec.arr || []).forEach(function(s) {
                                var txt = typeof s === 'string' ? s : (s.suggestion || s.action || String(s));
                                push({ text: txt, detail: '', section: sec.label, time: '',
                                    icon: '💡', tagClass: 'ra-change-tag-suggestion', tagLabel: 'Suggestion' });
                            });
                        });

                        if (allChanges.length === 0) {
                            var card = document.getElementById('raOverallChangesCard');
                            if (card) card.style.display = 'none';
                            return;
                        }

                        var PREVIEW = 4;
                        if (el_sub)   el_sub.textContent   = allChanges.length + ' total changes across all sections';
                        if (el_intro) el_intro.textContent = 'Every issue, suggestion, and improvement needed across your entire resume — all in one place, ordered by priority.';

                        el_list.innerHTML = allChanges.map(function(c, i) {
                            var hidden = i >= PREVIEW ? ' ra-change-hidden' : '';
                            var metaParts = [
                                '<span class="ra-change-tag ' + c.tagClass + '">' + c.tagLabel + '</span>',
                                c.section ? '<span class="ra-change-section-tag">' + c.section + '</span>' : '',
                                c.time    ? '<span class="ra-change-time">⏱ ' + c.time + '</span>' : '',
                                c.detail  ? '<span class="ra-change-time">' + c.detail + '</span>' : ''
                            ].filter(Boolean).join('');
                            return '<li class="ra-change-item' + hidden + '" style="animation-delay:' + (i * 0.04) + 's">'
                                + '<span class="ra-change-icon">' + c.icon + '</span>'
                                + '<div class="ra-change-body">'
                                + '<div class="ra-change-text">' + c.text + '</div>'
                                + (metaParts ? '<div class="ra-change-meta">' + metaParts + '</div>' : '')
                                + '</div></li>';
                        }).join('');

                        if (allChanges.length > PREVIEW) {
                            if (el_wrap) el_wrap.style.display = 'flex';
                            if (el_btn) {
                                var initLabel = el_btn.querySelector('.ra-changes-expand-label');
                                if (initLabel) initLabel.textContent = 'Show all ' + allChanges.length + ' changes';
                                el_btn.addEventListener('click', function() {
                                    var isExpanded = el_btn.getAttribute('aria-expanded') === 'true';
                                    el_btn.setAttribute('aria-expanded', String(!isExpanded));
                                    var lbl = el_btn.querySelector('.ra-changes-expand-label');
                                    if (lbl) lbl.textContent = isExpanded ? 'Show all ' + allChanges.length + ' changes' : 'Show less';
                                    el_list.querySelectorAll('.ra-change-hidden').forEach(function(li) {
                                        li.style.display = isExpanded ? 'none' : 'flex';
                                    });
                                    if (!isExpanded) {
                                        el_list.querySelectorAll('.ra-change-item').forEach(function(li, idx) {
                                            if (idx >= PREVIEW) {
                                                li.style.animation = 'none';
                                                void li.offsetHeight;
                                                li.style.animation = 'ra-change-slide-in 0.3s var(--ra-ease) ' + ((idx - PREVIEW) * 0.04) + 's both';
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    })();
                };

                // Populate on load if analysis is already available
                const hasMasterData =
                    pgResume &&
                    (pgResume.overall_analysis || pgResume.analysis?.overall);
                if (hasMasterData) {
                    populateResumeAnalysisTab(pgResume);
                } else {
                    raEmptyState.style.display = "";
                    raAnalysisWrap.style.display = "none";
                }

                // Re-analyze button — just re-fetches saved data from DB, no AI call
                const raReanalyzeBtn =
                    document.getElementById("raReanalyzeBtn");
                if (raReanalyzeBtn) {
                    raReanalyzeBtn.addEventListener("click", async () => {
                        raReanalyzeBtn.disabled = true;
                        raReanalyzeBtn.innerHTML =
                            '<span class="upload-spinner"></span>Loading…';
                        try {
                            const token = await firebase
                                .auth()
                                .currentUser.getIdToken();
                            const res = await fetch(
                                "https://careeriqai.onrender.com/api/resumes/my/active",
                                {
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                    },
                                },
                            );
                            if (res.ok) {
                                const json = await res.json();
                                if (json.data) {
                                    pgResume = json.data;
                                    populateResumeAnalysisTab(pgResume);
                                }
                            }
                        } catch (e) {
                            console.error("Re-fetch failed:", e);
                        }
                        raReanalyzeBtn.innerHTML =
                            '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Refresh';
                        raReanalyzeBtn.disabled = false;
                    });
                }

                // After home card analysis completes, also sync the analysis tab
                document
                    .getElementById("analyzeResumeBtn")
                    .addEventListener("click", async () => {
                        setTimeout(() => {
                            if (
                                pgResume &&
                                (pgResume.overall_analysis ||
                                    pgResume.analysis?.overall)
                            )
                                populateResumeAnalysisTab(pgResume);
                        }, 3000);
                    });

                // ═══════════════════════════════════════════════════════════════════════
                // CAREER ROADMAP — Full Visual Render (embedded standalone style)
                // ═══════════════════════════════════════════════════════════════════════
                const crmGenerateBtn  = document.getElementById("crmGenerateBtn");
                const crmVisualOutput = document.getElementById("crmVisualOutput");
                const crmHero         = document.getElementById("crmHeroSection");
                const crmSvgCont      = document.getElementById("crmSvgContainer");
                const crmPhasesCont   = document.getElementById("crmPhasesContainer");
                const crmSummary      = document.getElementById("crmSummaryFooter");

                const RM_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
                const RM_ICONS  = ['🚀','⚡','🛠️','🔥','🎯','🏆'];

                // ── Auto-load saved roadmap from DB on tab init ────────────────────
                (async () => {
                    try {
                        const tok = await firebase.auth().currentUser?.getIdToken();
                        if (!tok) return;
                        const res = await fetch('https://careeriqai.onrender.com/api/career/roadmap/saved', {
                            headers: { Authorization: `Bearer ${tok}` }
                        });
                        if (!res.ok) return;
                        const js2 = await res.json();
                        if (js2.data && js2.data.roadmap_data) {
                            const rd = js2.data;
                            const pd = typeof rd.roadmap_data === 'string'
                                ? JSON.parse(rd.roadmap_data)
                                : rd.roadmap_data;
                            if (pd && Array.isArray(pd.steps) && pd.steps.length > 0) {
                                renderVisualRoadmap(pd, rd.from_role, rd.to_role);
                                const inp = document.getElementById('crmTargetRole');
                                if (inp) inp.value = rd.to_role;
                            }
                        }
                    } catch (e) {
                        console.warn('[roadmap] Could not load saved roadmap:', e.message);
                    }
                })();

                function renderVisualRoadmap(parsedData, currentRole, targetRole) {
                    const steps = parsedData.steps || [];

                    // ── Hero ──────────────────────────────────────────────────
                    const tagsHtml = (parsedData.requiredSkills || [])
                        .map(s => `<span class="crm-chip-tag">${s}</span>`).join('');

                    crmHero.innerHTML = `
                        <div class="crm-orb violet"></div>
                        <div class="crm-orb amber"></div>
                        <div class="crm-orb cyan"></div>
                        <div class="crm-hero-inner">
                            <div class="crm-hero-pill">&#x23F1; ${parsedData.estimatedTimeline || 'See phases below'}</div>
                            <h1 class="crm-hero-title">${currentRole} &rarr; ${targetRole}</h1>
                            <p class="crm-hero-subtitle">AI-generated career transition plan &middot; ${new Date().toLocaleDateString()}</p>
                            <div class="crm-tags-row">${tagsHtml || '<span class="crm-chip-tag">AI Generated</span>'}</div>
                        </div>
                    `;

                    // ── Phase Cards ───────────────────────────────────────────
                    crmPhasesCont.innerHTML = '';
                    steps.forEach((step, i) => {
                        const isLast = i === steps.length - 1;
                        const color  = RM_COLORS[i % RM_COLORS.length];
                        const icon   = isLast ? '🏆' : RM_ICONS[i % RM_ICONS.length];

                        const card = document.createElement('div');
                        card.className = 'crm-phase-card';
                        card.setAttribute('data-index', i);
                        card.style.setProperty('--phase-color', color);

                        const milestones = (step.milestones || step.skills || []).slice(0, 4);
                        const msHtml = milestones.length
                            ? milestones.map(m => `<li class="crm-milestone-item"><span class="crm-milestone-icon">○</span><span>${typeof m === 'string' ? m : m.text || ''}</span></li>`).join('')
                            : '<li class="crm-milestone-item" style="color:#838486;font-style:italic;">Complete the objectives in this phase.</li>';

                        card.innerHTML = `
                            <div class="crm-card-eyebrow"><span>${icon}</span> Phase ${step.step || i + 1}</div>
                            <h3 class="crm-card-title">${step.title}</h3>
                            <div class="crm-card-meta">
                                <span class="crm-duration-chip">&#x23F1; ${step.duration || 'TBD'}</span>
                            </div>
                            <p class="crm-card-desc">${step.description || ''}</p>
                            <div class="crm-milestones-label">Milestones:</div>
                            <ul class="crm-milestones-list">${msHtml}</ul>
                            ${step.deliverable ? `<div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px 14px;font-size:0.83rem;color:#c5c6ca;">&#x1F4E6; ${step.deliverable}</div>` : ''}
                        `;
                        crmPhasesCont.appendChild(card);
                    });

                    // ── Position cards + SVG Road ─────────────────────────────
                    const numCards    = steps.length;
                    const cardSpacing = 360;
                    const totalH      = numCards * cardSpacing + 120;
                    crmPhasesCont.style.height   = `${totalH}px`;
                    crmPhasesCont.style.position = 'relative';
                    crmPhasesCont.style.zIndex   = '10';

                    const allCards = crmPhasesCont.querySelectorAll('.crm-phase-card');
                    allCards.forEach((card, i) => {
                        card.style.position = 'absolute';
                        card.style.top      = `${i * cardSpacing + 60}px`;
                        card.style.zIndex   = '20';
                        if (i % 2 === 0) {
                            card.style.left      = '54%';
                            card.style.width     = '42%';
                            card.style.textAlign = 'left';
                        } else {
                            card.style.right     = '54%';
                            card.style.width     = '42%';
                            card.style.textAlign = 'right';
                        }
                    });


                    // Draw SVG road
                    if (window.innerWidth > 768) {
                        crmSvgCont.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:0;';
                        let d = 'M 500 0 ';
                        steps.forEach((_, i) => {
                            const cy    = i * cardSpacing + 180;
                            const roadX = i % 2 === 0 ? 180 : 820;
                            if (i === 0) {
                                d += `C 500 60, ${roadX} 60, ${roadX} ${cy} `;
                            } else {
                                const prevCy    = (i - 1) * cardSpacing + 180;
                                const prevRoadX = i % 2 === 0 ? 820 : 180;
                                d += `C ${prevRoadX} ${prevCy + 180}, ${roadX} ${cy - 180}, ${roadX} ${cy} `;
                            }
                        });
                        const li = numCards - 1;
                        const lX = li % 2 === 0 ? 180 : 820;
                        const lY = li * cardSpacing + 180;
                        d += `C ${lX} ${lY + 140}, 500 ${lY + 170}, 500 ${totalH}`;

                        let svgHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${totalH}"
                                 preserveAspectRatio="none"
                                 style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;">
                                <!-- Single thin glowing line -->
                                <path d="${d}" stroke="rgba(0, 94, 208, 0.15)" stroke-width="6" stroke-linecap="round" fill="none"/>
                                <path d="${d}" stroke="#ef4444" stroke-width="2" stroke-linecap="round" fill="none"/>
                        `;
                        steps.forEach((_, i) => {
                            const cy    = i * cardSpacing + 180;
                            const roadX = i % 2 === 0 ? 180 : 820;
                            const circX = i % 2 === 0 ? 460 : 540;
                            const color = RM_COLORS[i % RM_COLORS.length];
                            const icon  = i === numCards - 1 ? '🏆' : RM_ICONS[i % RM_ICONS.length];
                            svgHTML += `
                                <!-- Thin connector from line to card -->
                                <line x1="${roadX}" y1="${cy}" x2="${circX}" y2="${cy}" stroke="rgba(0, 94, 208, 0.3)" stroke-width="1.5" stroke-dasharray="4 3"/>
                                <!-- Small dot on the line -->
                                <circle cx="${roadX}" cy="${cy}" r="5" fill="${color}" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
                                <!-- Phase icon circle (smaller) -->
                                <circle cx="${circX}" cy="${cy}" r="28" fill="${color}" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"
                                        style="filter:drop-shadow(0 2px 8px rgba(0,0,0,0.25));"/>
                                <text x="${circX}" y="${cy + 8}" text-anchor="middle" fill="#dfe3e7"
                                      font-size="18" font-family="sans-serif">${icon}</text>
                            `;
                        });
                        svgHTML += '</svg>';
                        crmSvgCont.innerHTML = svgHTML;
                    }

                    // ── Summary Footer ────────────────────────────────────────
                    crmSummary.innerHTML = `
                        <p>Your personalized career roadmap from <strong>${currentRole}</strong> to <strong>${targetRole}</strong>. Follow each phase step-by-step to reach your goal.</p>
                        <div class="crm-tags-row">${tagsHtml}</div>
                        <div class="crm-summary-credit">⚡ Generated by CareerIQ AI</div>
                    `;

                    // ── Scroll reveal ─────────────────────────────────────────
                    const obs = new IntersectionObserver((entries) => {
                        entries.forEach(e => {
                            if (e.isIntersecting) {
                                const idx = parseInt(e.target.getAttribute('data-index') || 0);
                                e.target.style.transitionDelay = `${idx * 120}ms`;
                                e.target.classList.add('revealed');
                                obs.unobserve(e.target);
                            }
                        });
                    }, { threshold: 0.1 });
                    allCards.forEach(c => obs.observe(c));

                    // Show output
                    crmVisualOutput.classList.add('visible');
                    setTimeout(() => crmVisualOutput.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                }

                if (crmGenerateBtn) {
                    crmGenerateBtn.addEventListener("click", async () => {
                        const targetRole = document.getElementById("crmTargetRole")?.value.trim();

                        if (!targetRole) {
                            if (window.CareerIQAuth && window.CareerIQAuth.Toast) {
                                window.CareerIQAuth.Toast.show("Please enter your target role or dream job.", "error");
                            }
                            return;
                        }

                        // Auto-extract current role and skills from the analyzed resume
                        let currentRole   = "Student / Professional";
                        let skillsString  = "Communication, Problem Solving";

                        if (pgResume && pgResume.overall_analysis) {
                            const analysis = typeof pgResume.overall_analysis === 'string'
                                ? JSON.parse(pgResume.overall_analysis)
                                : pgResume.overall_analysis;

                            if (analysis.experience?.roles?.length > 0) {
                                currentRole = analysis.experience.roles[0].job_title || currentRole;
                            } else if (analysis.education?.education_entries?.length > 0) {
                                const edu = analysis.education.education_entries[0];
                                currentRole = `${edu.field_of_study || 'Student'} at ${edu.institution}`;
                            }

                            if (analysis.skills) {
                                const allSkills = [
                                    ...(analysis.skills.technical_skills || []),
                                    ...(analysis.skills.tools_and_platforms || []),
                                    ...(analysis.skills.frameworks_and_libraries || [])
                                ];
                                if (allSkills.length > 0) skillsString = allSkills.slice(0, 15).join(", ");
                            }
                        } else {
                            if (window.CareerIQAuth && window.CareerIQAuth.Toast) {
                                window.CareerIQAuth.Toast.show(
                                    "We couldn't find your analyzed resume. Please upload and analyze your resume first for a tailored roadmap!",
                                    "warning"
                                );
                            }
                        }

                        const origBtnHTML = crmGenerateBtn.innerHTML;
                        crmGenerateBtn.innerHTML = '<span class="upload-spinner"></span>Generating Roadmap…';
                        crmGenerateBtn.disabled  = true;
                        if (crmVisualOutput) crmVisualOutput.classList.remove("visible");

                        try {
                            const token    = await firebase.auth().currentUser.getIdToken();
                            const response = await fetch("https://careeriqai.onrender.com/api/career/roadmap", {
                                method:  "POST",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                body: JSON.stringify({
                                    currentRole,
                                    targetRole,
                                    skills: skillsString ? skillsString.split(",").map(s => s.trim()).filter(Boolean) : [],
                                }),
                            });

                            if (!response.ok) throw new Error("Backend returned " + response.status);

                            const json = await response.json();
                            const roadmapText = typeof json.data === "string"
                                ? json.data
                                : json.data?.roadmap
                                  ? json.data.roadmap
                                  : JSON.stringify(json.data, null, 2);

                            // Parse structured JSON
                            let parsedData = null;
                            try {
                                let clean = roadmapText.replace(/```json/gi, '').replace(/```/g, '').trim();
                                parsedData = JSON.parse(clean);
                            } catch(e) { console.warn("Could not parse roadmap JSON", e); }

                            if (parsedData && Array.isArray(parsedData.steps)) {
                                renderVisualRoadmap(parsedData, currentRole, targetRole);
                            } else {
                                // Fallback: display raw text in hero area
                                if (crmHero) crmHero.innerHTML = `<div class="crm-hero-inner"><h1 class="crm-hero-title">${currentRole} → ${targetRole}</h1></div>`;
                                if (crmPhasesCont) crmPhasesCont.innerHTML = `<div style="padding:28px;background:rgba(255,255,255,0.04);border-radius:14px;color:#c5c6ca;white-space:pre-wrap;font-size:14px;line-height:1.8;">${roadmapText}</div>`;
                                if (crmSvgCont)    crmSvgCont.innerHTML = '';
                                if (crmSummary)    crmSummary.innerHTML = '';
                                if (crmVisualOutput) crmVisualOutput.classList.add('visible');
                            }

                            // Save to localStorage for the standalone roadmap page
                            try {
                                localStorage.setItem('careeriq_roadmap', JSON.stringify({
                                    title: `${currentRole} → ${targetRole}`,
                                    currentRole, targetRole,
                                    generatedAt: new Date().toISOString(),
                                    rawText:     roadmapText,
                                    parsedData
                                }));
                            } catch(e) { console.warn('localStorage save failed', e); }

                        } catch (err) {
                            console.error("Roadmap generation failed:", err);
                            if (window.CareerIQAuth && window.CareerIQAuth.Toast) {
                                window.CareerIQAuth.Toast.show(
                                    "Roadmap generation failed: " + (err.message || "Make sure the backend is running on port 5000."),
                                    "error", 6000
                                );
                            }
                        } finally {
                            crmGenerateBtn.innerHTML = origBtnHTML;
                            crmGenerateBtn.disabled  = false;
                        }
                    });
                }

                // Pre-fill current role from profile
                if (profileData) {
                    const crEl = document.getElementById("crmCurrentRole");
                    if (crEl && profileData.course) {
                        crEl.value =
                            profileData.course +
                            (profileData.yearOfStudy ? " Student" : "");
                    }
                    const skillsEl = document.getElementById("crmSkills");
                    if (skillsEl && profileData.skills) {
                        skillsEl.value = Array.isArray(profileData.skills)
                            ? profileData.skills.join(", ")
                            : profileData.skills;
                    }
                }

                const renderRoadmapSteps = (rawText) => {
                    crmSteps.innerHTML = "";
                    
                    let parsedData = null;
                    try {
                        // AI sometimes wraps JSON in markdown blocks
                        let cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                        parsedData = JSON.parse(cleanText);
                    } catch (e) {
                        console.warn("Could not parse AI output as JSON, falling back to raw render", e);
                    }

                    if (parsedData && parsedData.steps && Array.isArray(parsedData.steps)) {
                        // Render Metadata box
                        const metaDiv = document.createElement("div");
                        metaDiv.style.marginBottom = "40px";
                        metaDiv.style.padding = "20px";
                        metaDiv.style.background = "var(--bg-secondary)";
                        metaDiv.style.borderRadius = "12px";
                        metaDiv.style.border = "1px solid var(--border)";
                        metaDiv.innerHTML = `
                            <div style="font-size: 14px; color: var(--text-primary); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 18px">⏱️</span> <strong>Estimated Timeline:</strong> 
                                <span style="color: var(--text-secondary)">${parsedData.estimatedTimeline || 'Not specified'}</span>
                            </div>
                            <div style="font-size: 14px; color: var(--text-primary); display: flex; align-items: flex-start; gap: 8px;">
                                <span style="font-size: 18px">🛠️</span> <strong>Required Skills:</strong> 
                                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: -2px;">
                                    ${(parsedData.requiredSkills || []).map(s => `<span class="crm-skill-chip">${s}</span>`).join('') || '<span style="color: var(--text-secondary)">Not specified</span>'}
                                </div>
                            </div>
                        `;
                        crmSteps.appendChild(metaDiv);

                        // Render Full Roadmap Framework (SVG + Scroll Animations)
                        const roadmapWrap = document.createElement("section");
                        roadmapWrap.className = "timeline-section";
                        roadmapWrap.id = "timeline";
                        roadmapWrap.style.width = "100%";

                        // Container for the SVG path
                        const svgContainer = document.createElement("div");
                        svgContainer.className = "timeline-svg-container";
                        svgContainer.id = "svg-container";
                        roadmapWrap.appendChild(svgContainer);

                        // Container for the cards
                        const phasesContainer = document.createElement("div");
                        phasesContainer.className = "phases-container";
                        phasesContainer.id = "phases-container";
                        phasesContainer.style.width = "100%";
                        roadmapWrap.appendChild(phasesContainer);

                        const icons = ["🚀", "⚡", "🛠️", "🔥", "🎯", "🏆"];
                        const colors = window.COLORS.chart;

                        // Render Cards (Clean text to match the infographic style)
                        parsedData.steps.forEach((step, index) => {
                            const isLast = index === parsedData.steps.length - 1;
                            let icon = icons[index % icons.length];
                            if (isLast) icon = "🏆";
                            const color = colors[index % colors.length];
                            
                            const card = document.createElement("div");
                            card.className = "phase-card";
                            card.setAttribute("data-index", index);
                            
                            // Remove default card styling to blend perfectly with the infographic road
                            card.style.background = "transparent";
                            card.style.border = "none";
                            card.style.boxShadow = "none";
                            card.style.padding = "0";
                            
                            card.innerHTML = `
                                <div style="font-size: 13px; font-weight: 800; color: ${color}; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                                    Phase ${step.step || (index + 1)}
                                </div>
                                <h3 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin-bottom: 12px; line-height: 1.2;">
                                    ${step.title}
                                </h3>
                                <p style="font-size: 15px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
                                    ${step.description}
                                </p>
                                ${step.duration ? `<span style="display: inline-block; font-size: 12px; font-weight: 700; color: #dfe3e7; background: ${color}; padding: 6px 14px; border-radius: 99px;">⏱ ${step.duration}</span>` : ''}
                            `;
                            phasesContainer.appendChild(card);
                        });
                        
                        crmSteps.appendChild(roadmapWrap);

                        // SVG Drawing Logic (String based for rock-solid browser rendering)
                        const numCards = parsedData.steps.length;
                        const cardSpacing = 320;
                        const totalHeight = numCards * cardSpacing + 100;
                        phasesContainer.style.height = `${totalHeight}px`;
                        phasesContainer.style.position = "relative";
                        phasesContainer.style.zIndex = "10";

                        // Position Cards
                        const cards = phasesContainer.querySelectorAll(".phase-card");
                        cards.forEach((card, index) => {
                            card.style.position = "absolute";
                            card.style.top = `${index * cardSpacing + 50}px`;
                            card.style.width = "40%";
                            card.style.zIndex = "20";
                            
                            if (index % 2 === 0) {
                                // Road on left, Card on right
                                card.style.left = "55%";
                                card.style.paddingLeft = "10px";
                                card.style.textAlign = "left";
                            } else {
                                // Road on right, Card on left
                                card.style.right = "55%";
                                card.style.paddingRight = "10px";
                                card.style.textAlign = "right";
                            }
                        });

                        if (window.innerWidth > 768) {
                            let d = "M 500 0 ";
                            parsedData.steps.forEach((step, index) => {
                                const cy = index * cardSpacing + 150; 
                                const roadX = index % 2 === 0 ? 200 : 800; // Massive S-curve swings
                                
                                if (index === 0) {
                                    d += `C 500 50, ${roadX} 50, ${roadX} ${cy} `;
                                } else {
                                    const prevCy = (index - 1) * cardSpacing + 150;
                                    const prevRoadX = index % 2 === 0 ? 800 : 200;
                                    d += `C ${prevRoadX} ${prevCy + 160}, ${roadX} ${cy - 160}, ${roadX} ${cy} `;
                                }
                            });
                            // Complete the road off the bottom
                            const lastIndex = numCards - 1;
                            const lastRoadX = lastIndex % 2 === 0 ? 200 : 800;
                            const lastCy = lastIndex * cardSpacing + 150;
                            d += `C ${lastRoadX} ${lastCy + 120}, 500 ${lastCy + 150}, 500 ${totalHeight} `;

                            let svgHTML = `
                                <svg xmlns="http://www.w3.org/2000/svg" 
                                     viewBox="0 0 1000 ${totalHeight}" 
                                     preserveAspectRatio="none"
                                     style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none;">
                                    
                                    <!-- Thick dark shadow border -->
                                    <path d="${d}" stroke="#313539" stroke-width="70" stroke-linecap="round" fill="none"></path>
                                    
                                    <!-- Thick vibrant blue main road -->
                                    <path d="${d}" stroke="#ef4444" stroke-width="60" stroke-linecap="round" fill="none"></path>
                                    
                                    <!-- Center dashed white line -->
                                    <path d="${d}" stroke="#dfe3e7" stroke-width="5" stroke-dasharray="24 16" stroke-linecap="round" fill="none"></path>
                            `;

                            parsedData.steps.forEach((step, index) => {
                                const isLast = index === numCards - 1;
                                const color = colors[index % colors.length];
                                let icon = icons[index % icons.length];
                                if (isLast) icon = "🏆";
                                
                                const cy = index * cardSpacing + 150;
                                const roadX = index % 2 === 0 ? 200 : 800;
                                const bigCircleX = index % 2 === 0 ? 450 : 550;
                                
                                svgHTML += `
                                    <!-- Connecting line from road to big circle -->
                                    <line x1="${roadX}" y1="${cy}" x2="${bigCircleX}" y2="${cy}" stroke="#f59e0b" stroke-width="6"></line>
                                    
                                    <!-- Small yellow road anchor dot -->
                                    <circle cx="${roadX}" cy="${cy}" r="12" fill="#f59e0b" stroke="#dfe3e7" stroke-width="4"></circle>
                                    
                                    <!-- Huge colored icon circle -->
                                    <circle cx="${bigCircleX}" cy="${cy}" r="45" fill="${color}" stroke="#dfe3e7" stroke-width="6" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15));"></circle>
                                    <text x="${bigCircleX}" y="${cy + 10}" text-anchor="middle" fill="#dfe3e7" font-size="28px" font-family="sans-serif">${icon}</text>
                                `;
                            });

                            svgHTML += `</svg>`;
                            svgContainer.innerHTML = svgHTML;
                            svgContainer.style.zIndex = "5";
                        }

                        // Intersection Observer for Cards (Fade in text nicely)
                        const observer = new IntersectionObserver((entries) => {
                            entries.forEach(entry => {
                                if (entry.isIntersecting) {
                                    const idx = entry.target.getAttribute("data-index") || 0;
                                    entry.target.style.transitionDelay = `${idx * 150}ms`;
                                    entry.target.classList.add("revealed");
                                    observer.unobserve(entry.target);
                                }
                            });
                        }, { threshold: 0.1 });
                        
                        cards.forEach(c => observer.observe(c));

                    } else {
                        // Fallback: try to parse numbered list or show raw
                        const lines = rawText.split("\\n").filter((l) => l.trim());
                        const stepRegex = /^(\\d+)[.):]\\s*(.+)/;
                        let steps = [];
                        let currentStep = null;

                        lines.forEach((line) => {
                            const match = line.match(stepRegex);
                            if (match) {
                                if (currentStep) steps.push(currentStep);
                                currentStep = {
                                    num: match[1],
                                    title: match[2].trim(),
                                    lines: [],
                                };
                            } else if (currentStep) {
                                currentStep.lines.push(line.trim());
                            }
                        });
                        if (currentStep) steps.push(currentStep);

                        if (steps.length >= 2) {
                            steps.forEach((step) => {
                                const desc = step.lines.join(" ");
                                const durationMatch = desc.match(
                                    /(\\d+[-–]\\d+\\s*(weeks?|months?|years?))/i,
                                );
                                const durationText = durationMatch ? durationMatch[0] : null;

                                const el = document.createElement("div");
                                el.className = "crm-step";
                                el.innerHTML = `
                                  <div class="crm-step-left">
                                    <div class="crm-step-num">${step.num}</div>
                                    <div class="crm-step-line"></div>
                                  </div>
                                  <div class="crm-step-body">
                                    <h4 class="crm-step-title">${step.title}</h4>
                                    ${durationText ? `<span class="crm-step-duration">⏱ ${durationText}</span>` : ""}
                                    <p class="crm-step-desc">${desc || "Follow this step to progress on your career path."}</p>
                                  </div>
                                `;
                                crmSteps.appendChild(el);
                            });
                        } else {
                            const el = document.createElement("div");
                            el.className = "crm-raw-output";
                            el.textContent = rawText;
                            crmSteps.appendChild(el);
                        }
                    }
                };

                if (crmGenerateBtn) {
                    crmGenerateBtn.addEventListener("click", async () => {
                        const targetRole = document
                            .getElementById("crmTargetRole")
                            .value.trim();

                        if (!targetRole) {
                            if (window.CareerIQAuth && window.CareerIQAuth.Toast) {
                                window.CareerIQAuth.Toast.show(
                                    "Please enter your target role or dream job.",
                                    "error"
                                );
                            }
                            return;
                        }

                        // Auto-extract current role and skills from the analyzed resume
                        let currentRole = "Student / Professional";
                        let skillsString = "Communication, Problem Solving";

                        if (pgResume && pgResume.overall_analysis) {
                            const analysis = typeof pgResume.overall_analysis === 'string' ? JSON.parse(pgResume.overall_analysis) : pgResume.overall_analysis;
                            
                            // Try to get their latest role from experience
                            if (analysis.experience && analysis.experience.roles && analysis.experience.roles.length > 0) {
                                currentRole = analysis.experience.roles[0].job_title || currentRole;
                            } else if (analysis.education && analysis.education.education_entries && analysis.education.education_entries.length > 0) {
                                currentRole = `${analysis.education.education_entries[0].field_of_study || 'Student'} at ${analysis.education.education_entries[0].institution}`;
                            }

                            // Try to gather all skills into a string
                            if (analysis.skills) {
                                const allSkills = [
                                    ...(analysis.skills.technical_skills || []),
                                    ...(analysis.skills.tools_and_platforms || []),
                                    ...(analysis.skills.frameworks_and_libraries || [])
                                ];
                                if (allSkills.length > 0) {
                                    skillsString = allSkills.slice(0, 15).join(", "); // Limit to top 15 skills for context
                                }
                            }
                        } else {
                            if (window.CareerIQAuth && window.CareerIQAuth.Toast) {
                                window.CareerIQAuth.Toast.show(
                                    "We couldn't find your analyzed resume. Please upload and analyze your resume first for a tailored roadmap!",
                                    "warning"
                                );
                            }
                            // We still allow it to continue using the fallback defaults
                        }

                        const skills = skillsString;

                        const origBtnHTML = crmGenerateBtn.innerHTML;
                        crmGenerateBtn.innerHTML =
                            '<span class="upload-spinner"></span>Generating Roadmap…';
                        crmGenerateBtn.disabled = true;
                        crmOutput.classList.remove("visible");

                        try {
                            const token = await firebase
                                .auth()
                                .currentUser.getIdToken();
                            const response = await fetch(
                                "https://careeriqai.onrender.com/api/career/roadmap",
                                {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                        Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({
                                        currentRole,
                                        targetRole,
                                        skills: skills
                                            ? skills
                                                  .split(",")
                                                  .map((s) => s.trim())
                                                  .filter(Boolean)
                                            : [],
                                    }),
                                },
                            );

                            if (!response.ok)
                                throw new Error(
                                    "Backend returned " + response.status,
                                );

                            const json = await response.json();
                            const roadmapText =
                                typeof json.data === "string"
                                    ? json.data
                                    : json.data && json.data.roadmap
                                      ? json.data.roadmap
                                      : JSON.stringify(json.data, null, 2);

                            document.getElementById(
                                "crmRoadmapTitle",
                            ).textContent = `${currentRole} → ${targetRole}`;
                            document.getElementById(
                                "crmRoadmapMeta",
                            ).textContent =
                                `AI-generated career transition roadmap · ${new Date().toLocaleDateString()}`;
                            renderRoadmapSteps(roadmapText);
                            crmOutput.classList.add("visible");
                            crmOutput.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                            });

                            // ── Save to localStorage so the standalone Visual Roadmap page can show this data ──
                            try {
                                let parsedForStorage = null;
                                try {
                                    let clean = roadmapText.replace(/```json/gi,'').replace(/```/g,'').trim();
                                    parsedForStorage = JSON.parse(clean);
                                } catch(e) {}

                                const storagePayload = {
                                    title: `${currentRole} → ${targetRole}`,
                                    currentRole,
                                    targetRole,
                                    generatedAt: new Date().toISOString(),
                                    rawText: roadmapText,
                                    parsedData: parsedForStorage
                                };
                                localStorage.setItem('careeriq_roadmap', JSON.stringify(storagePayload));

                                // Update the "Open Full Roadmap" links to reflect live data is ready
                                document.querySelectorAll('.crm-view-full-btn').forEach(btn => {
                                    btn.title = `View visual roadmap: ${currentRole} → ${targetRole}`;
                                });
                            } catch(storageErr) {
                                console.warn('Could not save roadmap to localStorage:', storageErr);
                            }
                        } catch (err) {
                            console.error("Roadmap generation failed:", err);
                            if (
                                window.CareerIQAuth &&
                                window.CareerIQAuth.Toast
                            ) {
                                window.CareerIQAuth.Toast.show(
                                    "Roadmap generation failed: " +
                                        (err.message ||
                                            "Make sure the backend is running on port 5000."),
                                    "error",
                                    6000,
                                );
                            }
                        } finally {
                            crmGenerateBtn.innerHTML = origBtnHTML;
                            crmGenerateBtn.disabled = false;
                        }
                    });
                }

                // ═══════════════════════════════════════════════════════════════════════
                // UPLOAD — extracts text from PDF, saves to Firestore
                // Supports: uploadResumeBtn (topbar) + uploadResumeBtnCta (upload card)
                // After upload: shows Analyze button in topbar + RA tab + RA tab header
                // ═══════════════════════════════════════════════════════════════════════
                const resumeFileInput = document.getElementById("resumeFileInput");

                // Helper: show/hide analyze buttons everywhere
                const showAnalyzeButtons = (show) => {
                    [
                        document.getElementById("analyzeResumeBtn"),
                        document.getElementById("analyzeResumeBtnRA"),
                        document.getElementById("analyzeResumeBtnInAnalysis"),
                    ].forEach(btn => {
                        if (btn) btn.style.display = show ? "inline-flex" : "none";
                    });
                };

                // Helper: update resume name label in topbar
                const setResumeLabel = (text) => {
                    const el = document.getElementById("savedResumeName");
                    if (el) el.textContent = text;
                };

                // Helper: set loading state on all upload buttons
                const setUploadBtnState = (loading) => {
                    const btns = [
                        document.getElementById("uploadResumeBtn"),
                        document.getElementById("uploadResumeBtnCta"),
                    ];
                    btns.forEach(btn => {
                        if (!btn) return;
                        if (loading) {
                            btn.dataset.origHtml = btn.innerHTML;
                            btn.innerHTML = '<span class="upload-spinner"></span>Saving…';
                            btn.disabled = true;
                        } else {
                            btn.innerHTML = btn.dataset.origHtml || btn.innerHTML;
                            btn.disabled = false;
                        }
                    });
                };

                        // Core upload handler
                        const handleFileUpload = async (file) => {
                            if (!file) return;

                            // Validate file size and readability
                            if (file.size === 0) {
                                if (window.CareerIQAuth?.Toast) {
                                    window.CareerIQAuth.Toast.show("File is empty or unreadable. Try downloading it to your device first.", "error");
                                }
                                return;
                            }
                            
                            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                                if (window.CareerIQAuth?.Toast) {
                                    window.CareerIQAuth.Toast.show("File is too large. Please upload a PDF under 5MB.", "error");
                                }
                                return;
                            }

                            // Only accept PDF
                            if (!file.name.toLowerCase().endsWith('.pdf')) {
                                if (window.CareerIQAuth?.Toast) {
                                    window.CareerIQAuth.Toast.show("Please upload a PDF file.", "error");
                                }
                                return;
                            }

                            const uid = user.uid;
                            setUploadBtnState(true);

                            try {
                                // Check Firestore for existing resume
                                const snap = await db.collection("user_profiles").doc(uid).get();
                                const existing = snap.exists ? snap.data() : {};

                                // Same filename + already analyzed → just reload analysis
                                if (
                                    file.name === existing.resumeName &&
                                    pgResume &&
                                    pgResume.file_name === file.name &&
                                    pgResume.overall_analysis
                                ) {
                                    populateResumeAnalysisTab(pgResume);
                                    if (window.CareerIQAuth?.Toast) {
                                        window.CareerIQAuth.Toast.show(
                                            "Same resume detected — your saved analysis is displayed.",
                                            "info",
                                            4000
                                        );
                                    }
                                    setUploadBtnState(false);
                                    return;
                                }

                                // New file → extract text
                                pgResume = null;

                                // Check pdf.js is loaded
                                if (typeof pdfjsLib === "undefined") {
                                    throw new Error("PDF library not loaded. Please refresh the page and try again.");
                                }

                                // Upload PDF to backend to extract text (with OCR fallback)
                                const formData = new FormData();
                                formData.append('resumeFile', file);

                                // Wake up the Render server first (free tier sleeps after 15 min)
                                // This prevents "Failed to fetch" on cold starts
                                try {
                                    const wake = await fetch("https://careeriqai.onrender.com/health", {
                                        method: "GET",
                                        signal: AbortSignal.timeout(20000)
                                    });
                                    if (!wake.ok) throw new Error('wake failed');
                                } catch (wakeErr) {
                                    // If health check itself fails, server is down
                                    throw new Error('Cannot reach the server. Please check your internet connection and try again in a moment.');
                                }

                                // Now send the actual file
                                let response;
                                try {
                                    response = await fetch("https://careeriqai.onrender.com/resume/extract", {
                                        method: "POST",
                                        body: formData,
                                        signal: AbortSignal.timeout(60000)  // 60s timeout for large PDFs
                                    });
                                } catch (fetchErr) {
                                    if (fetchErr.name === 'TimeoutError') {
                                        throw new Error('Upload timed out. The server is busy — please try again in 30 seconds.');
                                    }
                                    // Make error detailed for debugging mobile
                                    throw new Error(`Failed to reach server [${fetchErr.name}: ${fetchErr.message}]. Check your internet connection and try again.`);
                                }

                                if (!response.ok) {
                                    throw new Error(`Failed to extract resume: ${response.status} ${response.statusText}`);
                                }

                        const extracted = await response.json();
                        const resumeText = extracted.raw_text;

                        if (!resumeText || resumeText.trim().length < 50) {
                            throw new Error(
                                "Could not read text from this PDF. Please make sure it is not a scanned image (use a text-based PDF)."
                            );
                        }

                        // Save to Firestore
                        const FieldValue = firebase.firestore.FieldValue;
                        await db.collection("user_profiles").doc(uid).set(
                            {
                                resumeName: file.name,
                                resumeText: resumeText,
                                resumeExtractionMethod: extracted.method || 'pdfjs',
                                resumeExtractedAt: new Date().toISOString(),
                                resumeAnalysis: FieldValue.delete(),
                                resumeScore: FieldValue.delete(),
                                resumeUploadCount: FieldValue.increment(1),
                            },
                            { merge: true }
                        );

                        // Show Analyze button everywhere
                        setResumeLabel("📄 " + file.name + " — ready to analyze");
                        showAnalyzeButtons(true);

                        // Also update the CTA card button text
                        const ctaBtn = document.getElementById("uploadResumeBtnCta");
                        if (ctaBtn) {
                            ctaBtn.textContent = "✅ " + file.name + " uploaded";
                            ctaBtn.style.color = "#3b82f6";
                        }

                        if (window.CareerIQAuth?.Toast) {
                            window.CareerIQAuth.Toast.show(
                                '✅ Resume saved! Click "Analyze with AI" to get your score.',
                                "success",
                                5000
                            );
                        }

                    } catch (err) {
                        console.error("Upload failed:", err);
                        if (window.CareerIQAuth?.Toast) {
                            window.CareerIQAuth.Toast.show(
                                "Upload failed: " + (err.message || "Unknown error"),
                                "error",
                                6000
                            );
                        }
                    } finally {
                        setUploadBtnState(false);
                        if (resumeFileInput) resumeFileInput.value = "";
                    }
                };

                // Wire the shared file input to the handler
                if (resumeFileInput) {
                    resumeFileInput.addEventListener("change", (e) => {
                        handleFileUpload(e.target.files[0]);
                    });
                }

                // Wire topbar upload button
                const uploadResumeBtn = document.getElementById("uploadResumeBtn");
                if (uploadResumeBtn && resumeFileInput) {
                    uploadResumeBtn.addEventListener("click", () => resumeFileInput.click());
                }

                // Wire CTA card upload button
                const uploadResumeBtnCta = document.getElementById("uploadResumeBtnCta");
                if (uploadResumeBtnCta && resumeFileInput) {
                    uploadResumeBtnCta.addEventListener("click", () => resumeFileInput.click());
                }

                // ── AI Career Assistant Chat Bot Logic ─────────────────────
                const initAIChatBot = () => {
                    const chatInput = document.getElementById('aiChatInput');
                    const chatSendBtn = document.getElementById('aiChatSendBtn');
                    const chatHistory = document.getElementById('aiChatHistory');

                    if (!chatInput || !chatSendBtn || !chatHistory) return;

                    const addMessage = (text, isUser = false, isTyping = false) => {
                        const msgDiv = document.createElement('div');
                        msgDiv.className = `chat-message ${isUser ? 'user-message' : 'ai-message'}`;
                        if (isTyping) {
                            msgDiv.classList.add('ai-typing');
                            msgDiv.innerHTML = `<span></span><span></span><span></span>`;
                        } else {
                            msgDiv.textContent = text;
                        }
                        chatHistory.appendChild(msgDiv);
                        chatHistory.scrollTop = chatHistory.scrollHeight;
                        return msgDiv;
                    };

                    const handleSend = async () => {
                        const message = chatInput.value.trim();
                        if (!message) return;

                        // 1. Add user message
                        addMessage(message, true);
                        chatInput.value = '';

                        // 2. Add typing indicator
                        const typingIndicator = addMessage('', false, true);

                        // 3. Send to backend
                        try {
                            const res = await fetch('https://careeriqai.onrender.com/api/chat', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
                                },
                                body: JSON.stringify({ message })
                            });

                            const data = await res.json();
                            typingIndicator.remove(); // Remove typing indicator

                            if (!res.ok) {
                                addMessage(`Error: ${data.error || 'Failed to get response.'}`, false);
                            } else {
                                addMessage(data.response, false);
                            }
                        } catch (err) {
                            console.error('Chat error:', err);
                            typingIndicator.remove();
                            addMessage('Network error. Please try again later.', false);
                        }
                    };

                    chatSendBtn.addEventListener('click', handleSend);
                    chatInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSend();
                        }
                    });
                };

                initAIChatBot();

            };


            if (window.CareerIQAuth) {
                initApp();
            } else {
                document.addEventListener("CareerIQAuthReady", initApp);
            }


      // Listen for theme changes to redraw charts with correct text colors
      window.addEventListener('themeChanged', () => {
        if (window._piqResumeData) {
          if (window._populateResumeAnalysisTab) window._populateResumeAnalysisTab(window._piqResumeData);
        }
      });
    
