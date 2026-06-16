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

  // ── Model-level failover within Gemini ────────────────────────────────────
  // Tried in order — first available/working model wins.
  // All model names below are VERIFIED against the Gemini API (June 2025).
  GEMINI_MODEL_FAILOVER: [
    // ── Primary Heavy Hitters ──
    'gemini-3.5-flash',
    'gemini-3.0-flash',
    'gemini-2.5-flash',
    
    // ── Fast / Lite Fallbacks ──
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite',
    
    // ── Legacy Flash Models ──
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash',
    
    // ── Gemma Models ──
    'gemma-4-26b-a4b-it',
    'gemma-4-31b-it',
  ],

  // ── Provider-level failover ───────────────────────────────────────────────
  // If ALL Gemini models fail, try Grok next.
  FAILOVER_ORDER: ['gemini', 'grok'],
};

