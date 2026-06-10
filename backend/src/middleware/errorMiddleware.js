/**
 * middleware/errorMiddleware.js
 *
 * Two middleware functions that MUST be mounted last in app.js:
 *   1. notFound   – catches any unmatched route and creates a 404 error.
 *   2. errorHandler – formats every thrown/passed error into a JSON response.
 */

'use strict';

/**
 * Catch-all for routes that do not match any handler.
 * @type {import('express').RequestHandler}
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found – ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global error handler.
 * @type {import('express').ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  console.error('[errorHandler] Error occurred:', err);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
