const { Patient, Doctor, Appointment, Invoice, Medicine } = require('../models');
const { Op } = require('sequelize');

exports.summary = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [
      totalPatients,
      totalDoctors,
      todaysAppointments,
      upcomingAppointments,
      unpaidInvoices,
      allMedicines,
      recentPatients,
      recentAppointments,
    ] = await Promise.all([
      Patient.count(),
      Doctor.count({ where: { status: 'active' } }),
      Appointment.count({ where: { date: today } }),
      Appointment.count({ where: { date: { [Op.gte]: today }, status: 'scheduled' } }),
      Invoice.findAll({ where: { status: { [Op.in]: ['unpaid', 'partially_paid'] } } }),
      Medicine.findAll(),
      Patient.findAll({ order: [['createdAt', 'DESC']], limit: 5 }),
      Appointment.findAll({
        where: { date: today },
        include: [
          { model: Patient, attributes: ['id', 'name', 'mrn'] },
          { model: Doctor, attributes: ['id', 'name'] },
        ],
        order: [['time', 'ASC']],
        limit: 10,
      }),
    ]);

    const outstandingRevenue = unpaidInvoices.reduce((sum, inv) => sum + (inv.total - inv.amountPaid), 0);
    const lowStockCount = allMedicines.filter(m => m.quantityInStock <= m.reorderLevel).length;

    const paidInvoicesThisMonth = await Invoice.sum('amountPaid', {
      where: {
        updatedAt: {
          [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    res.json({
      totalPatients,
      totalDoctors,
      todaysAppointments,
      upcomingAppointments,
      outstandingRevenue,
      revenueThisMonth: paidInvoicesThisMonth || 0,
      lowStockCount,
      recentPatients,
      recentAppointments,
    });
  } catch (err) { next(err); }
};
