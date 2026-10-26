import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  SstClient,
  SstClientCreate,
  SstEditorService,
} from '../../sst-editor/sst-editor.service';

/**
 * Pestaña «Empresas» de la administración del portal (HU_079): crea, edita y elimina las empresas
 * cliente que aparecen en el selector del tablero SST. Son las mismas empresas (CLIENTE_SST) que
 * ya alimentan indicadores, demografía y capacitaciones; aquí solo se movió su gestión.
 */
@Component({
  selector: 'app-portal-companies',
  imports: [ReactiveFormsModule],
  templateUrl: './portal-companies.html',
  styleUrl: '../portal-admin-panel.scss',
})
export class PortalCompanies {
  private service = inject(SstEditorService);
  private fb = inject(FormBuilder);

  readonly clients = signal<SstClient[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly submitted = signal(false);

  readonly riskLevels = ['I', 'II', 'III', 'IV', 'V'];

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    riskLevel: [''],
    arl: ['', Validators.maxLength(100)],
    employees: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.getClients().subscribe({
      next: (list) => {
        this.clients.set(list);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.describe(err));
        this.loading.set(false);
      },
    });
  }

  newClient(): void {
    this.editingId.set(null);
    this.submitted.set(false);
    this.formError.set(null);
    this.form.reset({ name: '', email: '', riskLevel: '', arl: '', employees: 0 });
    this.showForm.set(true);
  }

  edit(c: SstClient): void {
    this.editingId.set(c.id);
    this.submitted.set(false);
    this.formError.set(null);
    this.form.reset({
      name: c.name,
      email: c.email ?? '',
      riskLevel: c.riskLevel ?? '',
      arl: c.arl ?? '',
      employees: c.employees,
    });
    this.showForm.set(true);
  }

  cancel(): void {
    this.showForm.set(false);
  }

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.touched || this.submitted());
  }

  save(): void {
    this.submitted.set(true);
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: SstClientCreate = {
      name: (raw.name ?? '').trim(),
      email: raw.email ? raw.email.trim() : null,
      riskLevel: raw.riskLevel || null,
      arl: raw.arl ? raw.arl.trim() : null,
      employees: Number(raw.employees ?? 0),
    };

    this.saving.set(true);
    const id = this.editingId();
    const request$ = id
      ? this.service.updateClient({ ...payload, id })
      : this.service.createClient(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.formError.set(this.describe(err));
      },
    });
  }

  remove(c: SstClient): void {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        `¿Eliminar la empresa "${c.name}"? Sus usuarios del portal dejarán de poder ingresar.`,
      )
    ) {
      return;
    }
    this.service.deleteClient(c.id).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) => this.error.set(this.describe(err)),
    });
  }

  onLogoFile(client: SstClient, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      this.error.set('El logo no debe superar 1 MB.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.service.setLogo(client.id, dataUrl).subscribe({
        next: () => {
          input.value = '';
          this.reload();
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(this.describe(err));
          input.value = '';
        },
      });
    };
    reader.readAsDataURL(file);
  }

  private describe(err: HttpErrorResponse): string {
    if (err?.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.';
    }
    if (err?.status === 403) {
      return 'No tienes permiso para esta acción.';
    }
    return err?.error?.message ?? 'Ocurrió un error. Intenta nuevamente.';
  }
}
