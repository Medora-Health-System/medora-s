/**
 * MEDUI.D4A.3.3A — Enterprise allergy entries on Patient.clinicalHistoryProfileJson.
 * Zero Prisma migration: additive `allergies.entries[]` + nkda flag.
 */

export const ALLERGY_RECORD_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type AllergyRecordStatus = (typeof ALLERGY_RECORD_STATUSES)[number];

export const ALLERGY_VERIFICATION_STATUSES = [
  "UNVERIFIED",
  "PATIENT_REPORTED",
  "CLINICIAN_VERIFIED",
] as const;
export type AllergyVerificationStatus = (typeof ALLERGY_VERIFICATION_STATUSES)[number];

export const ALLERGY_SEVERITIES = [
  "MILD",
  "MODERATE",
  "SEVERE",
  "ANAPHYLAXIS",
  "UNKNOWN",
] as const;
export type AllergySeverity = (typeof ALLERGY_SEVERITIES)[number];

export type EnterpriseAllergyEntry = {
  id: string;
  substance: string;
  reaction?: string;
  severity?: AllergySeverity;
  verificationStatus?: AllergyVerificationStatus;
  status: AllergyRecordStatus;
  updatedAt?: string;
  updatedByUserId?: string;
};

export type EnterpriseAllergiesSection = {
  allergyNote?: string;
  medicationAllergiesDetail?: string;
  foodAllergiesDetail?: string;
  additionalAllergyInfo?: string;
  allergyDetailSelections?: string[];
  /** Structured enterprise allergy rows (authoritative for header active summary). */
  entries?: EnterpriseAllergyEntry[];
  nkda?: boolean;
};

function trim(v: unknown, max = 240): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function asStatus(v: unknown): AllergyRecordStatus {
  const s = String(v ?? "").toUpperCase();
  return (ALLERGY_RECORD_STATUSES as readonly string[]).includes(s)
    ? (s as AllergyRecordStatus)
    : "ACTIVE";
}

function asVerification(v: unknown): AllergyVerificationStatus | undefined {
  const s = String(v ?? "").toUpperCase();
  return (ALLERGY_VERIFICATION_STATUSES as readonly string[]).includes(s)
    ? (s as AllergyVerificationStatus)
    : undefined;
}

function asSeverity(v: unknown): AllergySeverity | undefined {
  const s = String(v ?? "").toUpperCase();
  return (ALLERGY_SEVERITIES as readonly string[]).includes(s) ? (s as AllergySeverity) : undefined;
}

export function sanitizeEnterpriseAllergyEntry(raw: unknown): EnterpriseAllergyEntry | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const substance = trim(o.substance, 160);
  if (!substance) return null;
  const id = trim(o.id, 64) || `alg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const entry: EnterpriseAllergyEntry = {
    id,
    substance,
    status: asStatus(o.status),
  };
  const reaction = trim(o.reaction, 240);
  if (reaction) entry.reaction = reaction;
  const severity = asSeverity(o.severity);
  if (severity) entry.severity = severity;
  const verification = asVerification(o.verificationStatus);
  if (verification) entry.verificationStatus = verification;
  const updatedAt = trim(o.updatedAt, 40);
  if (updatedAt) entry.updatedAt = updatedAt;
  const updatedByUserId = trim(o.updatedByUserId, 64);
  if (updatedByUserId) entry.updatedByUserId = updatedByUserId;
  return entry;
}

export function sanitizeEnterpriseAllergiesSection(raw: unknown): EnterpriseAllergiesSection {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: EnterpriseAllergiesSection = {};
  const allergyNote = trim(o.allergyNote);
  if (allergyNote) out.allergyNote = allergyNote;
  const med = trim(o.medicationAllergiesDetail, 2000);
  if (med) out.medicationAllergiesDetail = med;
  const food = trim(o.foodAllergiesDetail, 1000);
  if (food) out.foodAllergiesDetail = food;
  const add = trim(o.additionalAllergyInfo, 1000);
  if (add) out.additionalAllergyInfo = add;
  if (Array.isArray(o.allergyDetailSelections)) {
    out.allergyDetailSelections = o.allergyDetailSelections
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 40);
  }
  if (typeof o.nkda === "boolean") out.nkda = o.nkda;
  if (Array.isArray(o.entries)) {
    const entries: EnterpriseAllergyEntry[] = [];
    for (const row of o.entries.slice(0, 80)) {
      const e = sanitizeEnterpriseAllergyEntry(row);
      if (e) entries.push(e);
    }
    out.entries = entries;
  }
  return out;
}

/** Active-only summary for header / banner (NKDA or comma-separated substances). */
export function activeAllergiesSummary(
  allergies: EnterpriseAllergiesSection | null | undefined,
  nkdaLabel = "NKDA"
): { summary: string | null; availability: "PRESENT" | "NOT_PRESENT" | "NOT_DOCUMENTED" } {
  if (!allergies) return { summary: null, availability: "NOT_DOCUMENTED" };
  if (allergies.nkda === true || allergies.allergyDetailSelections?.includes("NKDA")) {
    return { summary: nkdaLabel, availability: "NOT_PRESENT" };
  }
  const active = (allergies.entries ?? []).filter((e) => e.status === "ACTIVE");
  if (active.length) {
    return {
      summary: active.map((e) => e.substance).join(", ").slice(0, 240),
      availability: "PRESENT",
    };
  }
  const legacy =
    allergies.medicationAllergiesDetail?.trim() ||
    allergies.allergyNote?.trim() ||
    allergies.additionalAllergyInfo?.trim() ||
    null;
  if (legacy) return { summary: legacy.slice(0, 240), availability: "PRESENT" };
  return { summary: null, availability: "NOT_DOCUMENTED" };
}

/** Compact audit-safe previous/next snapshot (substance + status only). */
export function allergySectionAuditSnapshot(allergies: EnterpriseAllergiesSection | null | undefined): {
  nkda: boolean;
  active: string[];
  inactive: string[];
} {
  const entries = allergies?.entries ?? [];
  return {
    nkda: Boolean(allergies?.nkda || allergies?.allergyDetailSelections?.includes("NKDA")),
    active: entries.filter((e) => e.status === "ACTIVE").map((e) => e.substance).slice(0, 40),
    inactive: entries.filter((e) => e.status === "INACTIVE").map((e) => e.substance).slice(0, 40),
  };
}

/** Sync legacy text fields from structured entries for older readers. */
export function syncLegacyAllergyTextFields(
  allergies: EnterpriseAllergiesSection
): EnterpriseAllergiesSection {
  const next = { ...allergies };
  if (next.nkda) {
    next.allergyDetailSelections = ["NKDA"];
    next.medicationAllergiesDetail = "";
    next.allergyNote = "NKDA";
    next.entries = [];
    return next;
  }
  const active = (next.entries ?? []).filter((e) => e.status === "ACTIVE");
  if (active.length) {
    next.medicationAllergiesDetail = active
      .map((e) => {
        const bits = [e.substance];
        if (e.reaction) bits.push(e.reaction);
        if (e.severity) bits.push(e.severity);
        return bits.join(" — ");
      })
      .join("; ");
    next.allergyNote = active.map((e) => e.substance).join(", ");
    next.allergyDetailSelections = (next.allergyDetailSelections ?? []).filter((c) => c !== "NKDA");
  }
  return next;
}
