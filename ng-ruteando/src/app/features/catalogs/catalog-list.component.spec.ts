import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { Fixture } from '../../../testing/api-testing';
import domainsFixture from '../../../testing/fixtures/gateway/get__master-domains.json';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { MasterDomain } from '../../core/api/models';
import { CatalogListComponent, valuesText } from './catalog-list.component';

const domains = (domainsFixture as unknown as Fixture).response.body as MasterDomain[];

describe('CatalogListComponent', () => {
  let fixture: ComponentFixture<CatalogListComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CatalogListComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CatalogListComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('lista los catálogos del gateway con su código como enlace al detalle y dice cuántos hay', () => {
    http.expectOne('/gateway/master-domains').flush(domains);
    fixture.detectChanges();
    expect(root().querySelector('app-page-header .subtitle')?.textContent?.trim()).toBe(`${domains.length} catálogos`);
    const first = root().querySelector('tr.mat-mdc-row')!;
    expect(first.querySelector('a')?.getAttribute('href')).toBe(`/catalogs/${domains[0].code}`);
    expect(first.textContent).toContain(domains[0].description);
  });

  it('un solo catálogo se dice en singular', () => {
    http.expectOne('/gateway/master-domains').flush([domains[0]]);
    fixture.detectChanges();
    expect(root().querySelector('app-page-header .subtitle')?.textContent?.trim()).toBe('1 catálogo');
  });

  it('valuesText cuenta los valores activos sobre el total', () => {
    http.expectOne('/gateway/master-domains').flush([]);
    const packageStatus = domains.find((d) => d.code === 'PackageStatus') as MasterDomain;
    const active = packageStatus.values.filter((v) => v.active).length;
    expect(valuesText(packageStatus)).toBe(`${active} de ${packageStatus.values.length}`);
    expect(active).toBeLessThan(packageStatus.values.length);
  });
});
