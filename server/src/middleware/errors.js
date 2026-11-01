export function notFound(req, res) {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'The requested resource was not found.' });
}

export function errorHandler(error, req, res, _next) {
  const status = error.status || (error.name === 'ZodError' || String(error.code || '').startsWith('22') ? 400 : error.code === '42501' ? 403 : ['23505', '23514'].includes(error.code) ? 409 : ['23503', 'P0002'].includes(error.code) ? 404 : 500);
  if (status >= 500) console.error(`[api] ${req.method} ${req.path}: request failed (${status}, ${error.name || 'Error'})`);
  const code = status === 503 ? 'SERVICE_UNAVAILABLE' : status === 400 ? 'VALIDATION_ERROR' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'INTERNAL_ERROR';
  const message = status >= 500 && status !== 503 ? 'An unexpected error occurred.' : status === 403 ? 'You do not have permission to perform this action.' : status === 404 ? 'The requested organization record was not found.' : status === 409 ? 'The operation conflicts with the record’s current state.' : error.message;
  res.status(status).json({ success: false, code, message });
}
