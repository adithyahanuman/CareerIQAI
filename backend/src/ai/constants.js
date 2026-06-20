'use strict';

module.exports = {
  PROVIDERS: {
    GEMINI: 'gemini',
    GROK:   'grok',
  },

  MODELS: {
    GEMINI: 'gemini-2.5-flash', // primary — confirmed working
    GROK:   'grok-2',
  },

  // ── Default Failover (Resume Parsing, Projects, Interview Questions, etc.) ─
  GEMINI_MODEL_FAILOVER: [
    'gemini-2.5-flash',          // 1st — stable, reliable
    'gemini-3-flash-preview',    // 2nd — 3.0 Flash preview (currently unstable)
    'gemini-3.5-flash',          // 3rd — newest Flash, most capable
    'gemini-2.5-flash-lite',     // 4th — lighter, faster
    'gemini-3.1-flash-lite',     // 5th — lite fallback
    'gemma-4-26b-a4b-it',        // 6th — Gemma open-weight
    'gemma-4-31b-it',            // 7th — Gemma open-weight larger
  ],

  // ── Failover order specifically for Benchmarking ───────────────────────────
  GEMINI_BENCHMARK_MODEL_FAILOVER: [
    'gemini-3.1-flash-lite',     // 1st — now at top
    'gemini-2.5-flash-lite',     
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemma-4-26b-a4b-it',
    'gemma-4-31b-it',
  ],

  // ── Failover order specifically for Career Roadmaps ────────────────────────
  GEMINI_ROADMAP_MODEL_FAILOVER: [
    'gemini-3.1-flash-lite',     // 1st — now at top
    'gemini-2.5-flash-lite',     
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemma-4-26b-a4b-it',
    'gemma-4-31b-it',
  ],

  // ── Provider-level failover ───────────────────────────────────────────────
  // If ALL Gemini models fail, try Grok next.
  FAILOVER_ORDER: ['gemini', 'grok'],
};

