import { fleetReturnUrl, readHandoff, toHandoffState } from './type-handoff';

describe('type-handoff', () => {
  describe('fleetReturnUrl', () => {
    it('acepta rutas internas de la flota, con o sin consulta', () => {
      expect(fleetReturnUrl('/flota/vehiculos/nuevo')).toBe('/flota/vehiculos/nuevo');
      expect(fleetReturnUrl('/flota/vehiculos/abc?x=1')).toBe('/flota/vehiculos/abc?x=1');
    });

    it('rechaza lo que no es de la flota', () => {
      expect(fleetReturnUrl('/lugares/nuevo')).toBeNull();
      expect(fleetReturnUrl('/')).toBeNull();
      expect(fleetReturnUrl('/flota')).toBeNull();
    });

    it('rechaza destinos externos o ambiguos', () => {
      for (const raw of ['//otro.invalid/flota/x', 'https://otro.invalid/flota/x', '/\\otro.invalid', '/flota/../acceso', 'javascript:alert(1)', '', null]) {
        expect(fleetReturnUrl(raw as string | null)).withContext(String(raw)).toBeNull();
      }
    });
  });

  describe('estado de la navegación', () => {
    it('ida y vuelta del borrador y del tipo creado', () => {
      const state = toHandoffState({ draft: { name: 'Furgón' }, createdTypeId: 't1' });
      expect(readHandoff(state)).toEqual({ draft: { name: 'Furgón' }, createdTypeId: 't1' });
    });

    it('el tipo creado es opcional', () => {
      expect(readHandoff(toHandoffState({ draft: {} }))).toEqual({ draft: {} });
    });

    it('cualquier otro estado es null', () => {
      for (const state of [null, undefined, 'x', 1, {}, { navigationId: 3 }, { fleetTypeHandoff: null }, { fleetTypeHandoff: 'x' }, { fleetTypeHandoff: {} }]) {
        expect(readHandoff(state)).withContext(JSON.stringify(state)).toBeNull();
      }
    });

    it('un createdTypeId que no es texto se ignora', () => {
      expect(readHandoff({ fleetTypeHandoff: { draft: {}, createdTypeId: 7 } })).toEqual({ draft: {} });
    });
  });
});
