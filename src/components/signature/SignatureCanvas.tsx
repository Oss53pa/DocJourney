import { useState, useRef, useCallback, useEffect } from 'react';
import getStroke from 'perfect-freehand';

// ---- Types ----

interface SignatureCanvasProps {
  mode: 'signature' | 'paraphe';
  onChange?: (svgPath: string | null) => void;
  onComplete?: (dataUrl: string) => void;
  initialValue?: string;
  disabled?: boolean;
  className?: string;
}

type Point = number[]; // [x, y, pressure]
type Stroke = Point[];

// ---- SVG path helper (from perfect-freehand docs) ----

function average(a: number, b: number) {
  return (a + b) / 2;
}

function getSvgPathFromStroke(points: number[][]): string {
  const len = points.length;
  if (len < 2) return '';

  let d = `M ${points[0][0].toFixed(2)},${points[0][1].toFixed(2)} `;

  for (let i = 0; i < len - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    d += `Q ${p0[0].toFixed(2)},${p0[1].toFixed(2)} ${average(p0[0], p1[0]).toFixed(2)},${average(p0[1], p1[1]).toFixed(2)} `;
  }

  return d;
}

// ---- Component ----

export default function SignatureCanvas({
  mode,
  onChange,
  onComplete,
  initialValue,
  disabled = false,
  className = '',
}: SignatureCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const useRealPressureRef = useRef(false);

  const height = mode === 'signature' ? 180 : 100;
  const strokeSize = mode === 'signature' ? 4 : 3;

  // Restore from initialValue
  useEffect(() => {
    if (initialValue && strokes.length === 0 && !currentStroke) {
      // initialValue is a pre-rendered SVG path — store as a "frozen" path
      setStrokes([]);
    }
  }, [initialValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const getOptions = useCallback((realPressure: boolean) => ({
    size: strokeSize,
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.5,
    easing: (t: number) => t,
    start: {
      taper: 0,
      easing: (t: number) => t,
      cap: true,
    },
    end: {
      taper: 100,
      easing: (t: number) => Math.sqrt(t),
      cap: true,
    },
    simulatePressure: !realPressure,
  }), [strokeSize]);

  // Build all SVG paths
  const allPaths = strokes.map(stroke => {
    const outline = getStroke(stroke, getOptions(useRealPressureRef.current));
    return getSvgPathFromStroke(outline);
  });

  // Live stroke
  let livePath = '';
  if (currentStroke && currentStroke.length > 0) {
    const outline = getStroke(currentStroke, getOptions(useRealPressureRef.current));
    livePath = getSvgPathFromStroke(outline);
  }

  const hasContent = strokes.length > 0 || !!initialValue;

  // ---- Export helpers ----

  const exportToPng = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = svg.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      URL.revokeObjectURL(url);
      onComplete?.(canvas.toDataURL('image/png'));
    };
    img.src = url;
  }, [onComplete]);

  const notifyChange = useCallback((newStrokes: Stroke[]) => {
    if (!onChange) return;
    if (newStrokes.length === 0) {
      onChange(null);
      return;
    }
    const paths = newStrokes.map(s => {
      const outline = getStroke(s, getOptions(useRealPressureRef.current));
      return getSvgPathFromStroke(outline);
    });
    onChange(paths.join(' '));
  }, [onChange, getOptions]);

  // ---- Pointer handlers ----

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);

    // Detect real pressure from stylus
    if (e.pointerType === 'pen' && e.pressure > 0 && e.pressure < 1) {
      useRealPressureRef.current = true;
    }

    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = useRealPressureRef.current ? e.pressure : 0.5;

    setIsDrawing(true);
    setCurrentStroke([[x, y, pressure]]);
  }, [disabled]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();

    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = useRealPressureRef.current ? e.pressure : 0.5;

    setCurrentStroke(prev => prev ? [...prev, [x, y, pressure]] : [[x, y, pressure]]);
  }, [isDrawing, disabled]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentStroke && currentStroke.length > 1) {
      const newStrokes = [...strokes, currentStroke];
      setStrokes(newStrokes);
      notifyChange(newStrokes);
    }
    setCurrentStroke(null);
  }, [isDrawing, currentStroke, strokes, notifyChange]);

  // ---- Actions ----

  const handleClear = useCallback(() => {
    setStrokes([]);
    setCurrentStroke(null);
    onChange?.(null);
  }, [onChange]);

  const handleUndo = useCallback(() => {
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    notifyChange(newStrokes);
  }, [strokes, notifyChange]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Canvas */}
      <div
        className={`relative rounded-lg border-2 border-dashed transition-colors ${
          disabled
            ? 'border-neutral-200 bg-neutral-50 cursor-not-allowed'
            : 'border-neutral-300 bg-white hover:border-neutral-400 cursor-crosshair'
        }`}
        style={{ height }}
      >
        <svg
          ref={svgRef}
          className="w-full h-full touch-none select-none"
          style={{ height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* White background for export */}
          <rect width="100%" height="100%" fill="white" rx="6" />

          {/* Guide line */}
          <line
            x1="10%"
            y1={height - 30}
            x2="90%"
            y2={height - 30}
            stroke="#e5e5e5"
            strokeWidth="1"
            strokeDasharray="4 3"
          />

          {/* initialValue path */}
          {initialValue && strokes.length === 0 && (
            <path d={initialValue} fill="#1a1a2e" stroke="none" />
          )}

          {/* Completed strokes */}
          {allPaths.map((d, i) => (
            <path key={i} d={d} fill="#1a1a2e" stroke="none" />
          ))}

          {/* Live stroke */}
          {livePath && (
            <path d={livePath} fill="#1a1a2e" stroke="none" />
          )}

          {/* Placeholder */}
          {!hasContent && !currentStroke && (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#d4d4d4"
              fontSize="13"
              fontFamily="'Segoe UI', Arial, sans-serif"
            >
              {mode === 'signature' ? 'Dessinez votre signature ici' : 'Dessinez votre paraphe ici'}
            </text>
          )}
        </svg>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={disabled || strokes.length === 0}
            className="px-2.5 py-1 text-[11px] font-medium text-neutral-500 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled || !hasContent}
            className="px-2.5 py-1 text-[11px] font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Effacer
          </button>
        </div>

        {onComplete && (
          <button
            type="button"
            onClick={exportToPng}
            disabled={disabled || !hasContent}
            className="px-3 py-1 text-[11px] font-semibold text-white bg-neutral-800 hover:bg-neutral-900 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Valider
          </button>
        )}
      </div>
    </div>
  );
}
