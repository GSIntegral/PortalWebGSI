import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SstDashboardService } from './sst-dashboard.service';
import { SstDashboard as SstDashboardData, SstImportResult, SstMonthlyTraining } from './sst-dashboard.types';

interface KpiCard {
  label: string;
  value: string;
  accent: string;
  foot?: string;
}

interface VBar {
  label: string;
  value: number;
  display: string;
  heightH: number;
  accent: string;
}

interface HBar {
  label: string;
  value: number;
  display: string;
  width: number;
  accent: string;
}

@Component({
  selector: 'app-sst-dashboard',
  imports: [RouterLink],
  templateUrl: './sst-dashboard.html',
  styleUrl: './sst-dashboard.scss',
})
export class SstDashboard {
  private sstService = inject(SstDashboardService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<SstDashboardData | null>(null);

  // Geometría de gráficos.
  readonly chartHeight = 200;

  constructor() {
    this.load(null, null);
  }

  load(year: number | null, clientCode: string | null): void {
    this.loading.set(true);
    this.error.set(null);
    this.sstService.getDashboard(year, clientCode).subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.describeError(err));
        this.loading.set(false);
      },
    });
  }

  onClientChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.load(this.data()?.year ?? null, value || null);
  }

  /** Nombre de la empresa filtrada (o "consolidado"). */
  readonly selectedClientName = computed<string>(() => {
    const d = this.data();
    if (!d?.selectedClientCode) return 'Todas las empresas (consolidado)';
    return d.availableClients.find((c) => c.code === d.selectedClientCode)?.name ?? d.selectedClientCode;
  });

  /** Iniciales de la empresa seleccionada, para el placeholder cuando no hay logo. */
  readonly clientInitials = computed<string>(() => {
    const name = this.selectedClientName();
    const initials = name
      .split(/\s+/)
      .filter((w) => /[a-zA-ZÀ-ÿ0-9]/.test(w))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
    return initials || '—';
  });

  print(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  readonly exporting = signal(false);

  exportExcel(): void {
    const year = this.data()?.year ?? new Date().getFullYear();
    this.exporting.set(true);
    this.sstService.exportExcel(year).subscribe({
      next: (blob) => {
        this.saveBlob(blob, `tablero_sst_${year}.xlsx`);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }

  downloadTemplate(): void {
    this.sstService.exportTemplate().subscribe({
      next: (blob) => this.saveBlob(blob, 'plantilla_importacion_sst.xlsx'),
    });
  }

  private saveBlob(blob: Blob, filename: string): void {
    if (typeof document === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Importar ──────────────────────────────────────────────────────
  readonly importing = signal(false);
  readonly importResult = signal<SstImportResult | null>(null);
  readonly importError = signal<string | null>(null);

  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const year = this.data()?.year ?? new Date().getFullYear();
    this.importing.set(true);
    this.importResult.set(null);
    this.importError.set(null);

    this.sstService.importExcel(file, year).subscribe({
      next: (res) => {
        this.importResult.set(res);
        this.importing.set(false);
        input.value = '';
        this.load(year, this.data()?.selectedClientCode ?? null);
      },
      error: (err: HttpErrorResponse) => {
        this.importError.set(err?.error?.message ?? 'No fue posible importar el archivo.');
        this.importing.set(false);
        input.value = '';
      },
    });
  }

  dismissImportResult(): void {
    this.importResult.set(null);
    this.importError.set(null);
  }

  private describeError(err: HttpErrorResponse): string {
    switch (err?.status) {
      case 0:
        return 'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución (https://localhost:7259).';
      case 401:
        return 'Tu sesión expiró. Inicia sesión nuevamente.';
      case 403:
        return 'No tienes permiso para ver el tablero SST o aún no has seleccionado una empresa.';
      default:
        return 'No fue posible cargar el tablero SST. Intenta nuevamente.';
    }
  }

  onYearChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.load(Number.isNaN(value) ? null : value, this.data()?.selectedClientCode ?? null);
  }

  // ── KPIs (set del tablero: 11 indicadores) ────────────────────────
  readonly kpiCards = computed<KpiCard[]>(() => {
    const d = this.data();
    if (!d) return [];
    const k = d.kpis;
    return [
      { label: 'Empresas atendidas', value: this.int(k.companyCount), accent: 'var(--primary-500)', foot: `clientes activos ${d.year}` },
      { label: 'Colaboradores cubiertos', value: this.int(k.employeeCount), accent: '#16a085', foot: 'trabajadores protegidos' },
      { label: 'Autoevaluación ARL', value: this.pct(k.selfAssessmentAvgPct), accent: '#27ae60', foot: 'prom. estándares mínimos' },
      { label: 'Cumplim. capacitaciones', value: this.pct(k.trainingAvgPct), accent: '#f5a623', foot: 'ejecución plan anual' },
      { label: 'Accidentes de trabajo', value: this.int(k.accidents), accent: '#e67e22', foot: 'total AT reportados' },
      { label: 'Días de incapacidad', value: this.int(k.disabilityDays), accent: '#e2574c', foot: 'días perdidos por AT' },
      { label: 'Enfermedades laborales', value: this.int(k.occupationalDiseases), accent: '#d35400', foot: 'casos identificados' },
      { label: 'AT mortales', value: this.int(k.fatalAccidents), accent: '#c0392b', foot: 'mortalidad (Res. 0312)' },
      { label: 'Prevalencia enf. laboral', value: this.int(k.prevalenceRate), accent: '#8e44ad', foot: 'casos ×100.000 trab.' },
      { label: 'Incidencia enf. laboral', value: this.int(k.incidenceRate), accent: '#9b59b6', foot: 'casos nuevos ×100.000' },
      { label: 'Severidad', value: this.dec(k.severityRate), accent: '#2d9cdb', foot: 'días por accidente' },
    ];
  });

  // ── Capacitaciones: realizadas vs meta por mes (línea) ────────────
  readonly trainingChart = computed(() => {
    const d = this.data();
    if (!d || !d.monthlyTraining.length) return null;
    const months = d.monthlyTraining;
    const w = 640;
    const h = this.chartHeight;
    const padX = 32;
    const padTop = 24;
    const padBottom = 28;
    const max = Math.max(1, ...months.flatMap((m) => [m.completed, m.target]));
    const stepX = (w - padX * 2) / Math.max(1, months.length - 1);
    const xAt = (i: number) => padX + stepX * i;
    const yAt = (v: number) => padTop + (h - padTop - padBottom) * (1 - v / max);
    const toPts = (sel: (m: SstMonthlyTraining) => number) =>
      months.map((m, i) => `${xAt(i)},${yAt(sel(m))}`).join(' ');
    return {
      w,
      h,
      realPts: toPts((m) => m.completed),
      metaPts: toPts((m) => m.target),
      real: months.map((m, i) => ({ cx: xAt(i), cy: yAt(m.completed), v: m.completed })),
      meta: months.map((m, i) => ({ cx: xAt(i), cy: yAt(m.target) })),
      labels: months.map((m, i) => ({ x: xAt(i), text: m.monthName.slice(0, 3) })),
      baseline: h - padBottom,
      grid: [0, 0.25, 0.5, 0.75, 1].map((f) => ({
        y: padTop + (h - padTop - padBottom) * (1 - f),
        v: this.int(Math.round(max * f)),
        x1: padX,
        x2: w - padX,
      })),
    };
  });

  // ── Cumplimiento de indicadores (%) ───────────────────────────────
  readonly complianceBars = computed<HBar[]>(() => {
    const d = this.data();
    if (!d) return [];
    const k = d.kpis;
    const accidentRate = k.employeeCount > 0 ? (k.accidents / k.employeeCount) * 100 : 0;
    return [
      { label: 'Autoevaluación ARL', value: k.selfAssessmentAvgPct, display: this.pct(k.selfAssessmentAvgPct), width: this.clampPct(k.selfAssessmentAvgPct), accent: '#27ae60' },
      { label: 'Objetivos SST', value: k.objectivesAvgPct, display: this.pct(k.objectivesAvgPct), width: this.clampPct(k.objectivesAvgPct), accent: '#16a085' },
      { label: 'Capacitaciones', value: k.trainingAvgPct, display: this.pct(k.trainingAvgPct), width: this.clampPct(k.trainingAvgPct), accent: '#f5a623' },
      { label: 'Accidentalidad', value: accidentRate, display: this.pct(accidentRate), width: this.clampPct(accidentRate), accent: '#e2574c' },
    ];
  });

  // ── Indicadores de resultado SST (conteo de casos, barras vert.) ──
  readonly resultBars = computed<VBar[]>(() => {
    const d = this.data();
    if (!d) return [];
    const k = d.kpis;
    const items = [
      { label: 'Incidentes', value: k.incidents, accent: '#f5a623' },
      { label: 'Accidentes', value: k.accidents, accent: '#e67e22' },
      { label: 'Enf. laborales', value: k.occupationalDiseases, accent: '#8e44ad' },
      { label: 'AT mortales', value: k.fatalAccidents, accent: '#c0392b' },
    ];
    const max = Math.max(1, ...items.map((i) => i.value));
    return items.map((i) => ({
      ...i,
      display: this.int(i.value),
      heightH: (i.value / max) * this.chartHeight,
    }));
  });

  // ── Días de incapacidad: selección vs promedio del portafolio ─────
  readonly disabilityCompare = computed<VBar[]>(() => {
    const d = this.data();
    if (!d) return [];
    const count = d.companies.length || 1;
    const portfolioAvg = d.companies.reduce((s, c) => s + c.disabilityDays, 0) / count;
    const items = [
      { label: 'Selección', value: d.kpis.disabilityDays, display: this.int(d.kpis.disabilityDays), accent: '#2f78c4' },
      { label: 'Prom. portafolio', value: portfolioAvg, display: this.dec(portfolioAvg), accent: '#16a085' },
    ];
    const max = Math.max(1, ...items.map((i) => i.value));
    return items.map((i) => ({ ...i, heightH: (i.value / max) * this.chartHeight }));
  });

  // ── Distribución por género (donut) ───────────────────────────────
  readonly gender = computed(() => {
    const d = this.data();
    const men = d?.demographics.men ?? 0;
    const women = d?.demographics.women ?? 0;
    const total = men + women || 1;
    const circ = 2 * Math.PI * 52; // r = 52
    const menDash = (men / total) * circ;
    return {
      men,
      women,
      total: men + women,
      menPct: Math.round((men / total) * 100),
      womenPct: Math.round((women / total) * 100),
      circ,
      menDash,
      womenDash: circ - menDash,
    };
  });

  // ── Formatters ────────────────────────────────────────────────────
  private nf(digits: number): Intl.NumberFormat {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }
  int(n: number): string {
    return this.nf(0).format(n ?? 0);
  }
  dec(n: number): string {
    return this.nf(1).format(n ?? 0);
  }
  pct(n: number): string {
    return `${this.nf(1).format(n ?? 0)}%`;
  }
  private clampPct(n: number): number {
    return Math.max(0, Math.min(100, n ?? 0));
  }
}
