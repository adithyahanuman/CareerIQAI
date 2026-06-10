/**
 * middleware/validateMiddleware.js
 *
 * Generic request validation helper.
 * Accepts a plain object of field rules and returns a middleware that
 * checks req.body, sets 422 on failure, and forwards a descriptive error.
 *
 * Usage example:
 *   router.post('/', validate({ email: 'required', password: 'required' }), controller)
 */

'use strict';

/**
 * @param {Record<string, 'required'>} rules  – keys are body field names
 * @returns {import('express').RequestHandler}
 */
const validate = (rules) => (req, res, next) => {
  const missing = Object.keys(rules).filter(
    (field) => rules[field] === 'required' &&
      (req.body[field] === undefined || req.body[field] === null || req.body[field] === '')
  );

  if (missing.length > 0) {
    res.status(422);
    return next(
      new Error(`Missing required fields: ${missing.join(', ')}`)
    );
  }

  next();
};

module.exports = { validate };
