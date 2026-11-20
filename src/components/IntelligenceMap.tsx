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
    if (ward.lstCelsius >= 43) return '#FF0000';
    if (ward.lstCelsius >= 40) return '#000000';
    if (ward.lstCelsius >= 37) return '#4B5563';
    return '#E5E7EB';
  }
  if (layer === 'ndvi') {
    if (ward.ndvi >= 0.45) return '#000000';
    if (ward.ndvi >= 0.3) return '#4B5563';
    if (ward.ndvi >= 0.2) return '#9CA3AF';
    return '#FF0000';
  }
  if (layer === 'air_quality') {
    if (ward.no2UmolM2 >= 155) return '#FF0000';
    if (ward.no2UmolM2 >= 120) return '#000000';
    if (ward.no2UmolM2 >= 90) return '#4B5563';
    return '#E5E7EB';
  }
  if (layer === 'land_cover') {
    switch (ward.dominantLandCover) {
      case 'dense_vegetation':
        return '#000000';
      case 'sparse_vegetation':
        return '#4B5563';
      case 'water_bodies':
        return '#9CA3AF';
      case 'bare_soil':
        return '#D1D5DB';
      case 'agricultural':
        return '#6B7280';
      default:
        return '#FF0000';
    }
  }
  if (layer === 'risk_zones') {
    if (ward.riskScore >= 82) return '#FF0000';
    if (ward.riskScore >= 68) return '#000000';
    if (ward.riskScore >= 45) return '#4B5563';
    return '#E5E7EB';
  }
  return '#000000';
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
          color: a.severity === 'critical' ? '#FF0000' : '#000000',
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
            attribution: 'Esri World Imagery · PRATYAKSHA Telemetry',
          },
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: 'CARTO · OpenStreetMap',
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#FFFFFF' },
          },
          {
            id: 'base-satellite',
            type: 'raster',
            source: 'esri-satellite',
            paint: {
              'raster-opacity': 0.75,
              'raster-saturation': -0.3,
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
          'line-color': '#000000',
          'line-width': 2.5,
          'line-dasharray': [4, 3],
          'line-opacity': 0.9,
        },
      });

      map.addSource('ward-polygons', {
        type: 'geojson',
        data: wardGeoJson,
      });

      map.addLayer({
        id: 'ward-fills',
        type: 'fill',
        source: 'ward-polygons',
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': activeLayer === 'boundaries' ? 0.05 : 0.45,
        },
      });

      map.addLayer({
        id: 'ward-borders',
        type: 'line',
        source: 'ward-polygons',
        paint: {
          'line-color': '#000000',
          'line-width': 1.5,
          'line-opacity': 0.7,
        },
      });

      map.addSource('hotspot-points', {
        type: 'geojson',
        data: hotspotGeoJson,
      });

      map.addLayer({
        id: 'hotspot-circles',
        type: 'circle',
        source: 'hotspot-points',
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      map.on('mousemove', (e) => {
        setCursorCoords([e.lngLat.lng, e.lngLat.lat]);
      });

      map.on('click', 'ward-fills', (e) => {
        if (!e.features || e.features.length === 0) return;
        const clickedId = e.features[0].properties?.id;
        const matched = municipality.wards.find((w) => w.id === clickedId);
        if (matched) setSelectedWard(matched);
      });

      map.on('mouseenter', 'ward-fills', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'ward-fills', () => {
        map.getCanvas().style.cursor = '';
      });

      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipality.id]);

  // Sync active layer changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    if (map.getSource('ward-polygons')) {
      (map.getSource('ward-polygons') as maplibregl.GeoJSONSource).setData(wardGeoJson);
    }
    if (map.getLayer('ward-fills')) {
      map.setPaintProperty(
        'ward-fills',
        'fill-opacity',
        activeLayer === 'boundaries' ? 0.05 : 0.45
      );
    }
  }, [activeLayer, wardGeoJson, mapReady]);

  // Sync basemap
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    if (map.getLayer('base-satellite') && map.getLayer('base-dark')) {
      if (baseStyle === 'satellite') {
        map.setLayoutProperty('base-satellite', 'visibility', 'visible');
        map.setLayoutProperty('base-dark', 'visibility', 'none');
      } else {
        map.setLayoutProperty('base-satellite', 'visibility', 'none');
        map.setLayoutProperty('base-dark', 'visibility', 'visible');
      }
    }
  }, [baseStyle, mapReady]);

  // Sync focus coordinates
  useEffect(() => {
    if (!mapReady || !mapRef.current || !focusedCoordinates) return;
    mapRef.current.flyTo({
      center: focusedCoordinates,
      zoom: 13,
      duration: 500,
    });
  }, [focusedCoordinates, mapReady]);

  const handleZoom = (delta: number) => {
    if (!mapRef.current) return;
    mapRef.current.zoomTo(mapRef.current.getZoom() + delta, { duration: 250 });
  };

  const handleRecenter = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({ center: municipality.center, zoom: municipality.zoom, duration: 400 });
  };

  const legendItems = useMemo(() => {
    switch (activeLayer) {
      case 'heat_island':
        return [
          { color: '#FF0000', label: '≥ 43°C Severe UHI' },
          { color: '#000000', label: '40–43°C High' },
          { color: '#4B5563', label: '37–40°C Elevated' },
          { color: '#E5E7EB', label: '< 37°C Nominal' },
        ];
      case 'ndvi':
        return [
          { color: '#000000', label: '≥ 0.45 Dense Canopy' },
          { color: '#4B5563', label: '0.30–0.44 Moderate' },
          { color: '#9CA3AF', label: '0.20–0.29 Stressed' },
          { color: '#FF0000', label: '< 0.20 Degraded' },
        ];
      case 'air_quality':
        return [
          { color: '#FF0000', label: '≥ 155 µmol/m² Critical' },
          { color: '#000000', label: '120–154 High' },
          { color: '#4B5563', label: '90–119 Moderate' },
          { color: '#E5E7EB', label: '< 90 Nominal' },
        ];
      case 'land_cover':
        return [
          { color: '#FF0000', label: 'Built-Up Area' },
          { color: '#000000', label: 'Dense Canopy' },
          { color: '#9CA3AF', label: 'Water Body' },
          { color: '#D1D5DB', label: 'Bare Soil' },
        ];
      default:
        return [
          { color: '#FF0000', label: 'Critical Risk (≥ 82)' },
          { color: '#000000', label: 'High Risk (68–81)' },
          { color: '#4B5563', label: 'Moderate (45–67)' },
          { color: '#E5E7EB', label: 'Nominal (< 45)' },
        ];
    }
  }, [activeLayer]);

  return (
    <div className="rounded-2xl overflow-hidden bg-white flex flex-col">
      {/* Map Toolbar */}
      <div className="px-5 py-3 border-b border-black/[0.06] flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <Layers className="w-4 h-4 text-[var(--blue)] shrink-0" aria-hidden="true" />
          <span className="text-xs font-bold tracking-tight text-[var(--ink)] whitespace-nowrap">
            INTELLIGENCE MAP — {municipality.name}
          </span>
          <span className="hidden xl:inline text-[11px] font-mono text-[var(--text-muted)] whitespace-nowrap">
            · {municipality.crsUtm} → EPSG:4326
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Map Layer Selection">
          {LAYER_META.map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => setActiveLayer(layer.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
                activeLayer === layer.id
                  ? 'bg-[var(--ink)] text-white shadow-xs'
                  : 'bg-[var(--canvas)] text-[var(--text-muted)] hover:text-[var(--ink)] hover:bg-[#E5E5EA]'
              }`}
            >
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map Viewport + Ward Telemetry Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 min-h-[480px]">
        <div className="xl:col-span-8 relative min-h-[420px] xl:min-h-[520px] bg-[#E5E7EB]">
          <div ref={containerRef} className="w-full h-full min-h-[420px] xl:min-h-[520px]" />

          {/* Top-left Base Map Toggle */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-md border border-black/[0.08] p-1 rounded-full shadow-[0_4px_16px_rgb(0_0_0/0.08)]">
            <button
              type="button"
              onClick={() => setBaseStyle('satellite')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                baseStyle === 'satellite' ? 'bg-[var(--ink)] text-white shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Satellite className="w-3 h-3" aria-hidden="true" />
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setBaseStyle('dark')}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                baseStyle === 'dark' ? 'bg-[var(--ink)] text-white shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--ink)]'
              }`}
            >
              Dark
            </button>
          </div>

          {/* Top-right Zoom & Recenter Controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 bg-white/90 backdrop-blur-md border border-black/[0.08] p-1 rounded-2xl shadow-[0_4px_16px_rgb(0_0_0/0.08)]">
            <button
              type="button"
              onClick={() => handleZoom(0.9)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--ink)] hover:bg-black/[0.05] transition-colors"
              aria-label="Zoom in"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-0.9)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--ink)] hover:bg-black/[0.05] transition-colors"
              aria-label="Zoom out"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRecenter}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--ink)] hover:bg-black/[0.05] transition-colors border-t border-black/[0.06]"
              aria-label="Recenter on municipality"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom-left Dynamic Legend */}
          <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-md border border-black/[0.08] p-3 rounded-2xl shadow-[0_4px_16px_rgb(0_0_0/0.08)] max-w-xs">
            <div className="text-[11px] font-bold text-[var(--ink)] mb-2 border-b border-black/[0.06] pb-1">
              {LAYER_META.find((l) => l.id === activeLayer)?.label} Legend
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {legendItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-[10px] font-medium text-[var(--ink)]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom-right Coordinate Readout */}
          <div className="absolute bottom-4 right-4 z-10 bg-white/90 backdrop-blur-md border border-black/[0.08] px-3 py-1 rounded-full text-[11px] font-mono font-medium text-[var(--ink)] tabular-nums shadow-[0_4px_16px_rgb(0_0_0/0.08)]">
            {cursorCoords[1].toFixed(4)}° N, {cursorCoords[0].toFixed(4)}° E
          </div>
        </div>

        {/* Ward Inspector Side Panel */}
        <div className="xl:col-span-4 border-t xl:border-t-0 xl:border-l border-black/[0.06] bg-white p-6 flex flex-col justify-between gap-6">
          {selectedWard ? (
            <>
              <div className="space-y-5">
                <div className="border-b border-black/[0.06] pb-4">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-[var(--text-muted)] font-medium uppercase">Zone Telemetry</span>
                    <span
                      className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${
                        selectedWard.severity === 'critical'
                          ? 'border-rose-200 bg-rose-50 text-[var(--critical)]'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {selectedWard.severity} · Risk {selectedWard.riskScore}/100
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold tracking-tight text-[var(--ink)]">
                    {selectedWard.name}
                  </h3>
                  <div className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
                    {selectedWard.center[1].toFixed(4)}°N, {selectedWard.center[0].toFixed(4)}°E ·{' '}
                    {selectedWard.areaKm2} km² · Pop {(selectedWard.population / 1000).toFixed(0)}k
                  </div>
                </div>

                {/* Ward Metrics 2x2 Bento Tiles */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] transition-all hover:scale-[1.02] group">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      LST TEMP
                    </div>
                    <div className="mt-1 text-xl font-bold text-[var(--ink)] tabular-nums">
                      {selectedWard.lstCelsius.toFixed(1)} °C
                    </div>
                    <div className="text-[10px] text-[var(--critical)] font-semibold tabular-nums mt-0.5">
                      {selectedWard.lstCelsius - selectedWard.lstBaseline >= 0 ? '+' : ''}
                      {(selectedWard.lstCelsius - selectedWard.lstBaseline).toFixed(1)} °C vs base
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] transition-all hover:scale-[1.02] group">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      CANOPY NDVI
                    </div>
                    <div className="mt-1 text-xl font-bold text-[var(--ink)] tabular-nums">
                      {selectedWard.ndvi.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] tabular-nums mt-0.5">
                      Base {selectedWard.ndviBaseline.toFixed(2)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] transition-all hover:scale-[1.02] group">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      NO₂ TROPO
                    </div>
                    <div className="mt-1 text-xl font-bold text-[var(--ink)] tabular-nums">
                      {selectedWard.no2UmolM2.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] tabular-nums mt-0.5">
                      AQI {selectedWard.aqi}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] transition-all hover:scale-[1.02] group">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      WATER EXTENT
                    </div>
                    <div className="mt-1 text-xl font-bold text-[var(--ink)] tabular-nums">
                      {selectedWard.waterExtentKm2.toFixed(2)} km²
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] tabular-nums mt-0.5">
                      Base {selectedWard.waterBaselineKm2.toFixed(2)} km²
                    </div>
                  </div>
                </div>

                {/* Quick Ward Switcher */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink)] mb-2">
                    SELECT MUNICIPAL SECTOR
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {municipality.wards.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setSelectedWard(w);
                          mapRef.current?.flyTo({ center: w.center, zoom: 12.2, duration: 400 });
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-xs font-semibold rounded-xl transition-all ${
                          selectedWard.id === w.id
                            ? 'bg-[var(--ink)] text-white shadow-xs'
                            : 'bg-[var(--canvas)] text-[var(--ink)] hover:bg-[#E5E5EA]'
                        }`}
                      >
                        <span className="truncate">{w.name}</span>
                        <span className="font-mono text-[11px] tabular-nums ml-2 shrink-0 opacity-80">
                          {w.riskScore}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-black/[0.06] flex flex-wrap gap-2">
                {onInspectAnomaly && (
                  <button
                    type="button"
                    onClick={() => onInspectAnomaly(selectedWard.id)}
                    className="button-sm flex-1 text-xs rounded-full"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    Inspect Anomaly
                  </button>
                )}
                {onOpenActionPlan && (
                  <button
                    type="button"
                    onClick={onOpenActionPlan}
                    className="button-signal text-xs rounded-full"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    Action Plan
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-[var(--text-muted)] font-mono">
              SELECT A MUNICIPAL WARD ON THE MAP TO INSPECT TELEMETRY.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
