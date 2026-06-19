'use strict';

/**
 * Base AI Provider class containing common utilities and key rotation logic.
 */
class BaseAIProvider {
  /**
   * @param {string} name 
   * @param {string} model 
   * @param {string[]|string} keys - Array of API keys
   */
  constructor(name, model, keys = []) {
    this.name = name;
    this.model = model;
    
    if (Array.isArray(keys)) {
      this.apiKeys = [...new Set(keys)]; // remove duplicates
    } else if (typeof keys === 'string') {
      this.apiKeys = keys ? keys.split(',').map(k => k.trim()).filter(Boolean) : [];
    } else {
      this.apiKeys = [];
    }
    
    this.currentKeyIndex = 0;
  }

  /**
   * Get the currently active API key.
   * 
   * @returns {string|null}
   */
  getActiveKey() {
    if (this.apiKeys.length === 0) return null;
    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * Rotate to the next API key in the list.
   * 
   * @returns {string|null} The new active key
   */
  rotateKey(reason = 'Quota exceeded') {
    if (this.apiKeys.length <= 1) {
      console.warn(`[AI Provider ${this.name}] ${reason}, but no backup keys are available.`);
      return this.getActiveKey();
    }
    const previousIndex = this.currentKeyIndex;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    const newKey = this.getActiveKey();
    console.warn(`[AI Provider ${this.name}] ${reason} on key index ${previousIndex}. Rotating to key index ${this.currentKeyIndex}.`);
    
    // Trigger callback for child providers (e.g. to re-initialize client SDKs)
    if (typeof this.onKeyRotated === 'function') {
      this.onKeyRotated(newKey);
    }
    
    return newKey;
  }

  /**
   * Check if the error is due to rate limit or quota exceeded.
   * 
   * @param {Error} error 
   * @returns {boolean}
   */
  isQuotaError(error) {
    if (!error || !error.message) return false;
    const msg = error.message.toLowerCase();
    return (
      msg.includes('429') ||
      msg.includes('quota') ||
      msg.includes('rate limit') ||
      msg.includes('resourceexhausted') ||
      msg.includes('too many requests') ||
      msg.includes('limit exceeded') ||
      msg.includes('api_key_invalid') ||
      msg.includes('api key not valid') ||
      msg.includes('invalid api key') ||
      msg.includes('401') ||
      msg.includes('403') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    );
  }

  /**
   * Helper to parse and extract JSON from AI response text.
   * Handles markdown code fences and malformed responses.
   * 
   * @param {string} text 
   * @returns {object}
   */
  parseJSON(text) {
    if (!text) {
      throw new Error('Empty response from AI model.');
    }
    
    let cleaned = text.trim();
    // Strip markdown code fences: ```json ... ```
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Attempt to extract the first JSON block { ... } or [ ... ]
      const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (innerError) {
          throw new Error(`Failed to parse extracted JSON block: ${innerError.message}. Original text: ${text.slice(0, 300)}`);
        }
      }
      throw new Error(`AI response is not valid JSON: ${text.slice(0, 300)}`);
    }
  }

  /**
   * Execute a function with exponential backoff retries and key rotation.
   * 
   * @param {Function} fn 
   * @param {number} retries 
   * @param {number} delayMs 
   * @returns {Promise<any>}
   */
  /**
   * Execute a function trying each available API key before giving up.
   * - Tries key[0], if quota/rate error → rotates to key[1], tries again, etc.
   * - Once all keys for this provider are exhausted, throws so the caller
   *   (aiService._execute) can failover to the next provider.
   *
   * @param {Function} fn
   * @returns {Promise<any>}
   */
  async withRetry(fn) {
    const totalKeys = Math.max(1, this.apiKeys.length);
    let lastError;

    for (let attempt = 1; attempt <= totalKeys; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        const isLast = attempt === totalKeys;

        if (this.isQuotaError(err) && !isLast) {
          // Rotate to the next key and immediately retry
          this.rotateKey();
          console.warn(`[AI Provider ${this.name}] Key ${attempt} failed (quota/rate). Trying key ${attempt + 1} of ${totalKeys}.`);
        } else {
          // Non-quota error OR no more keys — give up on this provider
          console.warn(`[AI Provider ${this.name}] Attempt ${attempt}/${totalKeys} failed: ${err.message}`);
          if (isLast) break;
        }
      }
    }
    throw lastError;
  }

  /**
   * Normalize the provider output.
   * 
   * @param {object} data 
   * @returns {object}
   */
  normalize(data) {
    return {
      success: true,
      provider: this.name,
      model: this.model,
      data: data
    };
  }

  async benchmarkResumes(prompt) {
    return this.analyzeResume(prompt);
  }
}

module.exports = BaseAIProvider;
