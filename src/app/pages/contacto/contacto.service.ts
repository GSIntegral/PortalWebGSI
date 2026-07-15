import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../sst-dashboard/sst-dashboard.types';

/**
 * Mensaje del formulario «Escríbenos». Los nombres de campo deben coincidir con
 * FacilIso.Backend.Entities.DTOs.Contact.ContactRequestDto.
 */
export interface ContactRequest {
  nombre: string;
  email: string;
  telefono: string;
  asunto: string;
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class ContactoService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/Contact`;

  /** El backend entrega el correo a los destinatarios configurados en su sección Contact. */
  send(dto: ContactRequest): Observable<void> {
    return this.http.post<ApiResponse<null>>(`${this.base}/Send`, dto).pipe(map(() => void 0));
  }
}
