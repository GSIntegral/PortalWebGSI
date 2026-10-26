import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../sst-dashboard/sst-dashboard.types';

/** Usuario del portal (cliente) tal como lo devuelve `/api/PortalUsers`. */
export interface PortalUser {
  userId: string;
  clientId: string;
  clientCode: string;
  clientName: string;
  /** False si la empresa ligada fue eliminada: el usuario no podrá ingresar. */
  clientActive: boolean;
  fullName: string;
  email: string;
  status: boolean;
  isFirstLogin: boolean;
  isLocked: boolean;
  lastLogin: string | null;
  creationDate: string;
}

export interface PortalUserCreate {
  fullName: string;
  email: string;
  clientId: string;
}

export interface PortalUserCreateResult {
  userId: string;
  email: string;
  /** False si el correo con la contraseña temporal no pudo enviarse. */
  tempPasswordEmailSent: boolean;
}

export interface PortalUserUpdate {
  userId: string;
  fullName: string;
  clientId: string;
}

/**
 * Administración de los usuarios del portal (HU_079). Se usa con la sesión del EQUIPO de GS
 * Integral; las empresas se gestionan con `SstEditorService` (son las mismas del tablero SST).
 */
@Injectable({ providedIn: 'root' })
export class PortalAdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/PortalUsers`;

  getUsers(clientId?: string | null): Observable<PortalUser[]> {
    let params = new HttpParams();
    if (clientId) {
      params = params.set('clientId', clientId);
    }
    return this.http
      .get<ApiResponse<PortalUser[]>>(`${this.base}/GetList`, { params })
      .pipe(map((r) => r.data));
  }

  createUser(dto: PortalUserCreate): Observable<PortalUserCreateResult> {
    return this.http
      .post<ApiResponse<PortalUserCreateResult>>(`${this.base}/Register`, dto)
      .pipe(map((r) => r.data));
  }

  updateUser(dto: PortalUserUpdate): Observable<PortalUser> {
    return this.http
      .put<ApiResponse<PortalUser>>(`${this.base}/Update`, dto)
      .pipe(map((r) => r.data));
  }

  setUserStatus(userId: string, isActive: boolean): Observable<PortalUser> {
    return this.http
      .patch<ApiResponse<PortalUser>>(`${this.base}/UpdateStatus`, { userId, isActive })
      .pipe(map((r) => r.data));
  }

  /** Genera una contraseña temporal nueva, desbloquea la cuenta y la envía por correo. */
  resetPassword(userId: string): Observable<{ tempPasswordEmailSent: boolean }> {
    return this.http
      .post<ApiResponse<{ tempPasswordEmailSent: boolean }>>(`${this.base}/ResetPassword`, {
        userId,
      })
      .pipe(map((r) => r.data));
  }
}
