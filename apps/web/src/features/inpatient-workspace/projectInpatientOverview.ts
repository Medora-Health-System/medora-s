/**
 * MEDUI.D4A.3.4 — Shared inpatient Overview projection.
 * Pure selector: maps authoritative synthesis/ops/events into typed modules.
 * Does not fabricate clinical values; unsupported modules are EMPTY/UNSUPPORTED.
 */

import {
  summarizeInpatientReviewOrdersForOverview,
  type InpatientReviewOrdersProjection,
  type InpatientWorkspaceRole,
} from "@medora/shared";
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
  due?: boolean;
  overdue?: boolean;
  highAlert?: boolean;
};

export type OverviewOrderLine = {
  orderItemId: string;
  label: string;
  status: string;
  orderType?: string;
  bucket: "active" | "new" | "pending";
};

export type OverviewCarePlanLine = {
  planId: string;
  title: string;
  status: string;
  goalSummary: string | null;
  concern: string | null;
};

export type OverviewProviderDocs = {
  availability: OverviewModuleAvailability;
  hpStatus: string | null;
  latestProgressExcerpt: string | null;
  assessmentPlanExcerpt: string | null;
};

export type OverviewDischargeModule = {
  availability: OverviewModuleAvailability;
  medicalReady: boolean | null;
  workflowState: string | null;
  estimatedDischargeDate: string | null;
  destination: string | null;
  barriers: Array<{ key: string; label: string; resolved: boolean }>;
  medicationReconciliationIncomplete: boolean | null;
  educationReady: boolean | null;
  followUpReady: boolean | null;
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
  orders: {
    availability: OverviewModuleAvailability;
    active: OverviewOrderLine[];
    newOrUnacknowledged: OverviewOrderLine[];
    pendingActions: OverviewOrderLine[];
    reviewOrders: {
      newUnreviewed: number;
      statUrgent: number;
      dueNursingActionable: number;
      overdueNursingActionable: number;
      held: number;
    } | null;
  };
  carePlan: {
    availability: OverviewModuleAvailability;
    plans: OverviewCarePlanLine[];
  };
  providerDocs: OverviewProviderDocs;
  /** Unified work requiring attention (D4A.2.8 task buckets). */
  tasks: { availability: OverviewModuleAvailability; items: OverviewTaskItem[] };
  nursing: {
    availability: OverviewModuleAvailability;
    admissionAssessmentComplete: boolean | null;
    lastShiftAssessmentAtIso: string | null;
    /** MEDUI.INP.2B — nursing admission baseline projection (read-only). */
    admissionOverview?: {
      availability: "READY" | "EMPTY";
      completeCount: number;
      totalSections: number;
      allRequiredComplete: boolean;
      signed: boolean;
      admissionSource: string | null;
      modeOfArrival: string | null;
      clinicalDocumentedAt: string | null;
      authorUserId: string | null;
      language: string | null;
      interpreterNeeded: string | null;
      historyReviewed: string | null;
      allergyReviewed: string | null;
      homeMedReviewed: string | null;
      advanceDirective: string | null;
      fallRiskConcern: string | null;
      mobilityBaseline: string | null;
      skinBaseline: string | null;
      nutritionConcern: string | null;
      eliminationBaseline: string | null;
      psychosocialBarrier: string | null;
      educationBarrier: string | null;
      preAdmissionResidence: string | null;
      dischargeBaselineFlag: string | null;
    } | null;
    /** INP.1B.6 — authoritative INP.1A overview projection (optional). */
    assessment?: {
      clinicalDocumentedAtIso: string | null;
      serverAuthoredAtIso: string | null;
      authorDisplayName: string | null;
      assessmentType: string | null;
      mentalStatus: string | null;
      painScore: number | null;
      respiratoryStatus: string | null;
      cardiovascularConcern: boolean;
      giGuConcern: boolean;
      skinWoundConcern: boolean;
      mobility: string | null;
      fallRisk: string | null;
      deviceLineConcern: boolean;
      safetyConcern: boolean;
      nutritionStatus: string | null;
      narrativeExcerpt: string | null;
      significantConcerns: string[];
    } | null;
  };
  intakeOutput: OverviewIoCompact;
  devices: {
    availability: OverviewModuleAvailability;
    lines?: string[];
  };
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
    orders?: {
      active?: Array<{ orderItemId: string; label: string; status: string; orderType?: string }>;
      newOrUnacknowledged?: Array<{ orderItemId: string; label: string; status: string }>;
      pendingActions?: Array<{ orderItemId: string; label: string; status: string }>;
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
    assessmentOverview?: {
      clinicalDocumentedAtIso?: string | null;
      serverAuthoredAtIso?: string | null;
      authorDisplayName?: string | null;
      assessmentType?: string | null;
      mentalStatus?: string | null;
      painScore?: number | null;
      respiratoryStatus?: string | null;
      cardiovascularConcern?: boolean;
      giGuConcern?: boolean;
      skinWoundConcern?: boolean;
      mobility?: string | null;
      fallRisk?: string | null;
      deviceLineConcern?: boolean;
      safetyConcern?: boolean;
      nutritionStatus?: string | null;
      narrativeExcerpt?: string | null;
      significantConcerns?: string[];
    } | null;
    admissionOverview?: InpatientOverviewProjection["nursing"]["admissionOverview"];
  };
  carePlanPlans?: OverviewCarePlanLine[] | null;
  providerDocs?: {
    hpStatus?: string | null;
    latestProgressExcerpt?: string | null;
    assessmentPlanExcerpt?: string | null;
  } | null;
  /** MEDUI.INP.2C.1 — enterprise device projection (IV + EDOC.17), optional. */
  devicesProjection?: {
    availability: OverviewModuleAvailability;
    lines?: string[];
  } | null;
  canProviderWrite: boolean;
  /** Same enterprise order projection as Review Orders — no second store. */
  reviewOrdersProjection?: InpatientReviewOrdersProjection | null;
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
  const SIGNIFICANT_EVENT_TYPES = new Set([
    "CRITICAL_RESULT",
    "CONSULT_COMPLETED",
    "CODE_STATUS_CHANGED",
    "ISOLATION_CHANGED",
    "MEDICATION_HELD",
    "CLINICAL_ALERT",
    "NURSING_ASSESSMENT_SAVED",
    "SIGNIFICANT_EVENT",
  ]);
  const events = (syn?.events ?? [])
    .filter((e) => {
      const sev = String(e.severity ?? "").toUpperCase();
      return (
        SIGNIFICANT_EVENT_TYPES.has(String(e.type ?? "").toUpperCase()) ||
        sev === "CRITICAL" ||
        sev === "WARNING" ||
        sev === "HIGH"
      );
    })
    .map((e) => ({
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
  const orderActive = (syn?.orders?.active ?? []).map((o) => ({
    ...o,
    bucket: "active" as const,
  }));
  const orderNew = (syn?.orders?.newOrUnacknowledged ?? []).map((o) => ({
    ...o,
    bucket: "new" as const,
  }));
  const orderPending = (syn?.orders?.pendingActions ?? []).map((o) => ({
    ...o,
    bucket: "pending" as const,
  }));
  const carePlans = input.carePlanPlans ?? [];
  const providerDocsIn = input.providerDocs ?? null;
  const medReconIncomplete =
    (dc.barriers ?? []).some((b) => /med.?recon/i.test(b.key) || /med.?recon/i.test(b.label)) ||
    null;
  const followUpReady = !(dc.barriers ?? []).some((b) => /follow.?up/i.test(b.key) || /follow.?up/i.test(b.label));
  const educationReady = !(dc.barriers ?? []).some((b) => /educat/i.test(b.key) || /educat/i.test(b.label));

  /** Overview always projects nursing for all clinical roles (providers read-only via panels). */
  const showNursingModule = true;

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
      lines: medLines.map((m) => ({
        ...m,
        due: /due/i.test(m.group),
        overdue: /overdue/i.test(m.group),
        highAlert: /vasoactive|anticoag|insulin|sedation/i.test(m.group),
      })),
      changes: (syn?.medications?.changes ?? []).map((m) => m.drug),
      held: (syn?.medications?.held ?? []).map((m) => m.drug),
    },
    orders: {
      availability:
        orderActive.length + orderNew.length + orderPending.length > 0 ||
        Boolean(input.reviewOrdersProjection?.lines.length)
          ? "READY"
          : "EMPTY",
      active: orderActive,
      newOrUnacknowledged: orderNew,
      pendingActions: orderPending,
      reviewOrders: input.reviewOrdersProjection
        ? summarizeInpatientReviewOrdersForOverview(input.reviewOrdersProjection)
        : null,
    },
    carePlan: {
      availability: carePlans.length ? "READY" : "EMPTY",
      plans: carePlans,
    },
    providerDocs: {
      availability:
        providerDocsIn?.hpStatus ||
        providerDocsIn?.latestProgressExcerpt ||
        providerDocsIn?.assessmentPlanExcerpt
          ? "READY"
          : "EMPTY",
      hpStatus: providerDocsIn?.hpStatus ?? null,
      latestProgressExcerpt: providerDocsIn?.latestProgressExcerpt ?? null,
      assessmentPlanExcerpt: providerDocsIn?.assessmentPlanExcerpt ?? null,
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
      lastShiftAssessmentAtIso:
        nursing?.assessmentOverview?.clinicalDocumentedAtIso ??
        nursing?.lastShiftAssessmentAt ??
        null,
      admissionOverview: nursing?.admissionOverview ?? null,
      assessment: nursing?.assessmentOverview
        ? {
            clinicalDocumentedAtIso: nursing.assessmentOverview.clinicalDocumentedAtIso ?? null,
            serverAuthoredAtIso: nursing.assessmentOverview.serverAuthoredAtIso ?? null,
            authorDisplayName: nursing.assessmentOverview.authorDisplayName ?? null,
            assessmentType: nursing.assessmentOverview.assessmentType ?? null,
            mentalStatus: nursing.assessmentOverview.mentalStatus ?? null,
            painScore: nursing.assessmentOverview.painScore ?? null,
            respiratoryStatus: nursing.assessmentOverview.respiratoryStatus ?? null,
            cardiovascularConcern: Boolean(nursing.assessmentOverview.cardiovascularConcern),
            giGuConcern: Boolean(nursing.assessmentOverview.giGuConcern),
            skinWoundConcern: Boolean(nursing.assessmentOverview.skinWoundConcern),
            mobility: nursing.assessmentOverview.mobility ?? null,
            fallRisk: nursing.assessmentOverview.fallRisk ?? null,
            deviceLineConcern: Boolean(nursing.assessmentOverview.deviceLineConcern),
            safetyConcern: Boolean(nursing.assessmentOverview.safetyConcern),
            nutritionStatus: nursing.assessmentOverview.nutritionStatus ?? null,
            narrativeExcerpt: nursing.assessmentOverview.narrativeExcerpt ?? null,
            significantConcerns: nursing.assessmentOverview.significantConcerns ?? [],
          }
        : null,
    },
    intakeOutput: {
      availability: hasIo ? "READY" : "EMPTY",
      intake24hMl: isDocumentedMl(io.intake24hMl) ? io.intake24hMl : null,
      output24hMl: isDocumentedMl(io.output24hMl) ? io.output24hMl : null,
      balance24hMl: isDocumentedMl(io.balance24hMl) ? io.balance24hMl : null,
      warnings: io.warnings ?? [],
    },
    devices: input.devicesProjection ?? { availability: "EMPTY", lines: [] },
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
      medicationReconciliationIncomplete: medReconIncomplete,
      educationReady: (dc.barriers ?? []).length ? educationReady : null,
      followUpReady: (dc.barriers ?? []).length ? followUpReady : null,
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
