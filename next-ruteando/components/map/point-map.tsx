'use client';

import { useEffect, useEffectEvent, useRef } from 'react';

import { useColorScheme } from '@/lib/color-scheme';
import { type LatLng, latLng, toOlCoordinate } from '@/lib/map/lat-lng';
import { readMapPalette } from '@/lib/map/map-palette';
import type { OpenLayers } from '@/lib/map/openlayers';

import { MapFrame } from './map-frame';
import { useOlMap } from './use-ol-map';

/** Redondea a 6 decimales (~10 cm) y lleva la longitud a -180..180 si el mapa dio la vuelta al mundo. */
export function normalizePoint(lon: number, lat: number): LatLng {
  const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
  const round = (n: number) => Math.round(n * 1e6) / 1e6;
  return { lat: round(lat), lng: round(wrapped) };
}

type Layer = InstanceType<OpenLayers['VectorLayer']>;
type Feature = InstanceType<OpenLayers['Feature']>;
type TranslateInteraction = InstanceType<OpenLayers['Translate']>;

/**
 * Mapa con un marcador opcional. Con `selectable`, un clic coloca el marcador y se puede arrastrar; `onPointChange` se llama solo por
 * acciones de la persona, no por los cambios que llegan por `point`. El mapa no se puede operar con teclado: quien lo use debe ofrecer
 * también campos de coordenadas.
 */
export function PointMap({
  point,
  selectable = false,
  onPointChange,
  ariaLabel,
  className,
}: {
  point: LatLng | null;
  selectable?: boolean;
  onPointChange?: (point: LatLng) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const { hostRef, ctx, failed } = useOlMap({ center: point ?? undefined });
  const scheme = useColorScheme();
  const layer = useRef<Layer | null>(null);
  const marker = useRef<Feature | null>(null);
  const translate = useRef<TranslateInteraction | null>(null);
  const emit = useEffectEvent((next: LatLng) => onPointChange?.(next));
  const isSelectable = useEffectEvent(() => selectable);
  const initialPoint = useEffectEvent(() => point);

  /** Estilo del marcador con los colores del tema que se ve. */
  const paint = useEffectEvent((ol: OpenLayers) => {
    const palette = readMapPalette(scheme, document);
    return new ol.Style({
      image: new ol.CircleStyle({
        radius: 9,
        fill: new ol.Fill({ color: palette.accent }),
        stroke: new ol.Stroke({ color: palette.halo, width: 3 }),
      }),
    });
  });

  /** Coloca (o quita) el marcador; con `recenter` mueve el mapa si el punto queda fuera de la vista. */
  const show = useEffectEvent((next: LatLng | null, recenter: boolean) => {
    if (!ctx || !marker.current) return;
    const coordinate = next && latLng(next.lat, next.lng) ? toOlCoordinate(next) : null;
    if (!coordinate) {
      marker.current.setGeometry(undefined);
      return;
    }
    const projected = ctx.ol.fromLonLat(coordinate);
    marker.current.setGeometry(new ctx.ol.Point(projected));
    if (recenter) {
      const view = ctx.map.getView();
      const extent = view.calculateExtent(ctx.map.getSize());
      const inside =
        projected[0]! >= extent[0]! &&
        projected[0]! <= extent[2]! &&
        projected[1]! >= extent[1]! &&
        projected[1]! <= extent[3]!;
      if (!inside) view.setCenter(projected);
    }
  });

  // Capas e interacciones: una vez, cuando el mapa existe
  useEffect(() => {
    if (!ctx) return;
    const { ol, map } = ctx;
    const source = new ol.VectorSource();
    const feature = new ol.Feature();
    source.addFeature(feature);
    const style = paint(ol);
    const vector = new ol.VectorLayer({ source, style: () => style });
    marker.current = feature;
    layer.current = vector;
    map.addLayer(vector);

    const move = new ol.Translate({ layers: [vector] });
    move.setActive(isSelectable());
    move.on('translateend', () => {
      const geometry = feature.getGeometry();
      if (!(geometry instanceof ol.Point)) return;
      const [lon, lat] = ol.toLonLat(geometry.getCoordinates());
      emit(normalizePoint(lon!, lat!));
    });
    map.addInteraction(move);
    translate.current = move;

    map.on('click', (event) => {
      if (!isSelectable()) return;
      const [lon, lat] = ol.toLonLat(event.coordinate);
      const picked = normalizePoint(lon!, lat!);
      show(picked, false);
      emit(picked);
    });
    show(initialPoint(), false);

    return () => {
      map.removeLayer(vector);
      map.removeInteraction(move);
      marker.current = null;
      layer.current = null;
      translate.current = null;
      void style;
    };
  }, [ctx]);

  useEffect(() => show(point, true), [point, ctx]);
  useEffect(() => translate.current?.setActive(selectable), [selectable, ctx]);

  // Cambio de tema: el canvas no se entera solo, así que se le vuelve a dar el estilo con los colores del tema nuevo
  useEffect(() => {
    if (!ctx || !layer.current) return;
    const style = paint(ctx.ol);
    layer.current.setStyle(() => style);
  }, [scheme, ctx]);

  return <MapFrame hostRef={hostRef} ariaLabel={ariaLabel} failed={failed} className={className} />;
}
