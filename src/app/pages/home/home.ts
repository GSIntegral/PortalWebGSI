import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../shared/reveal.directive';

interface Service {
  icon: string;
  title: string;
  text: string;
}
interface Stat {
  value: string;
  label: string;
}
interface Step {
  n: string;
  title: string;
  text: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, RevealDirective],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  readonly stats: Stat[] = [
    { value: '+28', label: 'Años de experiencia' },
    { value: '3', label: 'Sedes: Colombia · Guatemala · Ecuador' },
    { value: '+10', label: 'Países con aliados estratégicos' },
    { value: '100%', label: 'Profesionales certificados' },
  ];

  readonly services: Service[] = [
    {
      icon: 'design',
      title: 'Diseño',
      text: 'Diagnóstico de su empresa con base en las necesidades y expectativas de clientes, partes interesadas y la dirección estratégica corporativa.',
    },
    {
      icon: 'implement',
      title: 'Implementación y formación',
      text: 'Acompañamiento técnico, documentación y capacitación para poner en marcha el sistema de gestión y desarrollar competencias en su equipo.',
    },
    {
      icon: 'maintain',
      title: 'Mantenimiento',
      text: 'Auditorías internas, seguimiento y mejora continua para mantener la certificación vigente y el sistema alineado a los estándares.',
    },
  ];

  readonly steps: Step[] = [
    {
      n: '01',
      title: 'Diagnóstico',
      text: 'Evaluamos el estado actual frente al estándar requerido e identificamos brechas.',
    },
    {
      n: '02',
      title: 'Diseño del sistema',
      text: 'Estructuramos procesos, políticas y documentación a la medida de su organización.',
    },
    {
      n: '03',
      title: 'Implementación',
      text: 'Ponemos en marcha el sistema con formación práctica para todo el equipo.',
    },
    {
      n: '04',
      title: 'Auditoría y mejora',
      text: 'Verificamos, certificamos y aseguramos la mejora continua en el tiempo.',
    },
  ];

  readonly certs = [
    { name: 'ISO', text: 'Sistemas de Gestión bajo normas ISO' },
    { name: 'BASC', text: 'Sistema BASC según estándar v6' },
    { name: 'ODS', text: 'Cumplimiento de los ODS de la ONU' },
  ];
}
