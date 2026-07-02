import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    title: 'GS Integral SAS | Sistemas de Gestión ISO & BASC',
  },
  {
    path: 'quienes-somos',
    loadComponent: () => import('./pages/quienes-somos/quienes-somos').then((m) => m.QuienesSomos),
    title: 'Quiénes Somos | GS Integral SAS',
  },
  {
    path: 'aliados-estrategicos',
    loadComponent: () => import('./pages/aliados/aliados').then((m) => m.Aliados),
    title: 'Aliados Estratégicos | GS Integral SAS',
  },
  {
    path: 'contactanos',
    loadComponent: () => import('./pages/contacto/contacto').then((m) => m.Contacto),
    title: 'Contáctanos | GS Integral SAS',
  },
  {
    path: 'registro-fotografico',
    loadComponent: () => import('./pages/galeria/galeria').then((m) => m.Galeria),
    title: 'Registro Fotográfico | GS Integral SAS',
  },
  { path: '**', redirectTo: '' },
];
