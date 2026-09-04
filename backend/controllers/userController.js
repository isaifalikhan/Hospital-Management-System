const bcrypt = require('bcryptjs');
const { sequelize, User, Doctor } = require('../models');

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

    const user = await sequelize.transaction(async (t) => {
      const hashed = await bcrypt.hash(password, 10);
      const newUser = await User.create({ name, username, email, role, password: hashed }, { transaction: t });

      // A 'doctor' login is useless on its own — nothing elsewhere in the
      // app (booking, check-in, the doctor picker) reads from User, it all
      // reads from Doctor. So creating a doctor account also creates (or,
      // via doctorId, links) the Doctor profile in the same transaction,
      // instead of leaving an admin to separately remember to do that on
      // the Doctors page.
      if (role === 'doctor') {
        const { doctorId, specialization, qualification, departmentId, consultationFee, phone, availableDays, availableTime } = req.body;
        if (doctorId) {
          const doctor = await Doctor.findByPk(doctorId, { transaction: t });
          if (!doctor) throw Object.assign(new Error('Selected doctor profile was not found'), { status: 400 });
          if (doctor.userId) throw Object.assign(new Error('That doctor profile is already linked to another account'), { status: 409 });
          await doctor.update({ userId: newUser.id }, { transaction: t });
        } else {
          await Doctor.create({
            userId: newUser.id,
            name,
            email: email || null,
            phone: phone || null,
            specialization: specialization || null,
            qualification: qualification || null,
            departmentId: departmentId || null,
            consultationFee: consultationFee || 0,
            availableDays: availableDays || null,
            availableTime: availableTime || null,
          }, { transaction: t });
        }
      }

      return newUser;
    });

    const { password: _pw, ...safeUser } = user.toJSON();
    res.status(201).json(safeUser);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
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
