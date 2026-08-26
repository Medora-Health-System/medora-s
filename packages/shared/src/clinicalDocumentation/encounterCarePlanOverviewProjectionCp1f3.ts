/**
 * MEDUI.CP.1F.3 — Canonical Care Plan overview / clinical-context projection.
 * EncounterCarePlan* → resolved clinician-readable lines (no template keys).
 */

import {
  resolveCarePlanClinicalNarrativeForClinician,
  type CarePlanClinicalLocale,
} from "./enterpriseCarePlanTemplateClinicalTextCp1f1.js";

export type CarePlanOverviewLineV1 = {
  planId: string;
  title: string;
  status: string;
  goalSummary: string | null;
  concern: string | null;
  templateId: string | null;
};

type OverviewComponentInput = {
  componentType?: string;
  title?: string;
  text?: string;
  status?: string;
};

type OverviewPlanInput = {
  id?: string;
  title?: string;
  status?: string;
  templateId?: string | null;
  activatedAt?: string | null;
  components?: OverviewComponentInput[];
};

const CURRENT_STATUSES = new Set(["ACTIVE", "ON_HOLD", "UNDER_REVIEW", "DRAFT"]);
const COMPLETED_STATUSES = new Set(["COMPLETED", "DISCONTINUED"]);

function resolveClinical(value: string | null | undefined, locale: CarePlanClinicalLocale): string {
  return resolveCarePlanClinicalNarrativeForClinician(value, locale, "—");
}

function componentNarrative(c: OverviewComponentInput, locale: CarePlanClinicalLocale): string {
  const text = String(c.text ?? "").trim();
  const title = String(c.title ?? "").trim();
  return resolveClinical(text || title, locale);
}

function planSortWeight(status: string): number {
  const s = status.toUpperCase();
  if (CURRENT_STATUSES.has(s)) return 0;
  if (COMPLETED_STATUSES.has(s)) return 1;
  return 2;
}

export function projectEncounterCarePlanOverview(input: {
  plans?: OverviewPlanInput[] | null;
  displayLocale: CarePlanClinicalLocale;
  /** Max plans for overview rails (default 8). */
  limit?: number;
}): CarePlanOverviewLineV1[] {
  const locale = input.displayLocale;
  const limit = input.limit ?? 8;
  const raw = Array.isArray(input.plans) ? input.plans : [];

  const sorted = raw
    .slice()
    .sort((a, b) => {
      const wa = planSortWeight(String(a.status ?? "ACTIVE"));
      const wb = planSortWeight(String(b.status ?? "ACTIVE"));
      if (wa !== wb) return wa - wb;
      const ta = String(a.activatedAt ?? "");
      const tb = String(b.activatedAt ?? "");
      return tb.localeCompare(ta);
    })
    .slice(0, limit);

  return sorted.map((plan) => {
    const components = Array.isArray(plan.components) ? plan.components : [];
    const goals = components.filter(
      (c) => String(c.componentType ?? "").toUpperCase() === "GOAL"
    );
    const concerns = components.filter((c) =>
      /CONCERN|BARRIER|PROBLEM/i.test(String(c.componentType ?? ""))
    );
    const openConcern = concerns.find(
      (c) => !/COMPLETE|RESOLVED|DISCONTINUED/i.test(String(c.status ?? ""))
    );

    const goalParts = goals
      .slice(0, 2)
      .map((g) => componentNarrative(g, locale))
      .filter((s) => s && s !== "—");

    return {
      planId: String(plan.id ?? ""),
      title: resolveClinical(plan.title, locale) || "—",
      status: String(plan.status ?? "ACTIVE"),
      goalSummary: goalParts.length ? goalParts.join("; ") : null,
      concern: openConcern
        ? componentNarrative(openConcern, locale) || null
        : null,
      templateId: typeof plan.templateId === "string" ? plan.templateId : null,
    };
  });
}

/** Regression helper — clinician-facing overview must not leak internal template keys. */
export function carePlanOverviewContainsTemplateKeyLeak(text: string): boolean {
  const patterns = [
    /enterpriseInterdisciplinaryCarePlans/i,
    /inpatientNursingAdmissionInp2g/i,
    /\bD4b6\b/i,
    /\.templates\./i,
    /\.goalBody/i,
    /\.outcomeBody/i,
    /\.interventionBody/i,
    /\.monitoringBody/i,
    /\.educationBody/i,
  ];
  return patterns.some((re) => re.test(text));
}
