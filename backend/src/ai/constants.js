'use strict';

module.exports = {
  PROVIDERS: {
    GEMINI: 'gemini',
    GROK:   'grok',
  },

  MODELS: {
    GEMINI: 'gemini-3-flash-preview', // primary
    GROK:   'grok-2',
  },

  // ── Model-level failover within Gemini ────────────────────────────────────
  // Tried in order — first available/working model wins.
  // RPM = Requests Per Minute | TPM = Tokens Per Minute | RPD = Requests Per Day
  GEMINI_MODEL_FAILOVER: [
    'gemini-3-flash-preview',  // 1. Gemini 3 Flash       │  5 RPM · 250K TPM ·    20 RPD
    'gemini-3.5-flash',        // 2. Gemini 3.5 Flash      │  5 RPM · 250K TPM ·    20 RPD
    'gemini-2.5-flash',        // 3. Gemini 2.5 Flash      │  5 RPM · 250K TPM ·    20 RPD
    'gemini-3.1-flash-lite',   // 4. Gemini 3.1 Flash Lite │ 15 RPM · 250K TPM ·   500 RPD
    'gemma-4-31b-it',          // 5. Gemma 4 31B           │ 15 RPM · Unlimited · 1,500 RPD
    'gemma-4-26b-a4b-it',      // 6. Gemma 4 26B           │ 15 RPM · Unlimited · 1,500 RPD
    'gemini-2.5-flash-lite',   // 7. Gemini 2.5 Flash Lite │ 10 RPM · 250K TPM ·    20 RPD
  ],

  // ── Provider-level failover ───────────────────────────────────────────────
  // If ALL Gemini models fail, try Grok next.
  FAILOVER_ORDER: ['gemini', 'grok'],
};
