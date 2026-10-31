export {};

/** Monta un fragmento en el documento y lo devuelve; se limpia solo. */
const mounted: HTMLElement[] = [];
function mount(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  mounted.push(host);
  return host;
}

const CONTROLS =
  '<div class="ol-viewport"><div class="ol-control ol-zoom"><button class="ol-zoom-in" type="button">+</button><button class="ol-zoom-out" type="button">–</button></div>' +
  '<div class="ol-control ol-attribution"><ul><li><a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a></li></ul></div></div>';

describe('hoja de los mapas (OpenLayers)', () => {
  const root = document.documentElement;

  afterEach(() => {
    mounted.splice(0).forEach((host) => host.remove());
    root.removeAttribute('data-theme');
  });

  describe('teselas', () => {
    const filterOf = () => getComputedStyle(mount('<div class="app-tiles"></div>').firstElementChild!).filter;

    it('con el tema oscuro elegido, la capa base se oscurece invirtiendo la luminosidad', () => {
      root.setAttribute('data-theme', 'dark');

      expect(filterOf()).toContain('invert');
      expect(filterOf()).toContain('hue-rotate');
    });

    it('con el tema claro elegido, la capa base no se toca', () => {
      root.setAttribute('data-theme', 'light');

      expect(filterOf()).toBe('none');
    });

    it('lo que no es la capa base no lleva filtro: rutas, paradas y marcadores conservan sus colores', () => {
      root.setAttribute('data-theme', 'dark');

      expect(getComputedStyle(mount('<div class="ol-layer"></div>').firstElementChild!).filter).toBe('none');
    });
  });

  describe('controles', () => {
    it('los botones de zoom miden 44px, no los 22px de OpenLayers', () => {
      const host = mount(CONTROLS);
      for (const selector of ['.ol-zoom-in', '.ol-zoom-out']) {
        const rect = host.querySelector(selector)!.getBoundingClientRect();
        expect([rect.width, rect.height]).withContext(selector).toEqual([44, 44]);
      }
    });

    it('sus colores salen de los tokens del tema, no de los grises de OpenLayers', () => {
      const style = getComputedStyle(root);
      const pairs: [string, string][] = [
        ['--ol-background-color', '--mat-sys-surface-container-high'],
        ['--ol-foreground-color', '--mat-sys-on-surface'],
        ['--ol-subtle-foreground-color', '--mat-sys-on-surface-variant'],
        ['--ol-brand-color', '--mat-sys-primary'],
      ];

      for (const [ol, token] of pairs) {
        expect(style.getPropertyValue(ol)).withContext(ol).toBe(style.getPropertyValue(token));
      }
      expect(style.getPropertyValue('--ol-partial-background-color')).toContain(style.getPropertyValue('--mat-sys-surface'));
    });

    it('los enlaces de la atribución se distinguen con subrayado y no solo con el color', () => {
      const link = mount(CONTROLS).querySelector('.ol-attribution a') as HTMLElement;

      expect(getComputedStyle(link).textDecorationLine).toBe('underline');
    });

    it('el foco del teclado es el de toda la aplicación: contorno de 3px del color primario', () => {
      const button = mount(CONTROLS).querySelector('.ol-zoom-in') as HTMLButtonElement;
      button.focus({ focusVisible: true } as FocusOptions);

      if (!button.matches(':focus-visible')) {
        pending('el navegador de pruebas no marca este foco como visible');
      }
      expect(getComputedStyle(button).outlineWidth).toBe('3px');
    });
  });
});
