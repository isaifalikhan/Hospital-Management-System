import { useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';

// Checks whether every pixel in the canvas is fully transparent, i.e.
// nothing has been drawn on it yet.
function isCanvasBlank(canvas) {
  const ctx = canvas.getContext('2d');
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return false; // any non-zero alpha byte means ink
  }
  return true;
}

/**
 * A lightweight, dependency-free e-signature capture widget: a plain
 * <canvas> drawn on with the mouse or a touchscreen, exported as a base64
 * PNG data URL via onChange. Used to sign off medical records and discharge
 * summaries — no signature is required to submit either form, this just
 * captures one when the signer draws on it.
 */
export default function SignaturePad({ onChange, height = 160 }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const drawingRef = useRef(false);
  const [empty, setEmpty] = useState(true);

  // Backs the canvas with a higher-resolution drawing buffer than its
  // displayed CSS size (device pixel ratio) so strokes stay crisp, while
  // keeping the element responsive to its container's width.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ratio = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b'; // slate-800
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pointFromEvent(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const source = e.touches && e.touches.length ? e.touches[0] : e;
    return { x: source.clientX - rect.left, y: source.clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    drawingRef.current = true;
    const { x, y } = pointFromEvent(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const { x, y } = pointFromEvent(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    if (empty) setEmpty(false);
  }

  function finish() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    emit();
  }

  function emit() {
    const canvas = canvasRef.current;
    onChange?.(isCanvasBlank(canvas) ? null : canvas.toDataURL('image/png'));
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    onChange?.(null);
  }

  return (
    <div ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="w-full touch-none rounded-lg border border-slate-300 bg-white"
        style={{ height }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={finish}
        onMouseLeave={finish}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={finish}
      />
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs text-slate-400">Sign above with your mouse or finger</p>
        <button
          type="button"
          onClick={handleClear}
          disabled={empty}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:underline disabled:text-slate-300 disabled:no-underline"
        >
          <Eraser size={12} /> Clear
        </button>
      </div>
    </div>
  );
}
