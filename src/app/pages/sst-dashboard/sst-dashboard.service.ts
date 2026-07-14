import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { fixMojibakeDeep } from '../../core/mojibake';
import { ApiResponse, SstDashboard, SstImportResult } from './sst-dashboard.types';

@Injectable({ providedIn: 'root' })
export class SstDashboardService {
  private _httpClient = inject(HttpClient);

  /**
   * Obtiene el tablero SST consolidado del tenant actual.
   * El token Bearer lo agrega automáticamente el authInterceptor.
   *
   * @param year Año a consultar; si es null, el backend usa el más reciente con datos.
   */
  getDashboard(year?: number | null, clientCode?: string | null): Observable<SstDashboard> {
    let params = new HttpParams();
    if (year != null) {
      params = params.set('year', String(year));
    }
    if (clientCode) {
      params = params.set('clientCode', clientCode);
    }

    return this._httpClient
      .get<ApiResponse<SstDashboard>>(`${environment.apiUrl}/api/SstDashboard/GetDashboard`, {
        params,
      })
      .pipe(map((response) => fixMojibakeDeep(response.data)));
  }

  /** Descarga el libro Excel con los datos SST del año. */
  exportExcel(year: number): Observable<Blob> {
    const params = new HttpParams().set('year', String(year));
    return this._httpClient.get(`${environment.apiUrl}/api/SstEditor/ExportExcel`, {
      params,
      responseType: 'blob',
    });
  }

  /** Descarga la plantilla Excel vacía para importar datos. */
  exportTemplate(): Observable<Blob> {
    return this._httpClient.get(`${environment.apiUrl}/api/SstEditor/ExportTemplate`, {
      responseType: 'blob',
    });
  }

  /** Importa un libro Excel (.xlsx) con datos SST. */
  importExcel(file: File, year: number): Observable<SstImportResult> {
    const form = new FormData();
    form.append('file', file);
    const params = new HttpParams().set('year', String(year));
    return this._httpClient
      .post<ApiResponse<SstImportResult>>(`${environment.apiUrl}/api/SstEditor/ImportExcel`, form, {
        params,
      })
      .pipe(map((r) => r.data));
  }
}
