export function auditLog(req, _res, next) {
  req.audit = {
    actorId: req.user?.sub ?? null,
    method: req.method,
    path: req.path,
    at: new Date().toISOString()
  };
  next();
}
