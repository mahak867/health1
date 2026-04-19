export function notFound(_req, res) {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(err, _req, res, _next) {
  const status = err.statusCode ?? 500;
  const message = err.expose ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
}
