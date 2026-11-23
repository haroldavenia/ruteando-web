import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

/** El evento que Chrome, Edge y Android lanzan cuando la aplicación se puede instalar (no está en los tipos de TypeScript). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Instalación de la aplicación (PWA). En Chrome/Edge/Android guarda el aviso del navegador para ofrecer «Instalar aplicación»
 * cuando la persona quiera; Safari de iPhone/iPad no tiene ese aviso (se instala desde «Compartir»), así que solo se ofrece una
 * pista. `beforeinstallprompt` puede llegar antes de que cargue el menú: lo captura `assets/install-init.js`. Seguro en el servidor.
 */
@Injectable({ providedIn: 'root' })
export class InstallService {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly deferred = signal<BeforeInstallPromptEvent | null>(null);
  private readonly installed = signal(false);

  /** Hay un aviso guardado y la aplicación aún no está instalada. */
  readonly canInstall = computed(() => this.deferred() !== null && !this.installed());

  /** iPhone o iPad con Safari y sin instalar: no hay aviso, solo se puede explicar el camino manual. */
  readonly showIosHint = computed(() => this.isIos() && !this.isStandalone() && !this.installed());

  constructor() {
    const view = this.browser ? this.document.defaultView : null;
    if (!view) {
      return;
    }
    // `assets/install-init.js` lo guarda desde el primer momento: este servicio nace con el menú, ya tarde
    const early = (view as Window & { __installPrompt?: BeforeInstallPromptEvent }).__installPrompt;
    if (early) {
      this.deferred.set(early);
    }
    view.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault(); // sin esto el navegador muestra su propia mini-barra y no deja elegir el momento
      this.deferred.set(event as BeforeInstallPromptEvent);
    });
    view.addEventListener('appinstalled', () => {
      this.installed.set(true);
      this.deferred.set(null);
    });
  }

  /** Abre el cuadro de instalación del navegador. El aviso solo vale una vez. */
  async install(): Promise<void> {
    const event = this.deferred();
    if (!event) {
      return;
    }
    this.deferred.set(null);
    await event.prompt();
    if ((await event.userChoice).outcome === 'accepted') {
      this.installed.set(true);
    }
  }

  private isStandalone(): boolean {
    const view = this.document.defaultView;
    return (
      !!view &&
      (view.matchMedia?.('(display-mode: standalone)').matches === true ||
        (view.navigator as Navigator & { standalone?: boolean }).standalone === true)
    );
  }

  private isIos(): boolean {
    const view = this.document.defaultView;
    return !!view && /iPad|iPhone|iPod/.test(view.navigator.userAgent);
  }
}
