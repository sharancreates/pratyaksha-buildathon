import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import {
  Crosshair,
  Layers,
  Minus,
  Plus,
  Satellite,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import type {
  DetectedAnomaly,
  MapLayerId,
  MunicipalityProfile,
  WardFeature,
} from '../shared/types';

interface IntelligenceMapProps {
  municipality: MunicipalityProfile;
  anomalies: DetectedAnomaly[];
  focusedCoordinates?: [number, number] | null;
  onInspectAnomaly?: (wardId: string) => void;
  onOpenActionPlan?: () => void;
}

const LAYER_META: { id: MapLayerId; label: string; description: string }[] = [
  { id: 'heat_island', label: 'Heat Island (LST)', description: 'Land Surface Temp thermal intensity' },
  { id: 'ndvi', label: 'Vegetation (NDVI)', description: 'Canopy vigor & degradation index' },
  { id: 'air_quality', label: 'Air Quality / NO₂', description: 'Tropospheric NO₂ & AQI plumes' },
  { id: 'risk_zones', label: 'Environmental Risk', description: 'Multi-model ML consensus risk' },
  { id: 'land_cover', label: 'Land Cover (LULC)', description: 'Dominant EnvironmentalUNet class' },
  { id: 'boundaries', label: 'Ward Boundaries', description: 'Municipal administrative polygons' },
];

function getWardColor(ward: WardFeature, layer: MapLayerId): string {
  if (layer === 'heat_island') {
    if (ward.lstCelsius >= 43) return '#EF4444';
    if (ward.lstCelsius >= 40) return '#F97316';
    if (ward.lstCelsius >= 37) return '#F59E0B';
    return '#22D3EE';
  }
  if (layer === 'ndvi') {
    if (ward.ndvi >= 0.45) return '#16A34A';
    if (ward.ndvi >= 0.3) return '#84CC16';
    if (ward.ndvi >= 0.2) return '#F59E0B';
    return '#EF4444';
  }
  if (layer === 'air_quality') {
    if (ward.no2UmolM2 >= 155) return '#EF4444';
    if (ward.no2UmolM2 >= 120) return '#F59E0B';
    if (ward.no2UmolM2 >= 90) return '#22D3EE';
    return '#22C55E';
  }
  if (layer === 'land_cover') {
    switch (ward.dominantLandCover) {
      case 'dense_vegetation':
        return '#16A34A';
      case 'sparse_vegetation':
        return '#84CC16';
      case 'water_bodies':
        return '#0EA5E9';
      case 'bare_soil':
        return '#F59E0B';
      case 'agricultural':
        return '#A16207';
      default:
        return '#EF4444';
    }
  }
  if (layer === 'risk_zones') {
    if (ward.riskScore >= 82) return '#EF4444';
    if (ward.riskScore >= 68) return '#F59E0B';
    if (ward.riskScore >= 45) return '#22D3EE';
    return '#22C55E';
  }
  return '#22D3EE';
}

export function IntelligenceMap({
  municipality,
  anomalies,
  focusedCoordinates,
  onInspectAnomaly,
  onOpenActionPlan,
}: IntelligenceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapLayerId>('heat_island');
  const [baseStyle, setBaseStyle] = useState<'satellite' | 'dark'>('satellite');
  const [selectedWard, setSelectedWard] = useState<WardFeature | null>(
    municipality.wards[0] ?? null
  );
  const [cursorCoords, setCursorCoords] = useState<[number, number]>(municipality.center);

  useEffect(() => {
    setSelectedWard(municipality.wards[0] ?? null);
    setCursorCoords(municipality.center);
  }, [municipality]);

  const wardGeoJson = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: municipality.wards.map((w) => ({
        type: 'Feature' as const,
        id: w.id,
        properties: {
          id: w.id,
          name: w.name,
          fillColor: getWardColor(w, activeLayer),
          lstCelsius: w.lstCelsius,
          ndvi: w.ndvi,
          no2UmolM2: w.no2UmolM2,
          aqi: w.aqi,
          riskScore: w.riskScore,
          severity: w.severity,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [w.polygon],
        },
      })),
    };
  }, [municipality, activeLayer]);

  const boundaryGeoJson = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: { name: municipality.name },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [municipality.boundary],
          },
        },
      ],
    };
  }, [municipality]);

  const hotspotGeoJson = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: anomalies.map((a) => ({
        type: 'Feature' as const,
        properties: {
          id: a.id,
          wardId: a.wardId,
          wardName: a.wardName,
          indicator: a.indicator,
          severity: a.severity,
          consensusRiskScore: a.consensusRiskScore,
          color:
            a.severity === 'critical'
              ? '#EF4444'
              : a.severity === 'high'
              ? '#F59E0B'
              : '#22D3EE',
        },
        geometry: {
          type: 'Point' as const,
          coordinates: a.coordinates,
        },
      })),
    };
  }, [anomalies]);

  // Initialize MapLibre instance
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: 'Esri World Imagery · PRATYAKSHA Demo Telemetry',
          },
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: 'CARTO Dark Matter · OpenStreetMap',
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#080D18' },
          },
          {
            id: 'base-satellite',
            type: 'raster',
            source: 'esri-satellite',
            paint: {
              'raster-opacity': 0.72,
              'raster-brightness-max': 0.82,
              'raster-saturation': -0.15,
            },
          },
          {
            id: 'base-dark',
            type: 'raster',
            source: 'carto-dark',
            layout: { visibility: 'none' },
            paint: { 'raster-opacity': 0.95 },
          },
        ],
      },
      center: municipality.center,
      zoom: municipality.zoom,
      attributionControl: false,
    });

    map.on('load', () => {
      map.addSource('municipal-boundary', {
        type: 'geojson',
        data: boundaryGeoJson,
      });

      map.addLayer({
        id: 'municipal-boundary-line',
        type: 'line',
        source: 'municipal-boundary',
        paint: {
          'line-color': '#22D3EE',
          'line-width': 1.8,
          'line-dasharray': [4, 3],
          'line-opacity': 0.8,
        },
      });

      map.addSource('wards-source', {
        type: 'geojson',
        data: wardGeoJson,
      });

      map.addLayer({
        id: 'wards-fill',
        type: 'fill',
        source: 'wards-source',
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': 0.36,
        },
      });

      map.addLayer({
        id: 'wards-outline',
        type: 'line',
        source: 'wards-source',
        paint: {
          'line-color': ['get', 'fillColor'],
          'line-width': 1.6,
          'line-opacity': 0.9,
        },
      });

      map.addSource('hotspots-source', {
        type: 'geojson',
        data: hotspotGeoJson,
      });

      map.addLayer({
        id: 'hotspots-halo',
        type: 'circle',
        source: 'hotspots-source',
        paint: {
          'circle-radius': 15,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.22,
        },
      });

      map.addLayer({
        id: 'hotspots-core',
        type: 'circle',
        source: 'hotspots-source',
        paint: {
          'circle-radius': 6,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#080D18',
        },
      });

      map.on('mousemove', (e: maplibregl.MapMouseEvent) => {
        setCursorCoords([
          Number(e.lngLat.lng.toFixed(4)),
          Number(e.lngLat.lat.toFixed(4)),
        ]);
      });

      map.on('mouseenter', 'wards-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'wards-fill', () => {
        map.getCanvas().style.cursor = 'crosshair';
      });

      map.on('click', 'wards-fill', (e: maplibregl.MapLayerMouseEvent) => {
        const feat = e.features?.[0];
        const wid = feat?.properties?.id;
        if (wid) {
          const found = municipality.wards.find((w) => w.id === wid);
          if (found) setSelectedWard(found);
        }
      });

      map.on('click', 'hotspots-core', (e: maplibregl.MapLayerMouseEvent) => {
        const feat = e.features?.[0];
        const wid = feat?.properties?.wardId;
        if (wid) {
          const found = municipality.wards.find((w) => w.id === wid);
          if (found) setSelectedWard(found);
        }
      });

      setMapReady(true);
    });

    mapRef.current = map;
    return () => {
      setMapReady(false);
      map.remove();
      mapRef.current = null;
    };
    // Re-create cleanly only when municipality ID changes so ward click closure stays synced
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipality.id]);

  // Update GeoJSON layers when active layer or anomalies change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const wardSrc = map.getSource('wards-source') as maplibregl.GeoJSONSource | undefined;
    wardSrc?.setData(wardGeoJson);

    const hotspotSrc = map.getSource('hotspots-source') as maplibregl.GeoJSONSource | undefined;
    hotspotSrc?.setData(hotspotGeoJson);

    const fillOpacity = activeLayer === 'boundaries' ? 0.08 : 0.38;
    if (map.getLayer('wards-fill')) {
      map.setPaintProperty('wards-fill', 'fill-opacity', fillOpacity);
    }
  }, [wardGeoJson, hotspotGeoJson, activeLayer, mapReady]);

  // Switch satellite / dark base imagery
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (map.getLayer('base-satellite') && map.getLayer('base-dark')) {
      map.setLayoutProperty(
        'base-satellite',
        'visibility',
        baseStyle === 'satellite' ? 'visible' : 'none'
      );
      map.setLayoutProperty(
        'base-dark',
        'visibility',
        baseStyle === 'dark' ? 'visible' : 'none'
      );
    }
  }, [baseStyle, mapReady]);

  // Fly to focused coordinates when triggered externally
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !focusedCoordinates) return;
    map.flyTo({ center: focusedCoordinates, zoom: 12.6, duration: 750 });
  }, [focusedCoordinates, mapReady]);

  const handleZoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.zoomTo(map.getZoom() + delta, { duration: 220 });
  };

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: municipality.center, zoom: municipality.zoom, duration: 500 });
  };

  const legendItems = useMemo(() => {
    switch (activeLayer) {
      case 'heat_island':
        return [
          { color: '#EF4444', label: '≥ 43°C Severe UHI' },
          { color: '#F97316', label: '40–43°C High Thermal' },
          { color: '#F59E0B', label: '37–40°C Elevated' },
          { color: '#22D3EE', label: '< 37°C Cool Corridor' },
        ];
      case 'ndvi':
        return [
          { color: '#16A34A', label: '≥ 0.45 Healthy Canopy' },
          { color: '#84CC16', label: '0.30–0.44 Moderate' },
          { color: '#F59E0B', label: '0.20–0.29 Stressed' },
          { color: '#EF4444', label: '< 0.20 Sparse / Bare' },
        ];
      case 'air_quality':
        return [
          { color: '#EF4444', label: '≥ 155 µmol/m² Severe NO₂' },
          { color: '#F59E0B', label: '120–154 High' },
          { color: '#22D3EE', label: '90–119 Moderate' },
          { color: '#22C55E', label: '< 90 Nominal' },
        ];
      case 'land_cover':
        return [
          { color: '#EF4444', label: 'Built-Up' },
          { color: '#16A34A', label: 'Dense Canopy' },
          { color: '#0EA5E9', label: 'Water Bodies' },
          { color: '#F59E0B', label: 'Bare Soil' },
        ];
      default:
        return [
          { color: '#EF4444', label: 'Critical Risk (≥ 82)' },
          { color: '#F59E0B', label: 'High Risk (68–81)' },
          { color: '#22D3EE', label: 'Moderate (45–67)' },
          { color: '#22C55E', label: 'Nominal (< 45)' },
        ];
    }
  }, [activeLayer]);

  return (
    <div className="bg-[#111D2E] border border-slate-800/90 rounded-lg overflow-hidden flex flex-col">
      {/* Map Toolbar */}
      <div className="px-4 py-3 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3 bg-[#0D1524]">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-100 whitespace-nowrap">
            Geospatial Intelligence Map — {municipality.name}
          </span>
          <span className="hidden xl:inline text-xs font-mono text-slate-500 whitespace-nowrap">
            · {municipality.crsUtm} → EPSG:4326
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {LAYER_META.map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => setActiveLayer(layer.id)}
              className={`px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                activeLayer === layer.id
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50'
                  : 'bg-[#111D2E] text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map Viewport + Right Ward Telemetry Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 min-h-[480px]">
        <div className="xl:col-span-8 relative min-h-[420px] xl:min-h-[500px] bg-[#080D18]">
          <div ref={containerRef} className="w-full h-full min-h-[420px] xl:min-h-[500px]" />

          {/* Top-left Base Map Toggle */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-[#0D1524]/90 backdrop-blur-sm border border-slate-700/80 rounded-md p-1">
            <button
              type="button"
              onClick={() => setBaseStyle('satellite')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                baseStyle === 'satellite'
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Satellite className="w-3 h-3" />
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setBaseStyle('dark')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                baseStyle === 'dark'
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dark Vector
            </button>
          </div>

          {/* Top-right Zoom & Recenter Controls */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-[#0D1524]/90 backdrop-blur-sm border border-slate-700/80 rounded-md p-1">
            <button
              type="button"
              onClick={() => handleZoom(0.9)}
              className="w-8 h-8 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-cyan-300"
              aria-label="Zoom in"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-0.9)}
              className="w-8 h-8 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-cyan-300"
              aria-label="Zoom out"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRecenter}
              className="w-8 h-8 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-cyan-300 border-t border-slate-800"
              aria-label="Recenter on municipality"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom-left Dynamic Legend */}
          <div className="absolute bottom-3 left-3 z-10 bg-[#0D1524]/92 backdrop-blur-sm border border-slate-700/80 rounded-md px-3 py-2.5 max-w-xs">
            <div className="text-[11px] font-semibold text-slate-200 mb-1.5">
              {LAYER_META.find((l) => l.id === activeLayer)?.label} Legend
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {legendItems.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom-right Coordinate Readout */}
          <div className="absolute bottom-3 right-3 z-10 bg-[#0D1524]/90 border border-slate-700/80 rounded px-2.5 py-1 text-[11px] font-mono text-slate-300 tabular-nums">
            {cursorCoords[1].toFixed(4)}° N, {cursorCoords[0].toFixed(4)}° E
          </div>
        </div>

        {/* Ward Inspector Side Panel */}
        <div className="xl:col-span-4 border-t xl:border-t-0 xl:border-l border-slate-800/90 bg-[#0D1524] p-4 flex flex-col justify-between gap-4">
          {selectedWard ? (
            <>
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="text-slate-400">Selected Municipal Zone</span>
                    <span
                      className={
                        selectedWard.severity === 'critical'
                          ? 'text-red-400 font-semibold'
                          : selectedWard.severity === 'high'
                          ? 'text-amber-400 font-semibold'
                          : selectedWard.severity === 'moderate'
                          ? 'text-cyan-400 font-semibold'
                          : 'text-emerald-400 font-semibold'
                      }
                    >
                      {selectedWard.severity.toUpperCase()} · RISK {selectedWard.riskScore}/100
                    </span>
                  </div>
                  <h3 className="mt-1 text-base font-semibold text-slate-100">
                    {selectedWard.name}
                  </h3>
                  <div className="mt-1 text-xs font-mono text-slate-400 tabular-nums">
                    {selectedWard.center[1].toFixed(4)}°N, {selectedWard.center[0].toFixed(4)}°E ·{' '}
                    {selectedWard.areaKm2} km² · Pop {(selectedWard.population / 1000).toFixed(0)}k
                  </div>
                </div>

                {/* Ward Metrics Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#111D2E] border border-slate-800 rounded-md p-3">
                    <div className="text-[11px] text-slate-400">Land Surface Temp</div>
                    <div className="mt-1 text-lg font-mono font-bold text-slate-100 tabular-nums">
                      {selectedWard.lstCelsius.toFixed(1)} °C
                    </div>
                    <div className="text-[11px] font-mono text-amber-400 tabular-nums">
                      {selectedWard.lstCelsius - selectedWard.lstBaseline >= 0 ? '+' : ''}
                      {(selectedWard.lstCelsius - selectedWard.lstBaseline).toFixed(1)} °C vs base
                    </div>
                  </div>
                  <div className="bg-[#111D2E] border border-slate-800 rounded-md p-3">
                    <div className="text-[11px] text-slate-400">Vegetation NDVI</div>
                    <div className="mt-1 text-lg font-mono font-bold text-slate-100 tabular-nums">
                      {selectedWard.ndvi.toFixed(2)}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                      Baseline {selectedWard.ndviBaseline.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-[#111D2E] border border-slate-800 rounded-md p-3">
                    <div className="text-[11px] text-slate-400">Tropospheric NO₂</div>
                    <div className="mt-1 text-lg font-mono font-bold text-slate-100 tabular-nums">
                      {selectedWard.no2UmolM2.toFixed(1)}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                      µmol/m² · AQI {selectedWard.aqi}
                    </div>
                  </div>
                  <div className="bg-[#111D2E] border border-slate-800 rounded-md p-3">
                    <div className="text-[11px] text-slate-400">Water Extent</div>
                    <div className="mt-1 text-lg font-mono font-bold text-slate-100 tabular-nums">
                      {selectedWard.waterExtentKm2.toFixed(2)} km²
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                      Baseline {selectedWard.waterBaselineKm2.toFixed(2)} km²
                    </div>
                  </div>
                </div>

                {/* Quick Ward Switcher */}
                <div>
                  <div className="text-[11px] font-medium text-slate-400 mb-2">
                    Click Zone on Map or Select Below
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {municipality.wards.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setSelectedWard(w);
                          mapRef.current?.flyTo({ center: w.center, zoom: 12.2, duration: 550 });
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left text-xs transition-colors ${
                          selectedWard.id === w.id
                            ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/35'
                            : 'text-slate-300 hover:bg-[#111D2E] border border-transparent'
                        }`}
                      >
                        <span className="truncate">{w.name}</span>
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums ml-2 shrink-0">
                          {w.riskScore}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2">
                {onInspectAnomaly && (
                  <button
                    type="button"
                    onClick={() => onInspectAnomaly(selectedWard.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-xs font-medium text-cyan-200 hover:bg-cyan-500/25 transition-colors whitespace-nowrap"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Inspect ML Anomaly
                  </button>
                )}
                {onOpenActionPlan && (
                  <button
                    type="button"
                    onClick={onOpenActionPlan}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#111D2E] border border-slate-700 text-xs font-medium text-slate-200 hover:border-slate-500 transition-colors whitespace-nowrap"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Action Plan
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400">Select a municipal ward on the map to inspect telemetry.</div>
          )}
        </div>
      </div>
    </div>
  );
}
