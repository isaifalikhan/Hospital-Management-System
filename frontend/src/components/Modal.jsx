import { X } from 'lucide-react';

// Two widths, and the choice is deliberate: data-entry forms stay in the
// narrow portrait column (max-w-md) and stack their fields one per line, which
// is why none of the form modals pass `wide`. `wide` is reserved for the
// printable documents shown in a modal — the registration slip / OPD chalan,
// the invoice and the medical record — where the content is a page, not a form.
export default function Modal({ open, title, onClose, children, wide }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={`modal-panel w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
          <h3 className="text-base font-bold tracking-tight text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
