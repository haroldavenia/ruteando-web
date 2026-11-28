'use client';

import { RiAddLine, RiDeleteBinLine } from '@remixicon/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { useT } from '@/lib/i18n/client';
import type { LatLng } from '@/lib/map/lat-lng';
import { parseCoordinate } from '@/lib/map/location-input';

interface Row {
  lat: string;
  lng: string;
}

const toRows = (vertices: readonly LatLng[]): Row[] =>
  vertices.map((v) => ({ lat: String(v.lat), lng: String(v.lng) }));

/** El punto de una fila, o `null` si falta un valor o está fuera de rango. */
function pointOfRow(row: Row): LatLng | null {
  const lat = parseCoordinate(row.lat);
  const lng = parseCoordinate(row.lng);
  return lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

const validPoints = (rows: readonly Row[]): LatLng[] => rows.flatMap((row) => pointOfRow(row) ?? []);
const same = (a: readonly LatLng[], b: readonly LatLng[]) =>
  a.length === b.length && a.every((p, i) => p.lat === b[i]!.lat && p.lng === b[i]!.lng);

/**
 * Los vértices de un polígono en una tabla con latitud y longitud editables: es la alternativa completa al mapa para quien no puede
 * dibujar con el ratón. Un cambio válido llama a `onChange`; con un valor fuera de rango o vacío la lista no cambia y el error se ve junto
 * al campo. Los cambios que llegan desde fuera (el mapa) reconstruyen la tabla si no coinciden con lo que hay.
 */
export function VertexTable({
  vertices,
  onChange,
}: {
  vertices: readonly LatLng[];
  onChange: (vertices: LatLng[]) => void;
}) {
  const t = useT();
  const [rows, setRows] = useState<Row[]>(() => toRows(vertices));
  const [seen, setSeen] = useState(vertices);

  // Cambios que llegan desde fuera: se ajusta el estado durante el render (no en un efecto) para no pintar una tabla vieja
  if (vertices !== seen) {
    setSeen(vertices);
    if (!same(validPoints(rows), vertices) || rows.length !== vertices.length) setRows(toRows(vertices));
  }

  function commit(next: Row[]) {
    setRows(next);
    if (next.every((row) => pointOfRow(row))) {
      const points = validPoints(next);
      if (!same(points, vertices)) onChange(points);
    }
  }

  function add() {
    const first = vertices[0];
    const last = vertices[vertices.length - 1];
    // El vértice nuevo nace a medio camino entre el último y el primero, para que se vea y siga siendo válido
    const nudge = vertices.length === 1 ? 0.001 : 0;
    const row: Row =
      first && last
        ? { lat: String((first.lat + last.lat) / 2 + nudge), lng: String((first.lng + last.lng) / 2 + nudge) }
        : { lat: '', lng: '' };
    commit([...rows, row]);
  }

  const error = (text: string, limit: number, range: string) => {
    const value = parseCoordinate(text);
    if (value === null) return t('Obligatorio');
    return Math.abs(value) > limit ? range : '';
  };

  const cell = 'px-3 py-2 align-top';
  const input =
    'h-10 w-full min-w-28 rounded-control border border-outline bg-transparent px-3 text-on-surface aria-invalid:border-error focus-visible:outline-2 focus-visible:outline-primary';

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`@container overflow-x-hidden ${rows.length === 0 ? '' : 'rounded-control border border-outline-variant'}`}
      >
        <table role="table" className="w-full border-collapse text-start">
          <caption className={rows.length === 0 ? 'mt-2 pb-[10px] text-start text-sm font-medium' : 'sr-only'}>
            {t('Vértices del polígono')}
          </caption>
          <thead role="rowgroup" className="@max-[540px]:sr-only">
            <tr
              role="row"
              className="border-b border-outline-variant font-mono text-xs tracking-wide text-on-surface-variant uppercase"
            >
              <th scope="col" role="columnheader" className={`${cell} text-start font-medium`}>
                {t('Vértice')}
              </th>
              <th scope="col" role="columnheader" className={`${cell} text-start font-medium`}>
                {t('Latitud')}
              </th>
              <th scope="col" role="columnheader" className={`${cell} text-start font-medium`}>
                {t('Longitud')}
              </th>
              <th scope="col" role="columnheader" className={cell}>
                <span className="sr-only">{t('Quitar')}</span>
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {rows.map((row, index) => {
              const latError = error(row.lat, 90, t('Entre -90 y 90'));
              const lngError = error(row.lng, 180, t('Entre -180 y 180'));
              return (
                <tr
                  key={index}
                  role="row"
                  className="border-b border-outline-variant last:border-b-0 @max-[540px]:block @max-[540px]:p-2"
                >
                  <th scope="row" role="rowheader" className={`${cell} text-start font-medium @max-[540px]:block`}>
                    {index + 1}
                  </th>
                  <td role="cell" data-label={t('Latitud')} className={`${cell} @max-[540px]:block`}>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={row.lat}
                      aria-label={t('Latitud del vértice ') + (index + 1)}
                      aria-invalid={latError ? true : undefined}
                      className={input}
                      onChange={(event) =>
                        commit(rows.map((r, i) => (i === index ? { ...r, lat: event.target.value } : r)))
                      }
                    />
                    {latError ? (
                      <span role="alert" className="block text-xs text-error">
                        {latError}
                      </span>
                    ) : null}
                  </td>
                  <td role="cell" data-label={t('Longitud')} className={`${cell} @max-[540px]:block`}>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={row.lng}
                      aria-label={t('Longitud del vértice ') + (index + 1)}
                      aria-invalid={lngError ? true : undefined}
                      className={input}
                      onChange={(event) =>
                        commit(rows.map((r, i) => (i === index ? { ...r, lng: event.target.value } : r)))
                      }
                    />
                    {lngError ? (
                      <span role="alert" className="block text-xs text-error">
                        {lngError}
                      </span>
                    ) : null}
                  </td>
                  <td role="cell" className={`${cell} text-end @max-[540px]:block`}>
                    <IconButton
                      icon={RiDeleteBinLine}
                      label={t('Quitar el vértice ') + (index + 1)}
                      onClick={() => commit(rows.filter((_, i) => i !== index))}
                    />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr role="row">
                <td role="cell" colSpan={4} className={`${cell} px-4 text-on-surface`}>
                  {t('Todavía no hay vértices. Añade al menos tres o dibuja el polígono en el mapa.')}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div>
        <Button variant="outlined" onClick={add}>
          <Icon icon={RiAddLine} size={20} />
          {t('Añadir vértice')}
        </Button>
      </div>
    </div>
  );
}
