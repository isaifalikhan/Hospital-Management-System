// Vercel serverless entry point: re-exports the same Express app used for
// local/LAN deployment (backend/server.js). vercel.json rewrites /api/*
// requests here, preserving the original path, so Express's own /api/...
// route mounting still matches unchanged.
module.exports = require('../backend/server.js');
