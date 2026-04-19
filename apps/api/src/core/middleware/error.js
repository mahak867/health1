import { ZodError } from 'zod';

export function notFound(_req, res) {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((issue) => ({ path: issue.path, message: issue.message }))
    });
  }

  const status = err.statusCode ?? 500;
  const message = err.expose ? err.message : 'Internal server error';
  return res.status(status).json({ error: message });
}
