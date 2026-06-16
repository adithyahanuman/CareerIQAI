/**
 * benchmarking.js  (v3)
 * Personal role-fit benchmarking tab.
 *
 * States:
 *  'done'    → show results immediately (cached)
 *  'running' → show animated progress, auto-poll every 6s until done
 *  'none'    → no resume yet, show CTA
 *
 * Auto-loads on tab open. Polls backend (status endpoint) if a background
 * job is in progress (e.g. triggered automatically after resume upload).
 */

'use strict';

(function () {
    const API_BASE   = window.API_BASE || 'http://localhost:5000/api';
    const TOP_N      = 10;
    const POLL_MS    = 6000;   // poll every 6 seconds while 'running'

    let allResults   = [];
    let showAll      = false;
    let searchQuery  = '';
    let courseTier   = '';
    let runDate      = '';
    let _pollTimer   = null;   // setInterval handle
    let benchMetrics = null;

    // ── Auth ──────────────────────────────────────────────────────────────────
    async function authHeaders() {
        try {
            if (window.firebase && firebase.auth().currentUser) {
                const t = await firebase.auth().currentUser.getIdToken();
                return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
            }
        } catch (_) {}
        const t = localStorage.getItem('authToken') || '';
        return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
    }

    // ── Score helpers ─────────────────────────────────────────────────────────
    function scoreClass(grade) {
        const map = {
            'A+':'sc-a-plus','A':'sc-a','A−':'sc-a-minus','A-':'sc-a-minus',
            'B+':'sc-b-plus','B':'sc-b','B−':'sc-b-minus','B-':'sc-b-minus',
            'C+':'sc-c-plus','C':'sc-c','C−':'sc-c-minus','C-':'sc-c-minus',
            'D':'sc-d','F':'sc-f',
        };
        return map[grade] || 'sc-f';
    }

    function gradeColor(grade) {
        if (!grade) return '#ef4444';
        const g = grade.replace('−', '-');
        if (g === 'A+' || g === 'A' || g === 'B+') return '#22c55e';
        if (g === 'A-' || g === 'B' || g === 'C+') return '#f59e0b';
        if (g === 'B-' || g === 'C' || g === 'C-') return '#f97316';
        return '#ef4444';
    }

    function barColor(score) {
        if (score >= 80) return '#22c55e';
        if (score >= 60) return '#f59e0b';
        if (score >= 40) return '#f97316';
        return '#ef4444';
    }


    function podiumEmoji(rank) { return ['🥇','🥈','🥉'][rank] || ''; }
    function tierLabel(tier) {
        return { btech:'B.Tech', mtech:'M.Tech', msc:'M.Sc', mba:'MBA', phd:'PhD' }[tier] || 'B.Tech';
    }

    // ── Render helpers ────────────────────────────────────────────────────────
    const root = () => document.getElementById('page-benchmarking');
    function setRoot(html) {
        const el = root();
        if (el) el.innerHTML = `<div class="bench-tab">${html}</div>`;
    }

    // ── UI States ─────────────────────────────────────────────────────────────

    /** Shown while AI is scoring roles (background job running) */
    function showGenerating() {
        setRoot(`
            <div class="bench-header">
                <div class="bench-header-left">
                    <h2>Role Fit Benchmarking</h2>
                    <p>AI-powered fit score across all placement roles for your course.</p>
                </div>
                <span class="bench-badge">⚡ AI Powered</span>
            </div>
            <div class="bench-state-box">
                <div class="bench-state-icon generating-pulse">⚡</div>
                <p class="bench-state-title">Generating Your Scores…</p>
                <p class="bench-state-sub">We're scoring your resume against every placement role. This happens automatically after upload and takes about 15–30 seconds.</p>
                <div class="bench-loading-bar"></div>
                <p class="bench-state-hint">No action needed — this page will update automatically.</p>
            </div>`);
    }

    /** Shown on first load (instant spinner before first API call) */
    function showLoading() {
        setRoot(`
            <div class="bench-header">
                <div class="bench-header-left">
                    <h2>Role Fit Benchmarking</h2>
                    <p>AI-powered fit score across all placement roles for your course.</p>
                </div>
                <span class="bench-badge">⚡ AI Powered</span>
            </div>
            <div class="bench-state-box">
                <div class="bench-state-icon">⏳</div>
                <p class="bench-state-title">Loading…</p>
                <div class="bench-loading-bar"></div>
            </div>`);
    }

    /** Shown when no resume has been uploaded yet */
    function showNoResume() {
        stopPolling();
        setRoot(`
            <div class="bench-header">
                <div class="bench-header-left">
                    <h2>Role Fit Benchmarking</h2>
                    <p>AI-powered fit score across all placement roles for your course.</p>
                </div>
                <span class="bench-badge">⚡ AI Powered</span>
            </div>
            <div class="bench-state-box">
                <div class="bench-state-icon">📄</div>
                <p class="bench-state-title">No Analysed Resume Found</p>
                <p class="bench-state-sub">Upload and analyse your resume from the <strong>Resume Analysis</strong> tab. Your role-fit scores will appear here automatically once done.</p>
            </div>`);
    }

    /** Shown on unexpected errors */
    function showError(msg) {
        stopPolling();
        setRoot(`
            <div class="bench-header">
                <div class="bench-header-left">
                    <h2>Role Fit Benchmarking</h2>
                    <p>AI-powered fit score across all placement roles for your course.</p>
                </div>
                <div class="bench-header-right">
                    <button class="bench-refresh-btn" onclick="window.benchRun()">
                        <span class="bench-refresh-icon">🔄</span>
                        <div class="bench-spin"></div>
                        Retry
                    </button>
                </div>
            </div>
            <div class="bench-error-box">⚠️ ${msg}</div>`);
    }

    // ── Results renderer ──────────────────────────────────────────────────────
    function renderResults() {
        stopPolling();

        const filtered = allResults.filter(r =>
            !searchQuery || r.role_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        const isSearching = !!searchQuery;
        const top3       = isSearching ? [] : allResults.slice(0, 3);
        const visible    = showAll ? filtered : filtered.slice(0, TOP_N);
        const hiddenCount = filtered.length - TOP_N;

        const headerHtml = `
            <div class="bench-header" style="margin-bottom: 24px;">
                <div class="bench-header-left">
                    <h2>Benchmarking among your batch</h2>
                    <p>Compare your overall AI fit score against your peers.</p>
                </div>
                <div class="bench-header-right">
                    ${courseTier ? `<span class="bench-course-tag">${tierLabel(courseTier)}</span>` : ''}
                    <button class="bench-refresh-btn" id="benchRefreshBtn" onclick="window.benchRefresh()">
                        <span class="bench-refresh-icon">🔄</span>
                        <div class="bench-spin"></div>
                        Refresh
                    </button>
                </div>
            </div>`;

        const roleHeaderHtml = `
            <div class="bench-header" style="margin-top: 40px; margin-bottom: 20px;">
                <div class="bench-header-left">
                    <h2>Role Fit Benchmarking</h2>
                    <p>Your AI fit scores across all ${tierLabel(courseTier)} placement roles — ${runDate}.</p>
                </div>
            </div>`;

        const getOrdinal = (n) => {
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return s[(v - 20) % 10] || s[v] || s[0];
        };
        const m = benchMetrics || { my_rank: 0, percentile: 0, total_peers: 0, top_gap: 0 };
        const rankOrdinal = m.my_rank ? getOrdinal(m.my_rank) : '';

        const metricsHtml = `
            <div class="bench-metrics-row">
                <div class="bench-metric-card gradient-bg">
                    <div class="bench-metric-content">
                        <div class="bench-metric-label">Your Rank</div>
                        <div class="bench-metric-value brand-color">${m.my_rank || '-'}<span class="unit">${rankOrdinal}</span></div>
                        <div class="bench-metric-subtext">Top ${Math.max(1, 100 - (m.percentile || 0))}% of compared peers</div>
                    </div>
                </div>
                <div class="bench-metric-card">
                    <div class="bench-metric-content">
                        <div class="bench-metric-icon-wrap">
                            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </div>
                        <div class="bench-metric-value">${m.total_peers ? m.total_peers.toLocaleString() : '-'}</div>
                        <div class="bench-metric-label" style="margin-top:8px; margin-bottom:0;">Peers Compared</div>
                    </div>
                </div>
                <div class="bench-metric-card">
                    <div class="bench-metric-content">
                        <div class="bench-metric-icon-wrap">
                            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                        </div>
                        <div class="bench-metric-value">${m.top_gap} <span class="unit">pts</span></div>
                        <div class="bench-metric-label" style="margin-top:8px; margin-bottom:0;">Gap to Top Scorer</div>
                    </div>
                </div>
            </div>`;

        const podiumHtml = top3.length >= 3 ? `
            <div>
                <p class="bench-roles-section-label" style="margin-bottom:12px;">🏆 Top Matches</p>
                <div class="bench-podium">
                    ${top3.slice(0,3).map((r, i) => {
                        const color = gradeColor(r.grade);
                        return `
                        <div class="bench-podium-card rank-${i+1}" style="border-color:${color}22; cursor:pointer;" onclick="window.benchExpandCard('brc-${r.role_name.replace(/\W/g,'_')}')">
                            <div class="bench-podium-rank">${podiumEmoji(i)}</div>
                            <div class="bench-podium-role">${r.role_name}</div>
                            <div class="bench-podium-score-row">
                                <div class="bench-podium-score" style="color:${color};">${r.fit_score}</div>
                                <div class="bench-podium-grade" style="color:${color};">${r.grade}</div>
                            </div>
                            ${r.major_strength ? `<div class="bench-podium-strength">💪 ${r.major_strength}</div>` : ''}
                        </div>`;
                    }).join('')}
                </div>
            </div>` : '';

        const controlsHtml = `
            <div class="bench-controls">
                <div class="bench-search-wrap">
                    <svg class="bench-search-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input class="bench-search" id="benchSearchInput"
                           placeholder="Search roles…"
                           value="${searchQuery}"
                           oninput="window.benchSearch(this.value)" />
                </div>
                <span class="bench-count-badge">${filtered.length} roles</span>
                ${!showAll && hiddenCount > 0 ? `
                <button class="bench-show-all-btn" id="benchShowAllBtn" onclick="window.benchToggleAll()">
                    Show all ${filtered.length} roles ↓
                </button>` : ''}
                ${showAll && filtered.length > TOP_N ? `
                <button class="bench-show-all-btn active" id="benchShowAllBtn" onclick="window.benchToggleAll()">
                    Show top ${TOP_N} only ↑
                </button>` : ''}
            </div>`;

        let gridLabel = 'All Roles';
        if (isSearching) {
            gridLabel = `Search Results (${filtered.length})`;
        } else if (top3.length >= 3) {
            gridLabel = showAll ? 'All Roles' : `Roles #4–${Math.min(TOP_N, filtered.length)}`;
        }
        
        const gridStartOffset = (!showAll && top3.length >= 3) ? 3 : 0;
        const gridResults = showAll ? filtered : filtered.slice(0, TOP_N);

        const gridHtml = `
            <div>
                <p class="bench-roles-section-label" style="margin-bottom:12px;">📋 ${gridLabel}</p>
                <div class="bench-role-grid" id="benchRoleGrid">
                    ${gridResults.slice(gridStartOffset).map((r, i) => roleCardHtml(r, gridStartOffset + i + 1)).join('')}
                </div>
                ${!showAll && hiddenCount > 0 ? `
                <div style="text-align:center;margin-top:16px;">
                    <button class="bench-show-all-btn" onclick="window.benchToggleAll()" style="margin:auto;">
                        + Show ${hiddenCount} more roles
                    </button>
                </div>` : ''}
            </div>`;

        const modalHtml = `
            <div id="benchModalOverlay" class="bench-modal-overlay" onclick="window.benchCloseModal(event)">
                <div class="bench-modal-content" id="benchModalContent"></div>
            </div>
        `;

        setRoot(headerHtml + metricsHtml + roleHeaderHtml + podiumHtml + controlsHtml + gridHtml + modalHtml);

        const inp = document.getElementById('benchSearchInput');
        if (inp && searchQuery) { inp.focus(); inp.setSelectionRange(9999,9999); }
    }

    function roleCardHtml(r, rank) {
        const cls    = scoreClass(r.grade);
        const color  = gradeColor(r.grade);
        const bColor = barColor(r.fit_score);
        const id     = `brc-${r.role_name.replace(/\W/g,'_')}`;
        const rankBadge = (r.role_rank && r.total_role_peers)
            ? `<div class="bench-role-peer-rank" title="Your global rank for this role">
                   <span style="font-weight:800;color:${color};">#${r.role_rank}</span>
                   <span style="opacity:0.65;font-size:0.78em;"> of ${r.total_role_peers} peers</span>
               </div>`
            : '';
        return `
        <div class="bench-role-card" id="${id}" onclick="window.benchExpandCard('${id}')">
            <div class="bench-role-card-main">
                <div class="bench-role-rank-badge">#${rank}</div>
                <div class="bench-role-info">
                    <div class="bench-role-name">${r.role_name}</div>
                    ${rankBadge}
                </div>
                <div class="bench-score-bar-wrap">
                    <div class="bench-score-bar" style="width:${r.fit_score}%;background:${bColor};"></div>
                </div>
                <div class="bench-score-pill ${cls}">
                    <span class="bench-score-num">${r.fit_score}</span>
                    <span class="bench-score-grade">${r.grade}</span>
                </div>
            </div>
        </div>`;
    }

    // ── Interactions ──────────────────────────────────────────────────────────
    window.benchExpandCard = (id) => {
        const r = allResults.find(x => `brc-${x.role_name.replace(/\W/g,'_')}` === id);
        if (!r) { alert('Card data not found!'); return; }
        
        const det = r.detailed_analysis || {};
        const isFresh = Object.keys(det).length > 0;

        let contentHtml = `
            <div class="bench-modal-header">
                <h2>${r.role_name}</h2>
                <button class="bench-modal-close" onclick="window.benchCloseModal(event)">✕</button>
            </div>
            <div class="bench-modal-body">
        `;

        if (isFresh) {
            contentHtml += `
                <div class="bench-expanded-content" style="display:block; border-top:none; margin-top:0; padding-top:0;">
                    ${det.role_description ? `<div class="bench-expanded-desc">${det.role_description}</div>` : ''}
                    
                    <div class="bench-expanded-metrics">
                        <div class="match-badge">${r.fit_score}% match</div>
                        ${r.role_rank ? `<div>Rank: <span style="font-weight:800;">#${r.role_rank}</span> <span style="font-size: 0.9em; opacity: 0.8;">of ${r.total_role_peers}</span></div>` : ''}
                        <div>Readiness: <span style="font-weight:800;">${det.readiness_score}/100</span></div>
                        <div>Growth: <span style="color:var(--brand);font-weight:800;">${det.growth_potential}</span></div>
                    </div>

                    <div class="bench-expanded-grid">
                        <div class="bench-expanded-box">
                            <div class="bench-expanded-box-title">
                                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                Required skills
                            </div>
                            <div class="bench-pill-container">
                                ${(det.required_skills||[]).map(s => `<span class="bench-pill">${s}</span>`).join('')}
                            </div>
                        </div>

                        <div class="bench-expanded-box">
                            <div class="bench-expanded-box-title" style="color:#d97706;">
                                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                Missing competencies
                            </div>
                            <div class="bench-pill-container">
                                ${(det.missing_competencies||[]).map(s => `<span class="bench-pill missing">${s}</span>`).join('')}
                            </div>
                        </div>

                        <div class="bench-expanded-box">
                            <div class="bench-expanded-box-title">
                                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                                Common projects
                            </div>
                            <ul class="bench-list">
                                ${(det.common_projects||[]).map(p => `<li>${p}</li>`).join('')}
                            </ul>
                        </div>

                        <div class="bench-expanded-box">
                            <div class="bench-expanded-box-title">
                                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15l-3 3-3-3m0-6l3-3 3 3"></path></svg>
                                Recommended certifications
                            </div>
                            <ul class="bench-list">
                                ${(det.recommended_certifications||[]).map(c => `<li>${c}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Fallback for old cache
            contentHtml += `
                <div class="bench-role-detail" style="display:flex;">
                    ${r.major_strength ? `
                    <div class="bench-detail-item">
                        <div class="bench-detail-dot" style="background:#8b5cf6;"></div>
                        <div>
                            <div class="bench-detail-label" style="color:#22c55e;">Strength</div>
                            <div class="bench-detail-text">${r.major_strength}</div>
                        </div>
                    </div>` : ''}
                    ${r.improvement_suggestion ? `
                    <div class="bench-detail-item">
                        <div class="bench-detail-dot" style="background:#e0e7ff;"></div>
                        <div>
                            <div class="bench-detail-label" style="color:#ef4444;">To Improve</div>
                            <div class="bench-detail-text">${r.improvement_suggestion}</div>
                        </div>
                    </div>` : ''}
                </div>
            `;
        }
        
        contentHtml += `</div>`; // close body

        const overlay = document.getElementById('benchModalOverlay');
        const content = document.getElementById('benchModalContent');
        if (!overlay) alert('Modal element missing from page!'); if (overlay && content) {
            content.innerHTML = contentHtml;
            overlay.classList.add('active');
        }
    };

    window.benchCloseModal = (e) => {
        if (e && e.target !== e.currentTarget && !e.target.closest('.bench-modal-close')) return;
        document.getElementById('benchModalOverlay').classList.remove('active');
    };
    window.benchSearch     = (q) => { searchQuery = q; renderResults(); };
    window.benchToggleAll  = ()  => { showAll = !showAll; renderResults(); };

    // ── Polling ───────────────────────────────────────────────────────────────
    function stopPolling() {
        if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    }

    async function pollStatus() {
        try {
            const headers = await authHeaders();
            const res  = await fetch(`${API_BASE}/benchmark/my-role-fit/status`, { headers });
            if (!res.ok) return;
            const json = await res.json();
            const data = json.data;

            if (data.status === 'done') {
                // Results ready — load them fully and stop polling
                stopPolling();
                _applyResults(data);
                renderResults();
            } else if (data.status === 'none' || data.status === 'error') {
                stopPolling();
                alert("Benchmarking failed or timed out (AI rate limit reached). Please wait a moment and try refreshing.");
                renderResults(); // fallback to whatever was there
            }
            // 'running' → keep polling
        } catch (_) { /* network blip — keep polling */ }
    }

    function startPolling() {
        stopPolling();
        _pollTimer = setInterval(pollStatus, POLL_MS);
    }

    // ── Apply API data to state ───────────────────────────────────────────────
    function _applyResults(data) {
        allResults  = (data.results || []).sort((a, b) => b.fit_score - a.fit_score);
        courseTier  = data.course_tier || '';
        benchMetrics = data.metrics || null;
        const ts    = data.updated_at || data.created_at;
        runDate     = ts ? new Date(ts).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '';
        showAll     = false;
        searchQuery = '';
    }

    // ── Main load ─────────────────────────────────────────────────────────────
    /**
     * Called on tab open. Uses cache; if background job is running, shows
     * generating state and starts polling. Never blocks the UI.
     */
    async function loadData(forceRefresh = false) {
        stopPolling();

        if (!forceRefresh && allResults.length > 0) {
            // Already loaded this session — just re-render
            renderResults();
            return;
        }

        showLoading();

        try {
            const headers  = await authHeaders();
            const endpoint = forceRefresh
                ? `${API_BASE}/benchmark/my-role-fit/refresh`
                : `${API_BASE}/benchmark/my-role-fit`;
            const method   = forceRefresh ? 'POST' : 'GET';

            const res  = await fetch(endpoint, { method, headers });
            const json = await res.json();

            if (!res.ok) {
                if (res.status === 422) { showNoResume(); return; }
                throw new Error(json.message || 'Benchmark failed.');
            }

            const data = json.data;

            if (data.status === 'running') {
                // Background job triggered by resume upload is still in progress
                showGenerating();
                startPolling();   // auto-refresh every 6s
                return;
            }

            if (!data.results || data.results.length === 0) {
                // No sessions at all yet — show no-resume state
                showNoResume();
                return;
            }

            _applyResults(data);
            renderResults();

        } catch (err) {
            if (err.message && err.message.toLowerCase().includes('no analysed resume')) {
                showNoResume();
            } else {
                showError(err.message || 'Something went wrong. Please try again.');
            }
        }
    }

    window.benchRun     = () => loadData(false);
    window.benchRefresh = () => loadData(true);

    // ── Init on tab visibility ────────────────────────────────────────────────
    function init() {
        const tab = document.getElementById('page-benchmarking');
        if (!tab) return;
        loadData(false);
    }

    // Stop polling when user leaves the tab
    const origShowTab = window.showTab;
    window.showTab = function (tabName) {
        if (origShowTab) origShowTab(tabName);
        if (tabName === 'benchmarking') {
            init();
        } else {
            stopPolling(); // don't poll in background while on another tab
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const active = document.querySelector('.page-view.active, .page-view[style*="block"]');
        if (active && active.id === 'page-benchmarking') init();

        document.querySelectorAll('[data-target="benchmarking"]').forEach(el => {
            el.addEventListener('click', () => setTimeout(init, 50));
        });
    });

    window.initBenchmarking = init;
})();
