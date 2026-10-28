import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { UserService } from '../../core/user/user.service';
import { SstDashboardService } from './sst-dashboard.service';

describe('SstDashboardService.exportPdf', () => {
  let service: SstDashboardService;
  let http: HttpTestingController;
  let userService: UserService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SstDashboardService);
    http = TestBed.inject(HttpTestingController);
    userService = TestBed.inject(UserService);
  });

  afterEach(() => http.verify());

  it('el cliente del portal pide el PDF de su empresa SIN enviar código de empresa', () => {
    userService.user = { id: 'u-1', name: 'Ana', email: 'ana@cliente.com', kind: 'client', clientCode: 'EMP001' };

    service.exportPdf(2026, 'EMP002').subscribe();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/api/PortalDashboard/ExportPdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('year')).toBe('2026');
    expect(req.request.params.has('clientCode')).toBe(false);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF-'], { type: 'application/pdf' }));
  });

  it('el cliente exporta el Excel de SU empresa (endpoint del portal, sin código de empresa)', () => {
    userService.user = { id: 'u-1', name: 'Ana', email: 'ana@cliente.com', kind: 'client' };

    service.exportExcel(2026).subscribe();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/api/PortalData/ExportExcel`);
    expect(req.request.params.get('year')).toBe('2026');
    expect(req.request.params.has('clientCode')).toBe(false);
    req.flush(new Blob(['xlsx']));
  });

  it('el equipo exporta el Excel de todo el tenant', () => {
    userService.user = { id: 's-1', name: 'Admin', email: 'admin@gsintegral.com', kind: 'staff' };

    service.exportExcel(2026).subscribe();

    http.expectOne((r) => r.url === `${environment.apiUrl}/api/SstEditor/ExportExcel`).flush(new Blob(['xlsx']));
  });

  it('el equipo pide el consolidado cuando no hay empresa elegida', () => {
    userService.user = { id: 's-1', name: 'Admin', email: 'admin@gsintegral.com', kind: 'staff' };

    service.exportPdf(2026, null).subscribe();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/api/SstEditor/ExportPdf`);
    expect(req.request.params.get('year')).toBe('2026');
    expect(req.request.params.has('clientCode')).toBe(false);
    req.flush(new Blob(['%PDF-'], { type: 'application/pdf' }));
  });

  it('el equipo pide el PDF de la empresa elegida', () => {
    userService.user = { id: 's-1', name: 'Admin', email: 'admin@gsintegral.com', kind: 'staff' };

    service.exportPdf(2025, 'EMP002').subscribe();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/api/SstEditor/ExportPdf`);
    expect(req.request.params.get('year')).toBe('2025');
    expect(req.request.params.get('clientCode')).toBe('EMP002');
    req.flush(new Blob(['%PDF-'], { type: 'application/pdf' }));
  });
});
