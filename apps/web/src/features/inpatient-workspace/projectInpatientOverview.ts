/**
 * MEDUI.D4A.3.4 — Shared inpatient Overview projection.
 * Pure selector: maps authoritative synthesis/ops/events into typed modules.
 * Does not fabricate clinical values; unsupported modules are EMPTY/UNSUPPORTED.
 */

import type { InpatientWorkspaceRole } from "@medora/shared";
import {
  formatCareTeamDisplayName,
  isDocumentedMl,
  type ClinicalStateKey,
} from "./inpatientClinicalDisplayLabels";

export type OverviewModuleAvailability =
  | "READY"
  | "EMPTY"
  | "UNSUPPORTED"
  | "OMITTED_HEADER_DUPLICATE";

export type OverviewAlertItem = {
  id: string;
  severity: "WARNING" | "CRITICAL" | "INFO";
  text: string;
};

export type OverviewCareTeamModule = {
  availability: OverviewModuleAvailability;
  attending: string | null;
  provider: string | null;
  resident: string | null;
  app: string | null;
  hospitalDay: number | null;
  lengthOfStayHours: number | null;
  primaryDiagnosis: string | null;
  secondaryProblems: string[];
  consultServices: string[];
};

export type OverviewClinicalStateItem = {
  key: ClinicalStateKey;
  state: "RESOLVED" | "MISSING" | "UNRESOLVED_SYNTHETIC" | "UNKNOWN";
  summary: string | null;
  clinicalTimestampIso: string | null;
};

export type OverviewVitalRow = {
  key: string;
  label: string;
  current: string | null;
  previous: string | null;
  trend24h: string;
  abnormal: boolean;
};

export type OverviewLabLine = {
  label: string;
  current: string | null;
  critical: boolean;
  acknowledgedByProvider?: boolean;
  timestamp?: string | null;
  direction?: string | null;
  previous?: string | null;
};

export type OverviewMedLine = {
  drug: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  held: boolean;
  group: string;
};

export type OverviewTaskItem = {
  taskId: string;
  title: string;
  priority: string;
  linkedSection: string | null;
  bucket: "critical" | "today" | "upcoming" | "completed";
};

export type OverviewIoCompact = {
  availability: OverviewModuleAvailability;
  intake24hMl: number | null;
  output24hMl: number | null;
  balance24hMl: number | null;
  warnings: string[];
};

export type OverviewEventItem = {
  eventId: string;
  type: string;
  severity: string;
  summary: string;
  status: string;
  occurredAtIso: string;
  canAck: boolean;
};

export type OverviewDischargeModule = {
  availability: OverviewModuleAvailability;
  medicalReady: boolean | null;
  workflowState: string | null;
  estimatedDischargeDate: string | null;
  destination: string | null;
  barriers: Array<{ key: string; label: string; resolved: boolean }>;
};

export type OverviewPainCompare = {
  availability: OverviewModuleAvailability;
  admissionPain: string | null;
  currentPain: string | null;
  providerAssessment: string | null;
};

export type InpatientOverviewProjection = {
  role: InpatientWorkspaceRole;
  showRoundingMode: boolean;
  /** Header chrome already owns these — never re-render as plain duplicates. */
  headerDuplicatesOmitted: readonly string[];
  alerts: { availability: OverviewModuleAvailability; items: OverviewAlertItem[] };
  careTeam: OverviewCareTeamModule;
  problems: {
    availability: OverviewModuleAvailability;
    items: Array<{
      problemId: string;
      displayLabel: string;
      status: string;
      assessment: string | null;
    }>;
  };
  clinicalState: {
    availability: OverviewModuleAvailability;
    items: OverviewClinicalStateItem[];
  };
  vitals: { availability: OverviewModuleAvailability; rows: OverviewVitalRow[] };
  results: {
    availability: OverviewModuleAvailability;
    critical: OverviewLabLine[];
    pending: OverviewLabLine[];
    abnormal: OverviewLabLine[];
    trending: OverviewLabLine[];
    radiologyPending: Array<{ label: string; status: string }>;
    radiologyCritical: Array<{ label: string; acknowledgedByProvider: boolean }>;
  };
  medications: {
    availability: OverviewModuleAvailability;
    lines: OverviewMedLine[];
    changes: string[];
    held: string[];
  };
  /** Unified work requiring attention (D4A.2.8 task buckets). */
  tasks: { availability: OverviewModuleAvailability; items: OverviewTaskItem[] };
  nursing: {
    availability: OverviewModuleAvailability;
    admissionAssessmentComplete: boolean | null;
    lastShiftAssessmentAtIso: string | null;
  };
  intakeOutput: OverviewIoCompact;
  devices: { availability: OverviewModuleAvailability };
  consults: {
    availability: OverviewModuleAvailability;
    specialties: string[];
  };
  discharge: OverviewDischargeModule;
  recentEvents: { availability: OverviewModuleAvailability; items: OverviewEventItem[] };
  painCompare: OverviewPainCompare;
};

export type ProjectInpatientOverviewInput = {
  role: InpatientWorkspaceRole;
  emptyClinicianLabel: string;
  alerts: string[];
  synthesis: {
    overview?: {
      hospitalDay?: number | null;
      attending?: string | null;
      provider?: string | null;
      resident?: string | null;
      app?: string | null;
      lengthOfStayHours?: number | null;
      primaryDiagnosis?: string | null;
      secondaryProblems?: string[];
      consultServices?: string[];
      estimatedDischarge?: string | null;
      /** Intentionally ignored when projecting — header duplicate */
      codeStatus?: string | null;
      isolation?: string | null;
      currentBed?: string | null;
      admissionDate?: string | null;
      currentStatus?: string | null;
    };
    vitals?: OverviewVitalRow[];
    intakeOutput?: {
      intake24hMl?: number | null;
      output24hMl?: number | null;
      balance24hMl?: number | null;
      hospitalBalanceMl?: number | null;
      urineOutputMl?: number | null;
      drainOutputMl?: number | null;
      chestTubeMl?: number | null;
      ngOutputMl?: number | null;
      dialysisMl?: number | null;
      warnings?: string[];
    };
    laboratories?: {
      pending?: OverviewLabLine[];
      critical?: OverviewLabLine[];
      abnormal?: OverviewLabLine[];
      trending?: OverviewLabLine[];
    };
    radiology?: {
      pending?: Array<{ label: string; status: string }>;
      critical?: Array<{ label: string; acknowledgedByProvider: boolean }>;
    };
    medications?: {
      groups?: Record<
        string,
        Array<{
          drug: string;
          dose: string | null;
          route: string | null;
          frequency: string | null;
          held: boolean;
        }>
      >;
      changes?: Array<{ drug: string }>;
      held?: Array<{ drug: string }>;
    };
    tasks?: {
      critical?: Array<{
        taskId: string;
        title: string;
        priority: string;
        linkedSection?: string | null;
      }>;
      today?: Array<{
        taskId: string;
        title: string;
        priority: string;
        linkedSection?: string | null;
      }>;
      upcoming?: Array<{
        taskId: string;
        title: string;
        priority: string;
        linkedSection?: string | null;
      }>;
      completed?: Array<{ taskId: string; title: string }>;
    };
    dischargeReadiness?: {
      medicalReady?: boolean;
      workflowState?: string | null;
      estimatedDischargeDate?: string | null;
      destination?: string | null;
      barriers?: Array<{ key: string; label: string; resolved: boolean }>;
    };
    currentVsAdmission?: {
      admissionPain?: string | null;
      currentPain?: string | null;
      providerAssessment?: string | null;
    };
    events?: Array<{
      eventId: string;
      type: string;
      severity: string;
      summary: string;
      status: string;
      occurredAt: string;
    }>;
    problems?: Array<{
      problemId: string;
      displayLabel: string;
      status: string;
      assessment?: string | null;
    }>;
  } | null;
  authProjection: Record<string, unknown> | null;
  nursingOps?: {
    admissionAssessmentComplete?: boolean | null;
    lastShiftAssessmentAt?: string | null;
  } | null;
  canProviderWrite: boolean;
};

const HEADER_DUPLICATES = [
  "codeStatus",
  "isolation",
  "room",
  "admissionDate",
  "allergies",
  "singleVitalsSnapshot",
] as const;

function mapClinicalState(
  authProjection: Record<string, unknown> | null
): OverviewClinicalStateItem[] {
  const keys: ClinicalStateKey[] = ["pain", "fallRisk", "wounds"];
  return keys.map((key) => {
    const item = authProjection?.[key] as
      | {
          state?: string;
          summary?: string | null;
          clinicalTimestamp?: string | null;
        }
      | undefined;
    const stateRaw = (item?.state ?? "MISSING").toUpperCase();
    const state: OverviewClinicalStateItem["state"] =
      stateRaw === "RESOLVED"
        ? "RESOLVED"
        : stateRaw === "UNRESOLVED_SYNTHETIC"
          ? "UNRESOLVED_SYNTHETIC"
          : stateRaw === "MISSING"
            ? "MISSING"
            : "UNKNOWN";
    return {
      key,
      state,
      summary: typeof item?.summary === "string" ? item.summary : null,
      clinicalTimestampIso:
        typeof item?.clinicalTimestamp === "string" ? item.clinicalTimestamp : null,
    };
  });
}

export function projectInpatientOverview(
  input: ProjectInpatientOverviewInput
): InpatientOverviewProjection {
  const role = input.role;
  const syn = input.synthesis;
  const o = syn?.overview ?? {};
  const emptyName = input.emptyClinicianLabel;

  const alertItems: OverviewAlertItem[] = (input.alerts ?? []).map((text, i) => ({
    id: `alert-${i}`,
    severity: /critical/i.test(text) ? "CRITICAL" : "WARNING",
    text,
  }));

  const careTeam: OverviewCareTeamModule = {
    availability: "READY",
    attending: formatCareTeamDisplayName(o.attending, emptyName),
    provider: formatCareTeamDisplayName(o.provider, emptyName),
    resident: formatCareTeamDisplayName(o.resident, emptyName),
    app: formatCareTeamDisplayName(o.app, emptyName),
    hospitalDay: o.hospitalDay ?? null,
    lengthOfStayHours: o.lengthOfStayHours ?? null,
    primaryDiagnosis: o.primaryDiagnosis?.trim() || null,
    secondaryProblems: o.secondaryProblems ?? [],
    consultServices: o.consultServices ?? [],
  };

  const clinicalItems = mapClinicalState(input.authProjection);
  const clinicalResolved = clinicalItems.some((c) => c.state === "RESOLVED");

  const vitalRows = syn?.vitals ?? [];
  const labs = syn?.laboratories ?? {};
  const hasLabs =
    (labs.critical?.length ?? 0) +
      (labs.pending?.length ?? 0) +
      (labs.abnormal?.length ?? 0) +
      (labs.trending?.length ?? 0) >
    0;

  const medLines: OverviewMedLine[] = [];
  for (const [group, lines] of Object.entries(syn?.medications?.groups ?? {})) {
    for (const m of lines ?? []) {
      medLines.push({
        drug: m.drug,
        dose: m.dose,
        route: m.route,
        frequency: m.frequency,
        held: m.held,
        group,
      });
    }
  }

  const taskItems: OverviewTaskItem[] = [];
  for (const t of syn?.tasks?.critical ?? []) {
    taskItems.push({
      taskId: t.taskId,
      title: t.title,
      priority: t.priority,
      linkedSection: t.linkedSection ?? null,
      bucket: "critical",
    });
  }
  for (const t of syn?.tasks?.today ?? []) {
    taskItems.push({
      taskId: t.taskId,
      title: t.title,
      priority: t.priority,
      linkedSection: t.linkedSection ?? null,
      bucket: "today",
    });
  }
  for (const t of syn?.tasks?.upcoming ?? []) {
    taskItems.push({
      taskId: t.taskId,
      title: t.title,
      priority: t.priority,
      linkedSection: t.linkedSection ?? null,
      bucket: "upcoming",
    });
  }

  const io = syn?.intakeOutput ?? {};
  const hasIo =
    isDocumentedMl(io.intake24hMl) ||
    isDocumentedMl(io.output24hMl) ||
    isDocumentedMl(io.balance24hMl);

  const problems = syn?.problems ?? [];
  const events = (syn?.events ?? []).map((e) => ({
    eventId: e.eventId,
    type: e.type,
    severity: e.severity,
    summary: e.summary,
    status: e.status,
    occurredAtIso: e.occurredAt,
    canAck: input.canProviderWrite && e.status === "NEW" && role === "PROVIDER",
  }));

  const dc = syn?.dischargeReadiness ?? {};
  const cva = syn?.currentVsAdmission ?? {};
  const nursing = input.nursingOps ?? null;

  const showNursingModule = role === "NURSING" || role === "TECHNICIAN" || role === "CHART";

  return {
    role,
    showRoundingMode: role === "PROVIDER",
    headerDuplicatesOmitted: HEADER_DUPLICATES,
    alerts: {
      availability: alertItems.length ? "READY" : "EMPTY",
      items: alertItems,
    },
    careTeam,
    problems: {
      availability: problems.length ? "READY" : "EMPTY",
      items: problems.map((p) => ({
        problemId: p.problemId,
        displayLabel: p.displayLabel,
        status: p.status,
        assessment: p.assessment ?? null,
      })),
    },
    clinicalState: {
      availability: input.authProjection
        ? clinicalResolved
          ? "READY"
          : "EMPTY"
        : "UNSUPPORTED",
      items: clinicalItems,
    },
    vitals: {
      availability: vitalRows.length ? "READY" : "EMPTY",
      rows: vitalRows,
    },
    results: {
      availability: hasLabs || (syn?.radiology?.pending?.length ?? 0) > 0 ? "READY" : "EMPTY",
      critical: labs.critical ?? [],
      pending: labs.pending ?? [],
      abnormal: labs.abnormal ?? [],
      trending: labs.trending ?? [],
      radiologyPending: syn?.radiology?.pending ?? [],
      radiologyCritical: syn?.radiology?.critical ?? [],
    },
    medications: {
      availability: medLines.length ? "READY" : "EMPTY",
      lines: medLines,
      changes: (syn?.medications?.changes ?? []).map((m) => m.drug),
      held: (syn?.medications?.held ?? []).map((m) => m.drug),
    },
    tasks: {
      availability: taskItems.length ? "READY" : "EMPTY",
      items: taskItems,
    },
    nursing: {
      availability: showNursingModule
        ? nursing
          ? "READY"
          : "EMPTY"
        : "OMITTED_HEADER_DUPLICATE",
      admissionAssessmentComplete: nursing?.admissionAssessmentComplete ?? null,
      lastShiftAssessmentAtIso: nursing?.lastShiftAssessmentAt ?? null,
    },
    intakeOutput: {
      availability: hasIo ? "READY" : "EMPTY",
      intake24hMl: isDocumentedMl(io.intake24hMl) ? io.intake24hMl : null,
      output24hMl: isDocumentedMl(io.output24hMl) ? io.output24hMl : null,
      balance24hMl: isDocumentedMl(io.balance24hMl) ? io.balance24hMl : null,
      warnings: io.warnings ?? [],
    },
    devices: { availability: "UNSUPPORTED" },
    consults: {
      availability: (o.consultServices ?? []).length ? "READY" : "EMPTY",
      specialties: o.consultServices ?? [],
    },
    discharge: {
      availability:
        dc.medicalReady != null ||
        dc.workflowState ||
        dc.estimatedDischargeDate ||
        (dc.barriers ?? []).length
          ? "READY"
          : "EMPTY",
      medicalReady: dc.medicalReady ?? null,
      workflowState: dc.workflowState ?? null,
      estimatedDischargeDate: dc.estimatedDischargeDate ?? o.estimatedDischarge ?? null,
      destination: dc.destination ?? null,
      barriers: dc.barriers ?? [],
    },
    recentEvents: {
      availability: events.length ? "READY" : "EMPTY",
      items: events,
    },
    painCompare: {
      availability:
        cva.admissionPain || cva.currentPain || cva.providerAssessment ? "READY" : "EMPTY",
      admissionPain: cva.admissionPain ?? null,
      currentPain: cva.currentPain ?? null,
      providerAssessment: cva.providerAssessment ?? null,
    },
  };
}
