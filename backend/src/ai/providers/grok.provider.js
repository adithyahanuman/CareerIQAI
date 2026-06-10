'use strict';

const BaseAIProvider = require('./base.provider');
const { MODELS, PROVIDERS } = require('../constants');
const env = require('../../config/env');

/**
 * Grok (xAI) Provider implementation with key rotation support.
 */
class GrokProvider extends BaseAIProvider {
  constructor() {
    super(PROVIDERS.GROK, MODELS.GROK, env.grokApiKeys);
  }

  async _callAPI(prompt) {
    const activeKey = this.getActiveKey();
    if (!activeKey) {
      throw new Error('GROK_API_KEY / GROK_API_KEYS is not configured.');
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Grok API error [${response.status}]: ${errText.slice(0, 300)}`);
    }

    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content || '';
    return this.parseJSON(text);
  }

  async analyzeResume(prompt) {
    const data = await this.withRetry(() => this._callAPI(prompt));
    return this.normalize(data);
  }

  async generateCareerAdvice(prompt) {
    const data = await this.withRetry(() => this._callAPI(prompt));
    return this.normalize(data);
  }

  async matchJobDescription(prompt) {
    const data = await this.withRetry(() => this._callAPI(prompt));
    return this.normalize(data);
  }

  async generateInterviewQuestions(prompt) {
    const data = await this.withRetry(() => this._callAPI(prompt));
    return this.normalize(data);
  }

  async scoreProject(prompt) {
    const data = await this.withRetry(() => this._callAPI(prompt));
    return this.normalize(data);
  }
}

module.exports = GrokProvider;
