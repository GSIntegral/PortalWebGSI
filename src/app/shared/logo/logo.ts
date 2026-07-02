import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-logo',
  imports: [RouterLink],
  templateUrl: './logo.html',
  styleUrl: './logo.scss',
  host: { class: 'logo' },
})
export class Logo {
  /** 'light' para fondos oscuros, 'dark' para fondos claros. */
  readonly variant = input<'light' | 'dark'>('dark');
}
