import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SstClient, SstEditorService } from '../../sst-editor/sst-editor.service';
import { PortalAdminService, PortalUser } from '../portal-admin.service';

interface Notice {
  kind: 'ok' | 'warn';
  text: string;
}

/**
 * Pestaña «Usuarios del portal» (HU_079): el equipo crea cuentas de clientes con login propio,
 * las liga a UNA empresa y gestiona su estado y contraseña. El usuario recibe una contraseña
 * temporal por correo y debe cambiarla en su primer ingreso.
 */
@Component({
  selector: 'app-portal-users',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './portal-users.html',
  styleUrl: '../portal-admin-panel.scss',
})
export class PortalUsers {
  private service = inject(PortalAdminService);
  private editorService = inject(SstEditorService);
  private fb = inject(FormBuilder);

  readonly users = signal<PortalUser[]>([]);
  readonly clients = signal<SstClient[]>([]);
  readonly filterClientId = signal<string>('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly busyUserId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly notice = signal<Notice | null>(null);
  readonly showForm = signal(false);
  readonly editingUser = signal<PortalUser | null>(null);
  readonly submitted = signal(false);

  readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    clientId: ['', [Validators.required]],
  });

  constructor() {
    this.loadClients();
    this.reload();
  }

  private loadClients(): void {
    this.editorService.getClients().subscribe({
      next: (list) => this.clients.set(list),
      error: (err: HttpErrorResponse) => this.error.set(this.describe(err)),
    });
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.getUsers(this.filterClientId() || null).subscribe({
      next: (list) => {
        this.users.set(list);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.describe(err));
        this.loading.set(false);
      },
    });
  }

  onFilterChange(event: Event): void {
    this.filterClientId.set((event.target as HTMLSelectElement).value);
    this.reload();
  }

  newUser(): void {
    this.editingUser.set(null);
    this.submitted.set(false);
    this.formError.set(null);
    this.notice.set(null);
    this.form.enable();
    this.form.reset({ fullName: '', email: '', clientId: this.filterClientId() });
    this.showForm.set(true);
  }

  edit(user: PortalUser): void {
    this.editingUser.set(user);
    this.submitted.set(false);
    this.formError.set(null);
    this.notice.set(null);
    this.form.reset({ fullName: user.fullName, email: user.email, clientId: user.clientId });
    // El correo es el usuario de acceso y no se edita.
    this.form.controls.email.disable();
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
    const fullName = (raw.fullName ?? '').trim();
    const clientId = raw.clientId ?? '';
    const editing = this.editingUser();

    this.saving.set(true);

    if (editing) {
      this.service.updateUser({ userId: editing.userId, fullName, clientId }).subscribe({
        next: () => this.afterSave({ kind: 'ok', text: 'Usuario actualizado.' }),
        error: (err: HttpErrorResponse) => this.failSave(err),
      });
      return;
    }

    this.service
      .createUser({ fullName, email: (raw.email ?? '').trim(), clientId })
      .subscribe({
        next: (result) =>
          this.afterSave(
            result.tempPasswordEmailSent
              ? {
                  kind: 'ok',
                  text: `Usuario creado. Enviamos la contraseña temporal a ${result.email}.`,
                }
              : {
                  kind: 'warn',
                  text:
                    `Usuario creado, pero no se pudo enviar el correo a ${result.email}. ` +
                    'Usa «Restablecer contraseña» para generar y reenviar una nueva.',
                },
          ),
        error: (err: HttpErrorResponse) => this.failSave(err),
      });
  }

  private afterSave(notice: Notice): void {
    this.saving.set(false);
    this.showForm.set(false);
    this.notice.set(notice);
    this.reload();
  }

  private failSave(err: HttpErrorResponse): void {
    this.saving.set(false);
    this.formError.set(this.describe(err));
  }

  toggleStatus(user: PortalUser): void {
    const next = !user.status;
    const verb = next ? 'activar' : 'desactivar';
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`¿Seguro que deseas ${verb} a ${user.fullName}?`)
    ) {
      return;
    }
    this.busyUserId.set(user.userId);
    this.service.setUserStatus(user.userId, next).subscribe({
      next: () => {
        this.busyUserId.set(null);
        this.notice.set({
          kind: 'ok',
          text: next ? 'Usuario activado.' : 'Usuario desactivado: su sesión se cerrará en breve.',
        });
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.busyUserId.set(null);
        this.error.set(this.describe(err));
      },
    });
  }

  resetPassword(user: PortalUser): void {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        `Se generará una contraseña temporal nueva para ${user.fullName} y se enviará a ${user.email}. ` +
          'La contraseña actual dejará de funcionar. ¿Continuar?',
      )
    ) {
      return;
    }
    this.busyUserId.set(user.userId);
    this.service.resetPassword(user.userId).subscribe({
      next: (result) => {
        this.busyUserId.set(null);
        this.notice.set(
          result.tempPasswordEmailSent
            ? { kind: 'ok', text: `Contraseña restablecida. Enviamos la nueva a ${user.email}.` }
            : {
                kind: 'warn',
                text: `Contraseña restablecida, pero no se pudo enviar el correo a ${user.email}. Inténtalo de nuevo.`,
              },
        );
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.busyUserId.set(null);
        this.error.set(this.describe(err));
      },
    });
  }

  dismissNotice(): void {
    this.notice.set(null);
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
