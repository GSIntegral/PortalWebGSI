import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/guards/auth.guard';
import { ClientGuard } from './core/auth/guards/client.guard';
import { NoAuthGuard } from './core/auth/guards/noAuth.guard';
import { StaffGuard } from './core/auth/guards/staff.guard';

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
    // Edición de la galería: solo el equipo de GS Integral (los clientes del portal no).
    path: 'registro-fotografico/editor',
    canActivate: [StaffGuard],
    loadComponent: () => import('./pages/galeria-editor/galeria-editor').then((m) => m.GaleriaEditor),
    title: 'Gestión de fotografías | GS Integral SAS',
  },
  {
    // Login de CLIENTES del portal (HU_079): usuarios propios, ligados a una empresa.
    path: 'login',
    canActivate: [NoAuthGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    title: 'Iniciar sesión | GS Integral SAS',
  },
  {
    // Acceso interno del equipo con las credenciales de la plataforma Facil ISO.
    path: 'login/equipo',
    canActivate: [NoAuthGuard],
    loadComponent: () => import('./pages/login-equipo/login-equipo').then((m) => m.LoginEquipo),
    title: 'Acceso interno | GS Integral SAS',
  },
  {
    // Cambio obligatorio de la contraseña temporal del primer ingreso de un cliente.
    path: 'cambiar-contrasena',
    canActivate: [ClientGuard],
    loadComponent: () =>
      import('./pages/cambiar-contrasena/cambiar-contrasena').then((m) => m.CambiarContrasena),
    title: 'Crea tu contraseña | GS Integral SAS',
  },
  {
    // Edición de los datos de SU empresa (HU_079): solo usuarios del portal; el backend resuelve la empresa.
    path: 'mi-empresa',
    canActivate: [AuthGuard, ClientGuard],
    loadComponent: () => import('./pages/mi-empresa/mi-empresa').then((m) => m.MiEmpresa),
    title: 'Mi empresa | GS Integral SAS',
  },
  {
    // Clientes (ven solo su empresa) y equipo (ve el consolidado y puede cambiar de empresa).
    path: 'sst-dashboard',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/sst-dashboard/sst-dashboard').then((m) => m.SstDashboard),
    title: 'Tablero de Control SST | GS Integral SAS',
  },
  {
    path: 'sst-dashboard/editor',
    canActivate: [StaffGuard],
    loadComponent: () => import('./pages/sst-editor/sst-editor').then((m) => m.SstEditor),
    title: 'Editor de datos SST | GS Integral SAS',
  },
  {
    // Empresas y usuarios del portal (HU_079): solo el equipo de GS Integral.
    path: 'portal-admin',
    canActivate: [StaffGuard],
    loadComponent: () => import('./pages/portal-admin/portal-admin').then((m) => m.PortalAdmin),
    title: 'Administración del portal | GS Integral SAS',
  },
  { path: '**', redirectTo: '' },
];
