import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { RotateCcw, Undo2 } from 'lucide-react';

const clamp = value => Math.max(0, Math.min(1, value));
const copyStrokes = strokes => strokes.map(stroke => stroke.map(point => ({ ...point })));

function paintStroke(context, points, size) {
  if (!points.length) return;
  const width = Math.max(3, size * 0.018);
  context.strokeStyle = '#292438';
  context.fillStyle = '#292438';
  context.lineWidth = width;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  if (points.length === 1) {
    context.beginPath();
    context.arc(points[0].x * size, points[0].y * size, width / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }
  context.beginPath();
  context.moveTo(points[0].x * size, points[0].y * size);
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index];
    const next = points[index + 1];
    context.quadraticCurveTo(point.x * size, point.y * size, (point.x + next.x) * size / 2, (point.y + next.y) * size / 2);
  }
  const last = points[points.length - 1];
  context.lineTo(last.x * size, last.y * size);
  context.stroke();
}

/**
 * Store and emit actual ink as arrays of normalized { x, y } points.
 * guidePaths are SVG path strings in a 109 × 109 coordinate space.
 */
export default function HandwritingCanvas({
  guidePaths = [],
  showGuide = false,
  disabled = false,
  onChange,
  onDrawingChange,
  label = 'Area menulis hiragana',
}) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const strokesRef = useRef([]);
  const activeRef = useRef(null);
  const dimensionsRef = useRef({ size: 320, ratio: 1 });
  const cursorRef = useRef({ x: 0.5, y: 0.5 });
  const keyboardCursorRef = useRef(false);
  const callbacksRef = useRef({ onChange, onDrawingChange });
  const [strokeCount, setStrokeCount] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [keyboardDrawing, setKeyboardDrawing] = useState(false);
  const helpId = useId();
  const statusId = useId();
  callbacksRef.current = { onChange, onDrawingChange };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return;
    const { size, ratio } = dimensionsRef.current;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size, size);
    context.save();
    context.strokeStyle = '#ded8e9';
    context.lineWidth = 1;
    context.setLineDash([5, 6]);
    context.beginPath();
    context.moveTo(size / 2, 0);
    context.lineTo(size / 2, size);
    context.moveTo(0, size / 2);
    context.lineTo(size, size / 2);
    context.stroke();
    context.restore();

    if (showGuide && typeof Path2D !== 'undefined') {
      context.save();
      context.scale(size / 109, size / 109);
      context.strokeStyle = '#c6bddb';
      context.lineWidth = 2.6;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      guidePaths.forEach(path => context.stroke(new Path2D(path)));
      context.restore();
    }
    strokesRef.current.forEach(stroke => paintStroke(context, stroke, size));
    if (activeRef.current) paintStroke(context, activeRef.current.points, size);

    if (keyboardCursorRef.current && !disabled) {
      context.save();
      context.strokeStyle = '#8060ca';
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(cursorRef.current.x * size, cursorRef.current.y * size, Math.max(5, size * 0.02), 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  }, [disabled, guidePaths, showGuide]);

  const emitStrokes = useCallback(() => {
    setStrokeCount(strokesRef.current.length);
    callbacksRef.current.onChange?.(copyStrokes(strokesRef.current));
  }, []);

  const finishStroke = useCallback((save = true) => {
    const active = activeRef.current;
    if (!active) return;
    activeRef.current = null;
    if (save && active.points.length) {
      strokesRef.current.push(active.points);
      emitStrokes();
    }
    if (active.pointerId !== null && canvasRef.current?.hasPointerCapture?.(active.pointerId)) {
      canvasRef.current.releasePointerCapture(active.pointerId);
    }
    setDrawing(false);
    setKeyboardDrawing(false);
    callbacksRef.current.onDrawingChange?.(false);
    redraw();
  }, [emitStrokes, redraw]);

  const startStroke = useCallback((point, pointerId = null) => {
    activeRef.current = { pointerId, points: [point] };
    setDrawing(true);
    setKeyboardDrawing(pointerId === null);
    callbacksRef.current.onDrawingChange?.(true);
    redraw();
  }, [redraw]);

  const appendPoint = useCallback(point => {
    const points = activeRef.current?.points;
    if (!points) return;
    const previous = points[points.length - 1];
    if (Math.hypot(point.x - previous.x, point.y - previous.y) >= 0.0005) points.push(point);
  }, []);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return undefined;
    const resize = () => {
      const size = frame.getBoundingClientRect().width;
      if (!size) return;
      const ratio = window.devicePixelRatio || 1;
      dimensionsRef.current = { size, ratio };
      canvas.width = Math.round(size * ratio);
      canvas.height = Math.round(size * ratio);
      redraw();
    };
    resize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer?.observe(frame);
    window.addEventListener('resize', resize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [redraw]);

  useEffect(() => {
    if (disabled && activeRef.current) finishStroke();
    redraw();
  }, [disabled, finishStroke, redraw]);

  const pointerPoint = event => {
    const bounds = canvasRef.current.getBoundingClientRect();
    return { x: clamp((event.clientX - bounds.left) / bounds.width), y: clamp((event.clientY - bounds.top) / bounds.height) };
  };

  const handlePointerDown = event => {
    if (disabled || event.isPrimary === false || event.button !== 0) return;
    if (activeRef.current && activeRef.current.pointerId !== null) return;
    event.preventDefault();
    if (activeRef.current) finishStroke();
    event.currentTarget.focus({ preventScroll: true });
    keyboardCursorRef.current = false;
    startStroke(pointerPoint(event), event.pointerId);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = event => {
    if (disabled || activeRef.current?.pointerId !== event.pointerId) return;
    event.preventDefault();
    const samples = event.nativeEvent.getCoalescedEvents?.() || [];
    samples.forEach(sample => appendPoint(pointerPoint(sample)));
    appendPoint(pointerPoint(event));
    redraw();
  };

  const handlePointerUp = event => {
    if (activeRef.current?.pointerId !== event.pointerId) return;
    appendPoint(pointerPoint(event));
    finishStroke();
  };

  const undoStroke = () => {
    if (disabled || activeRef.current || !strokesRef.current.length) return;
    strokesRef.current.pop();
    emitStrokes();
    redraw();
  };

  const clearStrokes = () => {
    if (disabled || activeRef.current || !strokesRef.current.length) return;
    strokesRef.current = [];
    emitStrokes();
    redraw();
  };

  const handleKeyDown = event => {
    if (disabled) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (activeRef.current) finishStroke(false);
      else undoStroke();
      return;
    }
    if (activeRef.current && activeRef.current.pointerId !== null) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      finishStroke(false);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (event.repeat) return;
      keyboardCursorRef.current = true;
      if (activeRef.current) finishStroke();
      else if (event.key === ' ') startStroke({ ...cursorRef.current });
      redraw();
      return;
    }
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    keyboardCursorRef.current = true;
    const step = event.shiftKey ? 0.01 : 0.025;
    cursorRef.current = { x: clamp(cursorRef.current.x + direction[0] * step), y: clamp(cursorRef.current.y + direction[1] * step) };
    if (activeRef.current) appendPoint({ ...cursorRef.current });
    redraw();
  };

  return <div className="handwriting-canvas">
    <div ref={frameRef} className={`handwriting-canvas-frame${disabled ? ' disabled' : ''}`} style={{ aspectRatio: '1 / 1', width: '100%' }}>
      <canvas
        ref={canvasRef}
        className="handwriting-canvas-surface"
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
        aria-label={label}
        aria-describedby={`${helpId} ${statusId}`}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={event => { if (activeRef.current?.pointerId === event.pointerId) finishStroke(); }}
        onLostPointerCapture={event => { if (activeRef.current?.pointerId === event.pointerId) finishStroke(); }}
        onKeyDown={handleKeyDown}
        onFocus={() => { keyboardCursorRef.current = true; redraw(); }}
        onBlur={() => { if (activeRef.current?.pointerId === null) finishStroke(); keyboardCursorRef.current = false; redraw(); }}
      >Area menggambar hiragana. Gunakan mouse, jari, pena, atau tombol panah dan spasi.</canvas>
    </div>
    <div className="handwriting-canvas-toolbar">
      <span id={statusId} className="handwriting-canvas-count" aria-live="polite">{keyboardDrawing ? 'Pena aktif · Enter untuk selesai' : `${strokeCount} goresan`}</span>
      <button type="button" className="button secondary" onClick={undoStroke} disabled={disabled || drawing || !strokeCount} aria-label="Urungkan goresan terakhir"><Undo2 size={16} />Urungkan</button>
      <button type="button" className="button secondary" onClick={clearStrokes} disabled={disabled || drawing || !strokeCount} aria-label="Hapus semua goresan"><RotateCcw size={16} />Hapus</button>
    </div>
    <p id={helpId} className="handwriting-canvas-help">Tulis dengan mouse, jari, atau pena. Dengan keyboard: panah untuk bergerak, spasi untuk mulai/akhiri goresan, Enter untuk selesai. Shift + panah untuk langkah kecil.</p>
  </div>;
}
