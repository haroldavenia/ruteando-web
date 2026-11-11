import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { language, locale, t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { BrandComponent } from '../../shared/brand/brand.component';
import { LanguageToggleComponent } from '../../shared/ui/language-toggle.component';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle.component';
import { LEGAL, LEGAL_CONTACT } from './legal-content';
import { LEGAL_DOCS, LEGAL_INFO, LegalDoc, legalTitle } from './legal-docs';
import { LegalLinksComponent } from './legal-links.component';

/**
 * Un documento legal (política de privacidad, términos, SMS de verificación): página pública, sin sesión, con su propio marco
 * (marca, idioma y tema arriba; los demás documentos abajo). El documento sale de `data.doc` de la ruta y el texto del idioma activo.
 */
@Component({
  selector: 'app-legal-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    BrandComponent,
    LanguageToggleComponent,
    ThemeToggleComponent,
    LegalLinksComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="top">
      <a routerLink="/" class="home" [attr.aria-label]="'Ir al inicio' | t"><app-brand size="compact" /></a>
      <span class="spacer"></span>
      <app-language-toggle />
      <app-theme-toggle />
    </header>
    <main class="doc">
      <button mat-stroked-button type="button" class="back" (click)="back()">
        <mat-icon aria-hidden="true" fontIcon="arrow_back" />{{ 'Volver' | t }}
      </button>
      <h1>{{ title() }}</h1>
      <p class="updated">{{ updated() }}</p>
      <p class="intro">{{ text().intro }}</p>
      @for (section of text().sections; track section.heading) {
        <section>
          <h2>{{ section.heading }}</h2>
          @for (p of section.paragraphs ?? []; track p) {
            <p>{{ p }}</p>
          }
          @if (section.items; as items) {
            <ul>
              @for (item of items; track item) {
                <li>{{ item }}</li>
              }
            </ul>
          }
        </section>
      }
      <section>
        <h2>{{ contact().heading }}</h2>
        <p>{{ contactText() }}</p>
      </section>
    </main>
    <footer class="bottom"><app-legal-links replace /></footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
    }
    .top,
    .bottom {
      display: flex;
      flex: none;
      align-items: center;
      gap: 12px;
      box-sizing: border-box;
      width: 100%;
      max-width: 880px;
      margin-inline: auto;
      padding: 16px;
    }
    .spacer {
      flex: 1;
    }
    .home {
      color: inherit;
      text-decoration: none;
    }
    .back {
      margin-bottom: 20px;
    }
    .bottom {
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .doc {
      flex: 1;
      box-sizing: border-box;
      width: 100%;
      max-width: 880px;
      margin-inline: auto;
      padding: 24px 16px 40px;
    }
    h1 {
      margin: 0 0 4px;
      font: var(--mat-sys-headline-medium);
    }
    h2 {
      margin: 32px 0 8px;
      font: var(--mat-sys-title-large);
    }
    p,
    li {
      font: var(--mat-sys-body-large);
      line-height: 1.65;
    }
    p {
      margin: 0 0 12px;
    }
    ul {
      margin: 0 0 12px;
      padding-inline-start: 22px;
    }
    li {
      margin-bottom: 6px;
    }
    .updated {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
    .intro {
      margin-top: 20px;
    }
  `,
})
export class LegalPageComponent {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly data = toSignal(inject(ActivatedRoute).data, { initialValue: {} as Record<string, unknown> });
  private readonly doc = computed<LegalDoc>(() => {
    const doc = this.data()['doc'];
    return LEGAL_DOCS.includes(doc as LegalDoc) ? (doc as LegalDoc) : 'privacidad';
  });

  /** Vuelve a donde estaba la persona (el acceso o la aplicación); si abrió el enlace directo no hay a dónde: va al inicio. */
  protected back(): void {
    if (history.length > 1) {
      this.location.back();
    } else {
      void this.router.navigateByUrl('/');
    }
  }

  protected readonly title = computed(() => legalTitle(this.doc()));
  protected readonly text = computed(() => LEGAL[language()][this.doc()]);
  protected readonly contact = computed(() => LEGAL_CONTACT[language()]);
  protected readonly updated = computed(() =>
    t('Última actualización: {0}', [
      new Intl.DateTimeFormat(locale(), { dateStyle: 'long' }).format(new Date(`${LEGAL_INFO.updated}T12:00:00`)),
    ])
  );
  /** Con correo de contacto configurado lo muestra; si no, remite a quien administra la empresa. */
  protected readonly contactText = computed(() => {
    const email = LEGAL_INFO.contactEmail.trim();
    const contact = this.contact();
    return email ? contact.withEmail.replace('{email}', email) : contact.withoutEmail;
  });
}
