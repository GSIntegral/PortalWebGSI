import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-contacto',
  imports: [ReactiveFormsModule, RevealDirective],
  templateUrl: './contacto.html',
  styleUrl: './contacto.scss',
})
export class Contacto {
  private fb = inject(FormBuilder);

  readonly sent = signal(false);
  readonly submitted = signal(false);

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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Aquí se integraría el envío real (API / correo).
    this.sent.set(true);
    this.form.reset();
    this.submitted.set(false);
  }
}
