export {};

type Scheme = 'light' | 'dark';

/** Color resuelto de un token del tema para un elemento con ese `color-scheme` (`light-dark()` no se ve en la variable, solo al usarla). */
function resolve(host: HTMLElement, token: string): string {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  host.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

describe('tema de la aplicación', () => {
  const hosts: HTMLElement[] = [];
  const make = (scheme: Scheme, className = '') => {
    const host = document.createElement('div');
    host.className = className;
    host.style.colorScheme = scheme;
    document.body.appendChild(host);
    hosts.push(host);
    return host;
  };
  afterEach(() => hosts.splice(0).forEach((host) => host.remove()));

  it('el documento declara el tema claro y oscuro', () => {
    expect(getComputedStyle(document.documentElement).colorScheme).toMatch(/light\s+dark|only light|light dark/);
    expect(getComputedStyle(document.documentElement).colorScheme).toContain('dark');
  });

  it('cualquier elemento cambia de tokens entre el esquema claro y el oscuro, sin clases especiales', () => {
    expect(resolve(make('light'), '--mat-sys-surface')).not.toBe(resolve(make('dark'), '--mat-sys-surface'));
    expect(resolve(make('light'), '--mat-sys-on-surface')).not.toBe(resolve(make('dark'), '--mat-sys-on-surface'));
  });

  it('.access-theme no redefine el tema: usa los mismos tokens que el resto de la aplicación', () => {
    for (const scheme of ['light', 'dark'] as const) {
      for (const token of ['--mat-sys-surface', '--mat-sys-primary', '--mat-sys-on-surface']) {
        expect(resolve(make(scheme, 'access-theme'), token)).withContext(`${scheme} ${token}`).toBe(resolve(make(scheme), token));
      }
    }
  });
});
