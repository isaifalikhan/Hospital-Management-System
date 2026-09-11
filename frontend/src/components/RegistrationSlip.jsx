import { Printer, HeartPulse } from 'lucide-react';
import { formatMoney } from '../utils/currency';

// The reception record: everything the front desk collects from a patient
// (demographics, contact, emergency contact, allergies) plus, when the slip
// is raised off a visit, that visit's doctor/reason/queue token and the
// consultation fee to be collected — which is what makes it an OPD chalan
// rather than a plain registration slip. Rendered as one printable block so
// a receptionist can hand the patient a copy, and reused wherever that
// information is shown — the OPD confirmation, the Patients list, the
// patient chart and the walk-in queue.
//
// The wrapping `.print-area` class is the shared "print only this block"
// technique defined in index.css (same one the invoice and discharge summary
// use): everything else on the page is hidden and this block is repositioned
// to fill the sheet, escaping any modal's overflow clipping.

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Same arithmetic as the patient chart header (PatientDetail.jsx): whole
// years, averaging over leap years.
function ageFromDob(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob)) / 3.15576e10);
}

function Field({ label, children, wide }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-slate-800">{children || '—'}</dd>
    </div>
  );
}

export default function RegistrationSlip({ patient, visit }) {
  if (!patient) return null;

  const age = ageFromDob(patient.dob);
  // A visit turns the slip into a chalan; a fee turns it into one worth
  // presenting at the cash counter.
  const fee = Number(visit?.fee) || 0;

  return (
    <div className="print-area">
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <HeartPulse size={18} />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">MediCare HMS</p>
            <p className="text-xs text-slate-500">{visit ? 'OPD Chalan' : 'Patient Registration Slip'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-right text-xs text-slate-500 print:block">
            Printed {new Date().toLocaleString()}
          </p>
          <button onClick={() => window.print()} className="btn-secondary print:hidden" title="Print or save as PDF">
            <Printer size={16} /> Print / PDF
          </button>
        </div>
      </div>

      {visit?.tokenNumber != null && (
        <div className="mb-5 flex items-center justify-between rounded-xl bg-indigo-50 px-5 py-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-500">Queue Token</p>
            <p className="text-3xl font-bold leading-tight text-indigo-700">#{visit.tokenNumber}</p>
          </div>
          <div className="text-right text-sm text-indigo-700">
            <p className="font-medium">{visit.doctorName || 'Doctor not assigned'}</p>
            {visit.specialization && <p className="text-xs text-indigo-500">{visit.specialization}</p>}
          </div>
        </div>
      )}

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Patient Details</h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <Field label="MRN">{patient.mrn}</Field>
        <Field label="Full Name">{patient.name}</Field>
        <Field label="Date of Birth">
          {patient.dob ? `${formatDate(patient.dob)}${age !== null ? ` (${age} yrs)` : ''}` : ''}
        </Field>
        <Field label="Gender">{patient.gender && <span className="capitalize">{patient.gender}</span>}</Field>
        <Field label="CNIC">{patient.cnic}</Field>
        <Field label="Patient Status">{patient.status && <span className="capitalize">{patient.status}</span>}</Field>
        <Field label="Phone">{patient.phone}</Field>
        <Field label="Email">{patient.email}</Field>
        <Field label="Address" wide>{patient.address}</Field>
        <Field label="Emergency Contact">{patient.emergencyContactName}</Field>
        <Field label="Emergency Contact Phone">{patient.emergencyContactPhone}</Field>
        <Field label="Allergies" wide>{patient.allergies || 'None known'}</Field>
        <Field label="Registered On">{formatDate(patient.createdAt)}</Field>
      </dl>

      {visit && (
        <>
          <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Visit Details</h3>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Doctor">{visit.doctorName}</Field>
            <Field label="Specialization">{visit.specialization}</Field>
            <Field label="Visit Type">
              {visit.visitType && (
                <span className="capitalize">{visit.visitType === 'walk-in' ? 'Walk-in' : visit.visitType}</span>
              )}
            </Field>
            <Field label={visit.visitType === 'walk-in' ? 'Checked In' : 'Scheduled For'}>
              {visit.date ? `${formatDate(visit.date)}${visit.time ? ` at ${visit.time}` : ''}` : ''}
            </Field>
            <Field label="Reason for Visit" wide>{visit.reason}</Field>
          </dl>

          <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Charges</h3>
          <div className="rounded-lg border border-slate-200">
            <div className="flex items-center justify-between px-4 py-2.5 text-sm text-slate-700">
              <span>Consultation fee{visit.doctorName ? ` — ${visit.doctorName}` : ''}</span>
              <span>{formatMoney(fee)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900">
              <span>Total Payable</span>
              <span>{formatMoney(fee)}</span>
            </div>
          </div>
          {fee === 0 && (
            <p className="mt-1.5 text-xs text-slate-400 print:hidden">
              No consultation fee is set on this doctor's profile.
            </p>
          )}
        </>
      )}

      <div className="mt-8 grid grid-cols-2 gap-8 text-xs text-slate-500">
        <div>
          <div className="h-10 border-b border-slate-300" />
          <p className="mt-1">Patient / Attendant Signature</p>
        </div>
        <div>
          <div className="h-10 border-b border-slate-300" />
          <p className="mt-1">Received By (Reception)</p>
        </div>
      </div>
    </div>
  );
}
