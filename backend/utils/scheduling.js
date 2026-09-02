// Shared slot-availability math. Mirrors the logic in
// controllers/doctorController.js#availableSlots (kept separate rather than
// imported from there, since that function is wired directly to an
// Express req/res pair for the staff-facing route) so the patient portal's
// self-service booking flow can compute the same open 30-minute slots
// without depending on another workstream's public-booking endpoint, which
// may not exist in every checkout of this repo.

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SLOT_MINUTES = 30;

function timeToMinutes(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * @param {{availableDays: string, availableTime: string}} doctor
 * @param {string} date - YYYY-MM-DD
 * @param {string[]} bookedTimes - "HH:MM" strings already taken that day
 * @returns {{slots: string[], reason?: string}}
 */
function computeAvailableSlots(doctor, date, bookedTimes = []) {
  if (!doctor.availableDays || !doctor.availableTime) {
    return { slots: [], reason: 'This doctor has no configured availability.' };
  }

  const dayName = DAY_NAMES[new Date(`${date}T00:00:00`).getDay()];
  const availableDays = doctor.availableDays.split(',').map((d) => d.trim());
  if (!availableDays.includes(dayName)) {
    return { slots: [], reason: `Dr. ${doctor.name} is not available on ${dayName}s.` };
  }

  const [startStr, endStr] = doctor.availableTime.split('-').map((t) => t.trim());
  const startMin = timeToMinutes(startStr);
  const endMin = timeToMinutes(endStr);
  const booked = new Set(bookedTimes);

  const slots = [];
  for (let m = startMin; m + SLOT_MINUTES <= endMin; m += SLOT_MINUTES) {
    const slotTime = minutesToTime(m);
    if (!booked.has(slotTime)) slots.push(slotTime);
  }
  return { slots };
}

module.exports = { computeAvailableSlots, DAY_NAMES, SLOT_MINUTES };
