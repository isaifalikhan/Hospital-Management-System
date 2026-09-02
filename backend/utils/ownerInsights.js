const { Op } = require('sequelize');
const { Invoice, Appointment, Doctor, Department, Admission } = require('../models');

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SLOT_MINUTES = 30;

function timeToMinutes(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function defaultStartDate() {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return isoDate(d);
}

function datesInRange(start, end) {
  const dates = [];
  const cur = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cur <= last) {
    dates.push(isoDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// How many 30-minute slots a doctor's configured availableTime window
// ("HH:MM-HH:MM") holds in a single day. Mirrors the slot math used by
// GET /doctors/:id/available-slots (see doctorController.availableSlots).
function slotsPerDay(doctor) {
  if (!doctor.availableTime) return 0;
  const [startStr, endStr] = doctor.availableTime.split('-').map((t) => t.trim());
  const startMin = timeToMinutes(startStr);
  const endMin = timeToMinutes(endStr);
  return Math.max(Math.floor((endMin - startMin) / SLOT_MINUTES), 0);
}

/**
 * Owner-facing insights over a date range: revenue by doctor/department,
 * doctor utilization (completed appointments vs. that doctor's configured
 * available slots in the period — reusing the same availability logic as
 * GET /doctors/:id/available-slots), and ward/bed occupancy.
 *
 * Shared by dashboardController.ownerInsights (JSON) and
 * reportController.exportOwnerInsights (CSV) so both stay in sync.
 *
 * Note on bed occupancy: the schema has no dedicated bed-capacity config,
 * so "capacity" here is simplified to the distinct ward+bed combinations
 * that have ever been used by an admission — a reasonable proxy, not a
 * hard capacity limit configured by the hospital.
 */
async function computeOwnerInsights({ startDate, endDate } = {}) {
  const end = endDate || isoDate(new Date());
  const start = startDate || defaultStartDate();

  const [invoices, doctors, completedAppointments, admissions] = await Promise.all([
    Invoice.findAll({
      where: { date: { [Op.gte]: start, [Op.lte]: end }, status: { [Op.ne]: 'cancelled' } },
      attributes: ['id', 'total', 'date'],
      include: [{
        model: Appointment,
        attributes: ['doctorId'],
        include: [{
          model: Doctor,
          attributes: ['id', 'name'],
          include: [{ model: Department, attributes: ['id', 'name'] }],
        }],
      }],
    }),
    Doctor.findAll({ where: { status: 'active' }, include: [{ model: Department, attributes: ['name'] }] }),
    Appointment.findAll({
      where: { date: { [Op.gte]: start, [Op.lte]: end }, status: 'completed' },
      attributes: ['id', 'doctorId'],
    }),
    Admission.findAll({ attributes: ['ward', 'bedNumber', 'status'] }),
  ]);

  // --- Revenue by doctor / department (invoices attributed via their linked appointment) ---
  const revenueByDoctorMap = {};
  const revenueByDepartmentMap = {};
  invoices.forEach((inv) => {
    const doctor = inv.Appointment?.Doctor;
    const doctorName = doctor?.name || 'Unassigned';
    const deptName = doctor?.Department?.name || 'Unassigned';
    revenueByDoctorMap[doctorName] = (revenueByDoctorMap[doctorName] || 0) + Number(inv.total);
    revenueByDepartmentMap[deptName] = (revenueByDepartmentMap[deptName] || 0) + Number(inv.total);
  });
  const revenueByDoctor = Object.entries(revenueByDoctorMap)
    .map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue);
  const revenueByDepartment = Object.entries(revenueByDepartmentMap)
    .map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue);

  // --- Doctor utilization: completed appointments vs. configured capacity ---
  const days = datesInRange(start, end);
  const completedByDoctor = {};
  completedAppointments.forEach((a) => {
    if (a.doctorId == null) return;
    completedByDoctor[a.doctorId] = (completedByDoctor[a.doctorId] || 0) + 1;
  });
  const doctorUtilization = doctors
    .map((doc) => {
      const availableDays = doc.availableDays ? doc.availableDays.split(',').map((d) => d.trim()) : [];
      const perDay = slotsPerDay(doc);
      let availableSlots = 0;
      if (availableDays.length && perDay > 0) {
        days.forEach((d) => {
          const dayName = DAY_NAMES[new Date(`${d}T00:00:00`).getDay()];
          if (availableDays.includes(dayName)) availableSlots += perDay;
        });
      }
      const completed = completedByDoctor[doc.id] || 0;
      return {
        doctorId: doc.id,
        doctorName: doc.name,
        department: doc.Department?.name || 'Unassigned',
        completedAppointments: completed,
        availableSlots,
        utilizationPct: availableSlots > 0 ? Math.round((completed / availableSlots) * 1000) / 10 : null,
      };
    })
    .sort((a, b) => (b.utilizationPct ?? -1) - (a.utilizationPct ?? -1));

  // --- Ward / bed occupancy ---
  const bedsByWard = {};
  const activeByWard = {};
  admissions.forEach((a) => {
    if (!bedsByWard[a.ward]) bedsByWard[a.ward] = new Set();
    bedsByWard[a.ward].add(a.bedNumber);
    if (a.status === 'admitted') activeByWard[a.ward] = (activeByWard[a.ward] || 0) + 1;
  });
  const wardOccupancy = Object.keys(bedsByWard)
    .sort()
    .map((ward) => {
      const bedsEverUsed = bedsByWard[ward].size;
      const activeAdmissions = activeByWard[ward] || 0;
      return {
        ward,
        bedsEverUsed,
        activeAdmissions,
        occupancyPct: bedsEverUsed > 0 ? Math.round((activeAdmissions / bedsEverUsed) * 1000) / 10 : 0,
      };
    });
  const totalBedsEverUsed = new Set(admissions.map((a) => `${a.ward}::${a.bedNumber}`)).size;
  const totalActiveAdmissions = admissions.filter((a) => a.status === 'admitted').length;

  return {
    startDate: start,
    endDate: end,
    revenueByDoctor,
    revenueByDepartment,
    doctorUtilization,
    wardOccupancy,
    bedOccupancySummary: {
      totalBedsEverUsed,
      totalActiveAdmissions,
      occupancyPct: totalBedsEverUsed > 0 ? Math.round((totalActiveAdmissions / totalBedsEverUsed) * 1000) / 10 : 0,
    },
  };
}

module.exports = { computeOwnerInsights };
