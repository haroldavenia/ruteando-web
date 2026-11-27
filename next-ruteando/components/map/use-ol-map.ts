'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { useT } from '@/lib/i18n/client';
import { toOlCoordinate } from '@/lib/map/lat-lng';
import { MAP_CONFIG } from '@/lib/map/map-config';
import { loadOpenLayers, type OpenLayers } from '@/lib/map/openlayers';

export interface MapContext {
  ol: OpenLayers;
  map: InstanceType<OpenLayers['Map']>;
}

/**
 * Crea el mapa de OpenLayers dentro del elemento de `hostRef` (que debe pintar `MapFrame`): teselas de OpenStreetMap, zoom y atribución
 * siempre visible. Solo en el navegador y tras el primer render: OpenLayers se carga bajo demanda. `ctx` es `null` mientras carga, en el
 * servidor o si falló; cada tipo de mapa (punto, lugares, rutas, polígono) pone sus capas cuando `ctx` existe. `failed` también se activa
 * si las teselas no llegan, y se apaga cuando vuelven. El centro y el zoom iniciales se leen una sola vez.
 */
export function useOlMap(initial?: { center?: { lat: number; lng: number }; zoom?: number }) {
  const t = useT();
  const hostRef = useRef<HTMLDivElement>(null);
  const [ctx, setCtx] = useState<MapContext | null>(null);
  const [failed, setFailed] = useState(false);
  const [start] = useState(initial);
  // Las etiquetas de los controles no son motivo para recrear el mapa (p. ej. al cambiar el diccionario tras `router.refresh()`)
  const labels = useEffectEvent(() => ({ zoomIn: t('Acercar el mapa'), zoomOut: t('Alejar el mapa') }));

  useEffect(() => {
    const names = labels(); // fuera del callback asíncrono: un evento de efecto solo se llama desde el propio efecto
    let cancelled = false;
    let created: MapContext['map'] | null = null;
    loadOpenLayers().then(
      (ol) => {
        if (cancelled || !hostRef.current) return;
        const tiles = new ol.TileLayer({
          // `app-tiles`: con el tema oscuro las teselas se oscurecen con un filtro de la hoja global (las marcas no se tocan)
          className: 'app-tiles',
          source: new ol.XYZ({ url: MAP_CONFIG.tilesUrl, attributions: MAP_CONFIG.attribution }),
        });
        tiles.getSource()?.on('tileloaderror', () => setFailed(true));
        tiles.getSource()?.on('tileloadend', () => setFailed(false));
        const center = toOlCoordinate(start?.center ?? MAP_CONFIG.center) ?? [0, 0];
        created = new ol.Map({
          target: hostRef.current,
          layers: [tiles],
          view: new ol.View({ center: ol.fromLonLat(center), zoom: start?.zoom ?? MAP_CONFIG.zoom }),
          // La atribución del proveedor debe verse siempre: sin el botón que la pliega
          controls: ol.defaultControls({
            attributionOptions: { collapsible: false },
            zoomOptions: { zoomInTipLabel: names.zoomIn, zoomOutTipLabel: names.zoomOut },
          }),
        });
        setCtx({ ol, map: created });
      },
      () => {
        if (!cancelled) setFailed(true);
      }
    );
    return () => {
      cancelled = true;
      created?.setTarget(undefined);
      created?.dispose();
      setCtx(null);
    };
  }, [start]);

  return { hostRef, ctx, failed };
}
