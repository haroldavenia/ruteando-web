'use client';

import { RiCloseLine } from '@remixicon/react';
import Link from 'next/link';
import { useEffect, useEffectEvent, useMemo, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import type { DomainRoute } from '@/lib/api/models';
import { useColorScheme } from '@/lib/color-scheme';
import { useFormat } from '@/lib/hooks/use-format';
import { useT } from '@/lib/i18n/client';
import { stopTypeLabel } from '@/lib/journeys/labels';
import { type MapPalette, readableOn, readMapPalette, toRgba } from '@/lib/map/map-palette';
import type { OpenLayers } from '@/lib/map/openlayers';
import { routeColorFor } from '@/lib/map/route-colors';
import { lonLatBounds, routeCoordinates, routeLine, routeStops } from '@/lib/map/route-geometry';

import { MapFrame } from './map-frame';
import { useOlMap } from './use-ol-map';

export interface StopRef {
  routeIndex: number;
  sequence: number;
}

type Layer = InstanceType<OpenLayers['VectorLayer']>;
type Style = InstanceType<OpenLayers['Style']>;
type Feature = Parameters<
  NonNullable<ConstructorParameters<OpenLayers['VectorLayer']>[0]>['style'] & ((f: never) => unknown)
>[0];

const DEPOT = 'depot';
const FIT_PADDING = [48, 48, 48, 48];
const MAX_FIT_ZOOM = 16;
const SINGLE_POINT_ZOOM = 15;

/**
 * Mapa de solo lectura con las rutas de una jornada: una línea por ruta con su color, paradas numeradas y depósitos con una «D». La
 * leyenda y la ficha de parada son accesibles con teclado y cubren la información del mapa para quien no pueda usarlo. La ruta y la
 * parada elegidas se comparten con la pantalla (tablas de rutas y paradas) y se controlan desde fuera.
 */
export function RoutesMap({
  routes,
  selectedRoute,
  onSelectRoute,
  selectedStop,
  onSelectStop,
}: {
  routes: readonly DomainRoute[];
  selectedRoute: number | null;
  onSelectRoute: (routeIndex: number | null) => void;
  selectedStop: StopRef | null;
  onSelectStop: (stop: StopRef | null) => void;
}) {
  const t = useT();
  const format = useFormat();
  const scheme = useColorScheme();
  const { hostRef, ctx, failed } = useOlMap();
  const routeLayer = useRef<Layer | null>(null);
  const stopLayer = useRef<Layer | null>(null);
  const palette = useRef<MapPalette | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  /** Lo último que ya se dibujó o enfocó: los efectos no lo repiten (evita pisar lo que hizo la creación del mapa). */
  const drawn = useRef<readonly DomainRoute[] | null>(null);
  const fitted = useRef<number | null | undefined>(undefined);
  const centered = useRef<StopRef | null>(null);

  const legend = useMemo(
    () =>
      routes.map((route) => ({
        routeIndex: route.routeIndex,
        name: route.name,
        vehicle: route.resource
          ? route.resource.plate
            ? `${route.resource.name} (${route.resource.plate})`
            : route.resource.name
          : '—',
        distance: format.distance(route.distanceTraveled),
        color: routeColorFor(route.routeIndex, scheme),
        dashed: routeLine(route)?.dashed ?? false,
      })),
    [routes, scheme, format]
  );
  const nothingToDraw = useMemo(() => routeCoordinates(routes).length === 0, [routes]);

  const stopCard = useMemo(() => {
    if (!selectedStop) return null;
    const route = routes.find((r) => r.routeIndex === selectedStop.routeIndex);
    const waypoint = route?.waypoints.find((w) => w.sequence === selectedStop.sequence);
    return route && waypoint ? { route, waypoint, color: routeColorFor(route.routeIndex, scheme) } : null;
  }, [selectedStop, routes, scheme]);
  const focused = selectedRoute === null ? null : routes.find((r) => r.routeIndex === selectedRoute);

  const routesNow = useEffectEvent(() => routes);
  const selectedRouteNow = useEffectEvent(() => selectedRoute);
  const selectedStopNow = useEffectEvent(() => selectedStop);
  const schemeNow = useEffectEvent(() => scheme);
  const pickStop = useEffectEvent((stop: StopRef | null) => onSelectStop(stop));

  const routeStyle = useEffectEvent((ol: OpenLayers, feature: Feature): Style[] => {
    const index = (feature as { get: (k: string) => unknown }).get('routeIndex') as number;
    const dashed = (feature as { get: (k: string) => unknown }).get('dashed');
    const selected = selectedRouteNow();
    const dim = selected !== null && selected !== index;
    const width = selected === index ? 6 : 4;
    const colors = palette.current!;
    const base = routeColorFor(index, schemeNow());
    const color = dim ? toRgba(base, 0.35) : base;
    const dash = dashed ? [10, 8] : undefined;
    return [
      new ol.Style({
        stroke: new ol.Stroke({
          color: dim ? toRgba(colors.halo, 0.5) : colors.halo,
          width: width + 3,
          lineDash: dash,
        }),
      }),
      new ol.Style({ stroke: new ol.Stroke({ color, width, lineDash: dash }) }),
    ];
  });

  const stopStyle = useEffectEvent((ol: OpenLayers, feature: Feature): Style[] => {
    const get = (k: string) => (feature as { get: (k: string) => unknown }).get(k);
    const index = get('routeIndex') as number;
    const sequence = get('sequence') as number;
    const depot = get('stopType') === DEPOT;
    const selected = selectedRouteNow();
    const dim = selected !== null && selected !== index;
    const picked = selectedStopNow();
    const isPicked = picked?.routeIndex === index && picked.sequence === sequence;
    const colors = palette.current!;
    const dark = schemeNow() === 'dark';
    const color = routeColorFor(index, schemeNow());
    const label = depot ? 'D' : `${index + 1}·${sequence}`;
    // Con el tema claro el número es blanco con un borde oscuro; con el oscuro, las rutas son luminosas y el número va en el tono que más contraste da
    const numberColor = dark ? readableOn(color) : '#ffffff';
    const styles: Style[] = [];
    if (isPicked) {
      styles.push(
        new ol.Style({
          image: new ol.CircleStyle({
            radius: 22,
            fill: new ol.Fill({ color: toRgba(colors.ink, 0.12) }),
            stroke: new ol.Stroke({ color: colors.ink, width: 3 }),
          }),
        })
      );
    }
    styles.push(
      new ol.Style({
        image: new ol.CircleStyle({
          radius: depot ? 13 : 14,
          fill: new ol.Fill({ color: depot ? colors.halo : dim ? toRgba(color, 0.45) : color }),
          stroke: new ol.Stroke({
            color: depot ? (dim ? toRgba(color, 0.45) : color) : colors.halo,
            width: depot ? 4 : 2,
          }),
        }),
        text: new ol.TextStyle({
          text: label,
          font: '700 11px sans-serif',
          fill: new ol.Fill({ color: depot ? colors.ink : numberColor }),
          stroke: depot || dark ? undefined : new ol.Stroke({ color: 'rgba(0, 0, 0, 0.45)', width: 2 }),
        }),
      })
    );
    return styles;
  });

  const drawRoutes = useEffectEvent((list: readonly DomainRoute[]) => {
    if (!ctx || !routeLayer.current || !stopLayer.current) return;
    const { ol } = ctx;
    drawn.current = list;
    const lines = routeLayer.current.getSource()!;
    const stops = stopLayer.current.getSource()!;
    lines.clear();
    stops.clear();
    for (const route of list) {
      const line = routeLine(route);
      if (line) {
        const feature = new ol.Feature(new ol.LineString(line.coordinates.map((c) => ol.fromLonLat(c))));
        feature.set('routeIndex', route.routeIndex);
        feature.set('dashed', line.dashed);
        lines.addFeature(feature);
      }
      for (const stop of routeStops(route)) {
        const feature = new ol.Feature(new ol.Point(ol.fromLonLat(stop.coordinate)));
        feature.setProperties({
          routeIndex: route.routeIndex,
          sequence: stop.waypoint.sequence,
          stopType: stop.waypoint.stopType,
        });
        stops.addFeature(feature);
      }
    }
  });

  /** Encuadra una ruta (o todas con `null`); sin nada que ver deja la vista por defecto. */
  const fit = useEffectEvent((routeIndex: number | null) => {
    if (!ctx) return;
    const { ol, map } = ctx;
    fitted.current = routeIndex;
    const all = routesNow();
    const chosen = routeIndex === null ? all : all.filter((r) => r.routeIndex === routeIndex);
    const bounds =
      lonLatBounds(routeCoordinates(chosen)) ?? (routeIndex !== null ? lonLatBounds(routeCoordinates(all)) : null);
    if (!bounds) return;
    const view = map.getView();
    const [west, south, east, north] = bounds;
    if (west === east && south === north) {
      view.setCenter(ol.fromLonLat([west, south]));
      view.setZoom(SINGLE_POINT_ZOOM);
      return;
    }
    view.fit(ol.transformExtent(bounds, 'EPSG:4326', 'EPSG:3857'), { padding: FIT_PADDING, maxZoom: MAX_FIT_ZOOM });
  });

  const centerOn = useEffectEvent((ref: StopRef) => {
    centered.current = ref;
    if (!ctx) return;
    const route = routesNow().find((r) => r.routeIndex === ref.routeIndex);
    const stop = route && routeStops(route).find((s) => s.waypoint.sequence === ref.sequence);
    if (stop) ctx.map.getView().setCenter(ctx.ol.fromLonLat(stop.coordinate));
  });

  // Las capas y el clic en una parada: una vez, cuando el mapa existe
  useEffect(() => {
    if (!ctx) return;
    const { ol, map } = ctx;
    palette.current = readMapPalette(schemeNow(), document);
    const lines = new ol.VectorLayer({
      source: new ol.VectorSource(),
      style: (feature) => routeStyle(ol, feature as Feature),
    });
    const stops = new ol.VectorLayer({
      source: new ol.VectorSource(),
      style: (feature) => stopStyle(ol, feature as Feature),
      zIndex: 10,
    });
    routeLayer.current = lines;
    stopLayer.current = stops;
    map.addLayer(lines);
    map.addLayer(stops);
    const onClick = map.on('click', (event) => {
      const hit = map.forEachFeatureAtPixel(event.pixel, (feature) => feature, {
        layerFilter: (layer) => layer === stops,
        hitTolerance: 8,
      });
      const routeIndex = hit?.get('routeIndex') as number | undefined;
      const sequence = hit?.get('sequence') as number | undefined;
      pickStop(routeIndex === undefined || sequence === undefined ? null : { routeIndex, sequence });
    });
    drawRoutes(routesNow());
    fit(selectedRouteNow());
    // Una parada elegida antes de que el mapa estuviera listo se centra ahora
    const picked = selectedStopNow();
    if (picked) centerOn(picked);
    return () => {
      map.removeLayer(lines);
      map.removeLayer(stops);
      if (!Array.isArray(onClick)) map.un('click', onClick.listener);
      routeLayer.current = null;
      stopLayer.current = null;
      drawn.current = null;
    };
  }, [ctx]);

  // Rutas nuevas: se reconstruyen las capas y se encuadra todo
  useEffect(() => {
    if (ctx && routes !== drawn.current) {
      drawRoutes(routes);
      fit(selectedRoute);
    }
  }, [routes, ctx, selectedRoute]);

  // Cambio de tema: el canvas no se entera solo; se renuevan los colores y se vuelve a pintar
  useEffect(() => {
    if (!ctx) return;
    palette.current = readMapPalette(scheme, document);
    routeLayer.current?.changed();
    stopLayer.current?.changed();
  }, [scheme, ctx]);

  // Ruta elegida: se vuelve a pintar y se encuadra en ella (o en todas)
  useEffect(() => {
    if (!ctx) return;
    routeLayer.current?.changed();
    stopLayer.current?.changed();
    if (selectedRoute !== fitted.current) fit(selectedRoute);
  }, [selectedRoute, ctx]);

  // Parada elegida: halo y centrado; quien abrió la ficha (un botón de la tabla) recupera el foco al cerrarla
  useEffect(() => {
    if (!ctx) return;
    stopLayer.current?.changed();
    if (selectedStop && selectedStop !== centered.current) centerOn(selectedStop);
  }, [selectedStop, ctx]);
  useEffect(() => {
    if (!selectedStop) return;
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== document.body && !hostRef.current?.contains(active)) opener.current = active;
  }, [selectedStop, hostRef]);

  function closeStop() {
    onSelectStop(null);
    const previous = opener.current;
    opener.current = null;
    previous?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <MapFrame
        hostRef={hostRef}
        failed={failed}
        className="h-96"
        ariaLabel={t('Mapa de las rutas de la jornada. Las mismas rutas y paradas están en las tablas de más abajo.')}
      />
      {nothingToDraw ? (
        <p role="status" className="text-on-surface-variant">
          {t('No hay rutas con recorrido ni paradas con posición que dibujar.')}
        </p>
      ) : null}

      <section aria-labelledby="legend-title">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 id="legend-title" className="font-medium">
            {t('Leyenda de las rutas')}
          </h3>
          {selectedRoute !== null ? (
            <Button variant="outlined" onClick={() => onSelectRoute(null)}>
              {t('Ver todas')}
            </Button>
          ) : null}
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {focused ? t('Ruta enfocada: {0}', [focused.name]) : ''}
        </p>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {legend.map((item) => (
            <li key={item.routeIndex}>
              <button
                type="button"
                aria-pressed={selectedRoute === item.routeIndex}
                onClick={() => onSelectRoute(selectedRoute === item.routeIndex ? null : item.routeIndex)}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-outline px-3 py-1.5 text-start aria-pressed:border-primary aria-pressed:bg-secondary-container"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-7 shrink-0 rounded-full border-2"
                  style={{
                    background: item.dashed ? 'transparent' : item.color,
                    borderColor: item.color,
                    borderStyle: item.dashed ? 'dashed' : 'solid',
                  }}
                />
                <span className="flex flex-col text-sm">
                  <strong>
                    {item.routeIndex + 1}. {item.name}
                  </strong>
                  <span className="text-on-surface-variant">
                    {item.vehicle} · {item.distance}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div aria-live="polite">
        {stopCard ? (
          <section
            aria-labelledby="stop-title"
            className="rounded-card border border-outline-variant bg-surface-container p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="stop-title" className="flex items-center gap-2 font-medium">
                <span aria-hidden="true" className="size-3 rounded-full" style={{ background: stopCard.color }} />
                {t('{0} · Ruta {1}: {2}', [
                  stopCard.waypoint.stopType === 'depot' ? t('Depósito') : t('Parada ') + stopCard.waypoint.sequence,
                  stopCard.route.routeIndex + 1,
                  stopCard.route.name,
                ])}
              </h3>
              <IconButton icon={RiCloseLine} label={t('Cerrar la ficha de la parada')} onClick={closeStop} />
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  [t('Orden'), String(stopCard.waypoint.sequence)],
                  [t('Tipo'), stopTypeLabel(stopCard.waypoint.stopType, t)],
                  [t('Llegada'), format.dateTime(stopCard.waypoint.arrivalUtc)],
                  [t('Salida'), format.dateTime(stopCard.waypoint.departureUtc)],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-on-surface-variant">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {stopCard.waypoint.packageId ? (
              <Link
                href={`/packages/${encodeURIComponent(stopCard.waypoint.packageId)}`}
                className="mt-2 inline-block text-primary underline"
              >
                {t('Ver el paquete')}
              </Link>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
