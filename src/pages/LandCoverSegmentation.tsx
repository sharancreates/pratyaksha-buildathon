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
    caption: 'SENTINEL-2 NADIR TILE · SABARMATI CORRIDOR (10M)',
  },
  delhi: {
    src: ahmedabadNadir,
    caption: 'SENTINEL-2 NADIR TILE · YAMUNA RIVER CORE (10M)',
  },
  mumbai: {
    src: bengaluruNadir,
    caption: 'SENTINEL-2 NADIR TILE · CREEK CATCHMENT CORRIDOR (10M)',
  },
  bengaluru: {
    src: bengaluruNadir,
    caption: 'SENTINEL-2 NADIR TILE · LAKE NETWORK & CANOPY PARKS (10M)',
  },
  chennai: {
    src: bengaluruNadir,
    caption: 'SENTINEL-2 NADIR TILE · MARSHLAND BASIN (10M)',
  },
};

const CLASS_PALETTE: Record<LandCoverClassId, { rgb: [number, number, number]; label: string; hex: string }> = {
  dense_vegetation: { rgb: [0, 0, 0], label: 'Dense Vegetation', hex: '#000000' },
  sparse_vegetation: { rgb: [75, 85, 99], label: 'Sparse Vegetation', hex: '#4B5563' },
  built_up: { rgb: [255, 0, 0], label: 'Built-Up Areas', hex: '#FF0000' },
  water_bodies: { rgb: [156, 163, 175], label: 'Water Bodies', hex: '#9CA3AF' },
  bare_soil: { rgb: [209, 213, 219], label: 'Bare Soil', hex: '#D1D5DB' },
  agricultural: { rgb: [107, 114, 128], label: 'Agricultural Land', hex: '#6B7280' },
};

function classifyPixelRgb(r: number, g: number, b: number): LandCoverClassId {
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
  const [hoveredClass, setHoveredClass] = useState<string>('MOVE CURSOR OVER TILE TO INSPECT CLASS');
  const [imgError, setImgError] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixelClassMapRef = useRef<Uint8Array | null>(null);
  const mapDimRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  const scene = CITY_SCENES[municipality] ?? CITY_SCENES.ahmedabad;

  useEffect(() => {
    setImgError(false);
    fetchSegmentation(municipality).then(setSeg).catch(() => setSeg(null));
  }, [municipality]);

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
    setHoveredClass(`${CLASS_PALETTE[cid].label.toUpperCase()} [${x}, ${y}]`);
  };

  const handleRunSegmentation = async () => {
    setRunning(true);
    try {
      const res = await runSegmentationInference({ municipalityId: municipality });
      setSeg(res);
      pushToast({
        title: 'EnvironmentalUNet Inference Complete',
        description: `Classified ${res.totalAreaKm2} km² across 6 land-cover classes.`,
        variant: 'success',
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <section className="hero-compact border-2 border-black bg-white relative overflow-hidden flex flex-col justify-between">
        <span
          aria-hidden="true"
          className="index absolute right-4 top-2 text-[#E5E7EB] pointer-events-none select-none"
        >
          06
        </span>

        <div className="relative z-10">
          <div className="text-[11px] font-mono font-bold tracking-wider text-[#4B5563] uppercase mb-3">
            ENVIRONMENTAL UNET · 6-CLASS SEMANTIC SEGMENTATION · 10M NADIR
          </div>

          <h1 className="display mb-4 text-black">
            <span className="outline">LAND COVER</span>
            <br />
            SEGMENTATION
          </h1>

          <p className="lead mb-6 text-[#4B5563]">
            Classify multispectral satellite imagery into Dense Vegetation, Sparse Vegetation, Built-Up,
            Water Bodies, Bare Soil, and Agriculture.
          </p>

          <button
            type="button"
            disabled={running}
            onClick={() => void handleRunSegmentation()}
            className="button-sm bg-black text-white hover:bg-white hover:text-black disabled:opacity-50"
          >
            {running ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="w-4 h-4 mr-2" aria-hidden="true" />
            )}
            {running ? 'RUNNING UNET...' : 'RUN SEGMENTATION'}
          </button>
        </div>
      </section>

      {/* Fallback Notice */}
      <div className="border-2 border-black bg-white p-4 flex items-start gap-3 shadow-[4px_4px_0px_#000]">
        <AlertTriangle className="w-5 h-5 text-[#FF0000] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-xs text-black">
          <span className="font-black uppercase tracking-wider">DEMO SEGMENTATION MODE: </span>
          <span className="text-[#4B5563]">
            {seg?.weightsStatus ??
              'Trained PyTorch EnvironmentalUNet weights (.pt) are optional; displaying deterministic pixel-aligned spectral classification overlay.'}
          </span>
        </div>
      </div>

      {/* Main Split: Interactive Satellite Scene + Overlay Controls */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 border-2 border-black bg-white overflow-hidden flex flex-col">
          {/* Viewer Controls */}
          <div className="px-6 py-3.5 bg-black text-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
              <Layers className="w-4 h-4 text-white" aria-hidden="true" />
              <span>{scene.caption}</span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setShowOverlay((v) => !v)}
                className={`button-sm !py-1 !px-3 text-[11px] ${
                  showOverlay ? 'bg-white text-black' : 'border-white text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                {showOverlay ? 'OVERLAY ON' : 'RAW IMAGERY'}
              </button>

              <div className="flex items-center gap-2 text-xs font-mono font-bold">
                <label htmlFor="seg-opacity">OPACITY</label>
                <input
                  id="seg-opacity"
                  type="range"
                  min={0}
                  max={100}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-24 accent-white cursor-pointer"
                />
                <span className="w-8 text-right tabular-nums">{opacity}%</span>
              </div>
            </div>
          </div>

          {/* Interactive Imagery + Pixel-Aligned Canvas Mask */}
          <div
            className="relative w-full aspect-video bg-[#E5E7EB] cursor-crosshair select-none overflow-hidden"
            onMouseMove={handleMouseMove}
          >
            {imgError ? (
              <div className="w-full h-full flex items-center justify-center text-xs font-mono font-bold text-black">
                SATELLITE TILE PREVIEW UNAVAILABLE.
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
              className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-none"
              style={{ opacity: showOverlay ? opacity / 100 : 0 }}
            />
            <div className="absolute bottom-4 left-4 bg-white border-2 border-black px-3 py-1.5 text-[11px] font-mono font-bold text-black shadow-[3px_3px_0px_#000]">
              PROBE: {hoveredClass}
            </div>
          </div>

          {/* Classification Legend */}
          <div className="px-6 py-4 border-t-2 border-black bg-white flex flex-wrap items-center gap-x-6 gap-y-2">
            {Object.entries(CLASS_PALETTE).map(([id, item]) => (
              <div key={id} className="flex items-center gap-2 text-xs font-black uppercase text-black">
                <span
                  className="w-3.5 h-3.5 border border-black shrink-0"
                  style={{ backgroundColor: item.hex }}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Area-Wise Statistics */}
        <div className="xl:col-span-4 border-2 border-black bg-white p-6 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div className="border-b-2 border-black pb-3">
              <div className="text-[10px] font-mono font-bold uppercase text-[#4B5563]">
                {seg?.modelArchitecture ?? 'EnvironmentalUNet'}
              </div>
              <h2 className="mt-1 text-xs font-black uppercase tracking-widest text-black">
                AREA DISTRIBUTION ({seg?.totalAreaKm2 ?? 0} KM²)
              </h2>
            </div>

            <div className="space-y-3.5">
              {(seg?.classes ?? []).map((cls) => (
                <div key={cls.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold uppercase">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 border border-black shrink-0"
                        style={{ backgroundColor: cls.color }}
                        aria-hidden="true"
                      />
                      {cls.label}
                    </span>
                    <span className="font-mono tabular-nums">
                      {cls.areaKm2} KM² ({cls.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#E5E7EB] border border-black overflow-hidden">
                    <div
                      className="h-full bg-black"
                      style={{ width: `${Math.min(100, cls.percentage * 1.4)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t-2 border-black text-[11px] font-mono font-bold text-black space-y-1.5">
            <div className="flex justify-between">
              <span>INFERENCE MODE</span>
              <span className="text-[#FF0000]">DEMO FALLBACK</span>
            </div>
            <div className="flex justify-between">
              <span>SPATIAL RESOLUTION</span>
              <span className="tabular-nums">{seg?.spatialResolutionM ?? 10}M</span>
            </div>
            <div className="flex justify-between">
              <span>DEMO REFERENCE MIOU</span>
              <span className="tabular-nums">{seg?.estimatedIoUDemo ?? 0.79}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Year Change & Transition Matrix */}
      {seg && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 border-2 border-black bg-white p-6">
            <div className="border-b-2 border-black pb-3 mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-black">
                5-YEAR NET CLASS SHIFT (% OF MUNICIPAL AREA)
              </h2>
              <p className="text-[10px] font-mono text-[#4B5563] uppercase mt-0.5">
                POSITIVE VALUES = EXPANSION · NEGATIVE VALUES = CONTRACTION
              </p>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seg.classes} margin={{ top: 8, right: 12, left: -16, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#000000"
                    fontSize={10}
                    fontStyle="bold"
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    tickFormatter={(v: string) => v.split(' ')[0]}
                  />
                  <YAxis stroke="#000000" fontSize={10} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#000000',
                      borderWidth: '2px',
                      borderRadius: '0px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                  />
                  <Bar dataKey="fiveYearChangePct" name="5-Year Shift (%)">
                    {seg.classes.map((c) => (
                      <Cell
                        key={c.id}
                        fill={c.fiveYearChangePct >= 0 ? '#000000' : '#FF0000'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-6 border-2 border-black bg-white overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-black bg-black text-white">
              <h2 className="text-xs font-black uppercase tracking-widest text-white">
                LAND COVER TRANSITION ANALYSIS
              </h2>
            </div>
            <div className="divide-y-2 divide-black">
              {seg.transitions.map((t, idx) => (
                <div
                  key={idx}
                  className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-black hover:text-white transition-none group"
                >
                  <div>
                    <div className="text-xs font-black uppercase tracking-tight">
                      {t.fromClass} → {t.toClass}
                    </div>
                    <div className="text-[11px] text-[#4B5563] group-hover:text-[#D1D5DB] mt-0.5">
                      {t.driver}
                    </div>
                  </div>
                  <span className="font-mono text-xs font-black text-[#FF0000] group-hover:text-[#FF0000] tabular-nums shrink-0">
                    {t.areaKm2} KM²
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
