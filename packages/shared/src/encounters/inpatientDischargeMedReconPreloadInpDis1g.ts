/**
 * INP.DIS.1G.1 — Discharge medication reconciliation preload + fast nursing workspace helpers.
 * Does not invent BPMH / MAR-as-home-med conversion. No Prisma migration.
 */

import type { MedReconDecision } from "./inpatientClinicalOpsV1.js";
import { validateMedReconDecision } from "./inpatientClinicalOpsV1.js";
import type {
  InpatientDischargeMedicationLine1C,
  InpatientDischargeMedRelationship,
} from "./inpatientProviderDischargeInpDis1c.js";
import type { HomeMedicationReconciliationLineV1 } from "./medSurgNursingAdmissionD4a1.js";
import type { PatientClinicalHistoryHomeMedications } from "../patient/patientClinicalHistoryProfile.js";

/** Provenance for discharge recon lines (not admission preload enums). */
export const INPATIENT_DISCHARGE_MED_RECON_SOURCES = [
  "EXISTING_DISCHARGE_RECON",
  "CLINICAL_OPS",
  "HOME_MEDICATION",
  "PRIOR_HISTORY",
  "PROVIDER_DISCHARGE_PLAN",
  "INPATIENT_ORDER",
  "MANUAL",
] as const;

export type InpatientDischargeMedReconSource =
  (typeof INPATIENT_DISCHARGE_MED_RECON_SOURCES)[number];

export type InpatientDischargeMedReconHistoryState =
  | "LOADED_WITH_MEDICATIONS"
  | "NO_DOCUMENTED_MEDICATIONS"
  | "MEDICATION_HISTORY_UNAVAILABLE";

/** Compact workspace row kind for one-click nursing UX. */
export const INPATIENT_DISCHARGE_MED_RECON_ROW_KINDS = [
  "HOME_ONLY",
  "PROVIDER_CONTINUE",
  "PROVIDER_CHANGED",
  "PROVIDER_STOP",
  "PROVIDER_NEW",
  "MANUAL",
  "SAVED",
] as const;

export type InpatientDischargeMedReconRowKind =
  (typeof INPATIENT_DISCHARGE_MED_RECON_ROW_KINDS)[number];

export type InpatientDischargeMedReconLineV1 = {
  id: string;
  sourceLabel: string;
  medicationName: string;
  strength?: string | null;
  dose?: string | null;
  unit?: string | null;
  route?: string | null;
  frequency?: string | null;
  instructions?: string | null;
  catalogMedicationId?: string | null;
  source: InpatientDischargeMedReconSource;
  rowKind?: InpatientDischargeMedReconRowKind | null;
  homeRegimen?: string | null;
  dischargeRegimen?: string | null;
  /** Provider discharge plan relationship when seeded from dischargeMedications. */
  providerPlanRelationship?: string | null;
  providerPlanSummary?: string | null;
  decision: MedReconDecision;
  reason?: string | null;
};

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

function normalizeKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

/** First token drug key for pairing home ↔ discharge plan (Losartan 50 ↔ Losartan 100). */
export function medicationBaseMatchKey(label: string): string {
  const cleaned = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const first = cleaned.split(" ")[0] ?? "";
  return first;
}

function buildSourceLabel(parts: Array<string | null | undefined>): string {
  return parts.map((p) => (p ?? "").trim()).filter(Boolean).join(" — ");
}

function formatRegimen(parts: {
  dose?: string | null;
  unit?: string | null;
  route?: string | null;
  frequency?: string | null;
}): string | null {
  const dose = [parts.dose, parts.unit].map((x) => trimOrNull(x)).filter(Boolean).join(" ");
  const line = [dose || null, trimOrNull(parts.route), trimOrNull(parts.frequency)]
    .filter(Boolean)
    .join(" ");
  return line || null;
}

function isSource(v: unknown): v is InpatientDischargeMedReconSource {
  return (
    typeof v === "string" &&
    (INPATIENT_DISCHARGE_MED_RECON_SOURCES as readonly string[]).includes(v)
  );
}

function isRowKind(v: unknown): v is InpatientDischargeMedReconRowKind {
  return (
    typeof v === "string" &&
    (INPATIENT_DISCHARGE_MED_RECON_ROW_KINDS as readonly string[]).includes(v)
  );
}

/** Hydrate a saved inpatientMedRecon.lines entry. */
export function hydrateInpatientDischargeMedReconLine(
  raw: unknown
): InpatientDischargeMedReconLineV1 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = trimOrNull(o.id) ?? trimOrNull(o.lineId);
  const medicationName =
    trimOrNull(o.medicationName) ??
    trimOrNull(o.sourceLabel) ??
    trimOrNull(o.displayName) ??
    trimOrNull(o.medicationLabel);
  if (!id || !medicationName) return null;
  const decisionRaw = trimOrNull(o.decision) ?? "UNABLE_TO_VERIFY";
  const decision = validateMedReconDecision(decisionRaw)
    ? (decisionRaw as MedReconDecision)
    : "UNABLE_TO_VERIFY";
  const source = isSource(o.source) ? o.source : "EXISTING_DISCHARGE_RECON";
  const sourceLabel =
    trimOrNull(o.sourceLabel) ??
    buildSourceLabel([
      medicationName,
      trimOrNull(o.dose) ?? trimOrNull(o.strength),
      trimOrNull(o.frequency),
    ]);
  return {
    id,
    sourceLabel,
    medicationName,
    strength: trimOrNull(o.strength),
    dose: trimOrNull(o.dose),
    unit: trimOrNull(o.unit),
    route: trimOrNull(o.route),
    frequency: trimOrNull(o.frequency),
    instructions: trimOrNull(o.instructions),
    catalogMedicationId: trimOrNull(o.catalogMedicationId),
    source,
    rowKind: isRowKind(o.rowKind) ? o.rowKind : "SAVED",
    homeRegimen: trimOrNull(o.homeRegimen),
    dischargeRegimen: trimOrNull(o.dischargeRegimen),
    providerPlanRelationship: trimOrNull(o.providerPlanRelationship),
    providerPlanSummary: trimOrNull(o.providerPlanSummary),
    decision,
    reason: trimOrNull(o.reason),
  };
}

export function medReconLineNeedsReview(line: InpatientDischargeMedReconLineV1): boolean {
  return line.decision === "UNABLE_TO_VERIFY";
}

/** Safe for “Continue all unchanged” — no provider change/stop/new/conflict. */
export function canBulkContinueMedReconLine(line: InpatientDischargeMedReconLineV1): boolean {
  if (!medReconLineNeedsReview(line)) return false;
  const kind = line.rowKind ?? null;
  if (kind === "PROVIDER_CHANGED" || kind === "PROVIDER_STOP" || kind === "PROVIDER_NEW") {
    return false;
  }
  const rel = trimOrNull(line.providerPlanRelationship)?.toUpperCase();
  if (rel === "CHANGE" || rel === "STOP" || rel === "NEW") return false;
  return kind === "HOME_ONLY" || kind === "PROVIDER_CONTINUE" || kind === null;
}

export function summarizeMedReconWorkspace(lines: InpatientDischargeMedReconLineV1[]): {
  total: number;
  reconciled: number;
  needsReview: number;
} {
  const total = lines.length;
  const needsReview = lines.filter(medReconLineNeedsReview).length;
  return { total, reconciled: total - needsReview, needsReview };
}

export function allRequiredMedReconDecisionsComplete(
  lines: InpatientDischargeMedReconLineV1[]
): boolean {
  if (lines.length === 0) return false;
  return lines.every((l) => !medReconLineNeedsReview(l));
}

type HomeSeed = {
  id: string;
  medicationName: string;
  dose?: string | null;
  unit?: string | null;
  route?: string | null;
  frequency?: string | null;
  strength?: string | null;
  source: InpatientDischargeMedReconSource;
  regimen: string;
};

function collectHomeSeeds(input: {
  admissionHomeMedicationLines?: HomeMedicationReconciliationLineV1[] | null;
  patientHomeMedications?: PatientClinicalHistoryHomeMedications | null;
}): HomeSeed[] {
  const out: HomeSeed[] = [];
  const seen = new Set<string>();
  const push = (seed: HomeSeed) => {
    const key = medicationBaseMatchKey(seed.medicationName);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(seed);
  };

  if (Array.isArray(input.admissionHomeMedicationLines)) {
    input.admissionHomeMedicationLines.forEach((line, i) => {
      const name = trimOrNull(line.medicationLabel);
      if (!name) return;
      const regimen =
        formatRegimen({
          dose: line.dose ?? line.strength,
          route: line.route,
          frequency: line.frequency,
        }) ?? name;
      push({
        id: trimOrNull(line.lineId) ?? `home-${i}`,
        medicationName: name,
        dose: trimOrNull(line.dose),
        strength: trimOrNull(line.strength),
        route: trimOrNull(line.route),
        frequency: trimOrNull(line.frequency),
        source: "HOME_MEDICATION",
        regimen,
      });
    });
  }

  const home = input.patientHomeMedications;
  if (home) {
    const selections = Array.isArray(home.medicationSummarySelections)
      ? home.medicationSummarySelections
      : [];
    selections.forEach((raw, i) => {
      const label = trimOrNull(raw);
      if (!label) return;
      push({
        id: `prior-sel-${i}`,
        medicationName: label,
        source: "PRIOR_HISTORY",
        regimen: label,
      });
    });
    const summary = trimOrNull(home.medicationsSummary);
    if (summary && selections.length === 0) {
      summary
        .split(/[\n;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((label, i) => {
          push({
            id: `prior-sum-${i}`,
            medicationName: label,
            source: "PRIOR_HISTORY",
            regimen: label,
          });
        });
    }
  }

  return out;
}

function collectProviderSeeds(
  meds: InpatientDischargeMedicationLine1C[] | null | undefined
): InpatientDischargeMedicationLine1C[] {
  if (!Array.isArray(meds)) return [];
  return meds.filter((m) => Boolean(trimOrNull(m.displayName)));
}

function providerRegimen(m: InpatientDischargeMedicationLine1C): string {
  return (
    formatRegimen({
      dose: m.dose,
      unit: m.unit,
      route: m.route,
      frequency: m.frequency,
    }) ?? trimOrNull(m.displayName) ??
    ""
  );
}

/**
 * Pair home/prior meds with provider discharge plan into one-click workspace rows.
 */
export function buildPairedInpatientDischargeMedReconLines(input: {
  admissionHomeMedicationLines?: HomeMedicationReconciliationLineV1[] | null;
  patientHomeMedications?: PatientClinicalHistoryHomeMedications | null;
  providerDischargeMedications?: InpatientDischargeMedicationLine1C[] | null;
  clinicalOpsLines?: Array<{
    lineId: string;
    sourceLabel: string;
    decision: MedReconDecision;
    reason?: string | null;
  }> | null;
}): InpatientDischargeMedReconLineV1[] {
  const homes = collectHomeSeeds(input);
  const providers = collectProviderSeeds(input.providerDischargeMedications);
  const usedProvider = new Set<string>();
  const lines: InpatientDischargeMedReconLineV1[] = [];

  const findProvider = (homeName: string): InpatientDischargeMedicationLine1C | null => {
    const key = medicationBaseMatchKey(homeName);
    for (const p of providers) {
      const pid = p.id;
      if (usedProvider.has(pid)) continue;
      if (medicationBaseMatchKey(p.displayName) === key) {
        usedProvider.add(pid);
        return p;
      }
    }
    return null;
  };

  for (const home of homes) {
    const prov = findProvider(home.medicationName);
    if (!prov) {
      lines.push({
        id: `pair-home-${home.id}`,
        sourceLabel: buildSourceLabel([home.medicationName, home.regimen]),
        medicationName: home.medicationName,
        dose: home.dose,
        unit: home.unit,
        route: home.route,
        frequency: home.frequency,
        strength: home.strength,
        source: home.source,
        rowKind: "HOME_ONLY",
        homeRegimen: home.regimen,
        dischargeRegimen: null,
        providerPlanRelationship: null,
        providerPlanSummary: null,
        decision: "UNABLE_TO_VERIFY",
        reason: null,
      });
      continue;
    }

    const rel = (trimOrNull(prov.relationship)?.toUpperCase() ??
      "CONTINUE") as InpatientDischargeMedRelationship;
    const dReg = providerRegimen(prov);
    let rowKind: InpatientDischargeMedReconRowKind = "PROVIDER_CONTINUE";
    if (rel === "CHANGE") rowKind = "PROVIDER_CHANGED";
    else if (rel === "STOP") rowKind = "PROVIDER_STOP";
    else if (rel === "NEW") rowKind = "PROVIDER_NEW";
    else rowKind = "PROVIDER_CONTINUE";

    lines.push({
      id: `pair-${home.id}-${prov.id}`,
      sourceLabel: buildSourceLabel([home.medicationName, home.regimen, dReg]),
      medicationName: trimOrNull(prov.displayName) ?? home.medicationName,
      dose: trimOrNull(prov.dose) ?? home.dose,
      unit: trimOrNull(prov.unit) ?? home.unit,
      route: trimOrNull(prov.route) ?? home.route,
      frequency: trimOrNull(prov.frequency) ?? home.frequency,
      instructions: trimOrNull(prov.instructions),
      catalogMedicationId: trimOrNull(prov.catalogMedicationId),
      source: "PROVIDER_DISCHARGE_PLAN",
      rowKind,
      homeRegimen: home.regimen,
      dischargeRegimen: dReg || null,
      providerPlanRelationship: rel,
      providerPlanSummary: dReg || null,
      decision: "UNABLE_TO_VERIFY",
      reason: null,
    });
  }

  for (const prov of providers) {
    if (usedProvider.has(prov.id)) continue;
    const rel = (trimOrNull(prov.relationship)?.toUpperCase() ?? "NEW") as string;
    const name = trimOrNull(prov.displayName)!;
    const dReg = providerRegimen(prov);
    const rowKind: InpatientDischargeMedReconRowKind =
      rel === "STOP" ? "PROVIDER_STOP" : rel === "CHANGE" ? "PROVIDER_CHANGED" : "PROVIDER_NEW";
    lines.push({
      id: `pair-new-${prov.id}`,
      sourceLabel: buildSourceLabel([name, dReg]),
      medicationName: name,
      dose: trimOrNull(prov.dose),
      unit: trimOrNull(prov.unit),
      route: trimOrNull(prov.route),
      frequency: trimOrNull(prov.frequency),
      instructions: trimOrNull(prov.instructions),
      catalogMedicationId: trimOrNull(prov.catalogMedicationId),
      source: "PROVIDER_DISCHARGE_PLAN",
      rowKind,
      homeRegimen: null,
      dischargeRegimen: dReg || null,
      providerPlanRelationship: rel,
      providerPlanSummary: dReg || null,
      decision: "UNABLE_TO_VERIFY",
      reason: null,
    });
  }

  if (lines.length === 0 && Array.isArray(input.clinicalOpsLines)) {
    for (const l of input.clinicalOpsLines) {
      lines.push({
        id: l.lineId,
        sourceLabel: l.sourceLabel,
        medicationName: l.sourceLabel,
        source: "CLINICAL_OPS",
        rowKind: "HOME_ONLY",
        decision: validateMedReconDecision(l.decision) ? l.decision : "UNABLE_TO_VERIFY",
        reason: l.reason ?? null,
      });
    }
  }

  return lines;
}

export type BuildInpatientDischargeMedReconPreloadInput = {
  /** Saved dischargeSummaryJson.inpatientMedRecon.lines — wins when present. */
  existingDischargeReconLines?: unknown[] | null;
  clinicalOpsLines?: Array<{
    lineId: string;
    sourceLabel: string;
    decision: MedReconDecision;
    reason?: string | null;
  }> | null;
  admissionHomeMedicationLines?: HomeMedicationReconciliationLineV1[] | null;
  patientHomeMedications?: PatientClinicalHistoryHomeMedications | null;
  providerDischargeMedications?: InpatientDischargeMedicationLine1C[] | null;
  /** Optional inpatient order labels — NEVER treated as home medications. */
  inpatientOrderLabels?: string[] | null;
  /** True when a required history fetch failed (not merely empty). */
  historyLoadFailed?: boolean;
};

export type BuildInpatientDischargeMedReconPreloadResult = {
  lines: InpatientDischargeMedReconLineV1[];
  historyState: InpatientDischargeMedReconHistoryState;
  usedExistingDischargeRecon: boolean;
};

/**
 * Build discharge med-recon workspace lines from authoritative Medora sources.
 * Existing saved discharge recon lines take precedence (preserve nurse decisions).
 */
export function buildInpatientDischargeMedReconPreload(
  input: BuildInpatientDischargeMedReconPreloadInput
): BuildInpatientDischargeMedReconPreloadResult {
  const existingRaw = Array.isArray(input.existingDischargeReconLines)
    ? input.existingDischargeReconLines
    : [];
  const existing = existingRaw
    .map(hydrateInpatientDischargeMedReconLine)
    .filter((x): x is InpatientDischargeMedReconLineV1 => Boolean(x));

  if (existing.length > 0) {
    return {
      lines: existing,
      historyState: "LOADED_WITH_MEDICATIONS",
      usedExistingDischargeRecon: true,
    };
  }

  if (input.historyLoadFailed === true) {
    const partial = buildPairedInpatientDischargeMedReconLines({
      clinicalOpsLines: input.clinicalOpsLines,
      providerDischargeMedications: input.providerDischargeMedications,
    });
    return {
      lines: partial,
      historyState:
        partial.length > 0 ? "LOADED_WITH_MEDICATIONS" : "MEDICATION_HISTORY_UNAVAILABLE",
      usedExistingDischargeRecon: false,
    };
  }

  const paired = buildPairedInpatientDischargeMedReconLines({
    admissionHomeMedicationLines: input.admissionHomeMedicationLines,
    patientHomeMedications: input.patientHomeMedications,
    providerDischargeMedications: input.providerDischargeMedications,
    clinicalOpsLines: input.clinicalOpsLines,
  });

  // Optional inpatient order context — never as home meds; only if unmatched label.
  if (Array.isArray(input.inpatientOrderLabels) && input.inpatientOrderLabels.length) {
    const seen = new Set(paired.map((l) => medicationBaseMatchKey(l.medicationName)));
    input.inpatientOrderLabels.forEach((raw, i) => {
      const name = trimOrNull(raw);
      if (!name) return;
      const key = medicationBaseMatchKey(name);
      if (!key || seen.has(key)) return;
      seen.add(key);
      paired.push({
        id: `inp-ord-${i}-${key.slice(0, 24)}`,
        sourceLabel: name,
        medicationName: name,
        source: "INPATIENT_ORDER",
        rowKind: "HOME_ONLY",
        decision: "UNABLE_TO_VERIFY",
        reason: null,
      });
    });
  }

  return {
    lines: paired,
    historyState: paired.length > 0 ? "LOADED_WITH_MEDICATIONS" : "NO_DOCUMENTED_MEDICATIONS",
    usedExistingDischargeRecon: false,
  };
}

/**
 * Project finalized recon lines into longitudinal home-medications summary text
 * (existing PatientClinicalHistoryHomeMedications — no new table).
 */
export function projectPostDischargeHomeMedicationsFromRecon(
  lines: InpatientDischargeMedReconLineV1[]
): PatientClinicalHistoryHomeMedications {
  const selections: string[] = [];
  for (const line of lines) {
    if (
      line.decision === "DISCONTINUE" ||
      line.decision === "NOT_TAKING" ||
      line.decision === "HOLD"
    ) {
      continue;
    }
    if (line.decision === "UNABLE_TO_VERIFY") continue;
    const regimen =
      line.decision === "MODIFY" || line.decision === "REPLACE" || line.rowKind === "PROVIDER_NEW"
        ? line.dischargeRegimen ||
          formatRegimen({
            dose: line.dose,
            unit: line.unit,
            route: line.route,
            frequency: line.frequency,
          })
        : line.dischargeRegimen ||
          line.homeRegimen ||
          formatRegimen({
            dose: line.dose,
            unit: line.unit,
            route: line.route,
            frequency: line.frequency,
          });
    const label = [line.medicationName, regimen].filter(Boolean).join(" — ");
    if (label.trim()) selections.push(label.trim());
  }
  return {
    medicationsSummary: selections.join("\n"),
    medicationSummarySelections: selections,
  };
}

/** Printable fields for one provider discharge medication (non-empty only). */
export type InpatientDischargeMedicationPrintFact = {
  displayName: string;
  dose?: string | null;
  unit?: string | null;
  route?: string | null;
  frequency?: string | null;
  duration?: string | null;
  quantity?: string | null;
  refills?: number | null;
  instructions?: string | null;
  relationship?: string | null;
};

export function collectInpatientDischargeMedicationPrintFacts(
  medications: InpatientDischargeMedicationLine1C[] | null | undefined
): InpatientDischargeMedicationPrintFact[] {
  if (!Array.isArray(medications)) return [];
  const out: InpatientDischargeMedicationPrintFact[] = [];
  for (const m of medications) {
    const displayName = trimOrNull(m.displayName);
    if (!displayName) continue;
    out.push({
      displayName,
      dose: trimOrNull(m.dose),
      unit: trimOrNull(m.unit),
      route: trimOrNull(m.route),
      frequency: trimOrNull(m.frequency),
      duration: trimOrNull(m.duration),
      quantity: trimOrNull(m.quantity),
      refills:
        typeof m.refills === "number" && Number.isFinite(m.refills) ? m.refills : null,
      instructions: trimOrNull(m.instructions),
      relationship: trimOrNull(m.relationship)?.toUpperCase() ?? null,
    });
  }
  return out;
}

/** Single human-readable line for print (no empty segments). */
export function formatInpatientDischargeMedicationPrintLine(
  fact: InpatientDischargeMedicationPrintFact
): string {
  const bits: string[] = [fact.displayName];
  const dose = [fact.dose, fact.unit].filter(Boolean).join(" ").trim();
  if (dose) bits.push(dose);
  if (fact.route) bits.push(fact.route);
  if (fact.frequency) bits.push(fact.frequency);
  if (fact.duration) bits.push(fact.duration);
  if (fact.quantity) bits.push(`qty ${fact.quantity}`);
  if (fact.refills != null) bits.push(`refills ${fact.refills}`);
  if (fact.instructions) bits.push(fact.instructions);
  return bits.join(" · ");
}
