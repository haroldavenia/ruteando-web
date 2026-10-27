import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { Fixture } from '../../../testing/api-testing';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';

import { PackageListComponent } from './package-list.component';

import list from '../../../testing/fixtures/gateway/get__packages.json';

const value = (key: string, active: boolean) => ({ key, label: key, description: null, sortOrder: null, active });
/** Catálogo como el del gateway real: `returned` y una clave de pruebas están inactivos. */
const CATALOG = [
  {
    id: 'd1',
    code: 'PackageStatus',
    description: '',
    system: true,
    values: [value('pending', true), value('attended', true), value('unattended', true), value('cancelled', true), value('returned', false), value('demo_1', false)],
  },
];

describe('PackageListComponent: estados inactivos del catálogo', () => {
  let fixture: ComponentFixture<PackageListComponent>;
  let http: HttpTestingController;
  let overlay: HTMLElement;
  const root = () => fixture.nativeElement as HTMLElement;
  const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
  const body = (status: string) => {
    const page = JSON.parse(JSON.stringify((list as unknown as Fixture).response.body)) as { content: { status: string }[] };
    page.content[0].status = status;
    return page;
  };

  async function open(status: string): Promise<string[]> {
    TestBed.configureTestingModule({
      imports: [PackageListComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
    fixture = TestBed.createComponent(PackageListComponent);
    fixture.detectChanges();
    http.match((r) => r.url === '/gateway/master-domains').forEach((r) => r.flush(CATALOG));
    http.expectOne((r) => r.url === '/gateway/packages').flush(body(status));
    fixture.detectChanges();
    (root().querySelector('[aria-label^="Cambiar el estado del paquete"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    await wait();
    return Array.from(overlay.querySelectorAll('[mat-menu-item]')).map((b) => b.textContent!.trim());
  }

  afterEach(() => http.verify());

  it('con el catálogo del gateway no ofrece «Devuelto» ni claves inactivas', async () => {
    const items = await open('pending');
    expect(items).toEqual(['Atendido', 'No atendido', 'Cancelado']);
    expect(items).not.toContain('Devuelto');
    expect(items.join(' ')).not.toContain('demo_1');
  });

  it('un paquete con un estado inactivo se sigue mostrando con su etiqueta y su menú ofrece los activos', async () => {
    const items = await open('returned');
    expect(root().querySelector('tr.mat-mdc-row')!.textContent).toContain('Devuelto');
    expect(items).toEqual(['Pendiente', 'Atendido', 'No atendido', 'Cancelado']);
  });
});
