// Single source of truth for slot-availability math: doctor weekly
// availability (availableDays/availableTime) -> 30-minute slot boundaries.
// Every caller that needs this (staff booking, public booking, patient
// portal booking, owner-insights utilization, and the availableDays
// validator) imports it from here rather than reimplementing it.

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
    // Seeded/entered doctor names already include a "Dr." prefix (see
    // backend/utils/seed.js) — strip it before re-adding one, matching the
    // same convention the frontend already uses for doctor display names.
    const displayName = doctor.name.replace(/^Dr\.?\s*/, '');
    return { slots: [], reason: `Dr. ${displayName} is not available on ${dayName}s.` };
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

module.exports = { computeAvailableSlots, timeToMinutes, minutesToTime, DAY_NAMES, SLOT_MINUTES };
