import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../sst-dashboard/sst-dashboard.types';

/** Código de categoría tal como lo guarda la base (sin tildes). */
export type PhotoCategory = 'FORMACIONES' | 'CERTIFICACIONES' | 'AUDITORIAS' | 'EVENTOS';

/**
 * Etiqueta visible para cada código. La base guarda el código sin tildes y aquí
 * se le pone el acento: así ni la base ni el query string transportan acentos.
 * Debe coincidir con FacilIso.Backend.Entities.Constants.PhotoCategories.
 */
export const CATEGORY_LABELS: Record<PhotoCategory, string> = {
  FORMACIONES: 'Formaciones',
  CERTIFICACIONES: 'Certificaciones',
  AUDITORIAS: 'Auditorías',
  EVENTOS: 'Eventos',
};

export const PHOTO_CATEGORIES = Object.keys(CATEGORY_LABELS) as PhotoCategory[];

export interface Photo {
  id: string;
  title: string;
  category: PhotoCategory;
  place: string | null;
  imageUrl: string;
  creationDate: string;
}

export interface PhotoPage {
  items: Photo[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface PhotoCreate {
  title: string;
  category: PhotoCategory;
  place?: string | null;
}

export interface PhotoUpdate extends PhotoCreate {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class GaleriaService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/PhotoRecord`;

  /** Listado paginado. Endpoint público: no requiere sesión. */
  getList(category: PhotoCategory | null, page: number, pageSize: number): Observable<PhotoPage> {
    let params = new HttpParams().set('page', String(page)).set('pageSize', String(pageSize));
    if (category) {
      params = params.set('category', category);
    }

    return this.http
      .get<ApiResponse<PhotoPage>>(`${this.base}/GetList`, { params })
      .pipe(map((r) => ({ ...r.data, items: r.data.items.map(absolutize) })));
  }

  create(dto: PhotoCreate, image: File): Observable<Photo> {
    return this.http
      .post<ApiResponse<Photo>>(`${this.base}/Create`, toFormData(dto, image))
      .pipe(map((r) => absolutize(r.data)));
  }

  update(dto: PhotoUpdate, image: File | null): Observable<Photo> {
    return this.http
      .put<ApiResponse<Photo>>(`${this.base}/Update`, toFormData(dto, image))
      .pipe(map((r) => absolutize(r.data)));
  }

  delete(id: string): Observable<void> {
    const params = new HttpParams().set('id', id);
    return this.http
      .delete<ApiResponse<null>>(`${this.base}/Delete`, { params })
      .pipe(map(() => undefined));
  }
}

/**
 * El backend devuelve la URL relativa a sí mismo ("/files/…") para no atar la
 * base a un host. La imagen la sirve la API, no el portal, así que hay que
 * anteponer apiUrl. Si algún día se configura un CDN (DiskStorage:PublicBaseUrl)
 * la URL ya vendrá absoluta y se deja tal cual.
 */
function absolutize(photo: Photo): Photo {
  return { ...photo, imageUrl: resolveImageUrl(photo.imageUrl) };
}

export function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;
  return `${environment.apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** El backend recibe la foto como multipart: textos + archivo opcional. */
function toFormData(dto: PhotoCreate | PhotoUpdate, image: File | null): FormData {
  const form = new FormData();
  if ('id' in dto) {
    form.append('id', dto.id);
  }
  form.append('title', dto.title);
  form.append('category', dto.category);
  if (dto.place) {
    form.append('place', dto.place);
  }
  if (image) {
    form.append('image', image);
  }
  return form;
}
