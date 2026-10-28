import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { fixMojibakeDeep } from '../../core/mojibake';
import { UserService } from '../../core/user/user.service';
import { ApiResponse, SstDashboard, SstImportResult } from './sst-dashboard.types';

@Injectable({ providedIn: 'root' })
export class SstDashboardService {
  private _httpClient = inject(HttpClient);
  private _userService = inject(UserService);

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

  /**
   * Tablero de la empresa del usuario del portal (HU_079). No recibe código de empresa: el backend
   * lo resuelve desde el usuario del token, así que un cliente no puede pedir los datos de otra.
   */
  getClientDashboard(year?: number | null): Observable<SstDashboard> {
    let params = new HttpParams();
    if (year != null) {
      params = params.set('year', String(year));
    }

    return this._httpClient
      .get<ApiResponse<SstDashboard>>(`${environment.apiUrl}/api/PortalDashboard/GetDashboard`, {
        params,
      })
      .pipe(map((response) => fixMojibakeDeep(response.data)));
  }

  /**
   * Descarga el informe del tablero en PDF (generado en el servidor, HU_079).
   * Cliente del portal: solo su empresa (no se envía código). Equipo: consolidado o la empresa elegida.
   */
  exportPdf(year: number, clientCode: string | null): Observable<Blob> {
    if (this.isClientSession()) {
      const params = new HttpParams().set('year', String(year));
      return this._httpClient.get(`${environment.apiUrl}/api/PortalDashboard/ExportPdf`, {
        params,
        responseType: 'blob',
      });
    }

    let params = new HttpParams().set('year', String(year));
    if (clientCode) {
      params = params.set('clientCode', clientCode);
    }
    return this._httpClient.get(`${environment.apiUrl}/api/SstEditor/ExportPdf`, {
      params,
      responseType: 'blob',
    });
  }

  private isClientSession(): boolean {
    return this._userService.currentUser?.kind === 'client';
  }

  /**
   * Descarga el libro Excel con los datos SST del año. El cliente del portal recibe solo los datos de
   * su empresa (`PortalData/ExportExcel`); el equipo, los de todo el tenant (`SstEditor/ExportExcel`).
   */
  exportExcel(year: number): Observable<Blob> {
    const params = new HttpParams().set('year', String(year));
    const endpoint = this.isClientSession() ? 'api/PortalData/ExportExcel' : 'api/SstEditor/ExportExcel';
    return this._httpClient.get(`${environment.apiUrl}/${endpoint}`, {
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
