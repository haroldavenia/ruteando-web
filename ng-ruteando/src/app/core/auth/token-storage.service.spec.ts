import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TokenStorageService } from './token-storage.service';

const session = { access_token: 'acceso-123', refresh_token: 'refresco-456', expires_in: 3600 };

function newService(platform: 'browser' | 'server' = 'browser'): TokenStorageService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
  return TestBed.inject(TokenStorageService);
}

function storedValues(): string[] {
  return [localStorage, sessionStorage].flatMap((storage) =>
    Object.keys(storage).map((key) => `${key}=${storage.getItem(key)}`),
  );
}

describe('TokenStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-10-19T10:00:30Z'));
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('en el navegador', () => {
    it('guarda el token de acceso solo en memoria', () => {
      const service = newService();
      service.set(session);

      expect(service.get()).toBe('acceso-123');
      expect(storedValues().join('|')).not.toContain('acceso-123');
    });

    it('tras recargar (servicio nuevo) no hay acceso pero sí refresco', () => {
      newService().set(session);
      const recargado = newService();

      expect(recargado.get()).toBe('');
      expect(recargado.getRefreshToken()).toBe('refresco-456');
    });

    it('calcula la caducidad desde el momento actual', () => {
      const service = newService();
      service.set(session);

      expect(localStorage.getItem('hanoitTokenExpiresDate')).toBe('2026-10-19T11:00:30.000Z');
      expect(service.expiresAt?.toISOString()).toBe('2026-10-19T11:00:30.000Z');
    });

    it('devuelve el token de refresco mientras está vigente', () => {
      const service = newService();
      service.set(session);
      jasmine.clock().mockDate(new Date('2026-10-19T10:59:00Z'));

      expect(service.getRefreshToken()).toBe('refresco-456');
    });

    it('descarta el token caducado: devuelve null y limpia el almacenamiento', () => {
      const service = newService();
      service.set(session);
      jasmine.clock().mockDate(new Date('2026-10-19T11:00:31Z'));

      expect(service.getRefreshToken()).toBeNull();
      expect(localStorage.getItem('hanoitToken')).toBeNull();
      expect(localStorage.getItem('hanoitTokenExpiresDate')).toBeNull();
    });

    it('lee una sesión previa de AngularJS con la fecha en formato Date.toString()', () => {
      const futuro = new Date('2026-10-19T12:00:00Z');
      localStorage.setItem('hanoitToken', 'refresco-legacy');
      localStorage.setItem('hanoitTokenExpiresDate', futuro.toString());
      const service = newService();

      expect(service.getRefreshToken()).toBe('refresco-legacy');
      expect(service.expiresAt?.getTime()).toBe(Math.floor(futuro.getTime() / 1000) * 1000);
    });

    it('trata como caducada una sesión previa con la fecha ya pasada', () => {
      localStorage.setItem('hanoitToken', 'refresco-legacy');
      localStorage.setItem('hanoitTokenExpiresDate', new Date('2026-10-19T09:00:00Z').toString());

      expect(newService().getRefreshToken()).toBeNull();
    });

    it('trata como caducada una fecha ilegible, sin lanzar excepción', () => {
      localStorage.setItem('hanoitToken', 'refresco-raro');
      localStorage.setItem('hanoitTokenExpiresDate', 'no-es-una-fecha');
      const service = newService();

      expect(service.expiresAt).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
      expect(localStorage.getItem('hanoitToken')).toBeNull();
    });

    it('reiniciar la sesión borra acceso, refresco y caducidad', () => {
      const service = newService();
      service.set(session);
      service.resetToken();

      expect(service.get()).toBe('');
      expect(service.getRefreshToken()).toBeNull();
      expect(service.expiresAt).toBeNull();
      expect(storedValues()).toEqual([]);
    });

    it('sin sesión no hay token de refresco ni caducidad', () => {
      const service = newService();

      expect(service.getRefreshToken()).toBeNull();
      expect(service.expiresAt).toBeNull();
    });
  });

  describe('en el servidor (SSR)', () => {
    it('no lanza al leer y devuelve que no hay sesión', () => {
      localStorage.setItem('hanoitToken', 'no-debe-leerse');
      const service = newService('server');

      expect(() => service.get()).not.toThrow();
      expect(service.get()).toBe('');
      expect(service.getRefreshToken()).toBeNull();
      expect(service.expiresAt).toBeNull();
    });

    it('no lanza al guardar y no persiste nada', () => {
      const service = newService('server');

      expect(() => service.set(session)).not.toThrow();
      expect(() => service.setRefreshToken('x')).not.toThrow();
      expect(() => service.resetToken()).not.toThrow();
      expect(service.get()).toBe('');
      expect(storedValues()).toEqual([]);
    });
  });
});
