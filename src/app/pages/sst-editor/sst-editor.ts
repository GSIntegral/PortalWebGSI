import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  SstClient,
  SstClientCreate,
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

  readonly clients = signal<SstClient[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly submitted = signal(false);

  readonly riskLevels = ['I', 'II', 'III', 'IV', 'V'];

  // ── Pestañas ──────────────────────────────────────────────────────
  readonly activeTab = signal<'empresas' | 'indicadores' | 'demografia' | 'capacitaciones'>(
    'empresas',
  );

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

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    riskLevel: [''],
    arl: ['', Validators.maxLength(100)],
    employees: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.getClients().subscribe({
      next: (list) => {
        this.clients.set(list);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.describe(err));
        this.loading.set(false);
      },
    });
  }

  newClient(): void {
    this.editingId.set(null);
    this.submitted.set(false);
    this.formError.set(null);
    this.form.reset({ name: '', email: '', riskLevel: '', arl: '', employees: 0 });
    this.showForm.set(true);
  }

  edit(c: SstClient): void {
    this.editingId.set(c.id);
    this.submitted.set(false);
    this.formError.set(null);
    this.form.reset({
      name: c.name,
      email: c.email ?? '',
      riskLevel: c.riskLevel ?? '',
      arl: c.arl ?? '',
      employees: c.employees,
    });
    this.showForm.set(true);
  }

  cancel(): void {
    this.showForm.set(false);
  }

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.touched || this.submitted());
  }

  save(): void {
    this.submitted.set(true);
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: SstClientCreate = {
      name: (raw.name ?? '').trim(),
      email: raw.email ? raw.email.trim() : null,
      riskLevel: raw.riskLevel || null,
      arl: raw.arl ? raw.arl.trim() : null,
      employees: Number(raw.employees ?? 0),
    };

    this.saving.set(true);
    const id = this.editingId();
    const request$ = id
      ? this.service.updateClient({ ...payload, id })
      : this.service.createClient(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.formError.set(this.describe(err));
      },
    });
  }

  remove(c: SstClient): void {
    if (typeof window !== 'undefined' && !window.confirm(`¿Eliminar la empresa "${c.name}"?`)) {
      return;
    }
    this.service.deleteClient(c.id).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) => this.error.set(this.describe(err)),
    });
  }

  onLogoFile(client: SstClient, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      this.error.set('El logo no debe superar 1 MB.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.service.setLogo(client.id, dataUrl).subscribe({
        next: () => {
          input.value = '';
          this.reload();
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(this.describe(err));
          input.value = '';
        },
      });
    };
    reader.readAsDataURL(file);
  }

  // ── Pestañas / Indicadores ────────────────────────────────────────
  setTab(tab: 'empresas' | 'indicadores' | 'demografia' | 'capacitaciones'): void {
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
