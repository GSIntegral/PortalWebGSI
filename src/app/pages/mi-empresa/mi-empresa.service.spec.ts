import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { MiEmpresaService } from './mi-empresa.service';

const BASE = `${environment.apiUrl}/api/PortalData`;
const ok = <T>(data: T) => ({ success: true, message: 'ok', messageId: 1, httpStatusCode: 200, data });

describe('MiEmpresaService (datos propios del cliente)', () => {
  let service: MiEmpresaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(MiEmpresaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lee la empresa SIN enviar identificador de empresa', () => {
    let company: unknown;
    service.getCompany().subscribe((c) => (company = c));

    const req = http.expectOne(`${BASE}/GetCompany`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush(ok({ id: 'c-1', code: 'EMP001', name: 'Mi empresa', employees: 10 }));

    expect(company).toMatchObject({ code: 'EMP001' });
  });

  it('guarda los indicadores con el año y sin identificador de empresa', () => {
    service
      .saveIndicators({
        year: 2026, selfAssessmentPct: 90, objectivesPct: 80, incidents: 1, accidents: 2,
        disabilityDays: 3, occupationalDiseases: 0, fatalAccidents: 0, newOccupationalDiseaseCases: 0,
      })
      .subscribe();

    const req = http.expectOne(`${BASE}/SaveIndicator`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.year).toBe(2026);
    expect(req.request.body).not.toHaveProperty('clientId');
    expect(req.request.body).not.toHaveProperty('clientCode');
    req.flush(ok(null));
  });

  it('guarda la demografía y las capacitaciones sin identificador de empresa', () => {
    service
      .saveDemography({
        year: 2026, employees: 5, men: 3, women: 2, averageAge: 30, averageEducationYears: 11,
        averageStratum: 3, averageChildren: 1, mainRole: null, mainHealthProvider: null, hasData: true,
      } as never)
      .subscribe();
    const demography = http.expectOne(`${BASE}/SaveDemography`);
    expect(demography.request.body).not.toHaveProperty('clientId');
    demography.flush(ok(null));

    service.saveTrainings(2026, [{ monthNumber: 1, monthName: 'Enero', completed: 2, target: 3 }]).subscribe();
    const trainings = http.expectOne(`${BASE}/SaveTrainings`);
    expect(trainings.request.body).toEqual({
      year: 2026,
      months: [{ monthNumber: 1, monthName: 'Enero', completed: 2, target: 3 }],
    });
    trainings.flush(ok(null));
  });

  it('consulta cada recurso por año', () => {
    service.getIndicators(2025).subscribe();
    service.getDemography(2025).subscribe();
    service.getTrainings(2025).subscribe();

    for (const path of ['GetIndicators', 'GetDemography', 'GetTrainings']) {
      const req = http.expectOne((r) => r.url === `${BASE}/${path}`);
      expect(req.request.params.get('year')).toBe('2025');
      expect(req.request.params.has('clientCode')).toBe(false);
      req.flush(ok({}));
    }
  });

  it('actualiza la empresa solo con contacto, riesgo, ARL y colaboradores (sin nombre)', () => {
    service.updateCompany({ email: 'a@b.com', riskLevel: 'II', arl: 'Positiva', employees: 25 }).subscribe();

    const req = http.expectOne(`${BASE}/UpdateCompany`);
    expect(req.request.method).toBe('PUT');
    expect(Object.keys(req.request.body).sort()).toEqual(['arl', 'email', 'employees', 'riskLevel']);
    req.flush(ok({}));
  });
});
