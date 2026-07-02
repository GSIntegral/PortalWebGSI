import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-quienes-somos',
  imports: [RouterLink, RevealDirective],
  templateUrl: './quienes-somos.html',
  styleUrl: './quienes-somos.scss',
})
export class QuienesSomos {
  readonly values = [
    {
      title: 'Misión',
      text: 'Suplir las necesidades de las empresas de diversos sectores en la estandarización de sus procesos, generando crecimiento continuo para todos nuestros aliados estratégicos.',
      icon: 'target',
    },
    {
      title: 'Visión',
      text: 'Ser la compañía líder en consultoría de Sistemas de Gestión en América Latina, reconocida por la calidad, cercanía y resultados de nuestro acompañamiento.',
      icon: 'eye',
    },
    {
      title: 'Valores',
      text: 'Compromiso, integridad, excelencia técnica y mejora continua. Trabajamos con profesionales certificados que garantizan cada proceso.',
      icon: 'heart',
    },
  ];

  readonly sedes = ['Colombia', 'Guatemala', 'Ecuador'];
}
