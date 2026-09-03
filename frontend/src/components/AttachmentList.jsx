import { useEffect, useRef, useState } from 'react';
import { Paperclip, FileText, Download, Trash2, Upload, ImageOff } from 'lucide-react';
import { attachmentsApi } from '../api';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Reused across medical records, lab orders, and admissions (discharge
// documents) — anywhere a file needs to attach to a record. `canEdit`
// controls whether the upload control and delete buttons render; the
// backend enforces the same role check independently either way.
export default function AttachmentList({ entityType, entityId, canEdit }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [thumbs, setThumbs] = useState({}); // attachmentId -> object URL
  const fileInputRef = useRef(null);
  const thumbUrlsRef = useRef([]);

  async function load() {
    setLoading(true);
    try {
      const res = await attachmentsApi.list(entityType, entityId);
      setAttachments(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  // Fetch a thumbnail for each image attachment once the list loads; revoke
  // every object URL this component created when it unmounts or the list
  // changes, so we don't leak blob URLs.
  useEffect(() => {
    let cancelled = false;
    thumbUrlsRef.current.forEach((url) => window.URL.revokeObjectURL(url));
    thumbUrlsRef.current = [];
    setThumbs({});

    attachments
      .filter((a) => a.mimeType.startsWith('image/'))
      .forEach(async (a) => {
        try {
          const url = await attachmentsApi.getObjectUrl(a.id);
          if (cancelled) {
            window.URL.revokeObjectURL(url);
            return;
          }
          thumbUrlsRef.current.push(url);
          setThumbs((prev) => ({ ...prev, [a.id]: url }));
        } catch {
          // Thumbnail is a nice-to-have; leave it as the generic file icon on failure.
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments]);

  useEffect(() => () => {
    thumbUrlsRef.current.forEach((url) => window.URL.revokeObjectURL(url));
  }, []);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      await attachmentsApi.upload(entityType, entityId, file);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(attachment) {
    try {
      const url = await attachmentsApi.getObjectUrl(attachment.id);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download file');
    }
  }

  async function handleDelete(attachment) {
    if (!confirm(`Remove "${attachment.filename}"?`)) return;
    try {
      await attachmentsApi.remove(attachment.id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete attachment');
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Paperclip size={13} /> Attachments
        </p>
        {canEdit && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
            >
              <Upload size={13} /> {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </>
        )}
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {loading ? (
        <p className="text-xs text-slate-400">Loading...</p>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-slate-400">No files attached.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {attachments.map((a) => (
            <li key={a.id} className="group relative rounded-lg border border-slate-200 p-2 text-xs">
              <button
                type="button"
                onClick={() => handleDownload(a)}
                className="flex w-full flex-col items-center gap-1 text-center"
                title={`Download ${a.filename}`}
              >
                {thumbs[a.id] ? (
                  <img src={thumbs[a.id]} alt={a.filename} className="h-14 w-full rounded object-cover" />
                ) : a.mimeType.startsWith('image/') ? (
                  <ImageOff size={22} className="mt-2 text-slate-300" />
                ) : (
                  <FileText size={22} className="mt-2 text-slate-400" />
                )}
                <span className="w-full truncate font-medium text-slate-700">{a.filename}</span>
                <span className="text-slate-400">{formatSize(a.fileSize)}</span>
              </button>
              <div className="mt-1 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button type="button" onClick={() => handleDownload(a)} className="rounded p-1 text-slate-500 hover:bg-slate-100" title="Download">
                  <Download size={13} />
                </button>
                {canEdit && (
                  <button type="button" onClick={() => handleDelete(a)} className="rounded p-1 text-rose-500 hover:bg-rose-50" title="Delete">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
