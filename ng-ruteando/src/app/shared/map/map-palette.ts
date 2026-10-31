import { ColorScheme } from '../../core/theme/theme.service';

/**
 * Colores de las marcas de un mapa (marcador, halos, polígono) resueltos para el tema que se ve. OpenLayers dibuja en un canvas y
 * no entiende `var()` ni `light-dark()`: hay que darle colores concretos y volver a dárselos cuando el tema cambia.
 */
export interface MapPalette {
  /** Acento del tema: relleno del marcador y color del polígono si no tiene uno propio. */
  accent: string;
  /** Error del tema: polígono que no es válido. */
  danger: string;
  /** Borde y halo de las marcas: blanco sobre las teselas claras y la superficie del tema sobre las oscurecidas. */
  halo: string;
  /** Tinta sobre el halo: texto del depósito y anillo de la parada elegida. */
  ink: string;
}

/** `#RRGGBB`, `rgb(...)`, `rgba(...)` o `color(srgb ...)` → componentes 0..255; `null` si no se entiende. */
export function parseColor(css: string): [number, number, number] | null {
  const text = css.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(text);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
  if (rgb) {
    return [Math.round(+rgb[1]), Math.round(+rgb[2]), Math.round(+rgb[3])];
  }
  const srgb = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i.exec(text);
  return srgb ? [Math.round(+srgb[1] * 255), Math.round(+srgb[2] * 255), Math.round(+srgb[3] * 255)] : null;
}

/** Color en `#rrggbb` (minúsculas), o `null` si no se entiende. */
export function toHex(css: string): string | null {
  const parts = parseColor(css);
  return parts ? '#' + parts.map((p) => p.toString(16).padStart(2, '0')).join('') : null;
}

/** Color con opacidad 0..1 → `rgba(...)`. Si el color no se entiende, se devuelve tal cual. */
export function toRgba(css: string, alpha: number): string {
  const parts = parseColor(css);
  return parts ? `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})` : css;
}

/** Negro o blanco, el que más contraste da sobre el color de fondo (para el número de una parada). */
export function readableOn(background: string): '#000000' | '#ffffff' {
  const parts = parseColor(background) ?? [128, 128, 128];
  const linear = parts.map((p) => {
    const v = p / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  // El cruce en el que negro y blanco dan el mismo contraste está en 0,179
  return luminance > 0.179 ? '#000000' : '#ffffff';
}

/** Color que resuelve un token del tema en el documento (con el esquema actual); `fallback` si no se puede resolver. */
function resolveToken(doc: Document, token: string, fallback: string): string {
  const probe = doc.createElement('span');
  probe.style.color = `var(${token})`;
  doc.body.appendChild(probe);
  const resolved = doc.defaultView?.getComputedStyle(probe).color ?? '';
  probe.remove();
  return toHex(resolved) ?? fallback;
}

/**
 * Paleta de las marcas para el esquema dado. Con el tema claro el halo y la tinta son blanco y negro, como siempre; con el oscuro
 * salen de la superficie y del texto del tema, para que las marcas no brillen sobre las teselas oscurecidas.
 */
export function readMapPalette(scheme: ColorScheme, doc: Document): MapPalette {
  return {
    accent: resolveToken(doc, '--mat-sys-primary', '#6200ee'),
    danger: resolveToken(doc, '--mat-sys-error', '#b3261e'),
    halo: scheme === 'dark' ? resolveToken(doc, '--mat-sys-surface', '#141218') : '#ffffff',
    ink: scheme === 'dark' ? resolveToken(doc, '--mat-sys-on-surface', '#e6e0e9') : '#000000',
  };
}
