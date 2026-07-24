/**
 * MEDUI.D4A.3.4 — Display labels for inpatient clinical enums (never show raw codes).
 */

export type TranslateFn = (key: string) => string;

const CODE_STATUS_KEYS = [
  "FULL_CODE",
  "DNR",
  "DNI",
  "DNR_DNI",
  "COMFORT_MEASURES_ONLY",
  "LIMITED_INTERVENTIONS",
] as const;

const ISOLATION_KEYS = [
  "STANDARD",
  "CONTACT",
  "DROPLET",
  "AIRBORNE",
  "PROTECTIVE",
  "ENHANCED_CONTACT",
  "COVID",
  "ENTERIC",
  "ENHANCED_RESPIRATORY",
] as const;

const CLINICAL_STATE_KEYS = ["pain", "fallRisk", "wounds"] as const;

export type ClinicalStateKey = (typeof CLINICAL_STATE_KEYS)[number];

export function formatInpatientCodeStatusDisplay(
  raw: string | null | undefined,
  t: TranslateFn,
  emptyLabel: string
): string {
  const code = (raw ?? "").trim().toUpperCase();
  if (!code || code === "UNKNOWN" || code === "PENDING_DISCUSSION") return emptyLabel;
  if ((CODE_STATUS_KEYS as readonly string[]).includes(code)) {
    return t(`inpatientHeaderNursingD4a33.codeStatusEditor.options.${code}`);
  }
  // Humanize unknown codes without exposing snake_case as-is when possible.
  return code.replace(/_/g, " ");
}

export function formatInpatientIsolationDisplay(
  precautions: string[] | string | null | undefined,
  t: TranslateFn,
  emptyLabel: string
): string {
  const list = Array.isArray(precautions)
    ? precautions
    : typeof precautions === "string" && precautions.trim()
      ? [precautions]
      : [];
  const labels = list
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean)
    .map((code) => {
      if ((ISOLATION_KEYS as readonly string[]).includes(code)) {
        return t(`inpatientHeaderNursingD4a33.isolationEditor.options.${code}`);
      }
      return code.replace(/_/g, " ");
    });
  return labels.length ? labels.join(", ") : emptyLabel;
}

export function formatInpatientClinicalStateLabel(key: ClinicalStateKey, t: TranslateFn): string {
  return t(`inpatientOverviewD4a34.clinicalState.keys.${key}`);
}

export function formatInpatientEncounterStatusDisplay(
  raw: string | null | undefined,
  t: TranslateFn,
  emptyLabel: string
): string {
  const code = (raw ?? "").trim().toUpperCase();
  if (!code) return emptyLabel;
  const key = `inpatientOverviewD4a34.encounterStatus.${code}`;
  const labeled = t(key);
  return labeled !== key ? labeled : code.replace(/_/g, " ");
}

export function formatInpatientConsultSpecialtyDisplay(
  raw: string | null | undefined,
  t: TranslateFn
): string {
  const code = (raw ?? "").trim().toUpperCase();
  if (!code) return t("common.dash");
  const key = `inpatientOverviewD4a34.consultSpecialty.${code}`;
  const labeled = t(key);
  return labeled !== key ? labeled : code.replace(/_/g, " ");
}

/** Map synthesis sentinel / missing assignee to governed empty — never invent a clinician. */
export function formatCareTeamDisplayName(
  raw: string | null | undefined,
  emptyLabel: string
): string {
  const name = (raw ?? "").trim();
  if (!name) return emptyLabel;
  if (/^unknown clinician$/i.test(name)) return emptyLabel;
  return name;
}

export function isDocumentedMl(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
