'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const BaseAIProvider = require('./base.provider');
const { MODELS, PROVIDERS, GEMINI_MODEL_FAILOVER, GEMINI_BENCHMARK_MODEL_FAILOVER, GEMINI_ROADMAP_MODEL_FAILOVER } = require('../constants');
const env = require('../../config/env');

/**
 * Gemini AI Provider — supports both API key rotation AND model-level failover.
 * Strategy:
 *   Outer loop: Models (from GEMINI_MODEL_FAILOVER list)
 *   Inner loop: API Keys — only rotated for per-minute rate limits (429 RPM).
 *   Daily quota errors (RPD) skip all keys for that model immediately,
 *   since the daily limit is per-model and shared across all API keys.
 */
class GeminiProvider extends BaseAIProvider {
  constructor() {
    super(PROVIDERS.GEMINI, MODELS.GEMINI, env.geminiApiKeys);
    this.currentModel = MODELS.GEMINI;
    this._initClient();
  }

  _initClient() {
    const key = this.getActiveKey();
    if (key) this.genAI = new GoogleGenerativeAI(key);
  }

  onKeyRotated(newKey) {
    if (newKey) {
      console.log(`[Gemini Provider] Re-initialising SDK with rotated key.`);
      this.genAI = new GoogleGenerativeAI(newKey);
    }
  }

  /** Check if error means this model is unavailable or misbehaving (try next model) */
  isModelUnavailable(err) {
    if (!err || !err.message) return false;
    const msg = err.message.toLowerCase();
    return (
      msg.includes('503') ||
      msg.includes('server unavailable') ||
      msg.includes('overloaded') ||
      msg.includes('timeout') ||
      msg.includes('timed out') ||
      msg.includes('aborted') ||
      msg.includes('not found') ||
      msg.includes('404') ||
      msg.includes('connection was closed') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('fetch failed') ||      // network error / DNS timeout
      msg.includes('failed to parse') ||   // model returned non-JSON
      msg.includes('not valid json') ||     // model ignored JSON instruction
      msg.includes('empty response')        // model returned nothing
    );
  }

  /**
   * Daily quota (RPD) errors are per-model and shared across ALL API keys.
   * Rotating keys does NOT help — skip the model immediately.
   */
  isDailyQuotaError(err) {
    if (!err || !err.message) return false;
    const msg = err.message.toLowerCase();
    return (
      msg.includes('daily') ||
      msg.includes('per day') ||
      msg.includes('quota exceeded') ||
      msg.includes('resource_exhausted') ||
      msg.includes('resourceexhausted')
    );
  }

  async _callModel(modelId, prompt) {
    const activeKey = this.getActiveKey();
    if (!activeKey) throw new Error('GEMINI_API_KEY / GEMINI_API_KEYS is not configured.');
    if (!this.genAI) this.genAI = new GoogleGenerativeAI(activeKey);

    const model = this.genAI.getGenerativeModel({
      model: modelId,
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        responseMimeType: 'application/json', // force valid JSON output — prevents bullet-point reflections
        maxOutputTokens: 16384
      }
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return this.parseJSON(text);
  }

  /**
   * Failover strategy:
   * Outer loop: Models
   * Inner loop: API Keys
   *
   * Key index is reset to 0 at the start of EACH model, so every model
   * gets a full fresh pass through all keys.
   *
   * Daily quota (RPD) errors skip ALL keys for that model immediately —
   * rotating keys won't help since the daily cap is per-model.
   */
  async _callWithModelFailover(prompt, modelList = null) {
    const models = modelList && modelList.length
      ? modelList
      : (GEMINI_MODEL_FAILOVER && GEMINI_MODEL_FAILOVER.length ? GEMINI_MODEL_FAILOVER : [MODELS.GEMINI]);

    const totalKeys = Math.max(1, this.apiKeys.length);
    let lastError;

    // Outer loop: Models
    for (const modelId of models) {
      this.currentModel = modelId;
      this.model = modelId; // update for logging

      // ✅ Fix: Always reset to key[0] at the start of each new model.
      // Without this, a previous model's key rotations carry over and
      // the new model starts mid-way through the key list.
      this.currentKeyIndex = 0;
      this._initClient();

      // Inner loop: API Keys
      for (let keyAttempt = 1; keyAttempt <= totalKeys; keyAttempt++) {
        let success = false;
        
        // Transient error retry loop (up to 3 tries per key)
        for (let transientAttempt = 1; transientAttempt <= 3; transientAttempt++) {
          try {
            const data = await this._callModel(modelId, prompt);
            console.log(`[Gemini Provider] ✅ Success with model: ${modelId} using key ${keyAttempt}/${totalKeys}`);
            return data;
          } catch (err) {
            lastError = err;

            // If it's a transient error (parse error, 503, network glitch) -> retry same key
            if (this.isModelUnavailable(err)) {
              console.warn(`[Gemini Provider] ⚠️ Model ${modelId} transient error on key ${keyAttempt}/${totalKeys} (Attempt ${transientAttempt}/3). Error: ${err.message}`);
              if (transientAttempt < 3) {
                // Wait 2 seconds before retrying
                await new Promise(r => setTimeout(r, 2000));
                continue;
              }
              // If exhausted 3 transient retries, break inner loop and try next key/model
              console.warn(`[Gemini Provider] Transient retries exhausted for key ${keyAttempt}/${totalKeys}.`);
              break;
            }

            // If it's a quota error -> break inner loop immediately to rotate key
            if (this.isQuotaError(err) || this.isDailyQuotaError(err)) {
              let reason = this.isDailyQuotaError(err) ? 'Daily Quota Exceeded (RPD)' : 'Rate Limit / Quota Exceeded (RPM)';
              console.warn(`[Gemini Provider] ⚠️ Model ${modelId} quota error on key ${keyAttempt}/${totalKeys} (${reason}).`);
              break;
            }

            // Non-recoverable error (e.g. bad prompt syntax) — throw immediately
            throw err;
          }
        } // end transient retry loop

        // If we broke out of the transient loop due to quota or exhausting transient retries,
        // we rotate the key and try the next key.
        if (keyAttempt < totalKeys) {
          this.rotateKey(this.isQuotaError(lastError) || this.isDailyQuotaError(lastError) ? 'Quota exceeded' : 'Transient errors');
          continue;
        } else {
          console.warn(`[Gemini Provider] All API keys exhausted for model ${modelId}. Moving to next model.`);
          break;
        }
      }
    }

    throw lastError;
  }

  async analyzeResume(prompt)           { return this.normalize(await this._callWithModelFailover(prompt, GEMINI_MODEL_FAILOVER)); }
  async benchmarkResumes(prompt)        { return this.normalize(await this._callWithModelFailover(prompt, GEMINI_BENCHMARK_MODEL_FAILOVER)); }
  async generateCareerAdvice(prompt)    { return this.normalize(await this._callWithModelFailover(prompt, GEMINI_ROADMAP_MODEL_FAILOVER)); }
  async matchJobDescription(prompt)     { return this.normalize(await this._callWithModelFailover(prompt, GEMINI_MODEL_FAILOVER)); }
  async generateInterviewQuestions(prompt) { return this.normalize(await this._callWithModelFailover(prompt, GEMINI_MODEL_FAILOVER)); }
  async scoreProject(prompt)            { return this.normalize(await this._callWithModelFailover(prompt, GEMINI_MODEL_FAILOVER)); }
}

module.exports = GeminiProvider;

