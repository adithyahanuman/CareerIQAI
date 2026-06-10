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
   * Try every model in the failover list (each with all API keys) before giving up.
   */
  async _callWithModelFailover(prompt) {
    const models = GEMINI_MODEL_FAILOVER && GEMINI_MODEL_FAILOVER.length
      ? GEMINI_MODEL_FAILOVER
      : [MODELS.GEMINI];

    let lastError;

    for (const modelId of models) {
      this.currentModel = modelId;
      this.model = modelId; // update for logging
      try {
        // withRetry handles key rotation for this model
        const data = await this.withRetry(() => this._callModel(modelId, prompt));
        console.log(`[Gemini Provider] ✅ Success with model: ${modelId}`);
        return data;
      } catch (err) {
        lastError = err;
        if (this.isModelUnavailable(err)) {
          console.warn(`[Gemini Provider] ⚠️ Model ${modelId} unavailable — trying next model.`);
          // Reset key index for the next model attempt
          this.currentKeyIndex = 0;
          this._initClient();
        } else {
          // Non-availability error (e.g. bad prompt) — don't try more models
          throw err;
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

