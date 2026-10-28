import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { UserService } from '../../core/user/user.service';
import { MiEmpresaService, MyTrainingMonth } from './mi-empresa.service';

type Tab = 'empresa' | 'indicadores' | 'demografia' | 'capacitaciones';

interface Field {
  name: string;
  label: string;
  step: string;
  max?: number;
}

/**
 * «Mi empresa» (HU_079): el usuario del portal edita únicamente los datos de SU empresa (perfil,
 * indicadores, demografía y capacitaciones del año). La empresa no viaja en ninguna petición: el
 * backend la resuelve desde su sesión.
 */
@Component({
  selector: 'app-mi-empresa',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './mi-empresa.html',
  styleUrls: ['../portal-admin/portal-admin-panel.scss', './mi-empresa.scss'],
})
export class MiEmpresa {
  private service = inject(MiEmpresaService);
  private fb = inject(FormBuilder);

  readonly companyName = inject(UserService).currentUser?.clientName ?? 'Mi empresa';
  readonly riskLevels = ['I', 'II', 'III', 'IV', 'V'];

  readonly tab = signal<Tab>('indicadores');

  // Años seleccionables: los 6 últimos y el siguiente.
  readonly years = (() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => current + 1 - i);
  })();
  readonly year = signal(new Date().getFullYear());

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly hasData = signal(false);
  readonly submitted = signal(false);

  readonly showsYear = computed(() => this.tab() !== 'empresa');

  readonly companyForm = this.fb.group({
    email: ['', [Validators.email, Validators.maxLength(150)]],
    riskLevel: [''],
    arl: ['', Validators.maxLength(100)],
    employees: [0, [Validators.required, Validators.min(0)]],
  });

  readonly indicatorsForm = this.fb.group({
    selfAssessmentPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    objectivesPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    incidents: [0, [Validators.required, Validators.min(0)]],
    accidents: [0, [Validators.required, Validators.min(0)]],
    disabilityDays: [0, [Validators.required, Validators.min(0)]],
    occupationalDiseases: [0, [Validators.required, Validators.min(0)]],
    fatalAccidents: [0, [Validators.required, Validators.min(0)]],
    newOccupationalDiseaseCases: [0, [Validators.required, Validators.min(0)]],
  });

  readonly demographyForm = this.fb.group({
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

  readonly trainingsForm = this.fb.array<ReturnType<MiEmpresa['monthGroup']>>([]);

  /** Campos de los formularios (etiqueta, paso y tope) para no repetir el mismo bloque de HTML. */
  readonly indicatorFields: Field[] = [
    { name: 'selfAssessmentPct', label: 'Autoevaluación ARL (%)', step: '0.1', max: 100 },
    { name: 'objectivesPct', label: 'Cumplimiento de objetivos SST (%)', step: '0.1', max: 100 },
    { name: 'incidents', label: 'Incidentes', step: '1' },
    { name: 'accidents', label: 'Accidentes de trabajo', step: '1' },
    { name: 'disabilityDays', label: 'Días de incapacidad', step: '1' },
    { name: 'occupationalDiseases', label: 'Enfermedades laborales', step: '1' },
    { name: 'fatalAccidents', label: 'AT mortales', step: '1' },
    { name: 'newOccupationalDiseaseCases', label: 'Casos nuevos de enfermedad laboral', step: '1' },
  ];

  readonly demographyFields: Field[] = [
    { name: 'employees', label: 'Colaboradores', step: '1' },
    { name: 'men', label: 'Hombres', step: '1' },
    { name: 'women', label: 'Mujeres', step: '1' },
    { name: 'averageAge', label: 'Edad promedio (años)', step: '0.1', max: 120 },
    { name: 'averageEducationYears', label: 'Escolaridad promedio (años)', step: '0.1', max: 30 },
    { name: 'averageStratum', label: 'Estrato promedio', step: '0.1', max: 6 },
    { name: 'averageChildren', label: 'Hijos promedio', step: '0.1', max: 20 },
  ];

  constructor() {
    this.load();
  }

  private monthGroup(m: MyTrainingMonth) {
    return this.fb.group({
      monthNumber: [m.monthNumber],
      monthName: [m.monthName],
      completed: [m.completed, [Validators.required, Validators.min(0)]],
      target: [m.target, [Validators.required, Validators.min(0)]],
    });
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
    this.load();
  }

  onYearChange(event: Event): void {
    this.year.set(Number((event.target as HTMLSelectElement).value));
    this.load();
  }

  invalid(form: { get(name: string): { invalid: boolean; touched: boolean } | null }, control: string): boolean {
    const c = form.get(control);
    return !!c && c.invalid && (c.touched || this.submitted());
  }

  /** Carga los datos de la pestaña activa (siempre de la empresa del usuario). */
  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.submitted.set(false);

    const done = () => this.loading.set(false);
    const fail = (err: HttpErrorResponse) => {
      this.error.set(this.describe(err));
      done();
    };

    switch (this.tab()) {
      case 'empresa':
        this.service.getCompany().subscribe({
          next: (c) => {
            this.companyForm.reset({
              email: c.email ?? '',
              riskLevel: c.riskLevel ?? '',
              arl: c.arl ?? '',
              employees: c.employees,
            });
            done();
          },
          error: fail,
        });
        break;
      case 'indicadores':
        this.service.getIndicators(this.year()).subscribe({
          next: (i) => {
            this.indicatorsForm.reset({ ...i });
            this.hasData.set(i.hasData);
            done();
          },
          error: fail,
        });
        break;
      case 'demografia':
        this.service.getDemography(this.year()).subscribe({
          next: (d) => {
            this.demographyForm.reset({
              ...d,
              mainRole: d.mainRole ?? '',
              mainHealthProvider: d.mainHealthProvider ?? '',
            });
            this.hasData.set(d.hasData);
            done();
          },
          error: fail,
        });
        break;
      case 'capacitaciones':
        this.service.getTrainings(this.year()).subscribe({
          next: (months) => {
            this.trainingsForm.clear();
            months.forEach((m) => this.trainingsForm.push(this.monthGroup(m)));
            done();
          },
          error: fail,
        });
        break;
    }
  }

  save(): void {
    this.submitted.set(true);
    this.error.set(null);
    this.notice.set(null);

    const form =
      this.tab() === 'empresa'
        ? this.companyForm
        : this.tab() === 'indicadores'
          ? this.indicatorsForm
          : this.tab() === 'demografia'
            ? this.demographyForm
            : this.trainingsForm;

    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const year = this.year();
    const num = (v: unknown) => Number(v ?? 0);

    let request$: Observable<unknown>;
    switch (this.tab()) {
      case 'empresa': {
        const v = this.companyForm.getRawValue();
        request$ = this.service.updateCompany({
          email: v.email?.trim() || null,
          riskLevel: v.riskLevel || null,
          arl: v.arl?.trim() || null,
          employees: num(v.employees),
        });
        break;
      }
      case 'indicadores': {
        const v = this.indicatorsForm.getRawValue();
        request$ = this.service.saveIndicators({
          year,
          selfAssessmentPct: num(v.selfAssessmentPct),
          objectivesPct: num(v.objectivesPct),
          incidents: num(v.incidents),
          accidents: num(v.accidents),
          disabilityDays: num(v.disabilityDays),
          occupationalDiseases: num(v.occupationalDiseases),
          fatalAccidents: num(v.fatalAccidents),
          newOccupationalDiseaseCases: num(v.newOccupationalDiseaseCases),
        });
        break;
      }
      case 'demografia': {
        const v = this.demographyForm.getRawValue();
        request$ = this.service.saveDemography({
          year,
          employees: num(v.employees),
          men: num(v.men),
          women: num(v.women),
          averageAge: num(v.averageAge),
          averageEducationYears: num(v.averageEducationYears),
          averageStratum: num(v.averageStratum),
          averageChildren: num(v.averageChildren),
          mainRole: v.mainRole?.trim() || null,
          mainHealthProvider: v.mainHealthProvider?.trim() || null,
        });
        break;
      }
      default: {
        const months: MyTrainingMonth[] = (this.trainingsForm as FormArray).controls.map((g) => ({
          monthNumber: num(g.value.monthNumber),
          monthName: String(g.value.monthName ?? ''),
          completed: num(g.value.completed),
          target: num(g.value.target),
        }));
        request$ = this.service.saveTrainings(year, months);
      }
    }

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.notice.set('Cambios guardados. Ya se ven en tu tablero.');
        this.hasData.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(this.describe(err));
      },
    });
  }

  private describe(err: HttpErrorResponse): string {
    if (err?.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    }
    if (err?.status === 403) {
      return 'Tu cuenta o tu empresa no están activas. Comunícate con GS Integral.';
    }
    return err?.error?.message ?? 'Ocurrió un error. Intenta nuevamente.';
  }
}
