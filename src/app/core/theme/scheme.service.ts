import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  computed,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';

/** `auto` sigue la preferencia del sistema operativo; `light` y `dark` fuerzan el esquema. */
export type Scheme = 'auto' | 'light' | 'dark';

/** Misma clave que usa la plataforma Facil ISO para recordar la elección del usuario. */
const STORAGE_KEY = 'scheme';

/**
 * Modo claro / oscuro del portal (mismo comportamiento que Facil ISO):
 *  - por defecto, **claro**;
 *  - la elección se guarda en `localStorage('scheme')` y se conserva al recargar;
 *  - el esquema se aplica con la clase `dark` en `<html>` (los colores salen de las variables
 *    CSS de `styles.scss`);
 *  - un script en `index.html` aplica la clase antes del primer pintado, para no parpadear.
 *
 * La lectura de `localStorage` y de `matchMedia` ocurre después del primer render del navegador
 * (no en el constructor) para que la hidratación SSR coincida con el HTML prerenderizado.
 */
@Injectable({ providedIn: 'root' })
export class SchemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _scheme = signal<Scheme>('light');
  private readonly _systemDark = signal(false);
  private readonly _ready = signal(false);

  /** Esquema elegido por el usuario. */
  readonly scheme = this._scheme.asReadonly();

  /** Esquema efectivo (resuelve `auto` con la preferencia del sistema). */
  readonly effective = computed<'light' | 'dark'>(() => {
    const scheme = this._scheme();
    if (scheme === 'auto') {
      return this._systemDark() ? 'dark' : 'light';
    }
    return scheme;
  });

  readonly isDark = computed(() => this.effective() === 'dark');

  constructor() {
    // Aplica la clase solo cuando ya se leyó la preferencia guardada: antes de eso la clase la
    // puso el script de index.html y no debe quitarse por el valor inicial (claro) del signal.
    effect(() => {
      const dark = this.isDark();
      if (!this._ready()) return;
      const root = this.document.documentElement;
      root.classList.toggle('dark', dark);
      root.classList.toggle('light', !dark);
    });

    if (this.isBrowser) {
      afterNextRender(() => {
        this._scheme.set(this.readSaved());

        if (typeof window.matchMedia === 'function') {
          const query = window.matchMedia('(prefers-color-scheme: dark)');
          this._systemDark.set(query.matches);
          query.addEventListener('change', (event) => this._systemDark.set(event.matches));
        }

        this._ready.set(true);
      });
    }
  }

  /** Cambia entre claro y oscuro y recuerda la elección. */
  toggle(): void {
    this.set(this.isDark() ? 'light' : 'dark');
  }

  set(scheme: Scheme): void {
    this._scheme.set(scheme);
    this._ready.set(true);

    try {
      localStorage.setItem(STORAGE_KEY, scheme);
    } catch {
      // localStorage no disponible (modo privado): el cambio aplica solo en memoria.
    }
  }

  private readSaved(): Scheme {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'auto' || saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {
      // sin acceso a localStorage → valor por defecto
    }
    return 'light';
  }
}
