/**
 * AI-assisted drafting for discharge notes / medical-record notes.
 *
 * Zero-config by default: if AI_API_KEY is not set, generateSummary() falls
 * back to a deterministic template that composes a readable paragraph from
 * the same structured fields, so the "Generate Summary" button works with
 * no API keys and no third-party account. If AI_API_KEY IS set, it calls the
 * Anthropic Messages API (api.anthropic.com) to draft the paragraph instead.
 * Any failure calling the API (bad key, network, timeout, non-2xx) falls
 * back to the template rather than surfacing an error, so this feature
 * degrades gracefully instead of blocking the doctor/receptionist's workflow.
 *
 * Whichever path produced it, the result is only ever a *draft* — callers
 * must pre-fill an editable textarea with it and let a human review/edit
 * before saving; this service never writes to the database itself.
 */

const AI_API_URL = process.env.AI_API_URL || 'https://api.anthropic.com/v1/messages';
const AI_MODEL = process.env.AI_MODEL || 'claude-3-5-haiku-latest';
const REQUEST_TIMEOUT_MS = 15000;

/**
 * @param {string} title - e.g. "Discharge Summary" or "Visit Notes"
 * @param {string} [patientName]
 * @param {Record<string,string>} fields - ordered label -> value pairs (blank values are skipped)
 */
async function generateSummary({ title = 'Summary', patientName = '', fields = {} }) {
  const cleanFields = Object.entries(fields).filter(([, v]) => v && String(v).trim());

  if (process.env.AI_API_KEY) {
    try {
      return await callAiApi({ title, patientName, fields: cleanFields });
    } catch (err) {
      console.error('AI summary generation failed, falling back to template:', err.message);
      return templateSummary({ title, patientName, fields: cleanFields });
    }
  }
  return templateSummary({ title, patientName, fields: cleanFields });
}

// Deterministic, dependency-free draft: turns labeled fields into a short
// readable paragraph. This is what runs when AI_API_KEY is unset (the
// default), so the feature is fully functional with zero configuration.
function templateSummary({ title, patientName, fields }) {
  if (!fields.length) {
    return `${title}${patientName ? ` for ${patientName}` : ''}: no clinical details were provided yet. Add diagnosis, treatment, and vitals above, then generate again.`;
  }

  const who = patientName ? `Patient ${patientName}` : 'The patient';
  const sentences = fields.map(([label, value]) => `${label}: ${String(value).trim().replace(/\.$/, '')}.`);

  return [`${who} — ${title.toLowerCase()}.`, ...sentences]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function callAiApi({ title, patientName, fields }) {
  const prompt = [
    `Write a concise, professional ${title.toLowerCase()} paragraph (3-5 sentences) for a hospital record`,
    patientName ? ` for patient ${patientName}` : '',
    ', based only on the following structured clinical details. Do not invent facts not given below.',
    '\n\n',
    fields.map(([label, value]) => `${label}: ${value}`).join('\n'),
  ].join('');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.AI_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`AI API responded with ${res.status}`);
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text?.trim();
    if (!text) throw new Error('AI API returned no text content');
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { generateSummary };
