'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const BaseAIProvider = require('./base.provider');
const { MODELS, PROVIDERS, GEMINI_MODEL_FAILOVER } = require('../constants');
const env = require('../../config/env');

/**
 * Gemini AI Provider — supports both API key rotation AND model-level failover.
 * Order of attempts:
 *   1. Primary model (gemma-4-26b-a4b-it) with all API keys
 *   2. Fallback model 1 (gemini-3.1-flash-lite) with all API keys
 *   3. Fallback model 2 (gemini-2.5-flash-lite) with all API keys
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

  async _callModel(modelId, prompt) {
    const activeKey = this.getActiveKey();
    if (!activeKey) throw new Error('GEMINI_API_KEY / GEMINI_API_KEYS is not configured.');
    if (!this.genAI) this.genAI = new GoogleGenerativeAI(activeKey);

    const model = this.genAI.getGenerativeModel({
      model: modelId,
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        responseMimeType: 'application/json' // force valid JSON output — prevents bullet-point reflections
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
   * It tries all API keys for Model 1. If all API keys fail (e.g. rate limit), it moves to Model 2.
   */
  async _callWithModelFailover(prompt) {
    const models = GEMINI_MODEL_FAILOVER && GEMINI_MODEL_FAILOVER.length
      ? GEMINI_MODEL_FAILOVER
      : [MODELS.GEMINI];

    const totalKeys = Math.max(1, this.apiKeys.length);
    let lastError;

    // Outer loop: Models
    for (const modelId of models) {
      this.currentModel = modelId;
      this.model = modelId; // update for logging

      // Reset to the first key whenever we start a new model, 
      // or just rotate through. To strictly do api1, api2... we iterate exactly totalKeys times.
      for (let keyAttempt = 1; keyAttempt <= totalKeys; keyAttempt++) {
        
        // Initialize client with the current key
        this._initClient();
        
        try {
          const data = await this._callModel(modelId, prompt);
          console.log(`[Gemini Provider] ✅ Success with model: ${modelId} using key ${keyAttempt}/${totalKeys}`);
          return data;
        } catch (err) {
          lastError = err;
          
          if (this.isQuotaError(err) || this.isModelUnavailable(err)) {
            let reason = err.message || "Unknown error";
            if (this.isQuotaError(err)) reason = "Rate Limit / Quota Exceeded";
            else if (reason.includes('503') || reason.includes('overloaded')) reason = "Server Busy / Overloaded";
            
            console.warn(`[Gemini Provider] ⚠️ Model ${modelId} failed on key ${keyAttempt}/${totalKeys} (Reason: ${reason}) — trying next key/model.`);
            
            // If we have more keys to try for this model, rotate the key and try again
            if (keyAttempt < totalKeys) {
              this.rotateKey();
              continue; 
            } else {
              // We've exhausted all keys for this model. Break inner loop to move to the next model.
              console.warn(`[Gemini Provider] All API keys exhausted for model ${modelId}. Moving to next model.`);
              break; 
            }
          } else {
            // Non-recoverable error (e.g. bad prompt syntax) — throw immediately
            throw err;
          }
        }
      }
    }

    throw lastError;
  }

  async analyzeResume(prompt)           { return this.normalize(await this._callWithModelFailover(prompt)); }
  async generateCareerAdvice(prompt)    { return this.normalize(await this._callWithModelFailover(prompt)); }
  async matchJobDescription(prompt)     { return this.normalize(await this._callWithModelFailover(prompt)); }
  async generateInterviewQuestions(prompt) { return this.normalize(await this._callWithModelFailover(prompt)); }
  async scoreProject(prompt)            { return this.normalize(await this._callWithModelFailover(prompt)); }
}

module.exports = GeminiProvider;

