/**
 * benchmarking.js
 * All logic for the Benchmarking dashboard tab.
 */

'use strict';

(function () {
    // ── State ─────────────────────────────────────────────────────────────────
    let selectedCandidates = new Set(); // student IDs
    let jobRoles           = [];
    let allCandidates      = [];
    let currentResults     = null;
    let currentView        = 'heatmap'; // 'heatmap' | 'cards'

    const API_BASE = window.API_BASE || 'http://localhost:5000/api';

    // ── Auth helper ───────────────────────────────────────────────────────────
    async function getAuthHeaders() {
        if (window.firebase && firebase.auth().currentUser) {
            const token = await firebase.auth().currentUser.getIdToken();
            return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
        }
        // fallback for dev
        const token = localStorage.getItem('authToken') || '';
        return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    }

    // ── DOM helpers ───────────────────────────────────────────────────────────
    function $(id) { return document.getElementById(id); }

    // ── Colour helpers ────────────────────────────────────────────────────────
    function scoreClass(grade) {
        const map = {
            'A+': 'score-a-plus', 'A': 'score-a', 'A−': 'score-a-minus', 'A-': 'score-a-minus',
            'B+': 'score-b-plus', 'B': 'score-b', 'B−': 'score-b-minus', 'B-': 'score-b-minus',
            'C+': 'score-c-plus', 'C': 'score-c', 'C−': 'score-c-minus', 'C-': 'score-c-minus',
            'D': 'score-d', 'F': 'score-f',
        };
        return map[grade] || 'score-f';
    }

    function gradeColor(grade) {
        if (!grade) return '#6b7280';
        const g = grade.toUpperCase().replace('−', '-');
        if (g.startsWith('A')) return '#34d399';
        if (g === 'B+' || g === 'B') return '#818cf8';
        if (g === 'B-') return '#a78bfa';
        if (g.startsWith('C')) return '#fbbf24';
        if (g === 'D') return '#f87171';
        return '#fca5a5';
    }

    function initials(name) {
        return (name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    }

    // ── Fetch candidates ──────────────────────────────────────────────────────
    async function loadCandidates() {
        const listEl = $('benchCandidateList');
        listEl.innerHTML = '<div style="padding:12px;color:var(--text-secondary);font-size:13px;">Loading candidates…</div>';
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE}/benchmark/candidates`, { headers });
            const json = await res.json();
            allCandidates = json.data || [];
            renderCandidateList();
        } catch (e) {
            listEl.innerHTML = '<div style="color:#f87171;padding:12px;font-size:12px;">Failed to load candidates. Make sure you are logged in.</div>';
        }
    }

    function renderCandidateList() {
        const listEl = $('benchCandidateList');
        if (!allCandidates.length) {
            listEl.innerHTML = '<div style="padding:12px;color:var(--text-secondary);font-size:13px;">No analysed resumes found.</div>';
            return;
        }
        listEl.innerHTML = allCandidates.map(c => {
            const score = c.overall_score || c.ats_score || '—';
            const grade = c.grade || '';
            const color = gradeColor(grade);
            const isSel = selectedCandidates.has(c.id);
            return `
            <div class="bench-candidate-item${isSel ? ' selected' : ''}"
                 data-id="${c.id}" onclick="window.benchToggleCandidate('${c.id}')">
                <div class="bench-candidate-check">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="bench-candidate-info">
                    <div class="bench-candidate-name">${c.name || 'Unknown'}</div>
                    <div class="bench-candidate-meta">${c.email || ''}</div>
                </div>
                ${score !== '—' ? `<div class="bench-candidate-score" style="background:${color}18;color:${color};">${score}${grade ? ' · ' + grade : ''}</div>` : ''}
            </div>`;
        }).join('');
        updateSummary();
    }

    window.benchToggleCandidate = function (id) {
        if (selectedCandidates.has(id)) selectedCandidates.delete(id);
        else selectedCandidates.add(id);
        renderCandidateList();
    };

    // ── Job Roles ─────────────────────────────────────────────────────────────
    const PRESET_ROLES = [
        'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
        'ML Engineer', 'Data Analyst', 'DevOps Engineer', 'Mobile Developer',
        'Product Manager', 'Research Intern', 'UI/UX Designer',
    ];

    function renderRoleTags() {
        const tagsEl = $('benchRoleTags');
        tagsEl.innerHTML = jobRoles.map((r, i) => `
            <span class="bench-role-tag">
                ${r}
                <button onclick="window.benchRemoveRole(${i})" title="Remove">×</button>
            </span>`).join('');
        updateSummary();
    }

    window.benchRemoveRole = function (i) {
        jobRoles.splice(i, 1);
        renderRoleTags();
    };

    function addRole(role) {
        const r = role.trim();
        if (!r || jobRoles.includes(r) || jobRoles.length >= 10) return;
        jobRoles.push(r);
        renderRoleTags();
    }

    function renderPresets() {
        const el = $('benchPresets');
        el.innerHTML = PRESET_ROLES.map(r =>
            `<span class="bench-preset-chip" onclick="window.benchAddPreset('${r}')">${r}</span>`
        ).join('');
    }

    window.benchAddPreset = function (r) { addRole(r); };

    // ── Summary & Run ─────────────────────────────────────────────────────────
    function updateSummary() {
        const sumEl  = $('benchSummaryText');
        const runBtn = $('benchRunBtn');
        const c = selectedCandidates.size;
        const r = jobRoles.length;
        sumEl.innerHTML = `<strong>${c}</strong> candidate${c !== 1 ? 's' : ''} × <strong>${r}</strong> role${r !== 1 ? 's' : ''} = <strong>${c * r}</strong> score${c * r !== 1 ? 's' : ''}`;
        runBtn.disabled = c === 0 || r === 0;
    }

    // ── Run benchmark ─────────────────────────────────────────────────────────
    async function runBenchmark() {
        const btn   = $('benchRunBtn');
        const errEl = $('benchError');
        errEl.style.display = 'none';

        btn.classList.add('loading');
        btn.disabled = true;

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE}/benchmark/run`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    candidate_ids: [...selectedCandidates],
                    job_roles:     jobRoles,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Benchmark failed.');
            currentResults = json.data;
            renderResults(currentResults);
            // Load session history
            loadHistory();
        } catch (e) {
            errEl.textContent = e.message;
            errEl.style.display = 'block';
        } finally {
            btn.classList.remove('loading');
            btn.disabled = false;
            updateSummary();
        }
    }

    // ── Render Results ────────────────────────────────────────────────────────
    function renderResults(session) {
        const resultsEl = $('benchResultsSection');
        if (!resultsEl) return;
        resultsEl.style.display = '';

        const results = session.results || [];
        if (!results.length) {
            resultsEl.innerHTML = `<div class="bench-empty">
                <div class="bench-empty-icon">📊</div>
                <div class="bench-empty-title">No results yet</div>
                <div class="bench-empty-sub">Run a benchmark to see scores.</div>
            </div>`;
            return;
        }

        // Derive unique candidates and roles from results
        const candidatesMap = {};
        const rolesSet = new Set();
        results.forEach(r => {
            candidatesMap[r.student_id] = r.student_name;
            rolesSet.add(r.role_name);
        });
        const candidates = Object.entries(candidatesMap); // [[id, name], ...]
        const roles = [...rolesSet];

        // Build lookup: student_id → role → result
        const lookup = {};
        results.forEach(r => {
            if (!lookup[r.student_id]) lookup[r.student_id] = {};
            lookup[r.student_id][r.role_name] = r;
        });

        const runDate = session.created_at ? new Date(session.created_at).toLocaleString() : '';
        const total   = results.length;

        resultsEl.innerHTML = `
            <div class="bench-results-header">
                <div>
                    <h3 class="bench-results-title">📊 Benchmark Results</h3>
                    <div class="bench-results-meta">${total} scores · ${runDate}</div>
                </div>
                <div style="display:flex;gap:10px;align-items:center;">
                    <div class="bench-view-toggle">
                        <button class="bench-view-btn active" id="benchViewHeatmap" onclick="window.benchSetView('heatmap')">🔥 Heatmap</button>
                        <button class="bench-view-btn" id="benchViewCards" onclick="window.benchSetView('cards')">🃏 Cards</button>
                    </div>
                </div>
            </div>
            <div id="benchResultsBody"></div>`;

        renderHeatmap(candidates, roles, lookup);
    }

    window.benchSetView = function (view) {
        currentView = view;
        $('benchViewHeatmap').classList.toggle('active', view === 'heatmap');
        $('benchViewCards').classList.toggle('active', view === 'cards');
        if (!currentResults) return;
        const results = currentResults.results || [];
        const candidatesMap = {};
        const rolesSet = new Set();
        results.forEach(r => { candidatesMap[r.student_id] = r.student_name; rolesSet.add(r.role_name); });
        const candidates = Object.entries(candidatesMap);
        const roles = [...rolesSet];
        const lookup = {};
        results.forEach(r => {
            if (!lookup[r.student_id]) lookup[r.student_id] = {};
            lookup[r.student_id][r.role_name] = r;
        });
        if (view === 'heatmap') renderHeatmap(candidates, roles, lookup);
        else renderCards(results);
    };

    // ── Heatmap view ──────────────────────────────────────────────────────────
    function renderHeatmap(candidates, roles, lookup) {
        const bodyEl = $('benchResultsBody');
        const roleHeaders = roles.map(r =>
            `<th title="${r}">${r.length > 18 ? r.substring(0, 16) + '…' : r}</th>`
        ).join('');

        const rows = candidates.map(([sid, name]) => {
            const cells = roles.map(role => {
                const r = lookup[sid]?.[role];
                if (!r) return `<td><span class="bench-score-pill score-f">—</span></td>`;
                const cls = scoreClass(r.grade);
                return `<td class="bench-score-cell">
                    <span class="bench-score-pill ${cls}"
                          onmouseenter="window.benchShowTip(event,'${sid}','${role.replace(/'/g, "\\'")}')"
                          onmouseleave="window.benchHideTip()">
                        <span class="bench-score-num">${r.fit_score}</span>
                        <span class="bench-score-grade">${r.grade}</span>
                    </span>
                </td>`;
            }).join('');

            return `<tr>
                <td>
                    <div class="bench-candidate-cell">
                        <div class="bench-avatar">${initials(name)}</div>
                        <span class="bench-name-cell">${name}</span>
                    </div>
                </td>
                ${cells}
            </tr>`;
        }).join('');

        bodyEl.innerHTML = `
            <div class="bench-heatmap-wrap">
                <table class="bench-heatmap-table">
                    <thead><tr><th>Candidate</th>${roleHeaders}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    // ── Cards view ────────────────────────────────────────────────────────────
    function renderCards(results) {
        const bodyEl = $('benchResultsBody');
        const cards = results.map(r => {
            const cls   = scoreClass(r.grade);
            const color = gradeColor(r.grade);
            return `
            <div class="bench-detail-card">
                <div class="bench-card-header">
                    <div>
                        <div class="bench-card-name">${r.student_name}</div>
                        <div class="bench-card-role">${r.role_name}</div>
                    </div>
                    <div class="bench-card-score-ring ${cls}" style="border-color:${color}40;">
                        <span class="bench-card-score-val" style="color:${color};">${r.fit_score}</span>
                        <span class="bench-card-grade-val" style="color:${color};">${r.grade}</span>
                    </div>
                </div>
                <div class="bench-card-body">
                    ${r.major_strength ? `
                    <div class="bench-insight">
                        <div class="bench-insight-icon" style="background:rgba(16,185,129,0.12);color:#34d399;">💪</div>
                        <div>
                            <div class="bench-insight-label" style="color:#34d399;">Strength</div>
                            <div class="bench-insight-text">${r.major_strength}</div>
                        </div>
                    </div>` : ''}
                    ${r.improvement_suggestion ? `
                    <div class="bench-insight">
                        <div class="bench-insight-icon" style="background:rgba(251,191,36,0.12);color:#fbbf24;">🎯</div>
                        <div>
                            <div class="bench-insight-label" style="color:#fbbf24;">To Improve</div>
                            <div class="bench-insight-text">${r.improvement_suggestion}</div>
                        </div>
                    </div>` : ''}
                </div>
            </div>`;
        }).join('');

        bodyEl.innerHTML = `<div class="bench-cards-grid">${cards}</div>`;
    }

    // ── Tooltip ───────────────────────────────────────────────────────────────
    let _tipLookup = {};

    window.benchShowTip = function (evt, sid, role) {
        if (!currentResults) return;
        const results = currentResults.results || [];
        const r = results.find(x => x.student_id === sid && x.role_name === role);
        if (!r) return;
        const tip = $('benchTooltip');
        if (!tip) return;
        tip.innerHTML = `
            <div class="bench-tt-title">${r.student_name} — ${r.role_name}</div>
            <div class="bench-tt-row">Score: <strong>${r.fit_score} (${r.grade})</strong></div>
            ${r.major_strength ? `<div class="bench-tt-row">💪 <strong>Strength:</strong> ${r.major_strength}</div>` : ''}
            ${r.improvement_suggestion ? `<div class="bench-tt-row">🎯 <strong>Improve:</strong> ${r.improvement_suggestion}</div>` : ''}`;
        tip.classList.add('visible');
        moveTip(evt);
    };

    window.benchHideTip = function () {
        const tip = $('benchTooltip');
        if (tip) tip.classList.remove('visible');
    };

    function moveTip(evt) {
        const tip = $('benchTooltip');
        if (!tip) return;
        const x = evt.clientX + 14;
        const y = evt.clientY - 10;
        tip.style.left = Math.min(x, window.innerWidth - 300) + 'px';
        tip.style.top  = Math.min(y, window.innerHeight - 200) + 'px';
    }

    document.addEventListener('mousemove', e => {
        const tip = $('benchTooltip');
        if (tip && tip.classList.contains('visible')) moveTip(e);
    });

    // ── History ───────────────────────────────────────────────────────────────
    async function loadHistory() {
        const histEl = $('benchHistoryList');
        if (!histEl) return;
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE}/benchmark/sessions`, { headers });
            const json = await res.json();
            const sessions = json.data || [];
            if (!sessions.length) {
                histEl.innerHTML = '<div style="color:var(--text-secondary);font-size:12px;padding:8px;">No previous runs yet.</div>';
                return;
            }
            histEl.innerHTML = sessions.slice(0, 8).map(s => {
                const roles = Array.isArray(s.job_roles) ? s.job_roles : JSON.parse(s.job_roles || '[]');
                const candidates = Array.isArray(s.candidate_ids) ? s.candidate_ids : JSON.parse(s.candidate_ids || '[]');
                const date = new Date(s.created_at).toLocaleDateString();
                const dotColor = s.status === 'done' ? '#34d399' : s.status === 'error' ? '#f87171' : '#fbbf24';
                return `
                <div class="bench-history-item" onclick="window.benchLoadSession('${s.id}')">
                    <div class="bench-history-dot" style="background:${dotColor};"></div>
                    <div class="bench-history-info">
                        <div class="bench-history-roles">${roles.slice(0, 3).join(', ')}${roles.length > 3 ? ` +${roles.length - 3}` : ''}</div>
                        <div class="bench-history-meta">${candidates.length} candidate${candidates.length !== 1 ? 's' : ''} · ${date}</div>
                    </div>
                </div>`;
            }).join('');
        } catch (e) {
            histEl.innerHTML = '';
        }
    }

    window.benchLoadSession = async function (id) {
        try {
            const headers = await getAuthHeaders();
            const res  = await fetch(`${API_BASE}/benchmark/sessions/${id}`, { headers });
            const json = await res.json();
            if (json.success) {
                currentResults = json.data;
                renderResults(currentResults);
                document.getElementById('benchResultsSection').scrollIntoView({ behavior: 'smooth' });
            }
        } catch (e) {
            console.error('Failed to load session:', e);
        }
    };

    // ── Init ──────────────────────────────────────────────────────────────────
    function initBenchmarking() {
        renderPresets();
        loadCandidates();
        loadHistory();
        updateSummary();

        // Role input — add on Enter
        const inp = $('benchRoleInput');
        if (inp) {
            inp.addEventListener('keydown', e => {
                if (e.key === 'Enter') { addRole(inp.value); inp.value = ''; }
            });
        }

        const addBtn = $('benchRoleAddBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (!inp) return;
                addRole(inp.value);
                inp.value = '';
            });
        }

        const runBtn = $('benchRunBtn');
        if (runBtn) runBtn.addEventListener('click', runBenchmark);
    }

    // Wait for the tab to become visible (dashboard.js calls tab init functions)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBenchmarking);
    } else {
        initBenchmarking();
    }

    // Expose for re-init when tab is re-shown
    window.initBenchmarking = initBenchmarking;
})();
