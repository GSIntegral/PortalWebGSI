import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RevealDirective } from '../../shared/reveal.directive';
import { ContactoService } from './contacto.service';

@Component({
  selector: 'app-contacto',
  imports: [ReactiveFormsModule, RevealDirective],
  templateUrl: './contacto.html',
  styleUrl: './contacto.scss',
})
export class Contacto {
  private fb = inject(FormBuilder);
  private contactoService = inject(ContactoService);

  readonly sent = signal(false);
  readonly submitted = signal(false);
  readonly sending = signal(false);
  readonly error = signal(false);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.pattern(/^[0-9+()\s-]{7,}$/)]],
    asunto: ['', [Validators.required]],
    mensaje: ['', [Validators.required, Validators.minLength(10)]],
  });

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.touched || this.submitted());
  }

  submit() {
    this.submitted.set(true);
    if (this.form.invalid || this.sending()) {
      this.form.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    this.error.set(false);

    const raw = this.form.getRawValue();

    this.contactoService
      .send({
        nombre: raw.nombre ?? '',
        email: raw.email ?? '',
        telefono: raw.telefono ?? '',
        asunto: raw.asunto ?? '',
        mensaje: raw.mensaje ?? '',
      })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.sent.set(true);
          this.form.reset();
          this.submitted.set(false);
        },
        error: () => {
          // El mensaje no salió: no se marca como enviado para que se pueda reintentar.
          this.sending.set(false);
          this.error.set(true);
        },
      });
  }
}
