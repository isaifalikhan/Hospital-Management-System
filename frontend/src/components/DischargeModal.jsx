import { useState } from 'react';
import Modal from './Modal';
import SignaturePad from './SignaturePad';

/**
 * Shared discharge form used from both the patient chart (PatientDetail.jsx)
 * and the hospital-wide ward overview (Admissions.jsx): discharge notes plus
 * the discharging doctor's e-signature, captured with SignaturePad and sent
 * up as a base64 PNG in signatureData.
 */
export default function DischargeModal({ open, admission, onClose, onSubmit }) {
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [signatureData, setSignatureData] = useState(null);
  const [saving, setSaving] = useState(false);

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

  return (
    <Modal open={open} onClose={handleClose} title={admission ? `Discharge ${admission.Patient?.name || 'Patient'}` : 'Discharge Patient'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {admission && (
          <p className="text-sm text-slate-500">
            {admission.ward} · Bed {admission.bedNumber} · Admitted {admission.admissionDate}
          </p>
        )}
        <div>
          <label className="label">Discharge Notes</label>
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
