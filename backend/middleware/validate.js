const { validationResult } = require('express-validator');

/**
 * Run after an array of express-validator check(...) rules.
 * Returns a 400 with a flat list of field errors if any rule failed.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = validate;
