import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SchemeService } from './scheme.service';

describe('SchemeService (modo claro / oscuro)', () => {
  const root = document.documentElement;

  function createService(): SchemeService {
    const service = TestBed.inject(SchemeService);
    // afterNextRender se ejecuta en el siguiente ciclo de la aplicación.
    TestBed.inject(ApplicationRef).tick();
    TestBed.tick();
    return service;
  }

  beforeEach(() => {
    localStorage.clear();
    root.classList.remove('dark', 'light');
  });

  afterEach(() => {
    localStorage.clear();
    root.classList.remove('dark', 'light');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('por defecto es claro (igual que Facil ISO)', () => {
    const service = createService();

    expect(service.scheme()).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(root.classList.contains('dark')).toBe(false);
  });

  it('toggle() pasa a oscuro, aplica la clase en <html> y recuerda la elección', () => {
    const service = createService();

    service.toggle();
    TestBed.tick();

    expect(service.isDark()).toBe(true);
    expect(root.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('scheme')).toBe('dark');
  });

  it('toggle() dos veces vuelve a claro y quita la clase', () => {
    const service = createService();

    service.toggle();
    TestBed.tick();
    service.toggle();
    TestBed.tick();

    expect(service.isDark()).toBe(false);
    expect(root.classList.contains('dark')).toBe(false);
    expect(root.classList.contains('light')).toBe(true);
    expect(localStorage.getItem('scheme')).toBe('light');
  });

  it('respeta la elección guardada al cargar (oscuro)', () => {
    localStorage.setItem('scheme', 'dark');

    const service = createService();

    expect(service.scheme()).toBe('dark');
    expect(root.classList.contains('dark')).toBe(true);
  });

  it('ignora valores inválidos guardados y usa claro', () => {
    localStorage.setItem('scheme', 'violeta');

    const service = createService();

    expect(service.scheme()).toBe('light');
  });

  it("'auto' sigue la preferencia oscura del sistema", () => {
    localStorage.setItem('scheme', 'auto');
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('dark'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));

    const service = createService();

    expect(service.scheme()).toBe('auto');
    expect(service.isDark()).toBe(true);
    expect(root.classList.contains('dark')).toBe(true);
  });

  it('no falla si localStorage no está disponible', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const service = createService();

    expect(() => service.toggle()).not.toThrow();
    expect(service.isDark()).toBe(true);
  });
});
