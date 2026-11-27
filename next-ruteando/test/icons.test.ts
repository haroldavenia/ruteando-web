// @vitest-environment node
import * as Remix from '@remixicon/react';
import { describe, expect, test } from 'vitest';

import { MATERIAL_TO_REMIX } from '@/lib/icons/material-to-remix';

describe('tabla Material → Remix', () => {
  const entries = Object.entries(MATERIAL_TO_REMIX);

  test('cada equivalencia existe en la versión instalada de @remixicon/react', () => {
    const missing = entries.filter(([, remix]) => typeof (Remix as Record<string, unknown>)[remix] !== 'function');
    expect(missing).toEqual([]);
  });

  test('todas son la variante de línea (-Line), como en la guía de diseño', () => {
    // RiTranslate2, RiDraggable, RiLinkM… no tienen variante: son de un solo trazo
    const SINGLE = new Set([
      'RiDraggable',
      'RiLinkM',
      'RiLinkUnlinkM',
      'RiListCheck',
      'RiListUnordered',
      'RiTranslate2',
    ]);
    const notLine = entries.filter(([, remix]) => !remix.endsWith('Line') && !SINGLE.has(remix));
    expect(notLine).toEqual([]);
  });

  test('los nombres de Material son identificadores en minúsculas, sin repetirse', () => {
    expect(entries.every(([name]) => /^[a-z][a-z0-9_]*$/.test(name))).toBe(true);
    expect(entries.length).toBe(new Set(entries.map(([name]) => name)).size);
    expect(entries.length).toBeGreaterThanOrEqual(88); // los 88 declarados en ng-ruteando más los glifos de estado
  });
});
