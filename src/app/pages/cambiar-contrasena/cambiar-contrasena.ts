import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { UserService } from '../../core/user/user.service';
import { Logo } from '../../shared/logo/logo';

/** Al menos una letra y un número (la longitud mínima la valida `Validators.minLength`). */
function strongPassword(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value ?? '';
  return /[A-Za-z]/.test(value) && /\d/.test(value) ? null : { weak: true };
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const next = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return next === confirm ? null : { mismatch: true };
}

/**
 * Cambio obligatorio de la contraseña temporal en el primer ingreso de un cliente del portal.
 * Mientras no se cambie, el backend bloquea el resto de endpoints del portal (`first_login`).
 */
@Component({
  selector: 'app-cambiar-contrasena',
  imports: [ReactiveFormsModule, Logo],
  templateUrl: './cambiar-contrasena.html',
  // Mismo diseño que el login.
  styleUrl: '../login/login.scss',
})
export class CambiarContrasena {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly userName = this.userService.currentUser?.name ?? '';

  readonly form = this.fb.group(
    {
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(100),
          strongPassword,
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.touched || this.submitted());
  }

  get mismatch(): boolean {
    return (
      this.form.hasError('mismatch') &&
      (this.form.get('confirmPassword')?.touched === true || this.submitted())
    );
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.form.disable();

    const raw = this.form.getRawValue();

    this.authService
      .changeFirstLoginPassword(raw.newPassword ?? '', raw.confirmPassword ?? '')
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigateByUrl('/sst-dashboard', { replaceUrl: true });
        },
        error: (error) => {
          this.loading.set(false);
          this.form.enable();
          this.errorMessage.set(
            error?.error?.message ??
              'No fue posible cambiar la contraseña. Inténtalo de nuevo.',
          );
        },
      });
  }

  cancel(): void {
    this.authService.signOut().subscribe(() => {
      this.router.navigateByUrl('/login');
    });
  }
}
