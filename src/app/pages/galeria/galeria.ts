import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { UserService } from '../../core/user/user.service';
import { RevealDirective } from '../../shared/reveal.directive';
import {
  CATEGORY_LABELS,
  GaleriaService,
  PHOTO_CATEGORIES,
  Photo,
  PhotoCategory,
} from './galeria.service';

/** Encaja con la retícula de la galería: 4 columnas × 2 filas en escritorio. */
const PAGE_SIZE = 8;

/** Cuántos números de página se muestran a la vez en el paginador. */
const PAGE_WINDOW = 5;

@Component({
  selector: 'app-galeria',
  imports: [RouterLink, RevealDirective],
  templateUrl: './galeria.html',
  styleUrl: './galeria.scss',
})
export class Galeria {
  private service = inject(GaleriaService);
  private userService = inject(UserService);

  /** La galería es pública; el acceso al editor solo se muestra con sesión iniciada. */
  readonly currentUser = toSignal(this.userService.user$);

  readonly categories = PHOTO_CATEGORIES;
  readonly labels = CATEGORY_LABELS;

  /** null = "Todas". */
  readonly filter = signal<PhotoCategory | null>(null);
  readonly page = signal(1);

  readonly photos = signal<Photo[]>([]);
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly hasPrevious = signal(false);
  readonly hasNext = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly active = signal<Photo | null>(null);

  /** Ventana de páginas alrededor de la actual: con muchas fotos no cabrían todas. */
  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.page();

    let start = Math.max(1, current - Math.floor(PAGE_WINDOW / 2));
    const end = Math.min(total, start + PAGE_WINDOW - 1);
    start = Math.max(1, end - PAGE_WINDOW + 1);

    return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.service.getList(this.filter(), this.page(), PAGE_SIZE).subscribe({
      next: (result) => {
        this.photos.set(result.items);
        this.totalCount.set(result.totalCount);
        this.totalPages.set(result.totalPages);
        this.hasPrevious.set(result.hasPrevious);
        this.hasNext.set(result.hasNext);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.photos.set([]);
        this.totalCount.set(0);
        this.totalPages.set(0);
        this.loading.set(false);
        this.error.set(this.describe(err));
      },
    });
  }

  setFilter(category: PhotoCategory | null): void {
    if (this.filter() === category) return;

    this.filter.set(category);
    // La categoría nueva puede tener menos páginas: seguir en la actual dejaría
    // la retícula vacía.
    this.page.set(1);
    this.reload();
  }

  goTo(page: number): void {
    if (page === this.page() || page < 1 || page > this.totalPages()) return;

    this.page.set(page);
    this.reload();

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  label(category: PhotoCategory): string {
    return this.labels[category];
  }

  open(photo: Photo): void {
    this.active.set(photo);
  }

  close(): void {
    this.active.set(null);
  }

  private describe(err: HttpErrorResponse): string {
    if (err?.status === 0)
      return 'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.';
    return err?.error?.message ?? 'No se pudo cargar el registro fotográfico. Intenta nuevamente.';
  }
}
