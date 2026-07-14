import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../sst-dashboard/sst-dashboard.types';

export interface SstClient {
  id: string;
  code: string;
  name: string;
  email: string | null;
  riskLevel: string | null;
  arl: string | null;
  employees: number;
  hasLogo: boolean;
}

export interface SstClientCreate {
  name: string;
  email?: string | null;
  riskLevel?: string | null;
  arl?: string | null;
  employees: number;
}

export interface SstClientUpdate extends SstClientCreate {
  id: string;
}

export interface SstIndicatorRow {
  clientId: string;
  code: string;
  name: string;
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

export interface SstIndicatorUpsert {
  clientId: string;
  year: number;
  selfAssessmentPct: number;
  objectivesPct: number;
  incidents: number;
  accidents: number;
  disabilityDays: number;
  occupationalDiseases: number;
  fatalAccidents: number;
  newOccupationalDiseaseCases: number;
}

export interface SstDemographyRow {
  clientId: string;
  code: string;
  name: string;
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

export interface SstDemographyUpsert {
  clientId: string;
  year: number;
  employees: number;
  men: number;
  women: number;
  averageAge: number;
  averageEducationYears: number;
  averageStratum: number;
  averageChildren: number;
  mainRole?: string | null;
  mainHealthProvider?: string | null;
}

export interface SstTrainingSummary {
  clientId: string;
  code: string;
  name: string;
  totalCompleted: number;
  totalTarget: number;
  completionPct: number;
  monthsWithData: number;
}

export interface SstTrainingMonth {
  monthNumber: number;
  monthName: string;
  completed: number;
  target: number;
}

export interface SstTrainingSave {
  clientId: string;
  year: number;
  months: SstTrainingMonth[];
}

@Injectable({ providedIn: 'root' })
export class SstEditorService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/SstEditor`;

  getClients(): Observable<SstClient[]> {
    return this.http
      .get<ApiResponse<SstClient[]>>(`${this.base}/GetClients`)
      .pipe(map((r) => r.data));
  }

  createClient(dto: SstClientCreate): Observable<SstClient> {
    return this.http
      .post<ApiResponse<SstClient>>(`${this.base}/CreateClient`, dto)
      .pipe(map((r) => r.data));
  }

  updateClient(dto: SstClientUpdate): Observable<SstClient> {
    return this.http
      .put<ApiResponse<SstClient>>(`${this.base}/UpdateClient`, dto)
      .pipe(map((r) => r.data));
  }

  deleteClient(id: string): Observable<void> {
    const params = new HttpParams().set('id', id);
    return this.http
      .delete<ApiResponse<null>>(`${this.base}/DeleteClient`, { params })
      .pipe(map(() => undefined));
  }

  setLogo(clientId: string, logo: string): Observable<void> {
    return this.http
      .put<ApiResponse<null>>(`${this.base}/SetLogo`, { clientId, logo })
      .pipe(map(() => undefined));
  }

  getIndicators(year: number): Observable<SstIndicatorRow[]> {
    const params = new HttpParams().set('year', String(year));
    return this.http
      .get<ApiResponse<SstIndicatorRow[]>>(`${this.base}/GetIndicators`, { params })
      .pipe(map((r) => r.data));
  }

  saveIndicator(dto: SstIndicatorUpsert): Observable<void> {
    return this.http
      .put<ApiResponse<null>>(`${this.base}/SaveIndicator`, dto)
      .pipe(map(() => undefined));
  }

  getDemography(year: number): Observable<SstDemographyRow[]> {
    const params = new HttpParams().set('year', String(year));
    return this.http
      .get<ApiResponse<SstDemographyRow[]>>(`${this.base}/GetDemography`, { params })
      .pipe(map((r) => r.data));
  }

  saveDemography(dto: SstDemographyUpsert): Observable<void> {
    return this.http
      .put<ApiResponse<null>>(`${this.base}/SaveDemography`, dto)
      .pipe(map(() => undefined));
  }

  getTrainings(year: number): Observable<SstTrainingSummary[]> {
    const params = new HttpParams().set('year', String(year));
    return this.http
      .get<ApiResponse<SstTrainingSummary[]>>(`${this.base}/GetTrainings`, { params })
      .pipe(map((r) => r.data));
  }

  getTrainingMonths(clientId: string, year: number): Observable<SstTrainingMonth[]> {
    const params = new HttpParams().set('clientId', clientId).set('year', String(year));
    return this.http
      .get<ApiResponse<SstTrainingMonth[]>>(`${this.base}/GetTrainingMonths`, { params })
      .pipe(map((r) => r.data));
  }

  saveTrainings(dto: SstTrainingSave): Observable<void> {
    return this.http
      .put<ApiResponse<null>>(`${this.base}/SaveTrainings`, dto)
      .pipe(map(() => undefined));
  }
}
