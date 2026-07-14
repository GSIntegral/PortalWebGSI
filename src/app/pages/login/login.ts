import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { UserService } from '../../core/user/user.service';
import { Logo } from '../../shared/logo/logo';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Logo],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private userService = inject(UserService);
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

    const credentials = {
      email: this.form.getRawValue().email ?? '',
      password: this.form.getRawValue().password ?? '',
    };

    this.authService.signIn(credentials).subscribe({
      next: (result: { requiresPasswordChange: boolean; isSuperAdmin: boolean }) => {
        // El superadmin recibe un token sin empresa: hay que seleccionar una
        // (HU_002) para que las peticiones protegidas no devuelvan 401.
        const user = this.userService.currentUser;
        if (result.isSuperAdmin && !user?.companyId) {
          this.selectCompanyThenRedirect();
        } else {
          this.finishLogin();
        }
      },
      error: (error) => this.failLogin(error),
    });
  }

  /**
   * Selecciona automáticamente la empresa del superadmin. Con una sola empresa
   * activa (caso actual) la elige directo; si hubiera varias, toma la primera.
   */
  private selectCompanyThenRedirect(): void {
    this.authService.getActiveCompanies().subscribe({
      next: (companies) => {
        if (companies.length === 0) {
          this.finishLogin();
          return;
        }
        this.authService.selectCompany(companies[0].companyId).subscribe({
          next: () => this.finishLogin(),
          error: (error) => this.failLogin(error),
        });
      },
      error: (error) => this.failLogin(error),
    });
  }

  private finishLogin(): void {
    this.loading.set(false);
    // Redirige a la URL solicitada antes de iniciar sesión, si existe;
    // por defecto, va directo al tablero SST.
    const redirectURL = this.route.snapshot.queryParamMap.get('redirectURL') ?? '/sst-dashboard';
    this.router.navigateByUrl(redirectURL, { replaceUrl: true });
  }

  private failLogin(error: unknown): void {
    this.loading.set(false);
    this.form.enable();
    this.errorMessage.set(this.buildErrorMessage(error));
  }

  private buildErrorMessage(error: any): string {
    if (error?.name === 'TimeoutError') {
      return 'El servidor tardó demasiado en responder. Inténtalo de nuevo.';
    }
    return (
      error?.error?.message ??
      'No fue posible iniciar sesión. Verifica tus credenciales e inténtalo de nuevo.'
    );
  }
}
