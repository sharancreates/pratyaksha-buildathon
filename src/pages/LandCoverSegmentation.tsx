import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Eye, Layers, Play, RefreshCw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { fetchSegmentation, runSegmentationInference } from '../lib/api';
import type { LandCoverClassId, MunicipalityId, SegmentationResult } from '../shared/types';
import ahmedabadNadir from '../assets/images/satellite_ahmedabad_nadir_1795150976598.jpg';
import bengaluruNadir from '../assets/images/satellite_bengaluru_nadir_1795150979193.jpg';

const CITY_SCENES: Record<MunicipalityId, { src: string; caption: string }> = {
  ahmedabad: {
    src: ahmedabadNadir,
    caption: 'Sentinel-2 Synthetic Nadir Tile · Sabarmati River & Industrial Corridor (10m)',
  },
  delhi: {
    src: ahmedabadNadir,
    caption: 'Sentinel-2 Synthetic Nadir Tile · Yamuna River & Urban Core (10m)',
  },
  mumbai: {
    src: bengaluruNadir,
    caption: 'Sentinel-2 Synthetic Nadir Tile · Creek Catchments & High-Density Corridor (10m)',
  },
  bengaluru: {
    src: bengaluruNadir,
    caption: 'Sentinel-2 Synthetic Nadir Tile · Urban Lake Network & Canopy Parks (10m)',
  },
  chennai: {
    src: bengaluruNadir,
    caption: 'Sentinel-2 Synthetic Nadir Tile · Marshland Basin & Urban Corridor (10m)',
  },
};

const CLASS_PALETTE: Record<LandCoverClassId, { rgb: [number, number, number]; label: string; hex: string }> = {
  dense_vegetation: { rgb: [22, 163, 74], label: 'Dense Vegetation', hex: '#16A34A' },
  sparse_vegetation: { rgb: [132, 204, 22], label: 'Sparse Vegetation', hex: '#84CC16' },
  built_up: { rgb: [239, 68, 68], label: 'Built-Up Areas', hex: '#EF4444' },
  water_bodies: { rgb: [14, 165, 233], label: 'Water Bodies', hex: '#0EA5E9' },
  bare_soil: { rgb: [245, 158, 11], label: 'Bare Soil', hex: '#F59E0B' },
  agricultural: { rgb: [161, 98, 7], label: 'Agricultural Land', hex: '#A16207' },
};

function classifyPixelRgb(r: number, g: number, b: number): LandCoverClassId {
  // Deterministic spectral heuristic fallback for RGB orthophoto pixels
  if (b > r + 8 && g >= r - 6 && r < 115) return 'water_bodies';
  if (r < 58 && g < 72 && b < 86 && b >= r - 2) return 'water_bodies';
  if (g > r + 10 && g > b + 8) {
    return g < 118 ? 'dense_vegetation' : 'sparse_vegetation';
  }
  if (r > g + 16 && r > b + 24 && r > 120) {
    return g > 115 ? 'agricultural' : 'bare_soil';
  }
  if (Math.abs(r - g) < 16 && Math.abs(g - b) < 18 && r > 90) {
    return 'built_up';
  }
  if (r > 130 && g > 115 && b < 105) {
    return 'agricultural';
  }
  return 'built_up';
}

export function LandCoverSegmentation() {
  const { municipality, pushToast } = useAppContext();

  const [seg, setSeg] = useState<SegmentationResult | null>(null);
  const [opacity, setOpacity] = useState<number>(62);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [hoveredClass, setHoveredClass] = useState<string>('Move cursor over satellite scene to inspect class');
  const [imgError, setImgError] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixelClassMapRef = useRef<Uint8Array | null>(null);
  const mapDimRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  const scene = CITY_SCENES[municipality] ?? CITY_SCENES.ahmedabad;

  useEffect(() => {
    setImgError(false);
    fetchSegmentation(municipality).then(setSeg).catch(() => setSeg(null));
  }, [municipality]);

  // Compute deterministic pixel-aligned segmentation mask over the actual nadir orthophoto
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const targetW = 480;
      const targetH = 270;
      canvas.width = targetW;
      canvas.height = targetH;
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const frame = ctx.getImageData(0, 0, targetW, targetH);
      const data = frame.data;
      const classOrder: LandCoverClassId[] = [
        'dense_vegetation',
        'sparse_vegetation',
        'built_up',
        'water_bodies',
        'bare_soil',
        'agricultural',
      ];
      const classMap = new Uint8Array(targetW * targetH);

      for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
        const cls = classifyPixelRgb(data[i], data[i + 1], data[i + 2]);
        const idx = classOrder.indexOf(cls);
        classMap[p] = idx >= 0 ? idx : 2;
        const [cr, cg, cb] = CLASS_PALETTE[cls].rgb;
        data[i] = cr;
        data[i + 1] = cg;
        data[i + 2] = cb;
        data[i + 3] = 255;
      }

      ctx.putImageData(frame, 0, 0);
      pixelClassMapRef.current = classMap;
      mapDimRef.current = { w: targetW, h: targetH };
    };
    img.onerror = () => setImgError(true);
    img.src = scene.src;
  }, [scene.src]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const classMap = pixelClassMapRef.current;
    const { w, h } = mapDimRef.current;
    if (!classMap || w === 0 || h === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(w - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * w)));
    const y = Math.min(h - 1, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * h)));
    const classOrder: LandCoverClassId[] = [
      'dense_vegetation',
      'sparse_vegetation',
      'built_up',
      'water_bodies',
      'bare_soil',
      'agricultural',
    ];
    const cid = classOrder[classMap[y * w + x]] ?? 'built_up';
    setHoveredClass(`${CLASS_PALETTE[cid].label} (Pixel ${x}, ${y})`);
  };

  const handleRunSegmentation = async () => {
    setRunning(true);
    try {
      const res = await runSegmentationInference(municipality);
      setSeg(res);
      pushToast({
        title: 'EnvironmentalUNet Demo Inference Completed',
        description: `Classified ${res.totalAreaKm2} km² across 6 land-cover classes.`,
        variant: 'success',
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="bg-[#111D2E] border border-slate-800/90 rounded-lg px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-cyan-400">
            ENVIRONMENTAL UNET · PYTORCH ARCHITECTURE · 6-CLASS SEMANTIC SEGMENTATION
          </div>
          <h1 className="mt-1 text-xl font-semibold text-slate-100">
            Satellite Land Cover Segmentation
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Classify multispectral satellite imagery into Dense Vegetation, Sparse Vegetation, Built-Up, Water Bodies, Bare Soil, and Agriculture.
          </p>
        </div>

        <button
          type="button"
          disabled={running}
          onClick={() => void handleRunSegmentation()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-cyan-500/20 border border-cyan-400/50 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50 whitespace-nowrap"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run UNet Segmentation
        </button>
      </section>

      {/* Transparent Fallback Notice */}
      <div className="bg-amber-500/10 border border-amber-500/35 rounded-lg px-4 py-3 flex items-start gap-3 text-xs text-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">DEMO SEGMENTATION FALLBACK ACTIVE: </span>
          {seg?.weightsStatus ??
            'Trained PyTorch EnvironmentalUNet weights (.pt) are not loaded; displaying deterministic pixel-aligned spectral classification overlay.'}
        </div>
      </div>

      {/* Main Split: Interactive Satellite Scene + Overlay Controls */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 bg-[#111D2E] border border-slate-800/90 rounded-lg overflow-hidden flex flex-col">
          {/* Viewer Controls */}
          <div className="px-4 py-3 bg-[#0D1524] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-200">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold">{scene.caption}</span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setShowOverlay((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
                  showOverlay
                    ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200'
                    : 'bg-[#111D2E] border-slate-700 text-slate-400'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                {showOverlay ? 'Overlay On' : 'Original Imagery'}
              </button>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <label htmlFor="seg-opacity">Opacity</label>
                <input
                  id="seg-opacity"
                  type="range"
                  min={0}
                  max={100}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-28 accent-cyan-400"
                />
                <span className="w-9 text-right tabular-nums">{opacity}%</span>
              </div>
            </div>
          </div>

          {/* Interactive Imagery + Pixel-Aligned Canvas Mask */}
          <div
            className="relative w-full aspect-video bg-[#080D18] cursor-crosshair select-none overflow-hidden"
            onMouseMove={handleMouseMove}
          >
            {imgError ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-900 text-xs text-slate-400">
                Satellite tile preview unavailable.
              </div>
            ) : (
              <img
                src={scene.src}
                alt={scene.caption}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover block"
              />
            )}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-150"
              style={{ opacity: showOverlay ? opacity / 100 : 0 }}
            />
            <div className="absolute bottom-3 left-3 bg-[#0D1524]/92 border border-slate-700/80 rounded px-3 py-1.5 text-[11px] font-mono text-cyan-200">
              Probe: {hoveredClass}
            </div>
          </div>

          {/* Classification Legend */}
          <div className="px-4 py-3 bg-[#0D1524] border-t border-slate-800 flex flex-wrap items-center gap-x-5 gap-y-2">
            {Object.entries(CLASS_PALETTE).map(([id, item]) => (
              <div key={id} className="flex items-center gap-2 text-xs text-slate-300">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: item.hex }}
                />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Area-Wise Statistics */}
        <div className="xl:col-span-4 bg-[#111D2E] border border-slate-800/90 rounded-lg p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <div className="text-[11px] font-mono text-slate-400">
                {seg?.modelArchitecture ?? 'EnvironmentalUNet'}
              </div>
              <h2 className="mt-1 text-sm font-semibold text-slate-100">
                Area-Wise Land Cover Statistics ({seg?.totalAreaKm2 ?? 0} km²)
              </h2>
            </div>

            <div className="space-y-2.5">
              {(seg?.classes ?? []).map((cls) => (
                <div key={cls.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-200">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: cls.color }}
                      />
                      {cls.label}
                    </span>
                    <span className="font-mono text-slate-300 tabular-nums">
                      {cls.areaKm2} km² ({cls.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0D1524] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, cls.percentage * 1.4)}%`, backgroundColor: cls.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Inference Mode</span>
              <span className="text-amber-400">DEMO FALLBACK</span>
            </div>
            <div className="flex justify-between">
              <span>Spatial Resolution</span>
              <span className="text-slate-200 tabular-nums">{seg?.spatialResolutionM ?? 10}m</span>
            </div>
            <div className="flex justify-between">
              <span>Demo Reference mIoU</span>
              <span className="text-cyan-300 tabular-nums">{seg?.estimatedIoUDemo ?? 0.79}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Year Change & Transition Matrix */}
      {seg && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 bg-[#111D2E] border border-slate-800/90 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-100">
              5-Year Net Class Shift (% of Municipal Area)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 mb-4">
              Positive values indicate expansion; negative values indicate contraction
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seg.classes} margin={{ top: 8, right: 12, left: -16, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94A3B8"
                    fontSize={10}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    tickFormatter={(v: string) => v.split(' ')[0]}
                  />
                  <YAxis stroke="#94A3B8" fontSize={11} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D1524',
                      borderColor: '#334155',
                      fontSize: '12px',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="fiveYearChangePct" name="5-Year Shift (%)" radius={[3, 3, 0, 0]}>
                    {seg.classes.map((c) => (
                      <Cell key={c.id} fill={c.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-6 bg-[#111D2E] border border-slate-800/90 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-100">
                Land Cover Transition Analysis
              </h2>
            </div>
            <div className="divide-y divide-slate-800/80">
              {seg.transitions.map((t, idx) => (
                <div key={idx} className="px-4 py-3.5 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-100">
                      {t.fromClass} → {t.toClass}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{t.driver}</div>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-400 tabular-nums shrink-0">
                    {t.areaKm2} km²
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
