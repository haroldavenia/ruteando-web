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

function themed(scheme: Scheme, accessTheme = true): HTMLElement {
  const host = document.createElement('div');
  if (accessTheme) {
    host.className = 'access-theme';
  }
  host.style.colorScheme = scheme;
  document.body.appendChild(host);
  return host;
}

describe('tema de la vista de acceso', () => {
  const hosts: HTMLElement[] = [];
  const make = (scheme: Scheme, accessTheme = true) => {
    const host = themed(scheme, accessTheme);
    hosts.push(host);
    return host;
  };
  afterEach(() => hosts.splice(0).forEach((host) => host.remove()));

  it('con .access-theme los tokens cambian entre el esquema claro y el oscuro', () => {
    const light = resolve(make('light'), '--mat-sys-surface');
    const dark = resolve(make('dark'), '--mat-sys-surface');
    expect(light).not.toBe(dark);
    expect(resolve(make('light'), '--mat-sys-on-surface')).not.toBe(resolve(make('dark'), '--mat-sys-on-surface'));
  });

  it('fuera de .access-theme el tema sigue siendo el claro, aunque el esquema sea oscuro', () => {
    const light = resolve(make('light'), '--mat-sys-surface');
    const outsideDark = resolve(make('dark', false), '--mat-sys-surface');
    expect(outsideDark).toBe(light);
  });

  it('el esquema claro de la vista de acceso coincide con el tema de la aplicación', () => {
    expect(resolve(make('light'), '--mat-sys-primary')).toBe(resolve(make('light', false), '--mat-sys-primary'));
  });
});
