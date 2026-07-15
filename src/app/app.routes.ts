import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/guards/auth.guard';
import { NoAuthGuard } from './core/auth/guards/noAuth.guard';

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
  {
    path: 'registro-fotografico/editor',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/galeria-editor/galeria-editor').then((m) => m.GaleriaEditor),
    title: 'Gestión de fotografías | GS Integral SAS',
  },
  {
    path: 'login',
    canActivate: [NoAuthGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    title: 'Iniciar sesión | GS Integral SAS',
  },
  {
    path: 'sst-dashboard',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/sst-dashboard/sst-dashboard').then((m) => m.SstDashboard),
    title: 'Tablero de Control SST | GS Integral SAS',
  },
  {
    path: 'sst-dashboard/editor',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/sst-editor/sst-editor').then((m) => m.SstEditor),
    title: 'Editor de datos SST | GS Integral SAS',
  },
  { path: '**', redirectTo: '' },
];
