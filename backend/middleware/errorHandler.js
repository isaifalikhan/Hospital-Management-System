function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ message: 'A record with this value already exists', details: err.errors?.map(e => e.message) });
  }
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ message: 'Validation error', details: err.errors?.map(e => e.message) });
  }

  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
