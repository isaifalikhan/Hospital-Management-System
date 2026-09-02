const { generateSummary } = require('../utils/aiSummaryService');

// Pure drafting helper: takes structured fields already visible to the
// caller (diagnosis/treatment/vitals for a medical record, or ward/reason
// for a discharge summary) and returns a draft paragraph. It never reads or
// writes the database itself — the frontend pre-fills an editable textarea
// with the result and the doctor/receptionist must review and save it
// themselves, same as typing it by hand.
exports.summary = async (req, res, next) => {
  try {
    const { title, patientName, fields } = req.body;
    const text = await generateSummary({ title, patientName, fields });
    res.json({ summary: text, source: process.env.AI_API_KEY ? 'ai' : 'template' });
  } catch (err) { next(err); }
};
