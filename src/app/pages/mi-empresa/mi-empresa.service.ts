import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../sst-dashboard/sst-dashboard.types';

/** Empresa del usuario del portal. El nombre, el código y el logo los administra GS Integral. */
export interface MyCompany {
  id: string;
  code: string;
  name: string;
  email: string | null;
  riskLevel: string | null;
  arl: string | null;
  employees: number;
  hasLogo: boolean;
}

export interface MyCompanyUpdate {
  email: string | null;
  riskLevel: string | null;
  arl: string | null;
  employees: number;
}

export interface MyIndicators {
  selfAssessmentPct: number;
  objectivesPct: number;
  incidents: number;
  accidents: number;
  disabilityDays: number;
  occupationalDiseases: number;
  fatalAccidents: number;
  newOccupationalDiseaseCases: number;
  hasData: boolean;
}

export type MyIndicatorsSave = Omit<MyIndicators, 'hasData'> & { year: number };

export interface MyDemography {
  employees: number;
  men: number;
  women: number;
  averageAge: number;
  averageEducationYears: number;
  averageStratum: number;
  averageChildren: number;
  mainRole: string | null;
  mainHealthProvider: string | null;
  hasData: boolean;
}

export type MyDemographySave = Omit<MyDemography, 'hasData'> & { year: number };

export interface MyTrainingMonth {
  monthNumber: number;
  monthName: string;
  completed: number;
  target: number;
}

/**
 * Datos de SU empresa que un usuario del portal puede leer y editar (HU_079). Ninguna petición lleva
 * el identificador de la empresa: el backend lo resuelve desde el usuario del token.
 */
@Injectable({ providedIn: 'root' })
export class MiEmpresaService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/PortalData`;

  getCompany(): Observable<MyCompany> {
    return this.http.get<ApiResponse<MyCompany>>(`${this.base}/GetCompany`).pipe(map((r) => r.data));
  }

  updateCompany(dto: MyCompanyUpdate): Observable<MyCompany> {
    return this.http.put<ApiResponse<MyCompany>>(`${this.base}/UpdateCompany`, dto).pipe(map((r) => r.data));
  }

  getIndicators(year: number): Observable<MyIndicators> {
    const params = new HttpParams().set('year', String(year));
    return this.http
      .get<ApiResponse<MyIndicators>>(`${this.base}/GetIndicators`, { params })
      .pipe(map((r) => r.data));
  }

  saveIndicators(dto: MyIndicatorsSave): Observable<void> {
    return this.http.put<ApiResponse<null>>(`${this.base}/SaveIndicator`, dto).pipe(map(() => undefined));
  }

  getDemography(year: number): Observable<MyDemography> {
    const params = new HttpParams().set('year', String(year));
    return this.http
      .get<ApiResponse<MyDemography>>(`${this.base}/GetDemography`, { params })
      .pipe(map((r) => r.data));
  }

  saveDemography(dto: MyDemographySave): Observable<void> {
    return this.http.put<ApiResponse<null>>(`${this.base}/SaveDemography`, dto).pipe(map(() => undefined));
  }

  getTrainings(year: number): Observable<MyTrainingMonth[]> {
    const params = new HttpParams().set('year', String(year));
    return this.http
      .get<ApiResponse<MyTrainingMonth[]>>(`${this.base}/GetTrainings`, { params })
      .pipe(map((r) => r.data));
  }

  saveTrainings(year: number, months: MyTrainingMonth[]): Observable<void> {
    return this.http
      .put<ApiResponse<null>>(`${this.base}/SaveTrainings`, { year, months })
      .pipe(map(() => undefined));
  }
}
