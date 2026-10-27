import { HttpContext } from '@angular/common/http';

import {
  DEFAULT_API_ERROR_MESSAGES,
  REQUEST_ERROR_MESSAGES,
  genericMessage,
  resolveErrorMessage,
  withErrorMessage,
} from './api-error-messages';

describe('mensajes de error de la API', () => {
  it('usa los mensajes genéricos en español por estado', () => {
    expect(genericMessage(400)).toBe('La solicitud no es válida');
    expect(genericMessage(401)).toBe('Tu sesión no es válida o ha caducado');
    expect(genericMessage(403)).toBe('No tienes permiso para realizar esta acción');
    expect(genericMessage(404)).toBe('No se encontró el recurso solicitado');
    expect(genericMessage(0)).toBe('No hay conexión con el servidor');
  });

  it('todos los 5xx comparten el mensaje de servicio no disponible', () => {
    for (const status of [500, 502, 503, 504]) {
      expect(genericMessage(status)).toBe('El servicio no está disponible, inténtalo más tarde');
    }
  });

  it('un estado sin texto propio recibe un mensaje neutro', () => {
    expect(genericMessage(409)).toBe('No se pudo completar la solicitud');
  });

  it('no deja sin texto ningún estado de la tabla por defecto', () => {
    expect(Object.keys(DEFAULT_API_ERROR_MESSAGES).sort()).toEqual(['0', '400', '401', '403', '404']);
  });

  it('withErrorMessage guarda los mensajes en el contexto de la petición', () => {
    const context = withErrorMessage({ 404: 'No existe ese paquete' });
    expect(context.get(REQUEST_ERROR_MESSAGES)).toEqual({ 404: 'No existe ese paquete' });
    expect(new HttpContext().get(REQUEST_ERROR_MESSAGES)).toEqual({});
  });

  describe('resolveErrorMessage', () => {
    it('sin personalización devuelve el genérico', () => {
      expect(resolveErrorMessage({ status: 404, code: null }, {}, [])).toBe('No se encontró el recurso solicitado');
    });

    it('el mensaje de la petición sustituye al genérico solo en esa petición', () => {
      const request = { 404: 'No existe ese paquete' };
      expect(resolveErrorMessage({ status: 404, code: null }, request, [])).toBe('No existe ese paquete');
      expect(resolveErrorMessage({ status: 404, code: null }, {}, [])).toBe('No se encontró el recurso solicitado');
    });

    it('usa el mensaje registrado para un código del backend', () => {
      const registered = [{ PACKAGE_NOT_FOUND: 'El paquete ya no existe' }];
      expect(resolveErrorMessage({ status: 404, code: 'PACKAGE_NOT_FOUND' }, {}, registered)).toBe('El paquete ya no existe');
      expect(resolveErrorMessage({ status: 404, code: 'OTRO' }, {}, registered)).toBe('No se encontró el recurso solicitado');
    });

    it('usa el mensaje registrado para un estado', () => {
      expect(resolveErrorMessage({ status: 403, code: null }, {}, [{ 403: 'Solo administradores' }])).toBe('Solo administradores');
    });

    it('prioridad: petición, luego código registrado, luego genérico', () => {
      const registered = [{ PACKAGE_NOT_FOUND: 'Mensaje del código', 404: 'Mensaje del estado' }];
      const error = { status: 404, code: 'PACKAGE_NOT_FOUND' };

      expect(resolveErrorMessage(error, { 404: 'Mensaje de la petición' }, registered)).toBe('Mensaje de la petición');
      expect(resolveErrorMessage(error, {}, registered)).toBe('Mensaje del código');
      expect(resolveErrorMessage({ status: 404, code: null }, {}, registered)).toBe('Mensaje del estado');
      expect(resolveErrorMessage(error, {}, [])).toBe('No se encontró el recurso solicitado');
    });

    it('dentro de la petición el código gana al estado', () => {
      const request = { 404: 'Por estado', PACKAGE_NOT_FOUND: 'Por código' };
      expect(resolveErrorMessage({ status: 404, code: 'PACKAGE_NOT_FOUND' }, request, [])).toBe('Por código');
    });

    it('un registro posterior sustituye a uno anterior', () => {
      const registered = [{ 404: 'Primero' }, { 404: 'Segundo' }];
      expect(resolveErrorMessage({ status: 404, code: null }, {}, registered)).toBe('Segundo');
    });
  });
});
