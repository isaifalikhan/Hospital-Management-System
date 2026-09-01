const EXPIRY_WARNING_DAYS = 30;
const IGNORED_ALLERGY_VALUES = new Set(['', 'none', 'none known', 'n/a', 'na', 'nil']);

/**
 * Best-effort, non-clinical text match: does any of the patient's recorded
 * allergy keywords appear in the given medicine name/category? Free-text on
 * both sides, so this catches literal matches (allergy "penicillin" vs a
 * medicine named/categorized "Penicillin V") but not drug-class relationships
 * (e.g. won't catch "Amoxicillin" for a "penicillin" allergy). Returns the
 * matched keyword(s), or an empty array if nothing matches.
 */
function matchAllergy(allergiesText, ...targets) {
  if (!allergiesText) return [];
  const haystack = targets.filter(Boolean).join(' ').toLowerCase();
  if (!haystack) return [];

  const keywords = String(allergiesText)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s && !IGNORED_ALLERGY_VALUES.has(s.toLowerCase()));

  return keywords.filter((keyword) => haystack.includes(keyword.toLowerCase()));
}

/**
 * 'expired' | 'expiring_soon' | null based on a DATEONLY expiryDate string
 * compared to today.
 */
function checkExpiry(expiryDate, warnDays = EXPIRY_WARNING_DAYS) {
  if (!expiryDate) return null;
  const today = new Date(new Date().toISOString().slice(0, 10));
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return null;

  const daysUntilExpiry = Math.round((expiry - today) / 86400000);
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= warnDays) return 'expiring_soon';
  return null;
}

/**
 * Combines an allergy check and an expiry check for one prescribed medicine
 * into the { type, message } warning shape both the prescribing and
 * dispensing endpoints return.
 */
function prescriptionWarnings(allergiesText, medicineName, medicine) {
  const warnings = [];

  const allergyHits = matchAllergy(allergiesText, medicineName, medicine?.category);
  if (allergyHits.length) {
    warnings.push({
      type: 'allergy',
      message: `${medicineName}: patient has a recorded allergy to ${allergyHits.join(', ')}`,
    });
  }

  const expiryStatus = medicine ? checkExpiry(medicine.expiryDate) : null;
  if (expiryStatus === 'expired') {
    warnings.push({ type: 'expiry', message: `${medicineName}: this medicine expired on ${medicine.expiryDate}` });
  } else if (expiryStatus === 'expiring_soon') {
    warnings.push({ type: 'expiry', message: `${medicineName}: this medicine expires soon (${medicine.expiryDate})` });
  }

  return warnings;
}

module.exports = { matchAllergy, checkExpiry, prescriptionWarnings, EXPIRY_WARNING_DAYS };
