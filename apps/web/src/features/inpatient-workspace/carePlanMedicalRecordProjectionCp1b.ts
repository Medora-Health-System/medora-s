/**
 * MEDUI.CP.1B — Shared render helpers for Care Plan medical-record projection
 * (Summary UI + Print Entire Chart HTML). Read-only; no mutations.
 */

import type {
  CarePlanMedicalRecordPlanV1,
  EncounterCarePlanMedicalRecordProjectionV1,
} from "@medora/shared";
import { formatCarePlanClinicianAttribution } from "@medora/shared";

export type CarePlanMrTranslate = (key: string, vars?: Record<string, string | number>) => string;

const TEMPLATE_TITLE_KEYS: Record<string, string> = {
  fall_risk: "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.title",
};

const STATUS_I18N: Record<string, string> = {
  DRAFT: "inpatientMedicalRecordSummaryInp2f.carePlan.status.draft",
  ACTIVE: "inpatientMedicalRecordSummaryInp2f.carePlan.status.active",
  ON_HOLD: "inpatientMedicalRecordSummaryInp2f.carePlan.status.onHold",
  UNDER_REVIEW: "inpatientMedicalRecordSummaryInp2f.carePlan.status.underReview",
  COMPLETED: "inpatientMedicalRecordSummaryInp2f.carePlan.status.completed",
  DISCONTINUED: "inpatientMedicalRecordSummaryInp2f.carePlan.status.discontinued",
};

const DISCIPLINE_I18N: Record<string, string> = {
  NURSING: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineNursing",
  PROVIDER: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineProvider",
  RESPIRATORY: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineRespiratory",
  SHARED: "inpatientMedicalRecordSummaryInp2f.carePlan.disciplineShared",
  TECHNICIAN: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineTechnician",
  PT: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplinePt",
  OT: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineOt",
  SLP: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineSlp",
};

const ROLE_CREDENTIAL_I18N: Record<string, string> = {
  RN: "inpatientMedicalRecordSummaryInp2f.carePlan.credentials.rn",
  PROVIDER: "inpatientMedicalRecordSummaryInp2f.carePlan.credentials.provider",
  PATIENT_CARE_TECH: "inpatientMedicalRecordSummaryInp2f.carePlan.credentials.pct",
  ADMIN: "inpatientMedicalRecordSummaryInp2f.carePlan.credentials.admin",
};

function tryT(t: CarePlanMrTranslate, key: string): string {
  const value = t(key);
  return value === key ? "" : value;
}

export function resolveCarePlanPlanTitle(
  plan: CarePlanMedicalRecordPlanV1,
  t: CarePlanMrTranslate
): string {
  if (plan.templateId && TEMPLATE_TITLE_KEYS[plan.templateId]) {
    const localized = tryT(t, TEMPLATE_TITLE_KEYS[plan.templateId]!);
    if (localized) return localized;
  }
  if (plan.title.includes(".")) {
    const localized = tryT(t, plan.title);
    if (localized) return localized;
  }
  return plan.title;
}

export function resolveCarePlanStatusLabel(status: string, t: CarePlanMrTranslate): string {
  const key = STATUS_I18N[status.toUpperCase()];
  if (key) {
    const localized = tryT(t, key);
    if (localized) return localized;
  }
  return status;
}

export function resolveCarePlanDisciplineLabel(
  discipline: string | null | undefined,
  t: CarePlanMrTranslate
): string | null {
  if (!discipline) return null;
  const upper = discipline.toUpperCase();
  const key = DISCIPLINE_I18N[upper];
  if (key) {
    const localized = tryT(t, key);
    if (localized) return localized;
  }
  return discipline;
}

function roleCredentialLabel(roleSnapshot: string | null | undefined, t: CarePlanMrTranslate): string | null {
  if (!roleSnapshot) return null;
  const key = ROLE_CREDENTIAL_I18N[roleSnapshot.toUpperCase()];
  if (key) {
    const localized = tryT(t, key);
    if (localized) return localized;
  }
  // Never show raw engineering RoleCode strings in FR/EN chart.
  if (roleSnapshot === "RN") return "RN";
  if (roleSnapshot === "PROVIDER") return t("inpatientMedicalRecordSummaryInp2f.carePlan.credentials.provider");
  return null;
}

export function formatCarePlanDocumentedLine(
  planPiece: {
    documentedBy?: CarePlanMedicalRecordPlanV1["goals"][number]["documentedBy"];
    documentedAt?: string | null;
    correctedBy?: CarePlanMedicalRecordPlanV1["goals"][number]["correctedBy"];
    correctedAt?: string | null;
  },
  t: CarePlanMrTranslate,
  formatDateTime: (iso: string | null) => string
): string {
  const clinician = planPiece.documentedBy ?? {
    displayName: null,
    credentials: null,
    roleSnapshot: null,
    attributionUnavailable: true,
  };
  const primary = formatCarePlanClinicianAttribution({
    documentedByLabel: t("inpatientMedicalRecordSummaryInp2f.carePlan.documentedBy"),
    reviewedByLabel: t("inpatientMedicalRecordSummaryInp2f.carePlan.reviewedBy"),
    clinician,
    at: formatDateTime(planPiece.documentedAt ?? null),
    mode: "documented",
    roleLabel: roleCredentialLabel(clinician.roleSnapshot, t),
    attributionUnavailableLabel: t(
      "inpatientNursingAdmissionInp2g.carePlanWorkspace.attributionUnavailable"
    ),
  });
  if (!planPiece.correctedAt || !planPiece.correctedBy) return primary;
  const corrected = formatCarePlanClinicianAttribution({
    documentedByLabel: t("inpatientMedicalRecordSummaryInp2f.carePlan.documentedBy"),
    reviewedByLabel: t("inpatientMedicalRecordSummaryInp2f.carePlan.reviewedBy"),
    correctedByLabel: t("inpatientNursingAdmissionInp2g.carePlanWorkspace.correctedBy"),
    clinician: planPiece.correctedBy,
    at: formatDateTime(planPiece.correctedAt),
    mode: "corrected",
    roleLabel: roleCredentialLabel(planPiece.correctedBy.roleSnapshot, t),
    attributionUnavailableLabel: t(
      "inpatientNursingAdmissionInp2g.carePlanWorkspace.attributionUnavailable"
    ),
  });
  return [primary, corrected].filter(Boolean).join(" · ");
}

export function formatCarePlanReviewedLine(
  review: CarePlanMedicalRecordPlanV1["reviews"][number],
  t: CarePlanMrTranslate,
  formatDateTime: (iso: string | null) => string
): string {
  return formatCarePlanClinicianAttribution({
    documentedByLabel: t("inpatientMedicalRecordSummaryInp2f.carePlan.documentedBy"),
    reviewedByLabel: t("inpatientMedicalRecordSummaryInp2f.carePlan.reviewedBy"),
    clinician: review.reviewedBy,
    at: formatDateTime(review.reviewedAt),
    mode: "reviewed",
    roleLabel: roleCredentialLabel(review.reviewedBy.roleSnapshot, t),
    attributionUnavailableLabel: t(
      "inpatientNursingAdmissionInp2g.carePlanWorkspace.attributionUnavailable"
    ),
  });
}

function escHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function componentBlockHtml(
  heading: string,
  items: CarePlanMedicalRecordPlanV1["goals"],
  t: CarePlanMrTranslate,
  formatDateTime: (iso: string | null) => string
): string {
  if (!items.length) return "";
  const lis = items
    .map((item) => {
      const discipline = resolveCarePlanDisciplineLabel(item.discipline, t);
      const attribution = formatCarePlanDocumentedLine(item, t, formatDateTime);
      const body = item.text || item.title;
      return `<li><div>${escHtml(body)}</div>${
        discipline ? `<div>${escHtml(discipline)}</div>` : ""
      }${item.status ? `<div>${escHtml(resolveCarePlanStatusLabel(item.status, t))}</div>` : ""}${
        attribution ? `<div>${escHtml(attribution)}</div>` : ""
      }</li>`;
    })
    .join("");
  return `<h4>${escHtml(heading)}</h4><ul>${lis}</ul>`;
}

function planHtml(
  plan: CarePlanMedicalRecordPlanV1,
  t: CarePlanMrTranslate,
  formatDateTime: (iso: string | null) => string
): string {
  const title = resolveCarePlanPlanTitle(plan, t);
  const status = resolveCarePlanStatusLabel(plan.status, t);
  const contributors = plan.contributors
    .map((d) => resolveCarePlanDisciplineLabel(d, t) ?? d)
    .filter(Boolean)
    .join(" · ");
  const activatedLine = formatCarePlanClinicianAttribution({
    documentedByLabel: t("inpatientMedicalRecordSummaryInp2f.carePlan.documentedBy"),
    reviewedByLabel: t("inpatientMedicalRecordSummaryInp2f.carePlan.reviewedBy"),
    activatedByLabel: t("inpatientNursingAdmissionInp2g.carePlanWorkspace.activatedBy"),
    clinician: plan.activatedBy,
    at: formatDateTime(plan.activatedAt),
    mode: "activated",
    roleLabel: roleCredentialLabel(plan.activatedBy.roleSnapshot, t),
    attributionUnavailableLabel: t(
      "inpatientNursingAdmissionInp2g.carePlanWorkspace.attributionUnavailable"
    ),
  });
  const progressHtml = plan.progress.length
    ? `<h4>${escHtml(t("inpatientMedicalRecordSummaryInp2f.carePlan.progress"))}</h4><ul>${plan.progress
        .map((p) => {
          const line = formatCarePlanDocumentedLine(p, t, formatDateTime);
          return `<li><div>${escHtml(p.narrative)}</div>${
            line ? `<div>${escHtml(line)}</div>` : ""
          }</li>`;
        })
        .join("")}</ul>`
    : "";
  const reviewsHtml = plan.reviews.length
    ? `<h4>${escHtml(t("inpatientMedicalRecordSummaryInp2f.carePlan.reviews"))}</h4><ul>${plan.reviews
        .map((r) => {
          const line = formatCarePlanReviewedLine(r, t, formatDateTime);
          return `<li><div>${escHtml(r.narrative ?? r.reviewStatus ?? "")}</div>${
            line ? `<div>${escHtml(line)}</div>` : ""
          }</li>`;
        })
        .join("")}</ul>`
    : "";
  const transitionsHtml = plan.transitions.length
    ? `<h4>${escHtml(t("inpatientNursingAdmissionInp2g.carePlanWorkspace.navHistory"))}</h4><ul>${plan.transitions
        .map((tr) => {
          const to = String(tr.toStatus ?? "").toUpperCase();
          const from = String(tr.fromStatus ?? "").toUpperCase();
          const mode =
            to === "COMPLETED"
              ? "completed"
              : to === "DISCONTINUED"
                ? "discontinued"
                : "documented";
          const line = formatCarePlanClinicianAttribution({
            documentedByLabel: t("inpatientMedicalRecordSummaryInp2f.carePlan.documentedBy"),
            reviewedByLabel: t("inpatientMedicalRecordSummaryInp2f.carePlan.reviewedBy"),
            activatedByLabel: t("inpatientNursingAdmissionInp2g.carePlanWorkspace.activatedBy"),
            completedByLabel: t("inpatientNursingAdmissionInp2g.carePlanWorkspace.completedBy"),
            discontinuedByLabel: t("inpatientNursingAdmissionInp2g.carePlanWorkspace.discontinuedBy"),
            correctedByLabel: t("inpatientNursingAdmissionInp2g.carePlanWorkspace.correctedBy"),
            clinician: tr.actor,
            at: formatDateTime(tr.at),
            mode: mode as "documented" | "completed" | "discontinued" | "activated",
            roleLabel: roleCredentialLabel(tr.actor.roleSnapshot, t),
            attributionUnavailableLabel: t(
              "inpatientNursingAdmissionInp2g.carePlanWorkspace.attributionUnavailable"
            ),
          });
          const label =
            to === "ACTIVE" && from === "DRAFT"
              ? t("inpatientNursingAdmissionInp2g.carePlanWorkspace.historyActivated")
              : to === "ACTIVE"
                ? t("inpatientNursingAdmissionInp2g.carePlanWorkspace.historyActivated")
                : to === "ON_HOLD"
                  ? t("inpatientNursingAdmissionInp2g.carePlanWorkspace.historyHeld")
                  : to === "COMPLETED"
                    ? t("inpatientNursingAdmissionInp2g.carePlanWorkspace.historyCompleted")
                    : to === "DISCONTINUED"
                      ? t("inpatientNursingAdmissionInp2g.carePlanWorkspace.historyDiscontinued")
                      : resolveCarePlanStatusLabel(to, t);
          return `<li><div>${escHtml(label)}</div>${
            tr.reason ? `<div>${escHtml(tr.reason)}</div>` : ""
          }${line ? `<div>${escHtml(line)}</div>` : ""}</li>`;
        })
        .join("")}</ul>`
    : "";

  return `<article style="margin:0 0 16px;padding:0 0 12px;border-bottom:1px solid #e2e8f0">
    <h3 style="margin:0 0 6px">${escHtml(title)}</h3>
    <div>${escHtml(t("inpatientMedicalRecordSummaryInp2f.carePlan.statusLabel"))}: ${escHtml(status)}</div>
    ${activatedLine ? `<div>${escHtml(activatedLine)}</div>` : ""}
    ${
      plan.lastReviewedAt
        ? `<div>${escHtml(t("inpatientMedicalRecordSummaryInp2f.carePlan.lastReviewed"))}: ${escHtml(
            formatDateTime(plan.lastReviewedAt)
          )}</div>`
        : ""
    }
    ${
      contributors
        ? `<div>${escHtml(t("inpatientMedicalRecordSummaryInp2f.carePlan.contributors"))}: ${escHtml(
            contributors
          )}</div>`
        : ""
    }
    ${componentBlockHtml(t("inpatientMedicalRecordSummaryInp2f.carePlan.goalsOutcomes"), [...plan.goals, ...plan.outcomes], t, formatDateTime)}
    ${componentBlockHtml(t("inpatientMedicalRecordSummaryInp2f.carePlan.interventions"), plan.interventions, t, formatDateTime)}
    ${componentBlockHtml(t("inpatientMedicalRecordSummaryInp2f.carePlan.monitoring"), plan.monitoring, t, formatDateTime)}
    ${componentBlockHtml(t("inpatientMedicalRecordSummaryInp2f.carePlan.education"), plan.education, t, formatDateTime)}
    ${progressHtml}
    ${reviewsHtml}
    ${transitionsHtml}
  </article>`;
}

export function buildCarePlanMedicalRecordPrintHtml(input: {
  projection: EncounterCarePlanMedicalRecordProjectionV1;
  t: CarePlanMrTranslate;
  formatDateTime: (iso: string | null) => string;
  emptyLabel: string;
}): string {
  const { projection, t, formatDateTime, emptyLabel } = input;
  if (projection.availability === "EMPTY") {
    return `<p>${escHtml(emptyLabel)}</p>`;
  }
  const parts: string[] = [];
  if (projection.currentPlans.length) {
    parts.push(`<h3>${escHtml(t("inpatientMedicalRecordSummaryInp2f.carePlan.currentPlans"))}</h3>`);
    for (const plan of projection.currentPlans) {
      parts.push(planHtml(plan, t, formatDateTime));
    }
  }
  if (projection.completedDiscontinuedPlans.length) {
    parts.push(
      `<h3>${escHtml(t("inpatientMedicalRecordSummaryInp2f.carePlan.completedDiscontinuedPlans"))}</h3>`
    );
    for (const plan of projection.completedDiscontinuedPlans) {
      parts.push(planHtml(plan, t, formatDateTime));
    }
  }
  if (projection.historicalLegacy.length) {
    parts.push(`<h3>${escHtml(t("inpatientMedicalRecordSummaryInp2f.carePlan.historical"))}</h3><ul>`);
    for (const item of projection.historicalLegacy) {
      const discipline = resolveCarePlanDisciplineLabel(item.discipline, t);
      parts.push(
        `<li>${escHtml(item.goalText ?? "")}${
          discipline ? ` · ${escHtml(discipline)}` : ""
        }${item.documentedAt ? ` · ${escHtml(formatDateTime(item.documentedAt))}` : ""}</li>`
      );
    }
    parts.push("</ul>");
  }
  return parts.join("") || `<p>${escHtml(emptyLabel)}</p>`;
}
