class APIError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── PostgreSQL / Prisma Error Handlers ──────────────────────────────────────

// P2002 — unique constraint (e.g. duplicate email)
const HandleUniqueConstraintError = (err) => {
  const field = err.meta?.target?.[0] || 'field';
  const message = `${field} already exists. Please use another value.`;
  return new APIError(400, message);
};

// P2025 — record not found (update/delete on non-existent row)
const HandleRecordNotFoundError = () =>
  new APIError(404, 'Record not found.');

// P2003 — foreign key constraint failed
const HandleForeignKeyError = () =>
  new APIError(400, 'Related record does not exist.');

// P2014 — required relation violated
const HandleRelationError = () =>
  new APIError(400, 'This operation violates a required relation.');

// ─── Auth Error Handlers ──────────────────────────────────────────────────────

const HandleJWTError = () =>
  new APIError(401, 'Invalid token. Please log in again.');

const HandleJWTExpiredError = () =>
  new APIError(401, 'Your token has expired. Please log in again.');

// ─── Zod Validation Handler ───────────────────────────────────────────────────

const HandleZodError = (err) => {
  const errors = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  const message = `Validation failed. ${errors.join('. ')}`;
  return new APIError(422, message);
};

// ─── File Upload Handler ──────────────────────────────────────────────────────

const HandleMulterError = (err) => {
  const messages = {
    LIMIT_FILE_SIZE:       'File too large. Maximum size allowed is 50MB.',
    LIMIT_FILE_COUNT:      'Too many files. Maximum 3 files allowed.',
    LIMIT_UNEXPECTED_FILE: 'Unexpected file field.',
  };
  const message = messages[err.code] || 'File upload error.';
  return new APIError(400, message);
};

// ─── Rate Limit Handler ───────────────────────────────────────────────────────

const HandleRateLimitError = () =>
  new APIError(429, 'Too many requests. Please slow down and try again later.');

// ─── Response Senders ─────────────────────────────────────────────────────────

const SendErrorDev = (err, res) => {
  return res.status(err.statusCode).json({
    status:  err.status,
    message: err.message,
    error:   err,
    stack:   err.stack,
  });
};

const SendErrorProd = (err, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status:  err.status,
      message: err.message,
    });
  }
  console.error('ERROR', err);
  return res.status(500).json({
    status:  'error',
    message: 'Something went wrong. Please try again later.',
  });
};

// ─── Main Error Handler Middleware ────────────────────────────────────────────

const ErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status     = err.status     || 'error';

  if (process.env.NODE_ENV === 'development') {
    return SendErrorDev(err, res);
  }

  let error     = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
  error.message = err.message;

  if (err.code  === 'P2002')              error = HandleUniqueConstraintError(error);
  if (err.code  === 'P2025')              error = HandleRecordNotFoundError();
  if (err.code  === 'P2003')              error = HandleForeignKeyError();
  if (err.code  === 'P2014')              error = HandleRelationError();
  if (err.name  === 'JsonWebTokenError')  error = HandleJWTError();
  if (err.name  === 'TokenExpiredError')  error = HandleJWTExpiredError();
  if (err.name  === 'ZodError')           error = HandleZodError(err);
  if (err.name  === 'MulterError')        error = HandleMulterError(err);
  if (err.statusCode === 429)             error = HandleRateLimitError();

  return SendErrorProd(error, res);
};

// ─── Route Helpers ────────────────────────────────────────────────────────────

const CatchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

const NotFoundHandler = (req, res, next) => {
  next(new APIError(404, `Cannot find ${req.originalUrl} on this server.`));
};

// ─── Process-Level Handlers ───────────────────────────────────────────────────

const HandleUnhandledRejection = (server) => {
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION — Shutting down...', err.name, err.message);
    server.close(() => process.exit(1));
  });
};

const HandleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION — Shutting down...', err.name, err.message);
    process.exit(1);
  });
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  APIError,
  ErrorHandler,
  CatchAsync,
  NotFoundHandler,
  HandleUnhandledRejection,
  HandleUncaughtException,
  HandleUniqueConstraintError,
  HandleRecordNotFoundError,
  HandleForeignKeyError,
  HandleRelationError,
};
