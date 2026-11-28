import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { LocationFixDialog } from '@/components/packages/location-fix-dialog';
import type { ReviewRow } from '@/lib/packages/locating';
import type { DraftPackage } from '@/lib/packages/rows';

import { mockGateway } from './gateway-mock';
import { renderWithI18n } from './render';

vi.mock('@/lib/map/openlayers', () => ({ loadOpenLayers: () => Promise.reject(new Error('sin mapa')) }));

const row = (over: Partial<ReviewRow> = {}, input: Partial<DraftPackage> = {}): ReviewRow =>
  ({
    line: 4,
    original: [],
    input: {
      name: 'Ana',
      address: 'Calle 1',
      city: 'Bogotá',
      country: 'Colombia',
      location: { type: 'Point', coordinates: [-74.08, 4.6] },
      ...input,
    },
    status: 'match',
    standardizedAddress: 'CALLE 1',
    score: 0.95,
    failed: false,
    ...over,
  }) as ReviewRow;

function setup(r: ReviewRow) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  renderWithI18n(<LocationFixDialog row={r} onSave={onSave} onClose={onClose} />);
  return { onSave, onClose };
}

describe('corregir la ubicación de una fila', () => {
  test('si el punto no se movió conserva el estado con el que se ubicó al importar', async () => {
    const { onSave } = setup(row());
    expect(screen.getByRole('dialog', { name: 'Corregir la ubicación de la línea 4' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'match', standardizedAddress: 'CALLE 1', score: 0.95, failed: false })
    );
  });

  test('un punto escrito a mano queda como «manual» y la dirección vacía conserva la original', async () => {
    const { onSave } = setup(row());
    await userEvent.clear(screen.getByLabelText('Latitud'));
    await userEvent.type(screen.getByLabelText('Latitud'), '4.7');
    await userEvent.clear(screen.getByLabelText('Dirección'));
    await userEvent.clear(screen.getByLabelText('Ciudad'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    const saved = onSave.mock.calls[0]![0] as ReviewRow;
    expect(saved).toMatchObject({ status: 'manual', standardizedAddress: null, score: null });
    expect(saved.input.address).toBe('Calle 1');
    expect(saved.input.city).toBeNull();
    expect(saved.input.location).toMatchObject({ coordinates: [-74.08, 4.7] });
  });

  test('sin punto no guarda y lo dice; cerrar avisa', async () => {
    const { onSave, onClose } = setup(
      row({ status: 'unmatch', standardizedAddress: null, score: null }, { location: null })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Elige un punto en el mapa o escribe la latitud y la longitud')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
  });

  test('un punto que dio el geocodificador conserva su estado y su dirección normalizada', async () => {
    mockGateway({
      'POST /middleware/data/geocoding': {
        location: { type: 'Point', coordinates: [-74.07, 4.65] },
        score: 1,
        standardizedAddress: 'CALLE 10',
      },
    });
    const { onSave } = setup(row({ status: 'unmatch', standardizedAddress: null, score: null }, { location: null }));
    await userEvent.click(screen.getByRole('button', { name: 'Ubicar la dirección en el mapa' }));
    await waitFor(() => expect(screen.getByLabelText('Latitud')).toHaveValue(4.65));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ standardizedAddress: 'CALLE 10', score: 1 }));
    expect((onSave.mock.calls[0]![0] as ReviewRow).status).not.toBe('manual');
  });

  test('si lo ubicó el geocodificador y luego se mueve el punto, vuelve a ser «manual»', async () => {
    mockGateway({
      'POST /middleware/data/geocoding': {
        location: { type: 'Point', coordinates: [-74.07, 4.65] },
        score: 1,
        standardizedAddress: 'CALLE 10',
      },
    });
    const { onSave } = setup(row({ status: 'unmatch', standardizedAddress: null, score: null }, { location: null }));
    await userEvent.click(screen.getByRole('button', { name: 'Ubicar la dirección en el mapa' }));
    await waitFor(() => expect(screen.getByLabelText('Latitud')).toHaveValue(4.65));
    await userEvent.clear(screen.getByLabelText('Latitud'));
    await userEvent.type(screen.getByLabelText('Latitud'), '4.9');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect((onSave.mock.calls[0]![0] as ReviewRow).status).toBe('manual');
  });
});
