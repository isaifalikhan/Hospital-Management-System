const { Op } = require('sequelize');
const { sequelize } = require('../models');

// SQLite's LIKE is case-insensitive for ASCII by default; Postgres's isn't
// (it has a separate ILIKE for that). Using this instead of Op.like directly
// keeps "search" behaving the same on both the local/LAN SQLite deployment
// and the hosted Postgres one.
const searchOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;

module.exports = { searchOp };
