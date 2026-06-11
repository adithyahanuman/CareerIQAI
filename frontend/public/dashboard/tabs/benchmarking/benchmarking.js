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
        if (!grade) return '#6b7280';
        const g = grade.replace('−','-');
        if (g.startsWith('A')) return '#34d399';
        if (g === 'B+') return '#60a5fa';
        if (g === 'B')  return '#818cf8';
        if (g === 'B-') return '#a78bfa';
        if (g.startsWith('C')) return '#fbbf24';
        if (g === 'D')  return '#f87171';
        return '#fca5a5';
    }

    function barColor(score) {
        if (score >= 85) return '#34d399';
        if (score >= 75) return '#60a5fa';
        if (score >= 65) return '#818cf8';
        if (score >= 55) return '#fbbf24';
        if (score >= 45) return '#fb923c';
        return '#f87171';
    }

    function podiumEmoji(rank) { return ['🥇','🥈','🥉'][rank] || ''; }
    function tierLabel(tier) {
        return { btech:'B.Tech', mtech:'M.Tech', phd:'PhD' }[tier] || 'B.Tech';
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
        const top3       = allResults.slice(0, 3);
        const visible    = showAll ? filtered : filtered.slice(0, TOP_N);
        const hiddenCount = filtered.length - TOP_N;

        const headerHtml = `
            <div class="bench-header">
                <div class="bench-header-left">
                    <h2>Role Fit Benchmarking</h2>
                    <p>Your AI fit scores across all ${tierLabel(courseTier)} placement roles — ${runDate}.</p>
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

        const podiumHtml = top3.length >= 3 ? `
            <div>
                <p class="bench-roles-section-label" style="margin-bottom:12px;">🏆 Top Matches</p>
                <div class="bench-podium">
                    ${top3.slice(0,3).map((r, i) => {
                        const color = gradeColor(r.grade);
                        return `
                        <div class="bench-podium-card rank-${i+1}" style="border-color:${color}22;">
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

        const gridLabel = top3.length >= 3
            ? (showAll ? 'All Roles' : `Roles #4–${Math.min(TOP_N, filtered.length)}`)
            : 'All Roles';
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

        setRoot(headerHtml + podiumHtml + controlsHtml + gridHtml);

        const inp = document.getElementById('benchSearchInput');
        if (inp && searchQuery) { inp.focus(); inp.setSelectionRange(9999,9999); }
    }

    function roleCardHtml(r, rank) {
        const cls    = scoreClass(r.grade);
        const color  = gradeColor(r.grade);
        const bColor = barColor(r.fit_score);
        const id     = `brc-${r.role_name.replace(/\W/g,'_')}`;
        return `
        <div class="bench-role-card" id="${id}" onclick="window.benchExpandCard('${id}')">
            <div class="bench-role-card-main">
                <div class="bench-role-rank-badge">#${rank}</div>
                <div class="bench-role-info">
                    <div class="bench-role-name">${r.role_name}</div>
                </div>
                <div class="bench-score-bar-wrap">
                    <div class="bench-score-bar" style="width:${r.fit_score}%;background:${bColor};"></div>
                </div>
                <div class="bench-score-pill ${cls}">
                    <span class="bench-score-num">${r.fit_score}</span>
                    <span class="bench-score-grade">${r.grade}</span>
                </div>
            </div>
            <div class="bench-role-detail">
                ${r.major_strength ? `
                <div class="bench-detail-item">
                    <div class="bench-detail-dot" style="background:#34d399;"></div>
                    <div>
                        <div class="bench-detail-label" style="color:#34d399;">Strength</div>
                        <div class="bench-detail-text">${r.major_strength}</div>
                    </div>
                </div>` : ''}
                ${r.improvement_suggestion ? `
                <div class="bench-detail-item">
                    <div class="bench-detail-dot" style="background:#fbbf24;"></div>
                    <div>
                        <div class="bench-detail-label" style="color:#fbbf24;">To Improve</div>
                        <div class="bench-detail-text">${r.improvement_suggestion}</div>
                    </div>
                </div>` : ''}
            </div>
        </div>`;
    }

    // ── Interactions ──────────────────────────────────────────────────────────
    window.benchExpandCard = (id) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('expanded');
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
            }
            // 'running' → keep polling (do nothing here)
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
