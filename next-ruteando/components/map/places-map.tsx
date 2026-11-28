'use client';

import { useEffect, useEffectEvent, useMemo, useRef } from 'react';

import type { Place } from '@/lib/api/models';
import { useColorScheme } from '@/lib/color-scheme';
import { useT } from '@/lib/i18n/client';
import { fromGeoJsonPoint } from '@/lib/map/lat-lng';
import { readableOn, readMapPalette } from '@/lib/map/map-palette';
import type { OpenLayers } from '@/lib/map/openlayers';
import { routeColorFor } from '@/lib/map/route-colors';
import { placeTypeLabel, placeTypeOrder } from '@/lib/places/labels';

import { MapFrame } from './map-frame';
import { useOlMap } from './use-ol-map';

type Layer = InstanceType<OpenLayers['VectorLayer']>;
type Source = InstanceType<OpenLayers['VectorSource']>;
type Style = InstanceType<OpenLayers['Style']>;

/**
 * Mapa de los lugares: un pin por lugar, del color y con la letra de su tipo (el color nunca es la única señal), y la leyenda de los
 * tipos que hay. Dibuja los lugares que recibe (la lista ya filtrada) y se ajusta para mostrarlos todos; un clic en un pin llama a
 * `onSelect` con su id. El mapa no se maneja con teclado: la lista de al lado es la alternativa accesible.
 */
export function PlacesMap({
  places,
  selectedId,
  onSelect,
}: {
  places: readonly Place[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const t = useT();
  const scheme = useColorScheme();
  const { hostRef, ctx, failed } = useOlMap();
  const source = useRef<Source | null>(null);
  const layer = useRef<Layer | null>(null);
  const styles = useRef(new Map<string, Style[]>());
  const order = useMemo(() => placeTypeOrder(places), [places]);

  const letter = (type: string) => ([...placeTypeLabel(type, t)][0] ?? '?').toUpperCase();
  const legend = useMemo(() => {
    const present = new Set(places.map((p) => p.type));
    return order
      .filter((type) => present.has(type))
      .map((type) => {
        const color = routeColorFor(order.indexOf(type), scheme);
        return { key: type, color, ink: readableOn(color) };
      });
  }, [places, order, scheme]);

  const select = useEffectEvent((id: string) => onSelect(id));
  const selected = useEffectEvent(() => selectedId);
  const typeLetter = useEffectEvent((type: string) => letter(type));
  const colorOf = useEffectEvent((type: string) => routeColorFor(order.indexOf(type), scheme));
  const currentScheme = useEffectEvent(() => scheme);

  /** Un círculo con la letra del tipo, de su color, y, si es el elegido, un anillo alrededor. */
  const styleOf = useEffectEvent((ol: OpenLayers, type: string, isSelected: boolean): Style[] => {
    const key = `${type}|${isSelected}`;
    const cached = styles.current.get(key);
    if (cached) return cached;
    const palette = readMapPalette(currentScheme(), document);
    const color = colorOf(type);
    const result = [
      new ol.Style({
        image: new ol.CircleStyle({
          radius: 11,
          fill: new ol.Fill({ color }),
          stroke: new ol.Stroke({ color: palette.halo, width: 3 }),
        }),
        text: new ol.TextStyle({
          text: typeLetter(type),
          fill: new ol.Fill({ color: readableOn(color) }),
          font: '700 12px sans-serif',
        }),
      }),
    ];
    if (isSelected) {
      result.unshift(
        new ol.Style({
          image: new ol.CircleStyle({ radius: 17, stroke: new ol.Stroke({ color: palette.ink, width: 3 }) }),
        })
      );
    }
    styles.current.set(key, result);
    return result;
  });

  // La capa: una vez, cuando el mapa existe
  useEffect(() => {
    if (!ctx) return;
    const { ol, map } = ctx;
    const src = new ol.VectorSource();
    const vector = new ol.VectorLayer({
      source: src,
      style: (feature) => styleOf(ol, feature.get('type') as string, feature.get('id') === selected()),
    });
    source.current = src;
    layer.current = vector;
    map.addLayer(vector);
    const onClick = map.on('click', (event) => {
      const id = map.forEachFeatureAtPixel(event.pixel, (feature) => feature.get('id') as unknown, {
        layerFilter: (l) => l === vector,
        hitTolerance: 6,
      });
      if (typeof id === 'string') select(id);
    });
    return () => {
      map.removeLayer(vector);
      if (!Array.isArray(onClick)) map.un('click', onClick.listener);
      source.current = null;
      layer.current = null;
    };
  }, [ctx]);

  // Un pin por lugar con ubicación válida; se ajusta la vista para que se vean todos
  useEffect(() => {
    if (!ctx || !source.current) return;
    const { ol, map } = ctx;
    source.current.clear();
    for (const place of places) {
      const point = fromGeoJsonPoint(place.location?.coordinates);
      if (!point) continue;
      source.current.addFeature(
        new ol.Feature({
          geometry: new ol.Point(ol.fromLonLat([point.lng, point.lat])),
          id: place.id,
          type: place.type,
        })
      );
    }
    const extent = source.current.getExtent();
    if (extent && source.current.getFeatures().length > 0 && !ol.isEmpty(extent)) {
      map.updateSize();
      map.getView().fit(extent, { padding: [48, 48, 48, 48], maxZoom: 15, duration: 0 });
    }
  }, [places, ctx]);

  // El elegido o el tema cambian: los estilos se calculan de nuevo (el canvas no se entera solo)
  useEffect(() => {
    styles.current.clear();
    layer.current?.changed();
  }, [selectedId, scheme, ctx]);

  return (
    <div>
      <MapFrame
        hostRef={hostRef}
        failed={failed}
        className="h-90"
        ariaLabel={t('Mapa de los lugares: un pin por lugar, con el color y la letra de su tipo')}
      />
      <ul aria-label={t('Tipos de lugar')} className="mt-3 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-sm">
        {legend.map((item) => (
          <li key={item.key} className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-grid size-6 place-items-center rounded-full font-brand text-xs font-bold"
              style={{ background: item.color, color: item.ink }}
            >
              {letter(item.key)}
            </span>
            {placeTypeLabel(item.key, t)}
          </li>
        ))}
      </ul>
    </div>
  );
}
