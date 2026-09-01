const bcrypt = require('bcryptjs');
const { User, Doctor } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] }, order: [['name', 'ASC']] });
    res.json(users);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, username, email, password, role } = req.body;
    if (!name || !username || !password || !role) {
      return res.status(400).json({ message: 'name, username, password, and role are required' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, username, email, role, password: hashed });
    const { password: _pw, ...safeUser } = user.toJSON();
    res.status(201).json(safeUser);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { name, email, role, active, password } = req.body;
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (active !== undefined) user.active = active;
    if (password) user.password = await bcrypt.hash(password, 10);
    await user.save();
    const { password: _pw, ...safeUser } = user.toJSON();
    res.json(safeUser);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
};
