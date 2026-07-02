import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../shared/reveal.directive';

interface Photo {
  id: number;
  title: string;
  category: 'Formaciones' | 'Certificaciones' | 'Auditorías' | 'Eventos';
  place: string;
}

@Component({
  selector: 'app-galeria',
  imports: [RouterLink, RevealDirective],
  templateUrl: './galeria.html',
  styleUrl: './galeria.scss',
})
export class Galeria {
  readonly categories = ['Todas', 'Formaciones', 'Certificaciones', 'Auditorías', 'Eventos'] as const;
  readonly filter = signal<(typeof this.categories)[number]>('Todas');

  readonly photos: Photo[] = [
    { id: 1, title: 'Entrega de certificación', category: 'Certificaciones', place: 'Guatemala' },
    { id: 2, title: 'Ceremonia de graduación', category: 'Eventos', place: 'Guatemala' },
    { id: 3, title: 'Formación de auditores', category: 'Formaciones', place: 'Ecuador' },
    { id: 4, title: 'Reconocimiento institucional', category: 'Certificaciones', place: 'Guatemala' },
    { id: 5, title: 'Jornada de capacitación', category: 'Formaciones', place: 'Colombia' },
    { id: 6, title: 'Acto protocolario', category: 'Eventos', place: 'Guatemala' },
    { id: 7, title: 'Auditoría en planta', category: 'Auditorías', place: 'Colombia' },
    { id: 8, title: 'Taller de sensibilización', category: 'Formaciones', place: 'Colombia' },
    { id: 9, title: 'Entrega de diplomas', category: 'Certificaciones', place: 'Ecuador' },
    { id: 10, title: 'Visita de seguimiento', category: 'Auditorías', place: 'Colombia' },
    { id: 11, title: 'Congreso de gestión', category: 'Eventos', place: 'Colombia' },
    { id: 12, title: 'Formación in-company', category: 'Formaciones', place: 'Guatemala' },
  ];

  readonly filtered = computed(() => {
    const f = this.filter();
    return f === 'Todas' ? this.photos : this.photos.filter((p) => p.category === f);
  });

  readonly active = signal<Photo | null>(null);

  setFilter(cat: (typeof this.categories)[number]) {
    this.filter.set(cat);
  }
  open(photo: Photo) {
    this.active.set(photo);
  }
  close() {
    this.active.set(null);
  }
}
