export function formatErrorPayload(err, opts = {}) {
  const code = err && err.code ? err.code : opts.code || "INTERNAL_ERROR";
  const message = err && err.message ? err.message : opts.message || "An unexpected error occurred";
  const hint = err && err.hint ? err.hint : opts.hint || null;
  const details = err && err.details ? err.details : opts.details || null;
  return { error: message, code, hint, details };
}

export function sendError(res, err, status = 500, opts = {}) {
  try {
    const payload = formatErrorPayload(err, opts);
    return res.status(status).json(payload);
  } catch (e) {
    // Fallback minimal error
    return res.status(status).json({ error: (err && err.message) || "Error", code: "INTERNAL_ERROR" });
  }
}

export default sendError;
