'use strict';

const aiFactory = require('./aiFactory');
const env = require('../config/env');

/**
 * @typedef {Object} NormalizedResponse
 * @property {boolean} success - Whether the request was successful
 * @property {string} provider - The provider name used
 * @property {string} model - The model name used
 * @property {object} data - The parsed response JSON object
 * @property {Object} [token_usage] - Usage metrics
 * @property {number} token_usage.prompt_tokens
 * @property {number} token_usage.completion_tokens
 * @property {number} token_usage.total_tokens
 */

class AIService {
  constructor() {
    this.primaryProviderName = env.aiProvider || 'gemini';
  }

  /**
   * Helper to execute a method on a provider with structured logging and automatic failover.
   * 
   * @param {string} methodName 
   * @param {string} prompt 
   * @returns {Promise<NormalizedResponse>}
   * @private
   */
  async _execute(methodName, prompt) {
    const startTime = Date.now();
    const primary = env.aiProvider || this.primaryProviderName || 'gemini';

    // Try primary provider first, then failover providers if it fails
    const { FAILOVER_ORDER } = require('./constants');
    const providersToTry = [primary, ...FAILOVER_ORDER.filter(p => p !== primary)];

    let lastError = null;

    for (const providerName of providersToTry) {
      try {
        const provider = aiFactory.getProvider(providerName);
        // withRetry is now set to 1 — each provider gets exactly 1 attempt
        const response = await provider[methodName](prompt);
        const duration = Date.now() - startTime;

        console.log(JSON.stringify({
          level: 'info',
          message: `AI request completed via ${providerName}`,
          provider_used: providerName,
          model_used: response.model,
          method: methodName,
          response_time: `${duration}ms`,
          success: true
        }));

        return response;
      } catch (err) {
        lastError = err;
        console.error(JSON.stringify({
          level: 'warn',
          message: `Provider ${providerName} failed — trying next`,
          provider_used: providerName,
          method: methodName,
          failure_reason: err.message
        }));
      }
    }

    throw new Error(`AI Service: all providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Analyse a resume and return component scores.
   * 
   * @param {string} prompt 
   * @returns {Promise<NormalizedResponse>}
   */
  async analyzeResume(prompt) {
    return this._execute('analyzeResume', prompt);
  }

  /**
   * Generate career advisory roadmap or recommendation.
   * 
   * @param {string} prompt 
   * @returns {Promise<NormalizedResponse>}
   */
  async generateCareerAdvice(prompt) {
    return this._execute('generateCareerAdvice', prompt);
  }

  /**
   * Match a candidate's profile with a job description.
   * 
   * @param {string} prompt 
   * @returns {Promise<NormalizedResponse>}
   */
  async matchJobDescription(prompt) {
    return this._execute('matchJobDescription', prompt);
  }

  /**
   * Generate preparation interview questions.
   * 
   * @param {string} prompt 
   * @returns {Promise<NormalizedResponse>}
   */
  async generateInterviewQuestions(prompt) {
    return this._execute('generateInterviewQuestions', prompt);
  }

  /**
   * Score a project complexity and technology usage.
   * 
   * @param {string} prompt 
   * @returns {Promise<NormalizedResponse>}
   */
  async scoreProject(prompt) {
    return this._execute('scoreProject', prompt);
  }

  /**
   * Score multiple candidates against multiple job roles (benchmarking).
   *
   * @param {string} prompt
   * @returns {Promise<NormalizedResponse>}
   */
  async benchmarkResumes(prompt) {
    return this._execute('analyzeResume', prompt);
  }
}

module.exports = new AIService();
