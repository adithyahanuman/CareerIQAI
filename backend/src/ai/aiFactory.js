'use strict';

const GeminiProvider = require('./providers/gemini.provider');
const GrokProvider   = require('./providers/grok.provider');
const { PROVIDERS }  = require('./constants');

class AIFactory {
  constructor() {
    this.providers = {
      [PROVIDERS.GEMINI]: new GeminiProvider(),
      [PROVIDERS.GROK]:   new GrokProvider(),
    };
  }

  /**
   * Get provider instance by name.
   * 
   * @param {string} name 
   * @returns {import('./providers/base.provider')}
   */
  getProvider(name) {
    const provider = this.providers[name.toLowerCase()];
    if (!provider) {
      throw new Error(`AI Provider "${name}" is not supported.`);
    }
    return provider;
  }
}

module.exports = new AIFactory();
