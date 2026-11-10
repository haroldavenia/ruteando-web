import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QrCodeComponent } from './qr-code.component';
import { RecoveryCodesComponent } from './recovery-codes.component';

const CODES = Array.from({ length: 10 }, (_, i) => `ABCD${i}-EFGH${i}`);
const wait = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

describe('RecoveryCodesComponent', () => {
  let fixture: ComponentFixture<RecoveryCodesComponent>;
  let root: HTMLElement;
  let saved: number;

  const buttonNamed = (text: string) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes(text))!;

  beforeEach(() => {
    saved = 0;
    fixture = TestBed.createComponent(RecoveryCodesComponent);
    fixture.componentRef.setInput('codes', CODES);
    fixture.componentInstance.saved.subscribe(() => saved++);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  it('muestra los diez códigos y avisa de que no volverán a mostrarse', () => {
    expect(Array.from(root.querySelectorAll('li')).map((li) => li.textContent)).toEqual(CODES);
    expect(root.querySelector('[role="note"]')?.textContent).toContain('no volverán a mostrarse');
  });

  it('copiar los pone en el portapapeles, uno por línea, y lo anuncia', async () => {
    const write = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    buttonNamed('Copiar').click();
    await wait();
    fixture.detectChanges();

    expect(write).toHaveBeenCalledWith(CODES.join('\n'));
    expect(root.querySelector('[role="status"]')?.textContent).toBe('Códigos copiados');
  });

  it('si el portapapeles falla lo dice en lugar de callar', async () => {
    spyOn(navigator.clipboard, 'writeText').and.rejectWith(new Error('denegado'));
    buttonNamed('Copiar').click();
    await wait();
    fixture.detectChanges();

    expect(root.querySelector('[role="status"]')?.textContent).toContain('No se pudo copiar');
  });

  it('descargar genera un archivo de texto con los códigos', async () => {
    let blob: Blob | undefined;
    spyOn(URL, 'createObjectURL').and.callFake((b) => {
      blob = b as Blob;
      return 'blob:prueba';
    });
    spyOn(URL, 'revokeObjectURL');
    const click = spyOn(HTMLAnchorElement.prototype, 'click').and.stub();
    buttonNamed('Descargar').click();

    expect(click).toHaveBeenCalled();
    expect(await blob!.text()).toBe(CODES.join('\n') + '\n');
    expect(blob!.type).toBe('text/plain');
  });

  it('«Ya los guardé» avisa para seguir', () => {
    buttonNamed('Ya los guardé').click();
    expect(saved).toBe(1);
  });
});

describe('QrCodeComponent', () => {
  it('dibuja el código como SVG accesible, oscuro sobre claro', async () => {
    const fixture = TestBed.createComponent(QrCodeComponent);
    fixture.componentRef.setInput('text', 'otpauth://totp/Ruteando:ana?secret=JBSWY3DPEHPK3PXP');
    fixture.detectChanges();
    await wait(80);
    fixture.detectChanges();

    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Código QR para la aplicación autenticadora');
    expect(svg.querySelector('rect')?.getAttribute('fill')).toBe('#fff');
    const path = svg.querySelector('path')!;
    expect(path.getAttribute('fill')).toBe('#000');
    expect(path.getAttribute('d')!.length).toBeGreaterThan(200);
    const size = Number(svg.getAttribute('viewBox')!.split(' ')[2]);
    expect(size).toBeGreaterThan(20); // versión mínima 1 (21) más el margen
  });
});
