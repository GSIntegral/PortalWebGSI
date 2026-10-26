import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  SstDemographyRow,
  SstDemographyUpsert,
  SstEditorService,
  SstIndicatorRow,
  SstIndicatorUpsert,
  SstTrainingMonth,
  SstTrainingSave,
  SstTrainingSummary,
} from './sst-editor.service';

@Component({
  selector: 'app-sst-editor',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sst-editor.html',
  styleUrl: './sst-editor.scss',
})
export class SstEditor {
  private service = inject(SstEditorService);
  private fb = inject(FormBuilder);

  // ── Pestañas ──────────────────────────────────────────────────────
  // La gestión de empresas se movió a «Administración del portal» (/portal-admin, HU_079).
  readonly activeTab = signal<'indicadores' | 'demografia' | 'capacitaciones'>('indicadores');

  // ── Indicadores ───────────────────────────────────────────────────
  readonly indicators = signal<SstIndicatorRow[]>([]);
  readonly indLoading = signal(false);
  readonly indSaving = signal(false);
  readonly indError = signal<string | null>(null);
  readonly indFormError = signal<string | null>(null);
  readonly indShowForm = signal(false);
  readonly indYear = signal(2026);
  readonly editingClientId = signal<string | null>(null);
  readonly editingClientName = signal<string>('');

  readonly indForm = this.fb.group({
    selfAssessmentPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    objectivesPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    incidents: [0, [Validators.required, Validators.min(0)]],
    accidents: [0, [Validators.required, Validators.min(0)]],
    disabilityDays: [0, [Validators.required, Validators.min(0)]],
    occupationalDiseases: [0, [Validators.required, Validators.min(0)]],
    fatalAccidents: [0, [Validators.required, Validators.min(0)]],
    newOccupationalDiseaseCases: [0, [Validators.required, Validators.min(0)]],
  });

  // ── Demografía ────────────────────────────────────────────────────
  readonly demography = signal<SstDemographyRow[]>([]);
  readonly demLoading = signal(false);
  readonly demSaving = signal(false);
  readonly demError = signal<string | null>(null);
  readonly demFormError = signal<string | null>(null);
  readonly demShowForm = signal(false);
  readonly demYear = signal(2026);
  readonly editingDemClientId = signal<string | null>(null);
  readonly editingDemClientName = signal<string>('');

  readonly demForm = this.fb.group({
    employees: [0, [Validators.required, Validators.min(0)]],
    men: [0, [Validators.required, Validators.min(0)]],
    women: [0, [Validators.required, Validators.min(0)]],
    averageAge: [0, [Validators.required, Validators.min(0), Validators.max(120)]],
    averageEducationYears: [0, [Validators.required, Validators.min(0), Validators.max(30)]],
    averageStratum: [0, [Validators.required, Validators.min(0), Validators.max(6)]],
    averageChildren: [0, [Validators.required, Validators.min(0), Validators.max(20)]],
    mainRole: ['', Validators.maxLength(100)],
    mainHealthProvider: ['', Validators.maxLength(100)],
  });

  // ── Capacitaciones ────────────────────────────────────────────────
  readonly trainings = signal<SstTrainingSummary[]>([]);
  readonly capLoading = signal(false);
  readonly capSaving = signal(false);
  readonly capError = signal<string | null>(null);
  readonly capFormError = signal<string | null>(null);
  readonly capShowForm = signal(false);
  readonly capYear = signal(2026);
  readonly editingCapClientId = signal<string | null>(null);
  readonly editingCapClientName = signal<string>('');
  readonly capMonthsForm = this.fb.array<
    ReturnType<SstEditor['buildMonthGroup']>
  >([]);

  buildMonthGroup(m: SstTrainingMonth) {
    return this.fb.group({
      monthNumber: [m.monthNumber],
      monthName: [m.monthName],
      completed: [m.completed, [Validators.required, Validators.min(0)]],
      target: [m.target, [Validators.required, Validators.min(0)]],
    });
  }

  constructor() {
    this.loadIndicators();
  }

  // ── Pestañas / Indicadores ────────────────────────────────────────
  setTab(tab: 'indicadores' | 'demografia' | 'capacitaciones'): void {
    this.activeTab.set(tab);
    if (tab === 'indicadores' && this.indicators().length === 0) {
      this.loadIndicators();
    }
    if (tab === 'demografia' && this.demography().length === 0) {
      this.loadDemography();
    }
    if (tab === 'capacitaciones' && this.trainings().length === 0) {
      this.loadTrainings();
    }
  }

  loadIndicators(): void {
    this.indLoading.set(true);
    this.indError.set(null);
    this.service.getIndicators(this.indYear()).subscribe({
      next: (rows) => {
        this.indicators.set(rows);
        this.indLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.indError.set(this.describe(err));
        this.indLoading.set(false);
      },
    });
  }

  onIndYearChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isNaN(value) && value > 0) {
      this.indYear.set(value);
      this.indShowForm.set(false);
      this.loadIndicators();
    }
  }

  editIndicator(row: SstIndicatorRow): void {
    this.editingClientId.set(row.clientId);
    this.editingClientName.set(row.name);
    this.indFormError.set(null);
    this.indForm.reset({
      selfAssessmentPct: row.selfAssessmentPct,
      objectivesPct: row.objectivesPct,
      incidents: row.incidents,
      accidents: row.accidents,
      disabilityDays: row.disabilityDays,
      occupationalDiseases: row.occupationalDiseases,
      fatalAccidents: row.fatalAccidents,
      newOccupationalDiseaseCases: row.newOccupationalDiseaseCases,
    });
    this.indShowForm.set(true);
  }

  cancelIndicator(): void {
    this.indShowForm.set(false);
  }

  saveIndicator(): void {
    this.indFormError.set(null);
    if (this.indForm.invalid) {
      this.indForm.markAllAsTouched();
      return;
    }
    const clientId = this.editingClientId();
    if (!clientId) return;

    const raw = this.indForm.getRawValue();
    const payload: SstIndicatorUpsert = {
      clientId,
      year: this.indYear(),
      selfAssessmentPct: Number(raw.selfAssessmentPct ?? 0),
      objectivesPct: Number(raw.objectivesPct ?? 0),
      incidents: Number(raw.incidents ?? 0),
      accidents: Number(raw.accidents ?? 0),
      disabilityDays: Number(raw.disabilityDays ?? 0),
      occupationalDiseases: Number(raw.occupationalDiseases ?? 0),
      fatalAccidents: Number(raw.fatalAccidents ?? 0),
      newOccupationalDiseaseCases: Number(raw.newOccupationalDiseaseCases ?? 0),
    };

    this.indSaving.set(true);
    this.service.saveIndicator(payload).subscribe({
      next: () => {
        this.indSaving.set(false);
        this.indShowForm.set(false);
        this.loadIndicators();
      },
      error: (err: HttpErrorResponse) => {
        this.indSaving.set(false);
        this.indFormError.set(this.describe(err));
      },
    });
  }

  // ── Demografía ────────────────────────────────────────────────────
  loadDemography(): void {
    this.demLoading.set(true);
    this.demError.set(null);
    this.service.getDemography(this.demYear()).subscribe({
      next: (rows) => {
        this.demography.set(rows);
        this.demLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.demError.set(this.describe(err));
        this.demLoading.set(false);
      },
    });
  }

  onDemYearChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isNaN(value) && value > 0) {
      this.demYear.set(value);
      this.demShowForm.set(false);
      this.loadDemography();
    }
  }

  editDemography(row: SstDemographyRow): void {
    this.editingDemClientId.set(row.clientId);
    this.editingDemClientName.set(row.name);
    this.demFormError.set(null);
    this.demForm.reset({
      employees: row.employees,
      men: row.men,
      women: row.women,
      averageAge: row.averageAge,
      averageEducationYears: row.averageEducationYears,
      averageStratum: row.averageStratum,
      averageChildren: row.averageChildren,
      mainRole: row.mainRole ?? '',
      mainHealthProvider: row.mainHealthProvider ?? '',
    });
    this.demShowForm.set(true);
  }

  cancelDemography(): void {
    this.demShowForm.set(false);
  }

  saveDemography(): void {
    this.demFormError.set(null);
    if (this.demForm.invalid) {
      this.demForm.markAllAsTouched();
      return;
    }
    const clientId = this.editingDemClientId();
    if (!clientId) return;

    const raw = this.demForm.getRawValue();
    const payload: SstDemographyUpsert = {
      clientId,
      year: this.demYear(),
      employees: Number(raw.employees ?? 0),
      men: Number(raw.men ?? 0),
      women: Number(raw.women ?? 0),
      averageAge: Number(raw.averageAge ?? 0),
      averageEducationYears: Number(raw.averageEducationYears ?? 0),
      averageStratum: Number(raw.averageStratum ?? 0),
      averageChildren: Number(raw.averageChildren ?? 0),
      mainRole: raw.mainRole ? raw.mainRole.trim() : null,
      mainHealthProvider: raw.mainHealthProvider ? raw.mainHealthProvider.trim() : null,
    };

    this.demSaving.set(true);
    this.service.saveDemography(payload).subscribe({
      next: () => {
        this.demSaving.set(false);
        this.demShowForm.set(false);
        this.loadDemography();
      },
      error: (err: HttpErrorResponse) => {
        this.demSaving.set(false);
        this.demFormError.set(this.describe(err));
      },
    });
  }

  // ── Capacitaciones ────────────────────────────────────────────────
  loadTrainings(): void {
    this.capLoading.set(true);
    this.capError.set(null);
    this.service.getTrainings(this.capYear()).subscribe({
      next: (rows) => {
        this.trainings.set(rows);
        this.capLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.capError.set(this.describe(err));
        this.capLoading.set(false);
      },
    });
  }

  onCapYearChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isNaN(value) && value > 0) {
      this.capYear.set(value);
      this.capShowForm.set(false);
      this.loadTrainings();
    }
  }

  editTraining(row: SstTrainingSummary): void {
    this.editingCapClientId.set(row.clientId);
    this.editingCapClientName.set(row.name);
    this.capFormError.set(null);
    this.service.getTrainingMonths(row.clientId, this.capYear()).subscribe({
      next: (months) => {
        this.capMonthsForm.clear();
        for (const m of months) {
          this.capMonthsForm.push(this.buildMonthGroup(m));
        }
        this.capShowForm.set(true);
      },
      error: (err: HttpErrorResponse) => this.capError.set(this.describe(err)),
    });
  }

  cancelTraining(): void {
    this.capShowForm.set(false);
  }

  saveTrainings(): void {
    this.capFormError.set(null);
    if (this.capMonthsForm.invalid) {
      this.capMonthsForm.markAllAsTouched();
      return;
    }
    const clientId = this.editingCapClientId();
    if (!clientId) return;

    const months: SstTrainingMonth[] = this.capMonthsForm.controls.map((g) => ({
      monthNumber: Number(g.value.monthNumber ?? 0),
      monthName: g.value.monthName ?? '',
      completed: Number(g.value.completed ?? 0),
      target: Number(g.value.target ?? 0),
    }));

    const payload: SstTrainingSave = { clientId, year: this.capYear(), months };

    this.capSaving.set(true);
    this.service.saveTrainings(payload).subscribe({
      next: () => {
        this.capSaving.set(false);
        this.capShowForm.set(false);
        this.loadTrainings();
      },
      error: (err: HttpErrorResponse) => {
        this.capSaving.set(false);
        this.capFormError.set(this.describe(err));
      },
    });
  }

  private describe(err: HttpErrorResponse): string {
    if (err?.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.';
    }
    if (err?.status === 403) {
      return 'No tienes permiso para esta acción.';
    }
    return err?.error?.message ?? 'Ocurrió un error. Intenta nuevamente.';
  }
}
