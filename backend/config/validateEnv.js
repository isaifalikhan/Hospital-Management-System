/**
 * Fail fast if required environment variables are missing, instead of
 * surfacing a confusing downstream error (e.g. "secretOrPrivateKey must
 * have a value") the first time a request actually needs them.
 */
function validateEnv() {
  const missing = [];

  if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
    missing.push('JWT_SECRET');
  }

  if (missing.length) {
    console.error('\n✖ Missing required environment variable(s): ' + missing.join(', '));
    console.error('  Did you forget to copy backend/.env.example to backend/.env ?');
    console.error('  cp .env.example .env   (then restart the server)\n');
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 16) {
    console.warn('\n⚠ JWT_SECRET is very short. Use a longer random value in production.\n');
  }
}

module.exports = validateEnv;
