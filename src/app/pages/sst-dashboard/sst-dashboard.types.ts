// Contratos del Tablero de Control SST (espejo de FacilIso.Backend.Entities.DTOs.SstDashboard).

export interface SstKpis {
  companyCount: number;
  employeeCount: number;
  selfAssessmentAvgPct: number;
  trainingAvgPct: number;
  objectivesAvgPct: number;
  accidents: number;
  disabilityDays: number;
  occupationalDiseases: number;
  fatalAccidents: number;
  incidents: number;
  newOccupationalDiseaseCases: number;
  prevalenceRate: number;
  incidenceRate: number;
  severityRate: number;
}

export interface SstCompanyDetail {
  code: string;
  name: string;
  riskLevel: string | null;
  arl: string | null;
  employees: number;
  selfAssessmentPct: number;
  objectivesPct: number;
  trainingPct: number;
  incidents: number;
  accidents: number;
  disabilityDays: number;
  occupationalDiseases: number;
  fatalAccidents: number;
}

export interface SstMonthlyTraining {
  monthNumber: number;
  monthName: string;
  completed: number;
  target: number;
}

export interface SstDemographicsSummary {
  men: number;
  women: number;
  averageAge: number;
  averageEducationYears: number;
}

export interface SstIndicatorCatalog {
  number: number;
  name: string;
  type: string | null;
  formula: string | null;
  explanation: string | null;
  target: string | null;
}

export interface SstClientOption {
  code: string;
  name: string;
}

export interface SstDashboard {
  year: number;
  availableYears: number[];
  selectedClientCode: string | null;
  selectedClientLogo: string | null;
  availableClients: SstClientOption[];
  kpis: SstKpis;
  companies: SstCompanyDetail[];
  monthlyTraining: SstMonthlyTraining[];
  demographics: SstDemographicsSummary;
  dictionary: SstIndicatorCatalog[];
}

export interface SstImportResult {
  companies: number;
  indicators: number;
  trainings: number;
  demography: number;
  errors: string[];
}

// Envoltura estándar del backend.
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message: string;
  messageId: number;
  httpStatusCode: number;
}
