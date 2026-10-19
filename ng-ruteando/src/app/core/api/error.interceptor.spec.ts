import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL, Page } from './api-config';
import { ApiError } from './api-error';
import { provideApiErrorMessages, withErrorMessage } from './api-error-messages';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor y respuestas de la API', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  function setup(extraProviders: unknown[] = []): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        ...(extraProviders as []),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  }

  /** Lanza la petición, responde con un error y devuelve el `ApiError` recibido. */
  async function failWith(url: string, status: number, body: string | object | null, options: { context?: ReturnType<typeof withErrorMessage> } = {}): Promise<ApiError> {
    const result = new Promise<ApiError>((resolve, reject) =>
      http.get(url, options).subscribe({ next: () => reject(new Error('se esperaba un error')), error: resolve }),
    );
    const req = controller.expectOne(url);
    if (status === 0) {
      req.error(new ProgressEvent('error'));
    } else {
      req.flush(body, { status, statusText: 'x' });
    }
    return result;
  }

  beforeEach(() => setup());
  afterEach(() => controller.verify());

  describe('mensajes por defecto', () => {
    const cases: [number, string][] = [
      [400, 'La solicitud no es válida'],
      [401, 'Tu sesión no es válida o ha caducado'],
      [403, 'No tienes permiso para realizar esta acción'],
      [404, 'No se encontró el recurso solicitado'],
      [500, 'El servicio no está disponible, inténtalo más tarde'],
      [503, 'El servicio no está disponible, inténtalo más tarde'],
      [0, 'No hay conexión con el servidor'],
    ];
    for (const [status, message] of cases) {
      it(`estado ${status}`, async () => {
        const error = await failWith('/gateway/places', status, { message: 'texto del servidor' });
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(status);
        expect(error.message).toBe(message);
        expect(error.isNetwork).toBe(status === 0);
      });
    }
  });

  it('conserva el cuerpo del servidor en details pero no lo muestra', async () => {
    const error = await failWith('/gateway/places', 400, { code: 'BAD_PAGE', message: 'page debe ser >= 0' });
    expect(error.message).toBe('La solicitud no es válida');
    expect(error.code).toBe('BAD_PAGE');
    expect(error.details).toEqual({ code: 'BAD_PAGE', message: 'page debe ser >= 0' });
    expect(error.raw?.status).toBe(400);
  });

  it('toma `error` como código solo si tiene aspecto de código', async () => {
    expect((await failWith('/gateway/a', 400, { error: 'PACKAGE_INVALID' })).code).toBe('PACKAGE_INVALID');
    expect((await failWith('/gateway/b', 400, { error: 'Bad Request' })).code).toBeNull();
  });

  describe('cuerpos no interpretables', () => {
    it('cuerpo vacío', async () => {
      const error = await failWith('/gateway/places', 404, null);
      expect(error.message).toBe('No se encontró el recurso solicitado');
      expect(error.code).toBeNull();
    });

    it('cuerpo que no es JSON', async () => {
      const error = await failWith('/gateway/places', 500, '<html>Bad gateway</html>');
      expect(error.message).toBe('El servicio no está disponible, inténtalo más tarde');
      expect(error.code).toBeNull();
    });

    it('cuerpo con una forma desconocida', async () => {
      const error = await failWith('/gateway/places', 400, [1, 2, 3]);
      expect(error.message).toBe('La solicitud no es válida');
      expect(error.code).toBeNull();
    });
  });

  it('no abre diálogos del navegador', async () => {
    const alert = spyOn(window, 'alert');
    const confirm = spyOn(window, 'confirm');
    await failWith('/gateway/places', 500, null);
    await failWith('/gateway/places', 0, null);
    expect(alert).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('un mensaje por petición solo afecta a esa petición', async () => {
    const custom = await failWith('/gateway/packages/1', 404, null, { context: withErrorMessage({ 404: 'No existe ese paquete' }) });
    const other = await failWith('/gateway/packages/2', 404, null);
    expect(custom.message).toBe('No existe ese paquete');
    expect(other.message).toBe('No se encontró el recurso solicitado');
  });

  it('usa el mensaje registrado para el código del backend', async () => {
    setup([provideApiErrorMessages({ PACKAGE_NOT_FOUND: 'El paquete ya no existe' })]);
    const error = await failWith('/gateway/packages/1', 404, { code: 'PACKAGE_NOT_FOUND' });
    expect(error.message).toBe('El paquete ya no existe');
  });

  it('prioridad: petición, código registrado y genérico', async () => {
    setup([provideApiErrorMessages({ PACKAGE_NOT_FOUND: 'Mensaje del código' })]);
    const body = { code: 'PACKAGE_NOT_FOUND' };
    const byRequest = await failWith('/gateway/p/1', 404, body, { context: withErrorMessage({ 404: 'Mensaje de la petición' }) });
    const byCode = await failWith('/gateway/p/2', 404, body);
    const generic = await failWith('/gateway/p/3', 404, null);
    expect(byRequest.message).toBe('Mensaje de la petición');
    expect(byCode.message).toBe('Mensaje del código');
    expect(generic.message).toBe('No se encontró el recurso solicitado');
  });

  it('no toca los errores de peticiones a otras URLs', async () => {
    const result = new Promise<unknown>((resolve) => http.get('/otra/ruta').subscribe({ error: resolve }));
    controller.expectOne('/otra/ruta').flush(null, { status: 500, statusText: 'x' });
    const error = await result;
    expect(error).not.toBeInstanceOf(ApiError);
  });

  describe('respuestas de éxito sin cuerpo útil', () => {
    it('un 202 con [] entrega una lista vacía', async () => {
      const result = new Promise<unknown[]>((resolve) => http.get<unknown[]>('/gateway/positions').subscribe(resolve));
      controller.expectOne('/gateway/positions').flush([], { status: 202, statusText: 'Accepted' });
      expect(await result).toEqual([]);
    });

    it('un 204 sin cuerpo completa la operación sin error', async () => {
      const result = new Promise<unknown>((resolve, reject) =>
        http.delete('/gateway/places/1').subscribe({ next: resolve, error: reject }),
      );
      controller.expectOne('/gateway/places/1').flush(null, { status: 204, statusText: 'No Content' });
      expect(await result).toBeNull();
    });
  });

  it('una página del gateway llega tipada y las listas sin paginar llegan como arreglo', async () => {
    const page = new Promise<Page<{ id: string }>>((resolve) => http.get<Page<{ id: string }>>('/gateway/places').subscribe(resolve));
    controller.expectOne('/gateway/places').flush({ content: [{ id: 'a' }], page: 0, size: 20, totalElements: 1, totalPages: 1 });
    expect((await page).content[0].id).toBe('a');

    const list = new Promise<string[]>((resolve) => http.get<string[]>('/gateway/master-domains').subscribe(resolve));
    controller.expectOne('/gateway/master-domains').flush(['x', 'y']);
    expect(await list).toEqual(['x', 'y']);
  });
});
