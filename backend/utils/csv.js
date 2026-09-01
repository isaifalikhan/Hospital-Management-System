/**
 * Minimal dependency-free CSV serializer. Good enough for exporting flat
 * rows of primitives; wraps any value containing a comma, quote, or
 * newline in double quotes and escapes embedded quotes.
 */
// Leading =, +, -, @ (and tab/CR) make a cell a live formula in Excel/Sheets;
// prefixing with a quote forces it to be read as plain text instead
// (CSV/formula injection mitigation).
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function toCsv(rows, columns) {
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (FORMULA_PREFIX.test(str)) {
      str = `'${str}`;
    }
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((c) => escape(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => escape(c.value(row))).join(','));
  return [header, ...lines].join('\r\n');
}

function sendCsv(res, filename, csvContent) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvContent);
}

module.exports = { toCsv, sendCsv };
