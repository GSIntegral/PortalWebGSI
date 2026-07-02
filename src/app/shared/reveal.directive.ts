import {
  Directive,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  afterNextRender,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Añade la clase `is-visible` cuando el elemento entra en el viewport.
 * Seguro para SSR: sólo se activa en el navegador.
 */
@Directive({
  selector: '[reveal]',
  host: { class: 'reveal' },
})
export class RevealDirective {
  private el = inject(ElementRef<HTMLElement>);
  private platformId = inject(PLATFORM_ID);

  /** Retraso opcional en ms para escalonar la animación. */
  readonly revealDelay = input<number>(0);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const node = this.el.nativeElement as HTMLElement;
      const delay = this.revealDelay();
      if (delay) node.style.transitionDelay = `${delay}ms`;

      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              node.classList.add('is-visible');
              io.unobserve(node);
            }
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
      );
      io.observe(node);
    });
  }
}
