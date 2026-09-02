import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import Modal from './Modal';
import SignaturePad from './SignaturePad';

/**
 * Shared discharge form used from both the patient chart (PatientDetail.jsx)
 * and the hospital-wide ward overview (Admissions.jsx): discharge notes plus
 * the discharging doctor's e-signature, captured with SignaturePad and sent
 * up as a base64 PNG in signatureData. When the caller passes
 * onGenerateSummary, a "Generate Summary" button drafts the notes textarea
 * from the admission's details (AI_API_KEY-backed if configured, otherwise a
 * built-in template — see backend/utils/aiSummaryService.js); it only
 * pre-fills the still-editable textarea, nothing is auto-saved.
 */
export default function DischargeModal({ open, admission, onClose, onSubmit, onGenerateSummary }) {
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [signatureData, setSignatureData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  function handleClose() {
    setDischargeNotes('');
    setSignatureData(null);
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ dischargeNotes, signatureData });
      handleClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateSummary() {
    setGenerating(true);
    try {
      setDischargeNotes(await onGenerateSummary(admission));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={admission ? `Discharge ${admission.Patient?.name || 'Patient'}` : 'Discharge Patient'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {admission && (
          <p className="text-sm text-slate-500">
            {admission.ward} · Bed {admission.bedNumber} · Admitted {admission.admissionDate}
          </p>
        )}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="label mb-0">Discharge Notes</label>
            {onGenerateSummary && (
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={generating}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                title="Draft a discharge summary from this admission's details — review before saving"
              >
                <Sparkles size={13} /> {generating ? 'Generating...' : 'Generate Summary'}
              </button>
            )}
          </div>
          <textarea
            className="input"
            rows={3}
            value={dischargeNotes}
            onChange={(e) => setDischargeNotes(e.target.value)}
            placeholder="Condition on discharge, follow-up instructions, etc."
          />
        </div>
        <div>
          <label className="label">Doctor's Signature</label>
          <SignaturePad onChange={setSignatureData} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Discharging...' : 'Discharge Patient'}</button>
        </div>
      </form>
    </Modal>
  );
}
