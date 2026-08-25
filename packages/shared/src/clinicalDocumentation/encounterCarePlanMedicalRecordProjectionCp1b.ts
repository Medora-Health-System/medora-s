/**
 * MEDUI.CP.1B — Read-only medical-record projection of EncounterCarePlan*.
 * Same projection feeds Inpatient Summary and Print Entire Chart.
 * Does not invent a second Care Plan store.
 */

export type CarePlanMedicalRecordBucket = "CURRENT" | "COMPLETED_DISCONTINUED";

export type CarePlanMedicalRecordClinicianV1 = {
  displayName: string | null;
  /** Credential / profession label for chart display (never raw user UUID). */
  credentials: string | null;
  /** Role snapshot string when display credentials unavailable (RN, PROVIDER, …). */
  roleSnapshot: string | null;
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

type UserLite = {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
} | null | undefined;

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
  createdBy?: UserLite;
};

type AggregateProgress = {
  narrative?: string;
  status?: string | null;
  discipline?: string | null;
  createdAt?: string | Date | null;
  /** Prisma: authorUserId */
  authorUserId?: string | null;
  authorRoleSnapshot?: string | null;
  author?: UserLite;
};

type AggregateReview = {
  /** Prisma: reviewStatus */
  reviewStatus?: string | null;
  narrative?: string | null;
  createdAt?: string | Date | null;
  /** Prisma: reviewerUserId */
  reviewerUserId?: string | null;
  reviewerRoleSnapshot?: string | null;
  reviewer?: UserLite;
};

type AggregateTransition = {
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  createdAt?: string | Date | null;
  actorUserId?: string | null;
  actorRoleSnapshot?: string | null;
  actor?: UserLite;
};

export type EncounterCarePlanAggregateInput = {
  id?: string;
  title?: string;
  templateId?: string | null;
  status?: string;
  activatedAt?: string | Date | null;
  activatedByUserId?: string | null;
  activatedBy?: UserLite;
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

function displayName(user: UserLite, fallbackId?: string | null): string | null {
  if (user && typeof user.displayName === "string" && user.displayName.trim()) {
    return user.displayName.trim();
  }
  const first = typeof user?.firstName === "string" ? user.firstName.trim() : "";
  const last = typeof user?.lastName === "string" ? user.lastName.trim() : "";
  const joined = [first, last].filter(Boolean).join(" ").trim();
  if (joined) return joined;
  // Never surface raw user UUID in the medical record.
  void fallbackId;
  return null;
}

function clinician(
  user: UserLite,
  roleSnapshot: string | null | undefined,
  userId?: string | null
): CarePlanMedicalRecordClinicianV1 {
  return {
    displayName: displayName(user, userId),
    credentials: null,
    roleSnapshot: typeof roleSnapshot === "string" && roleSnapshot.trim() ? roleSnapshot.trim() : null,
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

function mapComponent(c: AggregateComponent): CarePlanMedicalRecordComponentV1 {
  const target = c.targetOutcome;
  return {
    kind: componentKind(c),
    title: String(c.title ?? "").trim(),
    text: String(c.text ?? "").trim(),
    targetOutcome: typeof target === "string" && target.trim() ? target.trim() : null,
    discipline: typeof c.discipline === "string" && c.discipline.trim() ? c.discipline.trim() : null,
    status: typeof c.status === "string" && c.status.trim() ? c.status.trim() : null,
    documentedBy: clinician(c.createdBy, null, c.createdByUserId),
    documentedAt: iso(c.createdAt),
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
  plan: EncounterCarePlanAggregateInput
): CarePlanMedicalRecordPlanV1 {
  const status = String(plan.status ?? "ACTIVE").toUpperCase();
  const components = Array.isArray(plan.components) ? plan.components.map(mapComponent) : [];
  const goals = components.filter((c) => c.kind === "GOAL");
  const outcomes = components.filter((c) => c.kind === "OUTCOME");
  const interventions = components.filter((c) => c.kind === "INTERVENTION" || c.kind === "SAFETY");
  const monitoring = components.filter((c) => c.kind === "MONITORING");
  const education = components.filter((c) => c.kind === "EDUCATION");

  const progress: CarePlanMedicalRecordProgressV1[] = (plan.progress ?? []).map((p) => ({
    narrative: String(p.narrative ?? "").trim(),
    status: typeof p.status === "string" ? p.status : null,
    discipline: typeof p.discipline === "string" ? p.discipline : null,
    documentedBy: clinician(p.author, p.authorRoleSnapshot, p.authorUserId),
    documentedAt: iso(p.createdAt),
  }));

  const reviews: CarePlanMedicalRecordReviewV1[] = (plan.reviews ?? []).map((r) => ({
    reviewStatus: typeof r.reviewStatus === "string" ? r.reviewStatus : null,
    narrative: typeof r.narrative === "string" ? r.narrative : null,
    reviewedBy: clinician(r.reviewer, r.reviewerRoleSnapshot, r.reviewerUserId),
    reviewedAt: iso(r.createdAt),
  }));

  const transitions: CarePlanMedicalRecordTransitionV1[] = (plan.transitions ?? []).map((t) => ({
    fromStatus: typeof t.fromStatus === "string" ? t.fromStatus : null,
    toStatus: typeof t.toStatus === "string" ? t.toStatus : null,
    reason: typeof t.reason === "string" ? t.reason : null,
    actor: clinician(t.actor, t.actorRoleSnapshot, t.actorUserId),
    at: iso(t.createdAt),
  }));

  const projected: CarePlanMedicalRecordPlanV1 = {
    planId: String(plan.id ?? ""),
    title: String(plan.title ?? "").trim() || "Care plan",
    templateId: typeof plan.templateId === "string" ? plan.templateId : null,
    status,
    bucket: bucketForStatus(status),
    activatedAt: iso(plan.activatedAt),
    activatedBy: clinician(plan.activatedBy, null, plan.activatedByUserId),
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
}): EncounterCarePlanMedicalRecordProjectionV1 {
  const plans = Array.isArray(input.plans) ? input.plans.map(projectEncounterCarePlanPlan) : [];
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
  mode: "documented" | "reviewed";
  roleLabel?: string | null;
}): string {
  const name = input.clinician.displayName?.trim() || null;
  const cred =
    input.clinician.credentials?.trim() ||
    input.roleLabel?.trim() ||
    null;
  const who = [name, cred].filter(Boolean).join(", ");
  const prefix = input.mode === "reviewed" ? input.reviewedByLabel : input.documentedByLabel;
  const parts = [who ? `${prefix} ${who}` : null, input.at].filter(Boolean);
  return parts.join(" · ");
}
