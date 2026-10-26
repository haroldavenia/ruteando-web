import { PackageInput } from '../../../core/api/models';

import { RowResult, runImport } from './package-importer';
import { ImportRow } from './package-rows';

const row = (line: number, guide?: string): ImportRow => ({
  line,
  original: [String(line)],
  input: { name: `P${line}`, serviceType: 'delivery', address: `Calle ${line}`, location: { type: 'Point', coordinates: [-74, 4.6] }, weight: 0, volume: 0, ...(guide ? { guideNumber: guide } : {}) },
});
const rows = (n: number, withGuide = false): ImportRow[] => Array.from({ length: n }, (_, i) => row(i + 2, withGuide ? `G-${i}` : undefined));
const http = (status: number, message = `HTTP ${status}`) => Object.assign(new Error(message), { status });
const immediate = () => Promise.resolve();
const tick = () => new Promise<void>((resolve) => setTimeout(resolve));
const statuses = (results: RowResult[]) => results.map((r) => r.status);

describe('runImport', () => {
  it('crea todas las filas y devuelve los resultados en el orden de entrada', async () => {
    const created: string[] = [];
    const results = await runImport(rows(7), async (input) => {
      await tick();
      created.push(input.name);
    });
    expect(statuses(results)).toEqual(Array(7).fill('created'));
    expect(results.map((r) => r.row.line)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(created.length).toBe(7);
  });

  it('nunca hay más de 4 peticiones simultáneas', async () => {
    let active = 0;
    let peak = 0;
    await runImport(rows(20), async () => {
      active++;
      peak = Math.max(peak, active);
      await tick();
      active--;
    });
    expect(peak).toBe(4);
  });

  it('respeta una concurrencia distinta', async () => {
    let active = 0;
    let peak = 0;
    await runImport(
      rows(10),
      async () => {
        active++;
        peak = Math.max(peak, active);
        await tick();
        active--;
      },
      { concurrency: 2 },
    );
    expect(peak).toBe(2);
  });

  it('envía a create el cuerpo de cada fila', async () => {
    const received: PackageInput[] = [];
    await runImport(rows(3, true), async (input) => void received.push(input));
    expect(received.map((r) => r.guideNumber)).toEqual(['G-0', 'G-1', 'G-2']);
  });

  it('sin filas termina enseguida', async () => {
    expect(await runImport([], async () => undefined)).toEqual([]);
  });

  it('un 409 con guía es «ya existía» y sin guía es un fallo', async () => {
    const results = await runImport([row(2, 'G-1'), row(3)], async () => {
      throw http(409, 'Ya existe');
    });
    expect(statuses(results)).toEqual(['existed', 'failed']);
    expect(results[1].message).toBe('Ya existe');
  });

  it('un error en una fila no detiene las demás', async () => {
    const results = await runImport(rows(5), async (input) => {
      if (input.name === 'P3') {
        throw http(500, 'El servicio no está disponible');
      }
    });
    expect(statuses(results)).toEqual(['created', 'failed', 'created', 'created', 'created']);
    expect(results[1].message).toBe('El servicio no está disponible');
  });

  it('un error sin mensaje usa un texto genérico', async () => {
    const results = await runImport([row(2)], async () => {
      throw 'boom';
    });
    expect(results[0].message).toBe('No se pudo completar la solicitud');
  });

  describe('saturación (429 y 503)', () => {
    it('reintenta con espera creciente y acaba creando la fila', async () => {
      const waits: number[] = [];
      let calls = 0;
      const results = await runImport(
        [row(2)],
        async () => {
          calls++;
          if (calls < 3) {
            throw http(429);
          }
        },
        { sleep: async (ms) => void waits.push(ms) },
      );
      expect(statuses(results)).toEqual(['created']);
      expect(calls).toBe(3);
      expect(waits).toEqual([1000, 2000]);
    });

    it('tras tres intentos fallidos la fila es fallida', async () => {
      let calls = 0;
      const results = await runImport(
        [row(2)],
        async () => {
          calls++;
          throw http(503, 'Servicio no disponible');
        },
        { sleep: immediate },
      );
      expect(calls).toBe(3);
      expect(results[0]).toEqual(jasmine.objectContaining({ status: 'failed', message: 'Servicio no disponible' }));
    });

    it('baja la concurrencia a la mitad para las filas que aún no han empezado', async () => {
      let activeLater = 0;
      let peakLater = 0;
      let saturatedOnce = false;
      await runImport(
        rows(24),
        async (input) => {
          // La primera fila satura al gateway; las tres siguientes ya estaban en vuelo
          if (input.name === 'P2') {
            if (!saturatedOnce) {
              saturatedOnce = true;
              throw http(429);
            }
            return;
          }
          const later = Number(input.name.slice(1)) >= 6;
          if (later) {
            activeLater++;
            peakLater = Math.max(peakLater, activeLater);
          }
          await tick();
          if (later) {
            activeLater--;
          }
        },
        { sleep: immediate },
      );
      expect(peakLater).toBeGreaterThan(0);
      expect(peakLater).toBeLessThanOrEqual(2);
    });

    it('la concurrencia no baja de 1', async () => {
      let calls = 0;
      const results = await runImport(
        rows(3),
        async () => {
          calls++;
          if (calls <= 6) {
            throw http(429);
          }
        },
        { sleep: immediate, maxAttempts: 10 },
      );
      expect(statuses(results)).toEqual(['created', 'created', 'created']);
    });
  });

  describe('cancelación', () => {
    it('no lanza filas nuevas, deja terminar las que están en vuelo y marca el resto como sin procesar', async () => {
      let cancelled = false;
      let started = 0;
      const results = await runImport(
        rows(12),
        async () => {
          started++;
          if (started === 4) {
            cancelled = true;
          }
          await tick();
        },
        { isCancelled: () => cancelled },
      );
      const created = results.filter((r) => r.status === 'created').length;
      const skipped = results.filter((r) => r.status === 'skipped');
      expect(created).toBe(started);
      expect(created + skipped.length).toBe(12);
      expect(skipped.length).toBeGreaterThan(0);
      expect(skipped[0].message).toContain('se canceló');
    });

    it('cancelar antes de empezar deja todo sin procesar', async () => {
      const create = jasmine.createSpy().and.resolveTo(undefined);
      const results = await runImport(rows(5), create, { isCancelled: () => true });
      expect(create).not.toHaveBeenCalled();
      expect(statuses(results)).toEqual(Array(5).fill('skipped'));
    });
  });

  it('informa del progreso y de cada resultado', async () => {
    const progress: number[] = [];
    const seen: string[] = [];
    await runImport(rows(5), async () => undefined, {
      onProgress: ({ done, total }) => progress.push(done * 100 + total),
      onResult: (r) => seen.push(r.status),
    });
    expect(progress).toEqual([105, 205, 305, 405, 505]);
    expect(seen.length).toBe(5);
  });

  it('reintentar solo las fallidas se hace volviendo a pasar esas filas', async () => {
    const first = await runImport(rows(4), async (input) => {
      if (input.name === 'P3') {
        throw http(500);
      }
    });
    const failed = first.filter((r) => r.status === 'failed').map((r) => r.row);
    expect(failed.length).toBe(1);
    const created: string[] = [];
    const second = await runImport(failed, async (input) => void created.push(input.name));
    expect(created).toEqual(['P3']);
    expect(statuses(second)).toEqual(['created']);
  });
});
