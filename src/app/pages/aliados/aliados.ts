import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-aliados',
  imports: [RouterLink, RevealDirective],
  templateUrl: './aliados.html',
  styleUrl: './aliados.scss',
})
export class Aliados {
  readonly regions = [
    {
      region: 'América Latina',
      countries: ['Colombia', 'Guatemala', 'Ecuador', 'Perú', 'México', 'Panamá', 'Chile', 'Costa Rica'],
    },
    {
      region: 'Europa',
      countries: ['España', 'Portugal'],
    },
  ];

  readonly benefits = [
    { title: 'Cobertura regional', text: 'Presencia y aliados en más de 10 países para acompañarte donde estés.', icon: 'globe' },
    { title: 'Conocimiento local', text: 'Aliados que dominan la normativa y el contexto de cada mercado.', icon: 'map' },
    { title: 'Estándares globales', text: 'Metodologías alineadas a normas internacionales ISO y BASC.', icon: 'shield' },
  ];
}
