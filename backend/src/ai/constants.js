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
    // ── Tier 1: Maximum Speed (Eliminates Timeouts) ──
    'gemini-2.5-flash-lite',  // Rate limit: 15 RPM, 1M TPM | Fastest generation speed
    'gemini-3.1-flash-lite',  // Rate limit: 15 RPM, 1M TPM | Fast lite model
    
    // ── Tier 2: Deeper Analysis (Standard Flash) ──
    'gemini-3.5-flash',       // Rate limit: 15 RPM, 1M TPM | High intelligence
    'gemini-3.0-flash',       // Rate limit: 15 RPM, 1M TPM | High intelligence
    'gemini-2.5-flash',       // Rate limit: 15 RPM, 1M TPM | Standard flash model
    'gemini-1.5-flash',       // Rate limit: 15 RPM, 1M TPM | Standard flash fallback
    
    // ── Tier 3: Heaviest / Slowest Models (Gemma) ──
    'gemini-1.5-flash-8b',    // Rate limit: 15 RPM, 1M TPM | Lightweight fast fallback
    'gemma-4-26b-a4b-it',     // Rate limit: Project-based Cloud/Vertex Quota
    'gemma-4-31b-it',         // Rate limit: Project-based Cloud/Vertex Quota
  ],

  // ── Provider-level failover ───────────────────────────────────────────────
  // If ALL Gemini models fail, try Grok next.
  FAILOVER_ORDER: ['gemini', 'grok'],
};

