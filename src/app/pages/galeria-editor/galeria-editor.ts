import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CATEGORY_LABELS,
  GaleriaService,
  PHOTO_CATEGORIES,
  Photo,
  PhotoCategory,
} from '../galeria/galeria.service';

const PAGE_SIZE = 10;

/** Debe coincidir con ImageStorage:MaxSizeBytes del backend (3 MB). */
const MAX_IMAGE_BYTES = 3_145_728;

/** Debe coincidir con la lista de ImageHandlingService.IsValidImageFile. */
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/webp',
  'image/svg+xml',
];

@Component({
  selector: 'app-galeria-editor',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './galeria-editor.html',
  styleUrl: './galeria-editor.scss',
})
export class GaleriaEditor {
  private service = inject(GaleriaService);
  private fb = inject(FormBuilder);

  readonly categories = PHOTO_CATEGORIES;
  readonly labels = CATEGORY_LABELS;

  readonly photos = signal<Photo[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(0);
  readonly totalCount = signal(0);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly submitted = signal(false);

  readonly imageFile = signal<File | null>(null);
  readonly imagePreview = signal<string | null>(null);

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    category: ['', Validators.required],
    place: ['', Validators.maxLength(100)],
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.service.getList(null, this.page(), PAGE_SIZE).subscribe({
      next: (result) => {
        this.photos.set(result.items);
        this.totalPages.set(result.totalPages);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.photos.set([]);
        this.loading.set(false);
        this.error.set(this.describe(err));
      },
    });
  }

  goTo(page: number): void {
    if (page === this.page() || page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.reload();
  }

  label(category: PhotoCategory): string {
    return this.labels[category];
  }

  newPhoto(): void {
    this.editingId.set(null);
    this.submitted.set(false);
    this.formError.set(null);
    this.form.reset({ title: '', category: '', place: '' });
    this.imageFile.set(null);
    this.imagePreview.set(null);
    this.showForm.set(true);
  }

  edit(photo: Photo): void {
    this.editingId.set(photo.id);
    this.submitted.set(false);
    this.formError.set(null);
    this.form.reset({
      title: photo.title,
      category: photo.category,
      place: photo.place ?? '',
    });
    // Sin archivo nuevo: se previsualiza la imagen actual y se conserva si no se cambia.
    this.imageFile.set(null);
    this.imagePreview.set(photo.imageUrl);
    this.showForm.set(true);
  }

  cancel(): void {
    this.showForm.set(false);
    this.formError.set(null);
    this.imageFile.set(null);
    this.imagePreview.set(null);
  }

  onImageFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Se valida aquí lo mismo que valida el backend, para dar el error al instante
    // en vez de después de subir varios MB.
    if (!ALLOWED_TYPES.includes(file.type)) {
      this.formError.set('Formato no permitido. Usa JPG, PNG, GIF, BMP, WEBP o SVG.');
      input.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.formError.set('La imagen no debe superar 3 MB.');
      input.value = '';
      return;
    }

    this.formError.set(null);
    this.imageFile.set(file);

    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  save(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.editingId();
    const file = this.imageFile();

    if (!id && !file) {
      this.formError.set('Debes adjuntar una imagen.');
      return;
    }

    const payload = {
      title: this.form.value.title!.trim(),
      category: this.form.value.category as PhotoCategory,
      place: this.form.value.place?.trim() || null,
    };

    this.saving.set(true);
    this.formError.set(null);

    const request$ = id
      ? this.service.update({ ...payload, id }, file)
      : this.service.create(payload, file!);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.imageFile.set(null);
        this.imagePreview.set(null);
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.formError.set(this.describe(err));
      },
    });
  }

  remove(photo: Photo): void {
    if (typeof window !== 'undefined' && !window.confirm(`¿Eliminar la fotografía "${photo.title}"?`)) {
      return;
    }

    this.service.delete(photo.id).subscribe({
      next: () => {
        // Era la única de la página: sin retroceder quedaría una página vacía.
        if (this.photos().length === 1 && this.page() > 1) {
          this.page.set(this.page() - 1);
        }
        this.reload();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.describe(err)),
    });
  }

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.touched || this.submitted());
  }

  private describe(err: HttpErrorResponse): string {
    if (err?.status === 0)
      return 'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.';
    if (err?.status === 403) return 'No tienes permiso para esta acción.';
    if (err?.status === 413) return 'La imagen es demasiado grande.';
    // Si el archivo supera el límite de multipart, el servidor corta la petición antes
    // de construir su envelope y responde un ProblemDetails sin `message`.
    if (err?.status === 400 && !err?.error?.message && err?.error?.errors) {
      return 'No se pudo procesar el archivo. Revisa que la imagen no supere 3 MB.';
    }
    return err?.error?.message ?? 'Ocurrió un error. Intenta nuevamente.';
  }
}
