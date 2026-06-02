/**
 * M1.3F.3 — read-only MAR medication safety governance display (no enforcement).
 */

export type MedicationSafetyGovernanceSnapshot = {
  isControlled?: boolean | null;
  controlledSchedule?: string | null;
  isHighAlert?: boolean | null;
  highAlertClass?: string | null;
  lasaGroupId?: string | null;
  lasaGroupLabel?: string | null;
  lasaSeverity?: string | null;
  requiresWitness?: boolean | null;
  requiresDoubleSign?: boolean | null;
  wasteDocumentationRecommended?: boolean | null;
  pharmacyVerificationStatus?:
    | "NOT_REQUIRED"
    | "PENDING"
    | "VERIFIED"
    | "REJECTED"
    | "OVERRIDDEN"
    | null;
  /** M1.3F.7 — pharmacy verify required before MAR (Schedule II/III, selected high-alert). */
  requiresPharmacyVerification?: boolean | null;
  pharmacyVerifiedAt?: string | null;
  pharmacyVerifiedByDisplay?: string | null;
};

export type MedicationSafetyBadgeId =
  | "CONTROLLED"
  | "HIGH_ALERT"
  | "LASA"
  | "WITNESS_REQUIRED"
  | "DOUBLE_SIGN_REQUIRED"
  | "PHARMACY_VERIFY"
  | "PHARMACY_VERIFIED"
  | "WASTE_REQUIRED";

export type MedicationSafetySummaryLineKind =
  | "controlled_schedule"
  | "high_alert_class"
  | "lasa_group"
  | "lasa_severity"
  | "witness_required"
  | "double_sign_required"
  | "pharmacy_verification"
  | "waste_recommended"
  | "informational";

export type MedicationSafetySummaryLine = {
  kind: MedicationSafetySummaryLineKind;
  /** i18n key under `marGovernance.summary.*` */
  labelKey: string;
  /** Optional raw value for interpolation (`{value}`) */
  value?: string | null;
};

export type MedicationSafetyGovernanceDisplayInput = MedicationSafetyGovernanceSnapshot & {
  /** Client-only fallback when profile HA flag is absent (name heuristic). */
  highRiskNameMatch?: boolean;
};

export function parseMedicationHighAlertCategoriesJson(value: unknown): {
  highAlertClass: string | null;
  lasaGroupCode: string | null;
  lasaGroupLabel: string | null;
  lasaSeverity: string | null;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { highAlertClass: null, lasaGroupCode: null, lasaGroupLabel: null, lasaSeverity: null };
  }
  const root = value as Record<string, unknown>;
  const highAlertClass = typeof root.highAlertClass === "string" ? root.highAlertClass.trim() : null;
  const lasaRaw = root.lasa;
  if (!lasaRaw || typeof lasaRaw !== "object" || Array.isArray(lasaRaw)) {
    return { highAlertClass, lasaGroupCode: null, lasaGroupLabel: null, lasaSeverity: null };
  }
  const lasa = lasaRaw as Record<string, unknown>;
  return {
    highAlertClass,
    lasaGroupCode: typeof lasa.lasaGroupCode === "string" ? lasa.lasaGroupCode.trim() : null,
    lasaGroupLabel: typeof lasa.lasaGroupLabel === "string" ? lasa.lasaGroupLabel.trim() : null,
    lasaSeverity: typeof lasa.lasaSeverity === "string" ? lasa.lasaSeverity.trim() : null,
  };
}

export function formatControlledSchedule(schedule: string | null | undefined): string | null {
  const s = schedule?.trim();
  if (!s) return null;
  if (/^schedule\s+/i.test(s)) return s;
  if (/^(I|II|III|IV|V)$/i.test(s)) return `Schedule ${s.toUpperCase()}`;
  return s;
}

export function formatHighAlertClass(highAlertClass: string | null | undefined): string | null {
  const c = highAlertClass?.trim();
  if (!c || c === "HIGH_ALERT_NONE") return null;
  return c.replace(/^HIGH_ALERT_/, "").replace(/_/g, " ");
}

export function formatLasaSeverity(lasaSeverity: string | null | undefined): string | null {
  const s = lasaSeverity?.trim();
  if (!s) return null;
  return s.replace(/^LASA_/, "").replace(/_/g, " ");
}

function resolvesHighAlert(input: MedicationSafetyGovernanceDisplayInput): boolean {
  if (input.isHighAlert === true) return true;
  const cls = input.highAlertClass?.trim();
  if (cls && cls !== "HIGH_ALERT_NONE") return true;
  return Boolean(input.highRiskNameMatch);
}

function resolvesLasa(input: MedicationSafetyGovernanceDisplayInput): boolean {
  return Boolean(input.lasaGroupId?.trim() || input.lasaSeverity?.trim());
}

export function getMedicationSafetyBadges(
  input: MedicationSafetyGovernanceDisplayInput
): MedicationSafetyBadgeId[] {
  const badges: MedicationSafetyBadgeId[] = [];
  if (input.isControlled === true) badges.push("CONTROLLED");
  if (resolvesHighAlert(input)) badges.push("HIGH_ALERT");
  if (resolvesLasa(input)) badges.push("LASA");
  if (input.requiresWitness === true) badges.push("WITNESS_REQUIRED");
  if (input.requiresDoubleSign === true) badges.push("DOUBLE_SIGN_REQUIRED");
  const pharm = input.pharmacyVerificationStatus;
  if (input.requiresPharmacyVerification === true && pharm === "VERIFIED") {
    badges.push("PHARMACY_VERIFIED");
  } else if (pharm === "PENDING" || pharm === "REJECTED" || pharm === "OVERRIDDEN") {
    badges.push("PHARMACY_VERIFY");
  } else if (input.requiresPharmacyVerification === true) {
    badges.push("PHARMACY_VERIFY");
  }
  if (input.wasteDocumentationRecommended === true) badges.push("WASTE_REQUIRED");
  return badges;
}

export function getMedicationSafetyWarningSummary(
  input: MedicationSafetyGovernanceDisplayInput
): MedicationSafetySummaryLine[] {
  const lines: MedicationSafetySummaryLine[] = [];
  const schedule = formatControlledSchedule(input.controlledSchedule);
  if (input.isControlled === true) {
    lines.push({
      kind: "controlled_schedule",
      labelKey: "controlledSchedule",
      value: schedule,
    });
  }
  const haClass = formatHighAlertClass(input.highAlertClass);
  if (resolvesHighAlert(input)) {
    lines.push({
      kind: "high_alert_class",
      labelKey: "highAlertClass",
      value: haClass,
    });
  }
  if (resolvesLasa(input)) {
    lines.push({
      kind: "lasa_group",
      labelKey: "lasaGroup",
      value: input.lasaGroupLabel?.trim() || input.lasaGroupId?.trim() || null,
    });
    const sev = formatLasaSeverity(input.lasaSeverity);
    if (sev) {
      lines.push({ kind: "lasa_severity", labelKey: "lasaSeverity", value: sev });
    }
  }
  if (input.requiresWitness === true) {
    lines.push({ kind: "witness_required", labelKey: "witnessRequired" });
  }
  if (input.requiresDoubleSign === true) {
    lines.push({ kind: "double_sign_required", labelKey: "doubleSignRequired" });
  }
  const pharm = input.pharmacyVerificationStatus;
  if (pharm && pharm !== "NOT_REQUIRED" && pharm !== "VERIFIED") {
    lines.push({
      kind: "pharmacy_verification",
      labelKey: "pharmacyVerification",
      value: pharm,
    });
  }
  if (input.wasteDocumentationRecommended === true) {
    lines.push({ kind: "waste_recommended", labelKey: "wasteRecommended" });
  }
  if (lines.length > 0) {
    lines.push({ kind: "informational", labelKey: "informationalOnly" });
  }
  return lines;
}

/** True when governance UI should render (badges or summary). */
export function medicationSafetyGovernanceHasDisplay(input: MedicationSafetyGovernanceDisplayInput): boolean {
  return getMedicationSafetyBadges(input).length > 0;
}
