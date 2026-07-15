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
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
