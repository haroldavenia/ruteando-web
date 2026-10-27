export {};

/** Monta un fragmento en el documento y lo devuelve; se limpia solo. */
const mounted: HTMLElement[] = [];
function mount(html: string, scheme: 'light' | 'dark' = 'light'): HTMLElement {
  const host = document.createElement('div');
  host.style.colorScheme = scheme;
  host.innerHTML = html;
  document.body.appendChild(host);
  mounted.push(host);
  return host;
}

describe('sistema de interfaz común', () => {
  afterEach(() => mounted.splice(0).forEach((host) => host.remove()));

  it('.page es un marco centrado con ancho máximo y lo enrutado dentro es una columna con espacio entre bloques', () => {
    const host = mount('<div style="width: 3000px"><div class="page"><router-outlet></router-outlet><app-x><h1>Título</h1><p>a</p></app-x></div></div>');
    const page = host.querySelector('.page') as HTMLElement;
    const style = getComputedStyle(page);
    expect(style.maxWidth).toBe('1200px');
    expect(parseFloat(style.marginLeft)).toBeGreaterThan(800);
    const screen = getComputedStyle(page.querySelector('app-x')!);
    expect(screen.display).toBe('flex');
    expect(screen.flexDirection).toBe('column');
    expect(screen.rowGap).toBe('24px');
    expect(getComputedStyle(page.querySelector('router-outlet')!).display).not.toBe('flex');
  });

  it('el título y los encabezados de sección de .page tienen un estilo único', () => {
    const page = mount('<div class="page"><h1>Título</h1><h2>Sección</h2></div>');
    const h1 = getComputedStyle(page.querySelector('h1')!);
    const h2 = getComputedStyle(page.querySelector('h2')!);
    expect(parseFloat(h1.fontSize)).toBeGreaterThanOrEqual(28);
    expect(h1.marginBottom).toBe('0px');
    expect(parseFloat(h2.fontSize)).toBeLessThan(parseFloat(h1.fontSize));
    expect(h2.marginBottom).toBe('12px');
  });

  it('.card tiene esquinas, borde y relleno comunes y su fondo cambia con el tema', () => {
    const light = getComputedStyle(mount('<div class="card">x</div>', 'light').firstElementChild!);
    expect(light.borderTopLeftRadius).toBe('20px');
    expect(light.borderTopWidth).toBe('1px');
    expect(light.paddingLeft).toBe('24px');
    const lightBg = light.backgroundColor;
    const darkBg = getComputedStyle(mount('<div class="card">x</div>', 'dark').firstElementChild!).backgroundColor;
    expect(darkBg).not.toBe(lightBg);
  });

  it('.card.flush no tiene relleno y recorta el contenido a sus esquinas', () => {
    const style = getComputedStyle(mount('<div class="card flush">x</div>').firstElementChild!);
    expect(style.paddingLeft).toBe('0px');
    expect(style.overflow).toBe('hidden');
  });

  it('.stat-grid es una rejilla que conserva el marcado dl > div > dt y dd', () => {
    const grid = mount('<dl class="summary stat-grid"><div><dt>Estado</dt><dd>Planificada</dd></div></dl>').firstElementChild as HTMLElement;
    expect(getComputedStyle(grid).display).toBe('grid');
    expect(grid.querySelector('div > dt')?.textContent).toBe('Estado');
    expect(getComputedStyle(grid.querySelector('dd')!).marginLeft).toBe('0px');
    expect(getComputedStyle(grid.querySelector('div')!).flexDirection).toBe('column');
  });

  it('.visually-hidden oculta el texto sin quitarlo del árbol de accesibilidad', () => {
    const el = mount('<span class="visually-hidden">Solo lectores</span>').firstElementChild as HTMLElement;
    const style = getComputedStyle(el);
    expect(style.position).toBe('absolute');
    expect(style.width).toBe('1px');
    expect(style.left).toBe('0px');
    expect(el.textContent).toBe('Solo lectores');
  });

  it('los selectores son de baja especificidad: un componente puede sobrescribirlos', () => {
    const el = mount('<div class="card" style="padding: 4px">x</div>').firstElementChild as HTMLElement;
    expect(getComputedStyle(el).paddingLeft).toBe('4px');
  });

  it('un texto oculto dentro de una tabla ancha no amplía el área desplazable de la página', () => {
    const host = mount('<div id="marco" style="width: 300px; overflow: auto"><table style="width: 900px"><thead><tr><th>A</th><th><span class="visually-hidden">Acciones</span></th></tr></thead></table></div>');
    const marco = host.querySelector('#marco') as HTMLElement;
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1);
    expect(marco.scrollWidth).toBeGreaterThan(marco.clientWidth);
  });
});
