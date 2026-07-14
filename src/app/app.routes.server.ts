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
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
