// The one place the app's currency is spelled. Every amount the UI shows —
// invoices, the OPD chalan, dashboard tiles, chart tooltips, doctor fees,
// medicine prices — goes through formatMoney so they all read the same and a
// future currency change is a one-line edit here.
//
// Amounts are stored as plain numbers (Invoice.total, Doctor.consultationFee,
// Medicine.unitPrice), so this only decides how they're rendered.
export const CURRENCY = 'Rs.';

export function formatMoney(value) {
  return `${CURRENCY} ${Number(value || 0).toFixed(2)}`;
}
