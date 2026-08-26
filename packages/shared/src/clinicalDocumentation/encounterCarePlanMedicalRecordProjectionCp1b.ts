/**
 * MEDUI.CP.1B / CP.1E — Read-only medical-record projection of EncounterCarePlan*.
 * Same projection feeds Inpatient Summary and Print Entire Chart.
 * Does not invent a second Care Plan store.
 * CP.1E: attribution from durable ClinicalAuthorSnapshot columns only (no live User rewrite).
 */

import { projectClinicalAuthorFromSnapshots } from "./clinicalAuthorSnapshotCp1e.js";
import {
  CARE_PLAN_ACTIVATION_CLINICAL_LOCALE,
  MEDORA_CARE_PLAN_CLINICAL_LOCALE_FALLBACK,
  resolveCarePlanClinicalNarrative,
  type CarePlanClinicalLocale,
} from "./enterpriseCarePlanTemplateClinicalTextCp1f1.js";

export type CarePlanMedicalRecordBucket = "CURRENT" | "COMPLETED_DISCONTINUED";

export type CarePlanMedicalRecordClinicianV1 = {
  displayName: string | null;
  /** Credential / profession label for chart display (never raw user UUID). */
  credentials: string | null;
  /** Role snapshot string when display credentials unavailable (RN, PROVIDER, …). */
  roleSnapshot: string | null;
  /**
   * MEDUI.CP.1E — true when durable display-name snapshot is absent
   * (pre-migration historical rows). Never invent names from live User / assignment.
   */
  attributionUnavailable?: boolean;
};

export type CarePlanMedicalRecordComponentV1 = {
  kind: "GOAL" | "OUTCOME" | "INTERVENTION" | "MONITORING" | "EDUCATION" | "SAFETY";
  title: string;
  text: string;
  targetOutcome: string | null;
  discipline: string | null;
  status: string | null;
  documentedBy: CarePlanMedicalRecordClinicianV1;
  documentedAt: string | null;
  /** Author-owned correction — original documentedBy unchanged. */
  correctedBy?: CarePlanMedicalRecordClinicianV1 | null;
  correctedAt?: string | null;
  correctionReason?: string | null;
};

export type CarePlanMedicalRecordProgressV1 = {
  narrative: string;
  status: string | null;
  discipline: string | null;
  documentedBy: CarePlanMedicalRecordClinicianV1;
  documentedAt: string | null;
};

export type CarePlanMedicalRecordReviewV1 = {
  reviewStatus: string | null;
  narrative: string | null;
  reviewedBy: CarePlanMedicalRecordClinicianV1;
  reviewedAt: string | null;
};

export type CarePlanMedicalRecordTransitionV1 = {
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  actor: CarePlanMedicalRecordClinicianV1;
  at: string | null;
};

export type CarePlanMedicalRecordPlanV1 = {
  /** Internal identity for React keys / tests only — never show in bedside chrome. */
  planId: string;
  title: string;
  templateId: string | null;
  status: string;
  bucket: CarePlanMedicalRecordBucket;
  activatedAt: string | null;
  activatedBy: CarePlanMedicalRecordClinicianV1;
  completedAt: string | null;
  discontinuedAt: string | null;
  lastReviewedAt: string | null;
  contributors: string[];
  goals: CarePlanMedicalRecordComponentV1[];
  outcomes: CarePlanMedicalRecordComponentV1[];
  interventions: CarePlanMedicalRecordComponentV1[];
  monitoring: CarePlanMedicalRecordComponentV1[];
  education: CarePlanMedicalRecordComponentV1[];
  progress: CarePlanMedicalRecordProgressV1[];
  reviews: CarePlanMedicalRecordReviewV1[];
  transitions: CarePlanMedicalRecordTransitionV1[];
};

export type CarePlanHistoricalLegacyItemV1 = {
  discipline: string | null;
  goalText: string | null;
  documentedAt: string | null;
};

export type EncounterCarePlanMedicalRecordProjectionV1 = {
  availability: "READY" | "EMPTY";
  currentPlans: CarePlanMedicalRecordPlanV1[];
  completedDiscontinuedPlans: CarePlanMedicalRecordPlanV1[];
  historicalLegacy: CarePlanHistoricalLegacyItemV1[];
};

type AggregateComponent = {
  id?: string;
  /** Prisma: componentType */
  componentType?: string;
  title?: string;
  text?: string;
  /** Prisma: targetOutcome */
  targetOutcome?: string | null;
  discipline?: string | null;
  status?: string | null;
  /** Prisma: monitoringJson */
  monitoringJson?: unknown;
  /** Prisma: educationJson */
  educationJson?: unknown;
  /** Prisma: sourceTemplateComponentId */
  sourceTemplateComponentId?: string | null;
  createdAt?: string | Date | null;
  /** Prisma: createdByUserId */
  createdByUserId?: string | null;
  createdByDisplayNameSnapshot?: string | null;
  createdByProfessionalTitleSnapshot?: string | null;
  correctedByUserId?: string | null;
  correctedByDisplayNameSnapshot?: string | null;
  correctedByProfessionalTitleSnapshot?: string | null;
  correctedAt?: string | Date | null;
  correctionReason?: string | null;
};

type AggregateProgress = {
  narrative?: string;
  status?: string | null;
  discipline?: string | null;
  createdAt?: string | Date | null;
  /** Prisma: authorUserId */
  authorUserId?: string | null;
  authorRoleSnapshot?: string | null;
  authorDisplayNameSnapshot?: string | null;
  authorProfessionalTitleSnapshot?: string | null;
};

type AggregateReview = {
  /** Prisma: reviewStatus */
  reviewStatus?: string | null;
  narrative?: string | null;
  createdAt?: string | Date | null;
  /** Prisma: reviewerUserId */
  reviewerUserId?: string | null;
  reviewerRoleSnapshot?: string | null;
  reviewerDisplayNameSnapshot?: string | null;
  reviewerProfessionalTitleSnapshot?: string | null;
};

type AggregateTransition = {
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  createdAt?: string | Date | null;
  actorUserId?: string | null;
  actorRoleSnapshot?: string | null;
  actorDisplayNameSnapshot?: string | null;
  actorProfessionalTitleSnapshot?: string | null;
};

export type EncounterCarePlanAggregateInput = {
  id?: string;
  title?: string;
  templateId?: string | null;
  status?: string;
  activatedAt?: string | Date | null;
  activatedByUserId?: string | null;
  activatedByDisplayNameSnapshot?: string | null;
  activatedByProfessionalTitleSnapshot?: string | null;
  completedAt?: string | Date | null;
  discontinuedAt?: string | Date | null;
  components?: AggregateComponent[];
  progress?: AggregateProgress[];
  reviews?: AggregateReview[];
  transitions?: AggregateTransition[];
};

export type LegacyCarePlanOpsItemInput = {
  discipline?: string | null;
  goalText?: string | null;
  createdAt?: string | Date | null;
  documentedAt?: string | Date | null;
};

function iso(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const s = String(value).trim();
  return s || null;
}

function clinicianFromSnapshots(input: {
  displayNameSnapshot?: string | null;
  professionalTitleSnapshot?: string | null;
  roleSnapshot?: string | null;
}): CarePlanMedicalRecordClinicianV1 {
  const projected = projectClinicalAuthorFromSnapshots(input);
  return {
    displayName: projected.displayName,
    credentials: projected.credentials,
    roleSnapshot: projected.roleSnapshot,
    attributionUnavailable: projected.attributionUnavailable,
  };
}

function hasJsonMarker(value: unknown): boolean {
  return value != null && typeof value === "object";
}

function componentKind(c: AggregateComponent): CarePlanMedicalRecordComponentV1["kind"] {
  const type = String(c.componentType ?? "").toUpperCase();
  const source = String(c.sourceTemplateComponentId ?? "").toLowerCase();
  const monitoring = c.monitoringJson;
  const education = c.educationJson;
  const target = c.targetOutcome;
  if (hasJsonMarker(monitoring) || source.includes("monitor")) return "MONITORING";
  if (hasJsonMarker(education) || source.includes("educat")) return "EDUCATION";
  if (source.includes("safety") || source.includes("precaution")) return "SAFETY";
  if (type === "GOAL") {
    if (source.includes("outcome") || (typeof target === "string" && target.trim())) {
      return "OUTCOME";
    }
    return "GOAL";
  }
  return "INTERVENTION";
}

function mapComponent(
  c: AggregateComponent,
  displayLocale: CarePlanClinicalLocale
): CarePlanMedicalRecordComponentV1 {
  const target = c.targetOutcome;
  const correctedAt = iso(c.correctedAt);
  const locale = displayLocale;
  const title = resolveCarePlanClinicalNarrative(String(c.title ?? "").trim(), locale);
  const text = resolveCarePlanClinicalNarrative(String(c.text ?? "").trim(), locale);
  const resolvedTarget =
    typeof target === "string" && target.trim()
      ? resolveCarePlanClinicalNarrative(target.trim(), locale)
      : null;
  return {
    kind: componentKind(c),
    title,
    text,
    targetOutcome: resolvedTarget,
    discipline: typeof c.discipline === "string" && c.discipline.trim() ? c.discipline.trim() : null,
    status: typeof c.status === "string" && c.status.trim() ? c.status.trim() : null,
    documentedBy: clinicianFromSnapshots({
      displayNameSnapshot: c.createdByDisplayNameSnapshot,
      professionalTitleSnapshot: c.createdByProfessionalTitleSnapshot,
    }),
    documentedAt: iso(c.createdAt),
    correctedBy: correctedAt
      ? clinicianFromSnapshots({
          displayNameSnapshot: c.correctedByDisplayNameSnapshot,
          professionalTitleSnapshot: c.correctedByProfessionalTitleSnapshot,
        })
      : null,
    correctedAt,
    correctionReason:
      typeof c.correctionReason === "string" && c.correctionReason.trim()
        ? c.correctionReason.trim()
        : null,
  };
}

function bucketForStatus(status: string): CarePlanMedicalRecordBucket {
  const s = status.toUpperCase();
  if (s === "COMPLETED" || s === "DISCONTINUED") return "COMPLETED_DISCONTINUED";
  return "CURRENT";
}

function contributorLabels(plan: CarePlanMedicalRecordPlanV1): string[] {
  const set = new Set<string>();
  for (const c of [...plan.goals, ...plan.outcomes, ...plan.interventions, ...plan.monitoring, ...plan.education]) {
    if (c.discipline) set.add(c.discipline);
  }
  for (const p of plan.progress) {
    if (p.discipline) set.add(p.discipline);
  }
  return [...set];
}

export function projectEncounterCarePlanPlan(
  plan: EncounterCarePlanAggregateInput,
  displayLocale: CarePlanClinicalLocale = MEDORA_CARE_PLAN_CLINICAL_LOCALE_FALLBACK
): CarePlanMedicalRecordPlanV1 {
  const status = String(plan.status ?? "ACTIVE").toUpperCase();
  const components = Array.isArray(plan.components) ? plan.components.map((c) => mapComponent(c, displayLocale)) : [];
  const goals = components.filter((c) => c.kind === "GOAL");
  const outcomes = components.filter((c) => c.kind === "OUTCOME");
  const interventions = components.filter((c) => c.kind === "INTERVENTION" || c.kind === "SAFETY");
  const monitoring = components.filter((c) => c.kind === "MONITORING");
  const education = components.filter((c) => c.kind === "EDUCATION");

  const progress: CarePlanMedicalRecordProgressV1[] = (plan.progress ?? []).map((p) => ({
    narrative: String(p.narrative ?? "").trim(),
    status: typeof p.status === "string" ? p.status : null,
    discipline: typeof p.discipline === "string" ? p.discipline : null,
    documentedBy: clinicianFromSnapshots({
      displayNameSnapshot: p.authorDisplayNameSnapshot,
      professionalTitleSnapshot: p.authorProfessionalTitleSnapshot,
      roleSnapshot: p.authorRoleSnapshot,
    }),
    documentedAt: iso(p.createdAt),
  }));

  const reviews: CarePlanMedicalRecordReviewV1[] = (plan.reviews ?? []).map((r) => ({
    reviewStatus: typeof r.reviewStatus === "string" ? r.reviewStatus : null,
    narrative: typeof r.narrative === "string" ? r.narrative : null,
    reviewedBy: clinicianFromSnapshots({
      displayNameSnapshot: r.reviewerDisplayNameSnapshot,
      professionalTitleSnapshot: r.reviewerProfessionalTitleSnapshot,
      roleSnapshot: r.reviewerRoleSnapshot,
    }),
    reviewedAt: iso(r.createdAt),
  }));

  const transitions: CarePlanMedicalRecordTransitionV1[] = (plan.transitions ?? []).map((t) => ({
    fromStatus: typeof t.fromStatus === "string" ? t.fromStatus : null,
    toStatus: typeof t.toStatus === "string" ? t.toStatus : null,
    reason: typeof t.reason === "string" ? t.reason : null,
    actor: clinicianFromSnapshots({
      displayNameSnapshot: t.actorDisplayNameSnapshot,
      professionalTitleSnapshot: t.actorProfessionalTitleSnapshot,
      roleSnapshot: t.actorRoleSnapshot,
    }),
    at: iso(t.createdAt),
  }));

  const projected: CarePlanMedicalRecordPlanV1 = {
    planId: String(plan.id ?? ""),
    title:
      resolveCarePlanClinicalNarrative(String(plan.title ?? "").trim(), displayLocale) ||
      "Care plan",
    templateId: typeof plan.templateId === "string" ? plan.templateId : null,
    status,
    bucket: bucketForStatus(status),
    activatedAt: iso(plan.activatedAt),
    activatedBy: clinicianFromSnapshots({
      displayNameSnapshot: plan.activatedByDisplayNameSnapshot,
      professionalTitleSnapshot: plan.activatedByProfessionalTitleSnapshot,
    }),
    completedAt: iso(plan.completedAt),
    discontinuedAt: iso(plan.discontinuedAt),
    lastReviewedAt: reviews.at(-1)?.reviewedAt ?? null,
    contributors: [],
    goals,
    outcomes,
    interventions,
    monitoring,
    education,
    progress,
    reviews,
    transitions,
  };
  projected.contributors = contributorLabels(projected);
  return projected;
}

export function projectEncounterCarePlanMedicalRecord(input: {
  plans?: EncounterCarePlanAggregateInput[] | null;
  legacyItems?: LegacyCarePlanOpsItemInput[] | null;
  /** UI session locale for legacy exact-key resolution only — never retranslates persisted narrative. */
  displayLocale?: CarePlanClinicalLocale;
}): EncounterCarePlanMedicalRecordProjectionV1 {
  const displayLocale = input.displayLocale ?? CARE_PLAN_ACTIVATION_CLINICAL_LOCALE;
  const plans = Array.isArray(input.plans) ? input.plans.map((p) => projectEncounterCarePlanPlan(p, displayLocale)) : [];
  const currentPlans = plans.filter((p) => p.bucket === "CURRENT");
  const completedDiscontinuedPlans = plans.filter((p) => p.bucket === "COMPLETED_DISCONTINUED");
  const historicalLegacy: CarePlanHistoricalLegacyItemV1[] = (input.legacyItems ?? [])
    .map((item) => ({
      discipline: typeof item.discipline === "string" ? item.discipline : null,
      goalText: typeof item.goalText === "string" ? item.goalText : null,
      documentedAt: iso(item.documentedAt ?? item.createdAt),
    }))
    .filter((item) => Boolean(item.goalText || item.discipline));

  const availability =
    currentPlans.length || completedDiscontinuedPlans.length || historicalLegacy.length
      ? "READY"
      : "EMPTY";

  return {
    availability,
    currentPlans,
    completedDiscontinuedPlans,
    historicalLegacy,
  };
}

/** Format clinician attribution for Summary / Print (locale supplies labels). */
export function formatCarePlanClinicianAttribution(input: {
  documentedByLabel: string;
  reviewedByLabel: string;
  clinician: CarePlanMedicalRecordClinicianV1;
  at: string | null;
  mode: "documented" | "reviewed" | "corrected" | "activated" | "completed" | "discontinued";
  roleLabel?: string | null;
  /** Locale string when durable snapshot is absent (pre-CP.1E rows). */
  attributionUnavailableLabel?: string | null;
  correctedByLabel?: string | null;
  activatedByLabel?: string | null;
  completedByLabel?: string | null;
  discontinuedByLabel?: string | null;
}): string {
  if (input.clinician.attributionUnavailable) {
    const unavailable =
      input.attributionUnavailableLabel?.trim() ||
      "Historical author attribution unavailable";
    return [unavailable, input.at].filter(Boolean).join(" · ");
  }
  const name = input.clinician.displayName?.trim() || null;
  const cred =
    input.clinician.credentials?.trim() ||
    input.roleLabel?.trim() ||
    null;
  const who = [name, cred].filter(Boolean).join(", ");
  const prefix =
    input.mode === "reviewed"
      ? input.reviewedByLabel
      : input.mode === "corrected"
        ? input.correctedByLabel || input.documentedByLabel
        : input.mode === "activated"
          ? input.activatedByLabel || input.documentedByLabel
          : input.mode === "completed"
            ? input.completedByLabel || input.documentedByLabel
            : input.mode === "discontinued"
              ? input.discontinuedByLabel || input.documentedByLabel
              : input.documentedByLabel;
  const parts = [who ? `${prefix} ${who}` : null, input.at].filter(Boolean);
  return parts.join(" · ");
}
