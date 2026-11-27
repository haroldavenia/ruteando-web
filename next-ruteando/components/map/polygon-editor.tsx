'use client';

import { RiPencilLine } from '@remixicon/react';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useColorScheme } from '@/lib/color-scheme';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { useLatest } from '@/lib/hooks/use-latest';
import { useLang, useT } from '@/lib/i18n/client';
import type { LatLng } from '@/lib/map/lat-lng';
import { type MapPalette, readMapPalette, toRgba } from '@/lib/map/map-palette';
import type { OpenLayers } from '@/lib/map/openlayers';
import { areaKm2, polygonIssueMessage, validatePolygon, verticesFromRing } from '@/lib/map/polygon-geometry';

import { MapFrame } from './map-frame';
import { useOlMap } from './use-ol-map';
import { VertexTable } from './vertex-table';

type Source = InstanceType<OpenLayers['VectorSource']>;
type Layer = InstanceType<OpenLayers['VectorLayer']>;
type Draw = InstanceType<OpenLayers['Draw']>;
type Modify = InstanceType<OpenLayers['Modify']>;

const FIT_PADDING = [48, 48, 48, 48];

/**
 * Editor de un polígono: dibujarlo en el mapa, arrastrar sus vértices y, en paralelo, una tabla de vértices con las mismas posibilidades
 * (la vía para quien no puede usar el ratón). `vertices` es la única fuente de verdad (sin repetir el primero al final).
 */
export function PolygonEditor({
  vertices,
  onChange,
  color,
}: {
  vertices: readonly LatLng[];
  onChange: (vertices: LatLng[]) => void;
  /** Color de la zona (`#RRGGBB`); sin color se usa el acento del tema. */
  color: string | null;
}) {
  const t = useT();
  const lang = useLang();
  const scheme = useColorScheme();
  const { ask, dialog } = useConfirm();
  const { hostRef, ctx, failed } = useOlMap();
  const [drawing, setDrawing] = useState(false);
  const source = useRef<Source | null>(null);
  const layer = useRef<Layer | null>(null);
  const draw = useRef<Draw | null>(null);
  const modify = useRef<Modify | null>(null);
  const palette = useRef<MapPalette | null>(null);
  /** Lo último que entregó el mapa: evita reconstruir la geometría mientras se arrastra un vértice. */
  const fromMap = useRef<readonly LatLng[] | null>(null);
  const fitted = useRef(false);

  const issues = useMemo(() => validatePolygon(vertices), [vertices]);
  const valid = vertices.length >= 3 && issues.every((i) => i.kind === 'unchecked');
  const summary = useMemo(() => {
    if (vertices.length === 0) return t('Todavía no hay polígono.');
    const blocking = issues.filter((i) => i.kind !== 'unchecked');
    if (blocking.length > 0) {
      return t('{0} vértices. {1}.', [vertices.length, blocking.map((i) => polygonIssueMessage(i, t)).join('. ')]);
    }
    const warning = issues.some((i) => i.kind === 'unchecked')
      ? ` ${polygonIssueMessage({ kind: 'unchecked' }, t)}.`
      : '';
    const area = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(areaKm2(vertices));
    return t('Polígono válido: {0} vértices, unos {1} km² (aproximado).{2}', [vertices.length, area, warning]);
  }, [vertices, issues, t, lang]);

  const emit = useLatest((next: LatLng[]) => onChange(next));
  const currentVertices = useEffectEvent(() => vertices);
  const style = useEffectEvent((ol: OpenLayers, type: string | undefined) => {
    const colors = palette.current!;
    const base = color ?? colors.accent;
    const problem = !valid && vertices.length >= 3;
    const stroke = problem ? colors.danger : base;
    if (type === 'Point') {
      return [
        new ol.Style({
          image: new ol.CircleStyle({
            radius: 7,
            fill: new ol.Fill({ color: stroke }),
            stroke: new ol.Stroke({ color: colors.halo, width: 2 }),
          }),
        }),
      ];
    }
    return [
      new ol.Style({ stroke: new ol.Stroke({ color: colors.halo, width: 7 }) }),
      new ol.Style({
        fill: new ol.Fill({ color: toRgba(stroke, 0.2) }),
        stroke: new ol.Stroke({ color: stroke, width: 4, lineDash: problem ? [10, 8] : undefined }),
      }),
    ];
  });

  /** Dibuja el polígono (o la línea o el punto mientras faltan vértices) y, la primera vez, encuadra la vista. */
  const showVertices = useLatest((points: readonly LatLng[]) => {
    if (!ctx || !source.current) return;
    const { ol, map } = ctx;
    source.current.clear();
    if (points.length === 0) return;
    const coords = points.map((v) => ol.fromLonLat([v.lng, v.lat]));
    const geometry =
      points.length >= 3
        ? new ol.Polygon([[...coords, coords[0]!]])
        : points.length === 2
          ? new ol.LineString(coords)
          : new ol.Point(coords[0]!);
    source.current.addFeature(new ol.Feature(geometry));
    if (!fitted.current) {
      fitted.current = true;
      const extent = geometry.getExtent();
      if (extent[0] === extent[2] && extent[1] === extent[3]) {
        map.getView().setCenter(coords[0]!);
        map.getView().setZoom(15);
      } else {
        map.getView().fit(extent, { padding: FIT_PADDING, maxZoom: 16 });
      }
    }
  });

  /** Lee los vértices de la geometría después de arrastrar uno y los entrega. */
  const readFromMap = useEffectEvent(() => {
    if (!ctx) return;
    const { ol } = ctx;
    const geometry = source.current?.getFeatures()[0]?.getGeometry();
    if (!geometry) return;
    const positions = (
      geometry instanceof ol.Polygon
        ? geometry.getCoordinates()[0]!
        : geometry instanceof ol.LineString
          ? geometry.getCoordinates()
          : geometry instanceof ol.Point
            ? [geometry.getCoordinates()]
            : []
    ).map((c) => ol.toLonLat(c));
    const next =
      geometry instanceof ol.Polygon ? verticesFromRing(positions) : verticesFromRing([...positions, positions[0]!]);
    fromMap.current = next;
    emit(next);
  });

  // La capa y la interacción de arrastre: una vez, cuando el mapa existe
  useEffect(() => {
    if (!ctx) return;
    const { ol, map } = ctx;
    palette.current = readMapPalette(scheme, document);
    const src = new ol.VectorSource();
    const vector = new ol.VectorLayer({ source: src, style: (feature) => style(ol, feature.getGeometry()?.getType()) });
    source.current = src;
    layer.current = vector;
    map.addLayer(vector);
    const edit = new ol.Modify({ source: src });
    edit.on('modifyend', () => readFromMap());
    map.addInteraction(edit);
    modify.current = edit;
    showVertices(currentVertices());
    return () => {
      map.removeLayer(vector);
      map.removeInteraction(edit);
      source.current = null;
      layer.current = null;
      modify.current = null;
    };
    // `scheme` se lee solo al crear la capa: el cambio de tema se atiende en el efecto de abajo
    // eslint-disable-next-line react-hooks/exhaustive-deps -- el mapa se crea una vez
  }, [ctx]);

  // Un cambio de vértices que no viene del mapa (la tabla) se vuelve a dibujar
  useEffect(() => {
    if (ctx && vertices !== fromMap.current) showVertices(vertices);
  }, [vertices, ctx, showVertices]);

  // Color, validez o tema: se renuevan los colores de las marcas y se vuelve a pintar
  useEffect(() => {
    palette.current = readMapPalette(scheme, document);
    layer.current?.changed();
  }, [color, valid, scheme, ctx]);

  function stopDrawing() {
    if (draw.current && ctx) {
      draw.current.abortDrawing();
      ctx.map.removeInteraction(draw.current);
      draw.current = null;
    }
    modify.current?.setActive(true);
    setDrawing(false);
  }
  const stop = useLatest(() => stopDrawing());

  function startDrawing() {
    if (!ctx || drawing) return;
    const { ol, map } = ctx;
    const tool = new ol.Draw({ type: 'Polygon', source: new ol.VectorSource() });
    tool.on('drawend', (event) => {
      const geometry = event.feature.getGeometry();
      const ring = (geometry instanceof ol.Polygon ? geometry.getCoordinates()[0]! : []).map((c) => ol.toLonLat(c));
      const next = verticesFromRing(ring);
      stop();
      if (next.length >= 3) {
        fromMap.current = next;
        emit(next);
        showVertices(next);
      }
    });
    draw.current = tool;
    map.addInteraction(tool);
    modify.current?.setActive(false);
    setDrawing(true);
  }

  // Escape cancela el dibujo
  useEffect(() => {
    if (!drawing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stop();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawing, stop]);

  async function clear() {
    const apply = () => {
      fromMap.current = [];
      emit([]);
      showVertices([]);
    };
    if (vertices.length <= 3) return apply();
    const ok = await ask({
      title: t('Borrar el polígono'),
      message: t('¿Quitar los {0} vértices del polígono?', [vertices.length]),
      confirmLabel: t('Borrar'),
      danger: true,
    });
    if (ok) apply();
  }

  return (
    <div className="flex flex-col gap-4 sm:col-span-2">
      <div role="group" aria-label={t('Herramientas del polígono')} className="flex flex-wrap items-center gap-2">
        {drawing ? (
          <>
            <Button variant="primary" onClick={() => draw.current?.finishDrawing()}>
              {t('Terminar polígono')}
            </Button>
            <Button variant="text" onClick={stopDrawing}>
              {t('Cancelar')}
            </Button>
            <span role="status" className="text-sm text-on-surface-variant">
              {t(
                'Haz clic en el mapa para añadir vértices; doble clic o «Terminar polígono» para cerrarlo. Escape cancela.'
              )}
            </span>
          </>
        ) : (
          <>
            <Button variant="outlined" disabled={!ctx} onClick={startDrawing}>
              <Icon icon={RiPencilLine} size={20} />
              {t('Dibujar polígono')}
            </Button>
            <Button variant="text" disabled={vertices.length === 0} onClick={() => void clear()}>
              {t('Borrar polígono')}
            </Button>
          </>
        )}
      </div>
      <MapFrame
        hostRef={hostRef}
        failed={failed}
        className="h-96"
        ariaLabel={t('Mapa para dibujar el polígono. También puedes escribir los vértices en la tabla de más abajo.')}
      />
      <p
        role="status"
        aria-live="polite"
        className={vertices.length > 0 && !valid ? 'text-error' : 'text-on-surface-variant'}
      >
        {summary}
      </p>
      <VertexTable vertices={vertices} onChange={onChange} />
      {dialog}
    </div>
  );
}
