// Invoice numbering, shared by every place that raises a bill — the Billing
// screen (controllers/invoiceController.js) and the automatic test bill a lab
// order creates (controllers/labOrderController.js) — so both produce the
// same INV######## shape and reception sees one consistent series.
function generateInvoiceNumber() {
  const ts = Date.now().toString().slice(-8);
  return `INV${ts}`;
}

module.exports = { generateInvoiceNumber };
