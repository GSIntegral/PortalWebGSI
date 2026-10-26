import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // El tablero SST depende de autenticación/datos en runtime: no se prerenderiza.
    path: 'sst-dashboard',
    renderMode: RenderMode.Client,
  },
  {
    path: 'sst-dashboard/editor',
    renderMode: RenderMode.Client,
  },
  {
    // La galería ya no es contenido estático: sus fotos salen de la API. Prerenderizarla
    // (el caso por defecto) congelaría en el build las fotos que hubiera en ese momento.
    path: 'registro-fotografico',
    renderMode: RenderMode.Client,
  },
  {
    path: 'registro-fotografico/editor',
    renderMode: RenderMode.Client,
  },
  {
    // Administración de empresas y usuarios del portal (HU_079): requiere sesión y datos en runtime.
    path: 'portal-admin',
    renderMode: RenderMode.Client,
  },
  {
    // Cambio de contraseña del primer ingreso (HU_079): depende de la sesión del navegador.
    path: 'cambiar-contrasena',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
