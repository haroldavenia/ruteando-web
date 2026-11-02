import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { InstallService } from './install.service';

describe('InstallService', () => {
  function promptEvent(outcome: 'accepted' | 'dismissed') {
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: jasmine.Spy;
      userChoice: Promise<{ outcome: string }>;
    };
    event.prompt = jasmine.createSpy('prompt').and.resolveTo();
    event.userChoice = Promise.resolve({ outcome });
    return event;
  }

  function create(platform = 'browser'): InstallService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
    return TestBed.inject(InstallService);
  }

  it('sin aviso del navegador no ofrece instalar', () => {
    expect(create().canInstall()).toBeFalse();
  });

  it('guarda el aviso (sin dejar que el navegador muestre el suyo) y lo ofrece', () => {
    const service = create();
    const event = promptEvent('accepted');
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBeTrue();
    expect(service.canInstall()).toBeTrue();
  });

  it('al instalar abre el cuadro del navegador y, si se acepta, deja de ofrecerlo', async () => {
    const service = create();
    const event = promptEvent('accepted');
    window.dispatchEvent(event);

    await service.install();

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(service.canInstall()).toBeFalse();
  });

  it('recoge el aviso que el navegador lanzó antes de que existiera el servicio', () => {
    const win = window as unknown as { __installPrompt?: unknown };
    win.__installPrompt = promptEvent('accepted');
    try {
      expect(create().canInstall()).toBeTrue();
    } finally {
      delete win.__installPrompt;
    }
  });

  it('el evento appinstalled retira la oferta', () => {
    const service = create();
    window.dispatchEvent(promptEvent('dismissed'));
    window.dispatchEvent(new Event('appinstalled'));

    expect(service.canInstall()).toBeFalse();
  });

  it('en el servidor no escucha nada ni ofrece nada', () => {
    const service = create('server');
    window.dispatchEvent(promptEvent('accepted'));

    expect(service.canInstall()).toBeFalse();
    expect(service.showIosHint()).toBeFalse();
  });
});
