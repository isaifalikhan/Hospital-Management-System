const { Patient, Doctor, Appointment, Invoice, Medicine, Department } = require('../models');
const { Op } = require('sequelize');

function lastNDates(n) {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

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

// Trend data for the dashboard charts: revenue billed per day and
// appointments booked per day over the last 14 days, plus a breakdown of
// completed appointments by department.
exports.analytics = async (req, res, next) => {
  try {
    const days = lastNDates(14);
    const startDate = days[0];

    const [invoices, appointments] = await Promise.all([
      Invoice.findAll({
        where: { date: { [Op.gte]: startDate } },
        attributes: ['date', 'total'],
      }),
      Appointment.findAll({
        where: { date: { [Op.gte]: startDate } },
        attributes: ['date', 'doctorId', 'status'],
        include: [{ model: Doctor, attributes: ['departmentId'], include: [{ model: Department, attributes: ['name'] }] }],
      }),
    ]);

    const revenueByDay = Object.fromEntries(days.map((d) => [d, 0]));
    invoices.forEach((inv) => {
      if (revenueByDay[inv.date] !== undefined) revenueByDay[inv.date] += Number(inv.total);
    });

    const appointmentsByDay = Object.fromEntries(days.map((d) => [d, 0]));
    const byDepartment = {};
    appointments.forEach((appt) => {
      if (appointmentsByDay[appt.date] !== undefined) appointmentsByDay[appt.date] += 1;
      const deptName = appt.Doctor?.Department?.name || 'Unassigned';
      byDepartment[deptName] = (byDepartment[deptName] || 0) + 1;
    });

    res.json({
      revenueTrend: days.map((date) => ({ date, revenue: Math.round(revenueByDay[date] * 100) / 100 })),
      appointmentsTrend: days.map((date) => ({ date, appointments: appointmentsByDay[date] })),
      appointmentsByDepartment: Object.entries(byDepartment).map(([name, value]) => ({ name, value })),
    });
  } catch (err) { next(err); }
};
