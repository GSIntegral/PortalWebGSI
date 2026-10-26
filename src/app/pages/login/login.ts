import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Logo } from '../../shared/logo/logo';

/**
 * Inicio de sesión de los CLIENTES del portal (HU_079). Usa un login independiente del de la
 * plataforma Facil ISO: otra tabla de usuarios y otro token, ligado a una única empresa.
 * El equipo de GS Integral entra por `/login/equipo`.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Logo],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.group({
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(150)],
    ],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(100),
      ],
    ],
  });

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.touched || this.submitted());
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
      .clientSignIn({ email: raw.email ?? '', password: raw.password ?? '' })
      .subscribe({
        next: ({ requiresPasswordChange }) => {
          this.loading.set(false);
          if (requiresPasswordChange) {
            this.router.navigateByUrl('/cambiar-contrasena', { replaceUrl: true });
            return;
          }
          // Redirige a la URL solicitada antes de iniciar sesión, si existe;
          // por defecto, va directo al tablero de su empresa.
          const redirectURL =
            this.route.snapshot.queryParamMap.get('redirectURL') ?? '/sst-dashboard';
          this.router.navigateByUrl(redirectURL, { replaceUrl: true });
        },
        error: (error) => {
          this.loading.set(false);
          this.form.enable();
          this.errorMessage.set(this.buildErrorMessage(error));
        },
      });
  }

  private buildErrorMessage(error: any): string {
    if (error?.name === 'TimeoutError') {
      return 'El servidor tardó demasiado en responder. Inténtalo de nuevo.';
    }
    if (error?.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    }
    return (
      error?.error?.message ??
      'No fue posible iniciar sesión. Verifica tus credenciales e inténtalo de nuevo.'
    );
  }
}
