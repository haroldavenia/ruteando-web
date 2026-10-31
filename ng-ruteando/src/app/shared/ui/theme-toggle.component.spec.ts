import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { THEME_STORAGE_KEY } from '../../core/theme/theme.service';

import { ThemeToggleComponent } from './theme-toggle.component';

describe('ThemeToggleComponent', () => {
  let fixture: ComponentFixture<ThemeToggleComponent>;
  const root = document.documentElement;
  const toggles = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-button-toggle')) as HTMLElement[];
  const buttons = () => toggles().map((toggle) => toggle.querySelector('button') as HTMLButtonElement);

  beforeEach(async () => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    root.removeAttribute('data-theme');
    await TestBed.configureTestingModule({ imports: [ThemeToggleComponent], providers: [provideNoopAnimations()] }).compileComponents();
    fixture = TestBed.createComponent(ThemeToggleComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    root.removeAttribute('data-theme');
  });

  it('es un grupo con nombre en español y tres botones de icono, cada uno con su nombre accesible', () => {
    const group = (fixture.nativeElement as HTMLElement).querySelector('mat-button-toggle-group')!;
    expect(group.getAttribute('aria-label')).toBe('Tema de color');
    expect(buttons().map((button) => button.getAttribute('aria-label'))).toEqual(['Tema del sistema', 'Tema claro', 'Tema oscuro']);
    expect(toggles().map((toggle) => toggle.querySelector('mat-icon')?.textContent?.trim())).toEqual(['brightness_auto', 'light_mode', 'dark_mode']);
    expect(toggles().every((toggle) => toggle.querySelector('mat-icon')?.getAttribute('aria-hidden') === 'true')).toBeTrue();
  });

  it('cada botón de icono lleva título con su nombre, para saber qué hace al pasar el cursor', () => {
    const toggles = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-button-toggle')) as HTMLElement[];

    expect(toggles.map((toggle) => toggle.getAttribute('title'))).toEqual(['Tema del sistema', 'Tema claro', 'Tema oscuro']);
    expect(toggles.map((toggle) => toggle.getAttribute('title'))).toEqual(buttons().map((button) => button.getAttribute('aria-label')));
  });

  it('arranca con «Sistema» elegido y lo anuncia como elegido (radio)', () => {
    expect(buttons().map((button) => button.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    expect(toggles().map((toggle) => toggle.classList.contains('mat-button-toggle-checked'))).toEqual([true, false, false]);
  });

  it('al elegir Oscuro cambia el tema de la aplicación, lo recuerda y lo marca como el elegido', () => {
    buttons()[2].click();
    fixture.detectChanges();

    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(buttons().map((button) => button.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true']);
  });

  it('al elegir Claro y luego Sistema vuelve a seguir al dispositivo', () => {
    buttons()[1].click();
    fixture.detectChanges();
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(buttons()[1].getAttribute('aria-checked')).toBe('true');

    buttons()[0].click();
    fixture.detectChanges();
    expect(root.hasAttribute('data-theme')).toBeFalse();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(buttons()[0].getAttribute('aria-checked')).toBe('true');
  });

  it('con una elección guardada arranca con ella marcada', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [ThemeToggleComponent], providers: [provideNoopAnimations()] }).compileComponents();
    fixture = TestBed.createComponent(ThemeToggleComponent);
    fixture.detectChanges();
    expect(buttons().map((button) => button.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
  });

  it('es una píldora de 36px de alto con botones táctiles de al menos 36px', () => {
    document.body.appendChild(fixture.nativeElement);
    const heights = buttons().map((button) => button.getBoundingClientRect().height);
    expect(heights.every((height) => height >= 36)).toBeTrue();
    expect(getComputedStyle((fixture.nativeElement as HTMLElement).querySelector('mat-button-toggle-group')!).borderTopLeftRadius).toBe('999px');
    (fixture.nativeElement as HTMLElement).remove();
  });
});
