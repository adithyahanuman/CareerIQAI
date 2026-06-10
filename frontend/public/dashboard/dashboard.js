    const initApp = async () => {
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
          e.preventDefault();
          const target = item.dataset.target;
          if (target) {
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
        const res = await fetch('http://localhost:5000/api/resumes/my/active', {
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

      // Interactive Dashboard Updates based on Profile
      if (profileData && profileData.onboarding_complete) {
        // Profile Complete
        document.querySelector('.stats-grid .stat-card:nth-child(1) .stat-value').textContent = '100%';

        // GPA / CGPA
        if (profileData.gpa) {
          document.getElementById('gpaDisplay').textContent = profileData.gpa;
        }

        // Welcome Subtitle
        const subtitleText = profileData.course ? `Ready to conquer your goals in ${profileData.course} (${profileData.yearOfStudy || 'Student'})?` : 'Ready to conquer your goals?';
        document.querySelector('.welcome-subtitle').textContent = subtitleText;
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
          window.location.href = 'index.html';
        } catch (err) {
          window.location.href = 'index.html';
        }
      });

      // ═══════════════════════════════════════════════════════════════════════
      // ANALYZE FROM FIRESTORE — reads stored text → calls Gemini → renders
      // ═══════════════════════════════════════════════════════════════════════
      const analyzeFromFirestore = async () => {
        const uid = user.uid;

        const analyzeBtn = document.getElementById('analyzeResumeBtn');
        const origHTML   = analyzeBtn.innerHTML;
        analyzeBtn.innerHTML = '<span class="upload-spinner"></span>Analyzing…';
        analyzeBtn.disabled  = true;

        try {
          const snap = await db.collection('user_profiles').doc(uid).get();
          if (!snap.exists) throw new Error('No profile found. Please upload a resume first.');

          const pd         = snap.data();
          const resumeText = pd.resumeText;
          const resumeName = pd.resumeName || 'resume.pdf';

          if (!resumeText || resumeText.trim().length < 50)
            throw new Error('No resume text found. Please upload a PDF resume first.');

          // Call backend — cache is used if analysis already exists for same filename
          const token = await firebase.auth().currentUser.getIdToken();
          const analysis = await window.GeminiClient.analyzeResume(resumeText, token, resumeName);

          pgResume = { file_name: resumeName, analysis };

          populateResumeAnalysisTab(pgResume);

          analyzeBtn.style.display = 'none';
          document.getElementById('savedResumeName').textContent = '';

          if (window.CareerIQAuth && window.CareerIQAuth.Toast) {
            window.CareerIQAuth.Toast.show('Analysis complete! Click “Resume Analysis” in the sidebar to view your report.', 'success', 5000);
          }

        } catch (err) {
          console.error('Analysis failed:', err);
          if (window.CareerIQAuth && window.CareerIQAuth.Toast) {
            window.CareerIQAuth.Toast.show('⚠️ ' + (err.message || 'Analysis failed. Make sure the backend is running.'), 'error', 6000);
          }
        } finally {
          analyzeBtn.innerHTML = origHTML;
          analyzeBtn.disabled  = false;
        }
      };

      const analyzeResumeBtn = document.getElementById('analyzeResumeBtn');
      if (analyzeResumeBtn) analyzeResumeBtn.addEventListener('click', analyzeFromFirestore);

      // ═══════════════════════════════════════════════════════════════════════
      // RESUME ANALYSIS TAB — load existing data from database into full view
      // ═══════════════════════════════════════════════════════════════════════
      const raEmptyState   = document.getElementById('raEmptyState');
      const raAnalysisWrap = document.getElementById('raAnalysisWrap');

      // ── Chart registry to avoid duplicate chart instances ──────────────────
      const RA_CHARTS = {};
      function raCreateChart(id, config) {
        if (RA_CHARTS[id]) { try { RA_CHARTS[id].destroy(); } catch(e) {} }
        const canvas = document.getElementById(id);
        if (!canvas) return;
        RA_CHARTS[id] = new Chart(canvas.getContext('2d'), config);
        return RA_CHARTS[id];
      }
      const RA_PALETTE = ['#4f8ef7','#22d3a5','#fbbf24','#f87171','#a78bfa','#38bdf8','#34d399','#fb923c','#e879f9'];
      const RA_SECTION_META = [
        { key:'contact',          label:'Contact',          icon:'📇', max:2,  accent:'#4f8ef7' },
        { key:'summary',          label:'Summary',          icon:'📝', max:2,  accent:'#a78bfa' },
        { key:'experience',       label:'Experience',       icon:'💼', max:20, accent:'#fbbf24' },
        { key:'education',        label:'Education',        icon:'🎓', max:20, accent:'#22d3a5' },
        { key:'skills',           label:'Skills',           icon:'⚡', max:20, accent:'#4f8ef7' },
        { key:'projects',         label:'Projects',         icon:'🚀', max:20, accent:'#22d3a5' },
        { key:'formatting',       label:'Formatting',       icon:'📄', max:6,  accent:'#94a3b8' },
        { key:'certifications',   label:'Certs',            icon:'🏅', max:20, accent:'#fbbf24' },
        { key:'extracurriculars', label:'Extracurriculars', icon:'🌐', max:20, accent:'#a78bfa' },
      ];
      function raGaugeColor(s) {
        if (s>=80) return '#22d3a5'; if (s>=65) return '#4f8ef7'; if (s>=50) return '#fbbf24'; return '#f87171';
      }
      function raProgColor(p) {
        if (p>=75) return '#22d3a5'; if (p>=50) return '#fbbf24'; return '#f87171';
      }
      function raHeatBg(p) {
        if (p>=80) return 'rgba(34,211,165,0.22)'; if (p>=65) return 'rgba(79,142,247,0.2)';
        if (p>=50) return 'rgba(251,191,36,0.2)'; return 'rgba(248,113,113,0.2)';
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
        const valColor = isLight ? '#0c1a2e' : '#e2e8f0';
        el.innerHTML = items.map(item =>
          `<div class="ra-legend-item"><span class="ra-legend-dot" style="background:${item.color}"></span><span>${item.label}</span><span style="margin-left:auto;color:${valColor};font-weight:500">${item.value}</span></div>`
        ).join('');
      }
      function raChartOpts(extra={}) {
        const { plugins, layout, ...rest } = extra;
        return { responsive:true, maintainAspectRatio:false, resizeDelay:100,
          plugins:{ legend:{display:false}, ...plugins },
          layout:{ padding:{top:4,right:8,bottom:4,left:4}, ...layout }, ...rest };
      }
      function raAxisStyle() {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const gridColor = isLight ? 'rgba(14,100,180,0.10)' : 'rgba(255,255,255,0.06)';
        const tickColor = isLight ? '#3a5170' : '#94a3b8';
        return {
          grid:{ color: gridColor },
          ticks:{ color: tickColor, font:{family:'inherit',size:10}, maxRotation:0, autoSkip:true, maxTicksLimit:8 }
        };
      }

      const populateResumeAnalysisTab = (resume) => {
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
          <div class="ra-hero-stat"><div class="ra-hero-stat-val">${rc.completeness_score || 0}%</div><div class="ra-hero-stat-lbl">Completeness</div></div>
          <div class="ra-hero-stat"><div class="ra-hero-stat-val">${D.projects.total_projects || 0}</div><div class="ra-hero-stat-lbl">Projects</div></div>`;

                    // Hero insights from action plan critical fixes
                    const el_insights = document.getElementById("raHeroInsights");
                    if (el_insights && D.action_plan.critical_fixes) {
                        el_insights.innerHTML = D.action_plan.critical_fixes
                            .slice(0, 3)
                            .map(
                                (f) =>
                                    `<div class="ra-insight" style="--insight-c:${f.severity === "critical" ? "#f87171" : "#fbbf24"}">
              <strong>${f.fix}</strong>${f.action}</div>`,
                            )
                            .join("");
                    }

                    // ── ANALYTICS OVERVIEW ──────────────────────────────────────────────
                    const breakdown = ov.score_breakdown || {};
                    const secLabels = [],
                        secRaw = [],
                        secMax = [],
                        secPct = [],
                        secColors = [];
                    RA_SECTION_META.forEach((m, i) => {
                        secLabels.push(m.label);
                        const r = breakdown[m.key] ?? 0;
                        secRaw.push(r);
                        secMax.push(m.max);
                        secPct.push(Math.round((r / m.max) * 100));
                        secColors.push(m.accent);
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
                            { v: score, l: "Overall", c: color },
                            {
                                v: ov.raw_score || 0,
                                l: "Raw Pts",
                                c: "#4f8ef7",
                            },
                            {
                                v: (rc.completeness_score || 0) + "%",
                                l: "Complete",
                                c: "#22d3a5",
                            },
                            {
                                v: D.projects.total_projects || 0,
                                l: "Projects",
                                c: "#a78bfa",
                            },
                            {
                                v: D.skills.total_skills_count || 0,
                                l: "Skills",
                                c: "#fbbf24",
                            },
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
                                    backgroundColor: secColors,
                                    borderColor: "#161b25",
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
                            color: secColors[i],
                        })),
                    );

                    // Section bars chart
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
            <span>${secPct[i]}%</span><span>${RA_SECTION_META[i].icon}</span></div>`,
                            )
                            .join("");

                    const _isLight =
                        document.documentElement.getAttribute("data-theme") ===
                        "light";
                    const _radarGrid = _isLight
                        ? "rgba(14,100,180,0.12)"
                        : "rgba(255,255,255,0.07)";
                    const _ptBorder = _isLight ? "#f0f4f9" : "#161b25";
                    const _ptLabel = _isLight ? "#0c1a2e" : "#e2e8f0";
                    // Radar
                    raCreateChart("raRadarChart", {
                        type: "radar",
                        data: {
                            labels: secLabels,
                            datasets: [
                                {
                                    data: secPct,
                                    backgroundColor: "rgba(79,142,247,0.15)",
                                    borderColor: "#4f8ef7",
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
                                        color: _isLight ? "#3a5170" : "#94a3b8",
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
                                    label: "Remaining",
                                    data: secMax.map((m, i) => m - secRaw[i]),
                                    backgroundColor: _isLight
                                        ? "rgba(14,100,180,0.08)"
                                        : "rgba(255,255,255,0.06)",
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
                            card.style.setProperty("--sc-accent", meta.accent);
                            card.innerHTML = `
              <div class="ra-sc-header">
                <span class="ra-sc-title">
                  <span class="ra-sc-icon" style="background:${meta.accent}18;border-color:${meta.accent}35">${meta.icon}</span>
                  ${meta.label}
                </span>
                <span class="ra-badge ra-badge-blue">${gr}</span>
              </div>
              <div class="ra-sc-meta">
                <span>${sc} / ${mx} pts</span>
                <span class="ra-sc-pct" style="color:${meta.accent}">${p}%</span>
              </div>
              <div class="ra-prog-bar" style="height:7px">
                <div class="ra-prog-fill" style="width:0%;background:${meta.accent}" data-w="${p}"></div>
              </div>
              <div class="ra-sc-foot">
                <div class="ra-sc-stat"><b style="color:${meta.accent}">${sc}</b>earned</div>
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
                    const catColors = [
                        "#4f8ef7",
                        "#22d3a5",
                        "#fbbf24",
                        "#a78bfa",
                    ];
                    raCreateChart("raChartSkillsCat", {
                        type: "doughnut",
                        data: {
                            labels: catLabels,
                            datasets: [
                                {
                                    data: catData,
                                    backgroundColor: catColors,
                                    borderColor: "#161b25",
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
                                    backgroundColor: [
                                        "#22d3a5",
                                        "#fbbf24",
                                        "#f87171",
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
                                    backgroundColor: projScores.map((s) =>
                                        s >= 8
                                            ? "#22d3a5"
                                            : s >= 5
                                              ? "#fbbf24"
                                              : "#f87171",
                                    ),
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
                                        "#22d3a5",
                                        "#4f8ef7",
                                        "#fbbf24",
                                    ],
                                    borderColor: "#161b25",
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
                            color: "#22d3a5",
                        },
                        {
                            label: "Has Outcome",
                            value: withOutcome,
                            color: "#4f8ef7",
                        },
                        {
                            label: "Tutorial",
                            value: tutorial,
                            color: "#fbbf24",
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
                <div class="ra-prog-bar" style="flex:1"><div class="ra-prog-fill" style="width:${(p.project_score || 0) * 10}%;background:#4f8ef7"></div></div>
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
                        active: "#22d3a5",
                        mostly_observation: "#fbbf24",
                        unclear: "#f87171",
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
                                            "#4f8ef7",
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
                                    backgroundColor: "#4f8ef799",
                                    borderColor: "#4f8ef7",
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
                                    "#94a3b8";
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
                                            "#4f8ef7",
                                            "#22d3a5",
                                            "#a78bfa",
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
                            ? "#22d3a5"
                            : l.includes("somewhat")
                              ? "#fbbf24"
                              : "#f87171",
                    );
                    raCreateChart("raChartCertRel", {
                        type: "pie",
                        data: {
                            labels: relLabels,
                            datasets: [
                                {
                                    data: relData,
                                    backgroundColor: relColors,
                                    borderColor: "#161b25",
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
                                (a.activity_name || "Activity").slice(0, 14),
                            ),
                            datasets: [
                                {
                                    data: acts.map(
                                        (a) => a.activity_score || 0,
                                    ),
                                    backgroundColor: acts.map((a) =>
                                        a.is_leadership ? "#a78bfa" : "#4f8ef7",
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
                            col2.innerHTML += `<div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:0.8rem;margin-bottom:0.75rem;display:flex;gap:0.55rem;align-items:flex-start">
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
                    const _vBorder =
                        document.documentElement.getAttribute("data-theme") ===
                        "light"
                            ? "#f0f4f9"
                            : "#161b25";
                    raCreateChart("raChartFmtVerbs", {
                        type: "doughnut",
                        data: {
                            labels: ["Strong Verbs", "Weak Verbs", "Filler"],
                            datasets: [
                                {
                                    data: [strong, weak, filler],
                                    backgroundColor: [
                                        "#22d3a5",
                                        "#fbbf24",
                                        "#f87171",
                                    ],
                                    borderColor: _vBorder,
                                    borderWidth: 2,
                                },
                            ],
                        },
                        options: raChartOpts({ cutout: "55%" }),
                    });
                    raHtmlLegend("raLegendFmtVerbs", [
                        { label: "Strong", value: strong, color: "#22d3a5" },
                        { label: "Weak", value: weak, color: "#fbbf24" },
                        { label: "Filler", value: filler, color: "#f87171" },
                    ]);

                    const atsV =
                        { low: 85, medium: 50, high: 20, critical: 10 }[
                            fm.ats_risk_level
                        ] || 50;
                    const atsC =
                        fm.ats_risk_level === "low"
                            ? "#22d3a5"
                            : fm.ats_risk_level === "medium"
                              ? "#fbbf24"
                              : "#f87171";
                    const _gaugeBg =
                        document.documentElement.getAttribute("data-theme") ===
                        "light"
                            ? "rgba(14,100,180,0.08)"
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
                    (ap.critical_fixes || []).forEach((f) => {
                        sevCounts[f.severity] =
                            (sevCounts[f.severity] || 0) + 1;
                    });
                    const sevL = Object.keys(sevCounts),
                        sevD = Object.values(sevCounts);
                    const sevColors = sevL.map((s) =>
                        s === "critical"
                            ? "#f87171"
                            : s === "high"
                              ? "#fbbf24"
                              : "#4f8ef7",
                    );
                    raCreateChart("raChartActionSev", {
                        type: "pie",
                        data: {
                            labels: sevL,
                            datasets: [
                                {
                                    data: sevD,
                                    backgroundColor: sevColors,
                                    borderColor: "#161b25",
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
                    const gainLabels = (ap.quick_wins || []).map((w) =>
                        (w.action || "").slice(0, 20),
                    );
                    raCreateChart("raChartQuickWins", {
                        type: "bar",
                        data: {
                            labels: gainLabels,
                            datasets: [
                                {
                                    data: gains,
                                    backgroundColor: "#22d3a5",
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
                                        "#22d3a5",
                                        "#f87171",
                                        "#fbbf24",
                                    ],
                                    borderColor: "#161b25",
                                    borderWidth: 2,
                                },
                            ],
                        },
                        options: raChartOpts({ cutout: "60%" }),
                    });
                    raHtmlLegend("raLegendCompStatus", [
                        { label: "Complete", value: comp, color: "#22d3a5" },
                        { label: "Missing", value: miss, color: "#f87171" },
                        {
                            label: "Underdeveloped",
                            value: under,
                            color: "#fbbf24",
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
                                        "#4f8ef7",
                                        "#22d3a5",
                                        "#fbbf24",
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
              <div><div class="ra-comp-col-title">✅ Complete</div>${(rc2.sections_complete || []).map((s) => `<div class="ra-comp-item">✅ ${s}</div>`).join("") || "None"}</div>
              <div><div class="ra-comp-col-title">❌ Missing</div>${(rc2.sections_missing || []).map((s) => `<div class="ra-comp-item">❌ ${s}</div>`).join("") || "None"}</div>
              <div><div class="ra-comp-col-title">⚠️ Underdeveloped</div>${(rc2.sections_underdeveloped || []).map((s) => `<div class="ra-comp-item">⚠️ <strong>${s.section}</strong>: ${s.reason}</div>`).join("") || "None"}</div>
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
            ${D.confidence.confidence_score ? `<div style="margin-top:1rem;display:flex;justify-content:flex-end"><span class="ra-confidence-badge">🛡️ <span style="color:var(--ra-emerald)">Analysis Confidence: ${D.confidence.confidence_score}%</span> · ${D.confidence.extraction_quality || ""}</span></div>` : ""}`;
                    }
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
                                "http://localhost:5000/api/resumes/my/active",
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
                            '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Refresh from DB';
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
                // CAREER ROADMAP — AI Generation via backend API
                // ═══════════════════════════════════════════════════════════════════════
                const crmGenerateBtn =
                    document.getElementById("crmGenerateBtn");
                const crmOutput = document.getElementById("crmOutput");
                const crmSteps = document.getElementById("crmSteps");

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
                    // Try to parse structured steps from the raw AI text
                    // Look for numbered lines like "1. Title" or "Step 1:"
                    const lines = rawText.split("\n").filter((l) => l.trim());
                    const stepRegex = /^(\d+)[.):]\s*(.+)/;
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
                            // Extract duration hint if present
                            const durationMatch = desc.match(
                                /(\d+[-–]\d+\s*(weeks?|months?|years?))/i,
                            );
                            const durationText = durationMatch
                                ? durationMatch[0]
                                : null;

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
                        // Fallback: show raw text nicely
                        const el = document.createElement("div");
                        el.className = "crm-raw-output";
                        el.textContent = rawText;
                        crmSteps.appendChild(el);
                    }
                };

                if (crmGenerateBtn) {
                    crmGenerateBtn.addEventListener("click", async () => {
                        const currentRole = document
                            .getElementById("crmCurrentRole")
                            .value.trim();
                        const targetRole = document
                            .getElementById("crmTargetRole")
                            .value.trim();
                        const skills = document
                            .getElementById("crmSkills")
                            .value.trim();

                        if (!currentRole || !targetRole) {
                            if (
                                window.CareerIQAuth &&
                                window.CareerIQAuth.Toast
                            ) {
                                window.CareerIQAuth.Toast.show(
                                    "Please enter both your current role and target role.",
                                    "error",
                                );
                            }
                            return;
                        }

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
                                "http://localhost:5000/api/career/roadmap",
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
                // UPLOAD — extracts text, saves to Firestore ONLY
                // Rules:
                //  • Same filename + analysis already saved → keep existing analysis,
                //    just show a toast ("same resume, showing saved results")
                //  • Different file → overwrite text, clear old analysis, show Analyze btn
                // ═══════════════════════════════════════════════════════════════════════
                const uploadResumeBtn =
                    document.getElementById("uploadResumeBtn");
                const resumeFileInput =
                    document.getElementById("resumeFileInput");

                if (uploadResumeBtn && resumeFileInput) {
                    uploadResumeBtn.addEventListener("click", () =>
                        resumeFileInput.click(),
                    );

                    resumeFileInput.addEventListener("change", async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        const uid = user.uid;

                        const origHTML = uploadResumeBtn.innerHTML;
                        uploadResumeBtn.innerHTML =
                            '<span class="upload-spinner"></span>Saving…';
                        uploadResumeBtn.disabled = true;

                        try {
                            // Check current Firestore state
                            const snap = await db
                                .collection("user_profiles")
                                .doc(uid)
                                .get();
                            const existing = snap.exists ? snap.data() : {};

                            // ── Same filename AND analysis exists in PostgreSQL → keep everything, just notify
                            if (
                                file.name === existing.resumeName &&
                                pgResume &&
                                pgResume.file_name === file.name &&
                                pgResume.overall_analysis
                            ) {
                                populateResumeAnalysisTab(pgResume);
                                if (
                                    window.CareerIQAuth &&
                                    window.CareerIQAuth.Toast
                                ) {
                                    window.CareerIQAuth.Toast.show(
                                        "Same resume detected — your saved analysis is shown in the Resume Analysis tab.",
                                        "info",
                                        4000,
                                    );
                                }
                                return; // nothing to re-upload
                            }

                            // ── New file → extract text and save
                            pgResume = null;
                            const extracted =
                                await ResumeExtractor.extractFromFile(file);
                            const resumeText = extracted.raw_text;

                            if (!resumeText || resumeText.trim().length < 50)
                                throw new Error(
                                    "Could not read text from this PDF. Make sure it is not a scanned image.",
                                );

                            // Save text; clear old analysis so stale scores don't show
                            const FieldValue = firebase.firestore.FieldValue;
                            await db
                                .collection("user_profiles")
                                .doc(uid)
                                .set(
                                    {
                                        resumeName: file.name,
                                        resumeText: resumeText,
                                        resumeExtractedAt:
                                            new Date().toISOString(),
                                        resumeAnalysis: FieldValue.delete(),
                                        resumeScore: FieldValue.delete(),
                                        resumeUploadCount:
                                            FieldValue.increment(1),
                                    },
                                    { merge: true },
                                );

                            // Show Analyze button for new resume
                            document.getElementById(
                                "savedResumeName",
                            ).textContent =
                                "📄 " + file.name + " — ready to analyze";
                            if (analyzeResumeBtn)
                                analyzeResumeBtn.style.display = "inline-flex";

                            if (
                                window.CareerIQAuth &&
                                window.CareerIQAuth.Toast
                            ) {
                                window.CareerIQAuth.Toast.show(
                                    'Resume saved! Click "Analyze with AI" to get your score.',
                                    "success",
                                    5000,
                                );
                            }
                        } catch (err) {
                            console.error("Upload failed:", err);
                            if (
                                window.CareerIQAuth &&
                                window.CareerIQAuth.Toast
                            ) {
                                window.CareerIQAuth.Toast.show(
                                    "Upload failed: " + err.message,
                                    "error",
                                );
                            }
                        } finally {
                            uploadResumeBtn.innerHTML = origHTML;
                            uploadResumeBtn.disabled = false;
                            resumeFileInput.value = "";
                        }
                    });
                }
            };

            if (window.CareerIQAuth) {
                initApp();
            } else {
                document.addEventListener("CareerIQAuthReady", initApp);
            }
