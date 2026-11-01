import { IDENTIFIER_KEYS, IDENTIFIER_LABELS, capacitySummary, driverName, identifierLabel, identifierText, vehicleLabel } from './fleet-labels';

describe('fleet-labels', () => {
  describe('identifierLabel', () => {
    it('tiene etiqueta en español para cada clave de IdentifierType', () => {
      expect(IDENTIFIER_KEYS).toEqual(['citizen_id', 'itin', 'plate', 'code']);
      expect(identifierLabel('citizen_id')).toBe('Documento de identidad');
      expect(identifierLabel('itin')).toBe('Identificación fiscal');
      expect(identifierLabel('plate')).toBe('Placa');
      expect(identifierLabel('code')).toBe('Código interno');
      expect(Object.keys(IDENTIFIER_LABELS).length).toBe(4);
    });

    it('una clave desconocida se muestra tal cual', () => {
      expect(identifierLabel('passport')).toBe('passport');
    });
  });

  describe('identifierText', () => {
    it('junta el tipo y el número', () => {
      expect(identifierText({ identifierType: 'citizen_id', identifierValue: '1020304050' })).toBe('Documento de identidad 1020304050');
    });

    it('sin tipo muestra solo el número y sin número no muestra nada', () => {
      expect(identifierText({ identifierType: null, identifierValue: '1020' })).toBe('1020');
      expect(identifierText({ identifierType: 'itin', identifierValue: null })).toBe('');
      expect(identifierText({ identifierType: null, identifierValue: '  ' })).toBe('');
    });
  });

  describe('capacitySummary', () => {
    it('resume el peso en kg y el volumen en m³', () => {
      expect(capacitySummary({ capacity: { weight: 500, volume: 12_000_000 }, measure: null, restriction: null })).toBe('500 kg · 12 m³');
    });

    it('usa decimales con coma cuando hacen falta, sin separador de miles', () => {
      expect(capacitySummary({ capacity: { weight: 1200.5, volume: 7_956_000 }, measure: null, restriction: null })).toBe('1200,5 kg · 7,96 m³');
    });

    it('sin datos dice «Sin capacidad»', () => {
      expect(capacitySummary({ capacity: null, measure: null, restriction: null })).toBe('Sin capacidad');
      expect(capacitySummary({ capacity: {}, measure: {}, restriction: {} })).toBe('Sin capacidad');
    });

    it('con datos que no sabe leer dice «Definida» en lugar de mentir', () => {
      expect(capacitySummary({ capacity: { units: 4 }, measure: null, restriction: null })).toBe('Definida');
    });

    it('muestra solo la parte que tiene', () => {
      expect(capacitySummary({ capacity: { weight: 25 }, measure: null, restriction: null })).toBe('25 kg');
    });
  });

  describe('nombres existentes', () => {
    it('driverName cae al correo y vehicleLabel a la matrícula o al nombre', () => {
      expect(driverName({ firstName: null, lastName: null, email: 'a@b.c' })).toBe('a@b.c');
      expect(vehicleLabel({ licensePlate: ' ', name: 'Furgón' })).toBe('Furgón');
      expect(vehicleLabel({ licensePlate: 'ABC-1', name: 'Furgón' })).toBe('ABC-1');
    });
  });
});
