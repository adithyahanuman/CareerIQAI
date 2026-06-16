/* =====================================================
   PlacementIQ Dashboard — Data Population
   Reads from pgResume (resume analysis data) and
   populates all dashboard home tab widgets.
   ===================================================== */

(function () {
    'use strict';

    // ── Wait for dashboard.js to expose pgResume ──────────────────────────────
    // We hook into the populateResumeAnalysisTab by wrapping the global

    // Color helpers
    function scoreColor(s) {
        return window.COLORS.getScoreColor(s);
    }

    // ── Draw readiness trend chart ────────────────────────────────────────────
    let trendChart = null;

    function drawTrendChart(currentScore) {
        const canvas = document.getElementById('piqTrendChart');
        if (!canvas) return;
        if (trendChart) { try { trendChart.destroy(); } catch (e) {} }

        // Build synthetic trend from current score (ascending curve)
        const base = Math.max(currentScore - 25, 40);
        const months = 6;
        const data = [];
        for (let i = 0; i < months; i++) {
            const progress = i / (months - 1);
            const eased = 1 - Math.pow(1 - progress, 2);
            data.push(Math.round(base + (currentScore - base) * eased + (Math.random() - 0.5) * 4));
        }
        data[months - 1] = currentScore; // last point = actual score

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const gridColor = isLight ? 'rgba(225, 29, 72, 0.08)' : 'rgba(244, 63, 94, 0.06)';
        const tickColor = isLight ? '#1a1218' : '#ffffff';

        const color = scoreColor(currentScore);
        const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, 120);
        gradient.addColorStop(0, color + '4d'); // 30% opacity
        gradient.addColorStop(1, color + '00'); // 0% opacity

        trendChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    data: data,
                    borderColor: color,
                    borderWidth: 2,
                    backgroundColor: gradient,
                    pointBackgroundColor: color,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        display: false,
                        grid: { display: false }
                    },
                    y: {
                        display: false,
                        min: Math.max(base - 10, 20),
                        max: Math.min(currentScore + 10, 100)
                    }
                }
            }
        });
    }

    // ── Animate gauge ─────────────────────────────────────────────────────────
    function animateGauge(score) {
        const fill = document.getElementById('piqGaugeFill');
        const scoreEl = document.getElementById('piqGaugeScore');
        if (!fill || !scoreEl) return;

        const circumference = 2 * Math.PI * 50; // r=50
        const color = scoreColor(score);
        fill.style.stroke = color;
        fill.style.strokeDasharray = circumference;
        fill.style.strokeDashoffset = circumference; // start at 0

        setTimeout(() => {
            const offset = circumference - (score / 100) * circumference;
            fill.style.strokeDashoffset = offset;
        }, 100);

        // Animate count-up
        const duration = 1200;
        const start = performance.now();
        const step = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            scoreEl.textContent = Math.round(eased * score);
            if (progress < 1) requestAnimationFrame(step);
            else scoreEl.textContent = score;
        };
        requestAnimationFrame(step);
    }

    // ── Populate skill tags ───────────────────────────────────────────────────
    function buildSkillTags(skills, containerId, limit = 8) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (!skills || !skills.length) {
            el.innerHTML = `<div class="piq-empty-state piq-empty-sm"><div class="piq-empty-text">None found</div></div>`;
            return;
        }

        el.innerHTML = skills.slice(0, limit).map(skill => {
            const name = typeof skill === 'string' ? skill : (skill.name || skill);
            return `<span class="piq-role-tag" style="background: rgba(34, 197, 94, 0.15); color: #10b981; border: 1px solid rgba(34, 197, 94, 0.3);">${name}</span>`;
        }).join('');
    }

    // ── Populate best-fit roles ───────────────────────────────────────────────
    function populateRoles(data) {
        const el = document.getElementById('piqRolesList');
        if (!el) return;

        const ap = data.action_plan || data.analysis?.action_plan || {};
        const overall = data.overall_analysis || data.analysis?.overall || {};
        const sk = data.skills_analysis || data.analysis?.skills || {};

        const rawRoles = ap.recommended_internship_roles || overall.recommended_roles || [];
        if (!rawRoles.length) return;

        const roleIcons = ['💻', '📊', '🤖', '🎨', '🔧', '📱', '🌐', '⚡'];
        const roleColors = [
            'linear-gradient(135deg,#f43f5e,#8b5cf6)', // Indigo to Violet
            'linear-gradient(135deg,#22c55e,#10b981)', // Green to Emerald
            'linear-gradient(135deg,#f59e0b,#f97316)', // Amber to Orange
            'linear-gradient(135deg,#06b6d4,#3b82f6)', // Cyan to Blue
        ];

        el.innerHTML = '';

        const allSkills = [
            ...(sk.technical_skills || []),
            ...(sk.frameworks_and_libraries || []),
        ].slice(0, 3);

        const score = overall.overall_score || 0;
        rawRoles.slice(0, 3).forEach((role, i) => {
            const match = Math.min(98, Math.max(65, score + 10 - i * 7));
            const item = document.createElement('div');
            item.className = 'piq-role-item';
            const tags = allSkills.slice(0, 3).map(s => `<span class="piq-role-tag">${s}</span>`).join('');
            item.innerHTML = `
                <div class="piq-role-header">
                    <div class="piq-role-icon" style="background:${roleColors[i % roleColors.length]}">${roleIcons[i % roleIcons.length]}</div>
                    <div class="piq-role-match">${match}%</div>
                </div>
                <div class="piq-role-name">${role}</div>
                <div class="piq-role-tags">${tags}</div>
                <div class="piq-role-bar-wrap">
                    <div class="piq-role-bar-fill" data-w="${match}" style="width:0%"></div>
                </div>
            `;
            el.appendChild(item);
        });

        setTimeout(() => {
            el.querySelectorAll('.piq-role-bar-fill').forEach(b => {
                b.style.width = b.dataset.w + '%';
            });
        }, 300);
    }

    // ── Populate strengths ────────────────────────────────────────────────────
    function populateStrengths(data) {
        const el = document.getElementById('piqStrengths');
        if (!el) return;
        const ap = data.action_plan || data.analysis?.action_plan || {};
        const strengths = ap.strengths_to_highlight || [];
        if (!strengths.length) return;

        el.innerHTML = strengths.slice(0, 3).map(s => `
            <div class="piq-strength-item">
                <span class="piq-strength-icon">✅</span>
                <span>${s}</span>
            </div>
        `).join('');
    }

    // ── Populate improvements ─────────────────────────────────────────────────
    function populateImprovements(data) {
        const el = document.getElementById('piqImprovements');
        if (!el) return;
        const ap = data.action_plan || data.analysis?.action_plan || {};
        const fixes = ap.critical_fixes || ap.quick_wins || [];
        if (!fixes.length) return;

        const gains = ['+18', '+12', '+8', '+7'];
        el.innerHTML = fixes.slice(0, 4).map((f, i) => `
            <div class="piq-improvement-item">
                <span class="piq-improvement-text">${f.fix || f.action || f}</span>
                <span class="piq-improvement-gain">${gains[i] || '+5'}</span>
            </div>
        `).join('');
    }

    // ── Populate Growth Roadmap (4 fixed steps) ───────────────────────────────
    function populateRoadmap(data) {
        const ap       = data.action_plan        || data.analysis?.action_plan || {};
        const skillsD  = data.skills_analysis    || data.analysis?.skills      || {};
        const projD    = data.projects_analysis  || data.analysis?.projects    || {};

        // ── Extract skill gaps (for Step 1 tags) ─────────────────────────────
        let foundSkills = [];
        (ap.biggest_gaps || []).forEach(g => {
            const name = typeof g === 'string' ? g : (g.skill || g.gap || g.name || String(g));
            if (name && !foundSkills.includes(name)) foundSkills.push(name);
        });
        (skillsD.skills_without_evidence || []).forEach(s => {
            const name = typeof s === 'string' ? s : (s.skill || s.name || '');
            if (name && !foundSkills.includes(name)) foundSkills.push(name);
        });
        if (foundSkills.length < 3) {
            const suggestions = [
                ...(ap.long_term_suggestions || []).map(s => s.suggestion || s),
                ...(ap.critical_fixes || []).map(s => s.fix || s.action || s),
            ];
            const KNOWN = ['Docker','Kubernetes','AWS','GCP','Azure','System Design','SQL','NoSQL',
                'MongoDB','PostgreSQL','Redis','Kafka','Spark','Tableau','PowerBI','TensorFlow',
                'PyTorch','scikit-learn','Machine Learning','Deep Learning','NLP','React','Node.js',
                'FastAPI','Flask','Django','TypeScript','GraphQL','REST API','Microservices','CI/CD',
                'Linux','DSA','Agile'];
            suggestions.forEach(txt => {
                if (!txt) return;
                KNOWN.forEach(kw => {
                    if (txt.toLowerCase().includes(kw.toLowerCase()) && !foundSkills.includes(kw))
                        foundSkills.push(kw);
                });
            });
        }

        // ── Extract projects (for Step 2 tags) ───────────────────────────────
        const aiSuggestions = projD.projects_suggestions || [];
        const PROJECT_ICONS = ['🌐','🤖','⚙️','📊','🏗️','🔗'];
        const PROJECT_COLORS = ['#f43f5e','#8b5cf6','#ec4899','#22c55e','#f59e0b','#06b6d4'];
        const FALLBACK_PROJECTS = [
            { title: 'Full-Stack SaaS App' },
            { title: 'ML Prediction Pipeline' },
            { title: 'DevOps CI/CD Pipeline' },
        ];
        let projectItems = aiSuggestions.length
            ? aiSuggestions.slice(0, 3).map((s, i) => ({
                title: typeof s === 'string' ? s.split(':')[0] : (s.name || s.title || `Project ${i+1}`),
                color: PROJECT_COLORS[i % PROJECT_COLORS.length],
                icon:  PROJECT_ICONS[i % PROJECT_ICONS.length],
            }))
            : FALLBACK_PROJECTS.map((p, i) => ({
                ...p,
                color: PROJECT_COLORS[i % PROJECT_COLORS.length],
                icon:  PROJECT_ICONS[i % PROJECT_ICONS.length],
            }));

        // ── Roadmap element ───────────────────────────────────────────────────
        const roadmapEl = document.getElementById('piqGrowthRoadmap');
        if (!roadmapEl) {
            const badge = document.getElementById('piqUpdatedBadge');
            if (badge) badge.style.display = '';
            return;
        }



        // ── Build content for each fixed step from real data ──────────────────

        // Step 1 — Skill Gaps
        const gapItems = foundSkills.slice(0, 8);
        const step1Desc = gapItems.length
            ? `Master these missing skills: ${gapItems.slice(0, 5).join(', ')}${gapItems.length > 5 ? ` +${gapItems.length - 5} more` : ''}.`
            : 'Your skill profile looks strong. Focus on deepening expertise in your core stack.';
        const step1Tags = gapItems.slice(0, 6).map(s =>
            `<span class="piq-road-tag piq-road-tag-warn">${s}</span>`).join('');

        // Step 2 — Required Projects
        const projTitles = projectItems.map(p => p.title);
        const step2Desc = projTitles.length
            ? `Build these projects to prove your skills to recruiters:`
            : 'Build 2–3 showcase projects aligned to your target role.';
        const step2Tags = projTitles.slice(0, 3).map(t =>
            `<span class="piq-road-tag piq-road-tag-violet">${t}</span>`).join('');

        // Step 3 — Resume Changes
        const critFixes  = ap.critical_fixes         || [];
        const quickWins  = ap.quick_wins              || [];
        const weekFixes  = ap.this_week_improvements  || [];
        const allFixes   = [
            ...critFixes.map(f => f.fix || f.action || f),
            ...quickWins.map(f => f.action || f),
            ...weekFixes.map(f => f.improvement || f),
        ].filter(Boolean);
        const step3Desc = allFixes.length
            ? `${allFixes.length} changes identified to improve your resume score:`
            : 'Refine your bullet points, add quantified results, and improve ATS keywords.';
        const step3Tags = allFixes.slice(0, 3).map(f =>
            `<span class="piq-road-tag piq-road-tag-amber">${String(f).substring(0, 40)}${String(f).length > 40 ? '…' : ''}</span>`
        ).join('');

        // Step 4 — Apply for Jobs
        const roles    = ap.recommended_internship_roles || [];
        const certs    = ap.recommended_certifications   || [];
        const step4Desc = roles.length
            ? `Target these roles once your profile is ready:`
            : 'Apply to internships and entry-level roles once your resume and projects are ready.';
        const step4Tags = [
            ...roles.slice(0, 3).map(r =>
                `<span class="piq-road-tag piq-road-tag-teal">${r}</span>`),
            ...certs.slice(0, 2).map(c =>
                `<span class="piq-road-tag piq-road-tag-violet">${c}</span>`),
        ].join('');

        // ── 4 fixed steps definition ──────────────────────────────────────────
        const FIXED_STEPS = [
            {
                icon:  '⚡',
                color: '#f59e0b', // Amber
                label: 'STEP 1',
                title: 'Skill Gap Analysis',
                time:  '2–4 weeks',
                desc:  step1Desc,
                tags:  step1Tags,
                impact: gapItems.length ? `${gapItems.length} skills to learn` : 'Profile strong',
            },
            {
                icon:  '🛠️',
                color: '#f43f5e', // Indigo
                label: 'STEP 2',
                title: 'Required Projects',
                time:  '4–8 weeks',
                desc:  step2Desc,
                tags:  step2Tags,
                impact: `${projTitles.length} project${projTitles.length !== 1 ? 's' : ''} recommended`,
            },
            {
                icon:  '📝',
                color: '#ec4899', // Pink
                label: 'STEP 3',
                title: 'Resume Changes Required',
                time:  '1 week',
                desc:  step3Desc,
                tags:  step3Tags,
                impact: allFixes.length ? `${allFixes.length} improvements` : 'Resume looks good',
            },
            {
                icon:  '🎯',
                color: '#22c55e', // Green
                label: 'STEP 4',
                title: 'Apply for Jobs / Internships',
                time:  'Ongoing',
                desc:  step4Desc,
                tags:  step4Tags,
                impact: roles.length ? `${roles.length} target roles` : 'Start applying!',
            },
        ];

        roadmapEl.innerHTML = FIXED_STEPS.map((s, i) => `
            <div class="piq-road-step" tabindex="0" data-index="${i}">
                <div class="piq-road-left">
                    <div class="piq-road-node" style="background:${s.color}18;border-color:${s.color}50;color:${s.color};">${s.icon}</div>
                    ${i < FIXED_STEPS.length - 1 ? `<div class="piq-road-connector" style="background:linear-gradient(to bottom,${s.color}40,${FIXED_STEPS[i+1].color}20);"></div>` : ''}
                </div>
                <div class="piq-road-body">
                    <div class="piq-road-header">
                        <span class="piq-road-label" style="color:${s.color};">${s.label}</span>
                        <span class="piq-road-time">⏱ ${s.time}</span>
                        <span class="piq-road-impact-mini" style="color:${s.color};background:${s.color}12;border-color:${s.color}30;">${s.impact}</span>
                    </div>
                    <div class="piq-road-title">${s.title}</div>
                    <div class="piq-road-expand">
                        <p class="piq-road-desc">${s.desc}</p>
                        ${s.tags ? `<div class="piq-road-tags">${s.tags}</div>` : ''}
                    </div>
                </div>
            </div>`
        ).join('');

        // Wire click/keyboard expand toggle
        roadmapEl.querySelectorAll('.piq-road-step').forEach(step => {
            const toggle = () => {
                const isOpen = step.classList.contains('piq-road-open');
                roadmapEl.querySelectorAll('.piq-road-step').forEach(s => s.classList.remove('piq-road-open'));
                if (!isOpen) step.classList.add('piq-road-open');
            };
            step.addEventListener('click', toggle);
            step.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
            });
        });

        // Show updated badge
        const badge = document.getElementById('piqUpdatedBadge');
        if (badge) badge.style.display = '';
    }

    // ── Main populate function ────────────────────────────────────────────────
    function populatePlacementIQ(pgResume) {
        if (!pgResume) return;

        const D = {
            overall: pgResume.overall_analysis || pgResume.analysis?.overall || {},
            skills: pgResume.skills_analysis || pgResume.analysis?.skills || {},
            action_plan: pgResume.action_plan_analysis || pgResume.analysis?.action_plan || {},
            projects: pgResume.projects_analysis || pgResume.analysis?.projects || {},
            completeness: pgResume.completeness_analysis || pgResume.analysis?.resume_completeness || {},
            formatting: pgResume.formatting_analysis || pgResume.analysis?.formatting || {},
            certifications: pgResume.certifications_analysis || pgResume.analysis?.certifications || {},
        };

        const score = D.overall.overall_score || 0;
        const color = scoreColor(score);

        // ── 1. Welcome subtitle ──
        const sub = document.getElementById('piqWelcomeSub');
        if (sub) {
            const percentile = D.overall.percentile_estimate || '';
            sub.textContent = percentile
                ? `Your career readiness is ${percentile} — ${score >= 75 ? 'excellent standing!' : 'keep improving!'}`
                : `Resume analyzed · employability score ${score}/100`;
        }

        // ── 2. Hero gauge ──
        animateGauge(score);

        // Hero title
        const heroTitle = document.getElementById('piqHeroTitle');
        if (heroTitle) {
            const pct = D.overall.percentile_estimate || '';
            heroTitle.textContent = pct
                ? `You're in the top ${pct} of your batch`
                : (D.overall.grade_label || `Your employability score is ${score}/100`);
        }

        // Hero desc
        const heroDesc = document.getElementById('piqHeroDesc');
        if (heroDesc) {
            heroDesc.textContent = D.overall.one_line_verdict
                || D.action_plan?.encouragement
                || `${(D.action_plan?.critical_fixes || []).length} high-impact improvements could push you into the top decile by placement season.`;
        }

        // ── 3. Metric cards ──
        // Resume Quality
        const qual = document.getElementById('piqResumeQuality');
        const qualSub = document.getElementById('piqResumeQualitySub');
        if (qual) {
            qual.textContent = `${score}/100`;
            qual.style.color = color;
        }
        if (qualSub) {
            qualSub.textContent = D.overall.grade_label || D.overall.letter_grade
                ? `${D.overall.letter_grade || ''} — ${D.overall.grade_label || 'Strong structure & content'}`
                : 'Strong structure & content';
        }

        // ATS Compatibility
        const atsScore = document.getElementById('piqAtsScore');
        const atsSub = document.getElementById('piqAtsSub');
        const atsRisk = D.formatting.ats_risk_level || 'medium';
        const atsVal = { low: 85, medium: 68, high: 45, critical: 25 }[atsRisk] || 68;
        if (atsScore) {
            atsScore.textContent = `${atsVal}/100`;
            atsScore.style.color = atsRisk === 'low' ? '#22c55e' : atsRisk === 'medium' ? '#f59e0b' : '#ef4444';
        }
        if (atsSub) {
            const fixes = D.action_plan?.critical_fixes?.length || 0;
            atsSub.textContent = fixes ? `${fixes} fixes suggested` : `ATS Risk: ${atsRisk}`;
        }

        // Achievements
        const achiev = document.getElementById('piqAchievements');
        const achievSub = document.getElementById('piqAchievSub');
        const certs = (D.certifications?.certifications_found || []).length;
        const projects = D.projects?.total_projects || 0;
        const total = certs + projects;
        if (achiev) {
            achiev.textContent = total || '—';
        }
        if (achievSub) {
            achievSub.textContent = total
                ? `${certs} certifications · ${projects} projects`
                : 'Complete resume analysis to see';
        }

        // ── 4. Trend chart ──
        drawTrendChart(score);

        // ── 5. Best-Fit Roles ──
        populateRoles(pgResume);

        // ── 6. Skills Intelligence ──
        const allSkills = [
            ...(D.skills.technical_skills || []),
            ...(D.skills.tools_and_platforms || []),
            ...(D.skills.frameworks_and_libraries || []),
            ...(D.skills.soft_skills || [])
        ];

        buildSkillTags(allSkills, 'piqAllSkills', 30);



        // ── 7. Resume Insights ──
        populateStrengths(pgResume);
        populateImprovements(pgResume);

        // ── 8. Growth Roadmap ──
        populateRoadmap(pgResume);
    }

    // ── Hook into analysis completion ────────────────────────────────────────
    // We patch the global dashboard's data flow

    // Listen for a custom event dispatched after analysis
    document.addEventListener('careeriq:analysis-ready', (e) => {
        if (e.detail?.pgResume) {
            populatePlacementIQ(e.detail.pgResume);
        }
    });

    // Also try polling for pgResume availability
    let pollCount = 0;
    const pollInterval = setInterval(() => {
        pollCount++;
        if (pollCount > 40) { clearInterval(pollInterval); return; }

        // Try to get from global scope
        if (window._piqResumeData) {
            clearInterval(pollInterval);
            populatePlacementIQ(window._piqResumeData);
        }
    }, 500);

    // ── Wire up "View Analysis" button ───────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        const viewBtn = document.getElementById('piqViewAnalysisBtn');
        if (viewBtn) {
            viewBtn.addEventListener('click', () => {
                // Navigate to resume analysis tab
                const raLink = document.querySelector('.menu-item[data-target="resume-analysis"]');
                if (raLink) raLink.click();
            });
        }

        const benchBtn = document.getElementById('piqBenchmarkBtn');
        if (benchBtn) {
            benchBtn.addEventListener('click', () => {
                const bLink = document.querySelector('.menu-item[data-target="benchmarking"]');
                if (bLink) bLink.click();
            });
        }

        // View all roles click
        const viewAll = document.querySelector('.piq-view-all');
        if (viewAll) {
            viewAll.addEventListener('click', (e) => {
                e.preventDefault();
                const target = viewAll.dataset.target;
                if (target) {
                    const link = document.querySelector(`.menu-item[data-target="${target}"]`);
                    if (link) link.click();
                }
            });
        }

        // Upload CTA button
        const ctaBtn = document.getElementById('uploadResumeBtnCta');
        if (ctaBtn) {
            ctaBtn.addEventListener('click', () => {
                const fileInput = document.getElementById('resumeFileInput');
                if (fileInput) fileInput.click();
            });
        }

        // Analyze button in RA tab
        const analyzeRA = document.getElementById('analyzeResumeBtnRA');
        const analyzeMain = document.getElementById('analyzeResumeBtn');
        if (analyzeRA && analyzeMain) {
            analyzeRA.addEventListener('click', () => analyzeMain.click());
        }

        const analyzeInAnalysis = document.getElementById('analyzeResumeBtnInAnalysis');
        if (analyzeInAnalysis && analyzeMain) {
            analyzeInAnalysis.addEventListener('click', () => analyzeMain.click());
        }
    });

    // ── Patch dashboard.js populateResumeAnalysisTab ─────────────────────────
    // After dashboard.js loads, wrap its populate function
    const patchDashboard = () => {
        // Wait for CareerIQAuth and then observe pgResume changes
        if (typeof window._dashboardPopulate === 'function') {
            const orig = window._dashboardPopulate;
            window._dashboardPopulate = (resume) => {
                orig(resume);
                populatePlacementIQ(resume);
            };
        }
    };

    // Try to integrate with dashboard data after load
    window.addEventListener('load', () => {
        // Give dashboard.js time to run
        setTimeout(() => {
            if (window._piqResumeData) {
                populatePlacementIQ(window._piqResumeData);
                clearInterval(pollInterval);
            }
        }, 2000);
    });

    // Expose populate function globally so dashboard.js can call it
    window.PlacementIQ = { populate: populatePlacementIQ };

})();
