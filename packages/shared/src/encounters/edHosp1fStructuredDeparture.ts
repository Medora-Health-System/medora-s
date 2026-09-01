/**
 * ED.HOSP.1F — Structured observation/admission nursing departure codes.
 * Persists into existing erAdaptiveNursingExecutionV1.sections strings.
 * No parallel store. No Prisma migration.
 */

import { ENCOUNTER_BED_UNIT_CODES, normalizeBedUnitCode } from "./facilityBedGovernance.js";
import { DEFAULT_FACILITY_CLINICAL_UNIT_DEFINITIONS } from "./hospitalUnitRegistryV1.js";
import { OXYGEN_DELIVERY_DEVICES, type OxygenDeliveryDevice } from "../vitalsMeasurementContext.js";
import { BELONGINGS_STORAGE_LOCATION_VALUES } from "../clinicalDocumentation/belongingsValuablesDocumentationPayloads.js";
import type { AdaptiveNursingSectionValues } from "./adaptiveEdNursingExecutionD4a2.js";

export const ED_HOSP_1F_STRUCTURED_DEPARTURE = "ED.HOSP.1F" as const;

export const ED_HOSP_1F_OBSERVATION_UNIT_CODES = ["OBS"] as const;

export const ED_HOSP_1F_UNIT_PENDING = "UNIT_PENDING" as const;

export type EdHosp1fStructuredNursingPathway = "ADMISSION" | "OBSERVATION";

export const ED_HOSP_1F_TRANSPORT_CODES = [
  "AMBULATORY",
  "WHEELCHAIR",
  "STRETCHER",
  "BED",
  "EMS",
] as const;

export const ED_HOSP_1F_CONDITION_CODES = [
  "STABLE",
  "IMPROVED",
  "UNCHANGED",
  "CRITICAL",
] as const;

export const ED_HOSP_1F_BELONGINGS_CODES = [
  "WITH_PATIENT",
  "TRANSFER_STAFF",
  "FAMILY",
  "SECURITY",
  "NONE_DOCUMENTED",
] as const;

export const ED_HOSP_1F_IV_CODES = [
  "NO_ACCESS",
  "PERIPHERAL",
  "CENTRAL",
  "PICC",
  "PORT",
  "IO",
] as const;

export const ED_HOSP_1F_ORDER_ACK_CODES = [
  "ORDERS_REVIEWED",
  "PENDING_IDENTIFIED",
  "NO_OUTSTANDING",
] as const;

export const ED_HOSP_1F_INFUSION_CODES = [
  "NONE",
  "CONTINUING",
  "STOPPED_BEFORE_DEPARTURE",
] as const;

export const ED_HOSP_1F_HANDOFF_CODES = ["HANDOFF_REVIEWED"] as const;

export const ED_HOSP_1F_FALL_CODES = [
  "NOT_ASSESSED",
  "LOW",
  "MODERATE",
  "HIGH",
  "EXISTING_REVIEWED",
] as const;

export const ED_HOSP_1F_SKIN_CODES = ["NO_DOCUMENTED_CONCERN", "EXISTING_REVIEWED"] as const;

export const ED_HOSP_1F_BED_PENDING = "BED_PENDING" as const;

export const ED_HOSP_1F_READINESS_GROUPS = [
  { id: "destination", fieldIds: ["receivingUnit", "assignedBed"] },
  { id: "handoff", fieldIds: ["handoff", "receivingNurse"] },
  { id: "linesOxygen", fieldIds: ["ivAccess", "oxygen", "infusions"] },
  { id: "orders", fieldIds: ["admissionOrderAck"] },
  { id: "safety", fieldIds: ["fallRisk", "skinWounds"] },
  { id: "belongings", fieldIds: ["belongingsValuables"] },
  { id: "transport", fieldIds: ["transportMethod", "conditionLeavingEd"] },
  { id: "departure", fieldIds: ["edDepartureAt"] },
] as const;

export type EdHosp1fReadinessGroupId = (typeof ED_HOSP_1F_READINESS_GROUPS)[number]["id"];

export type EdHosp1fIvLine = {
  site?: string | null;
  gauge?: string | null;
  kind?: string | null;
};

export type EdHosp1fOrderLite = {
  category?: string | null;
  status?: string | null;
  displayName?: string | null;
  isInfusion?: boolean;
};

export type EdHosp1fChartContext = {
  assignedUnitCode?: string | null;
  assignedBedKey?: string | null;
  assignedRoomKey?: string | null;
  requestedService?: string | null;
  requestedLevelOfCare?: string | null;
  nurseAssignedDisplay?: string | null;
  nurseAssignedUserId?: string | null;
  sessionUserId?: string | null;
  sessionNurseDisplay?: string | null;
  patientDisplay?: string | null;
  mrn?: string | null;
  chiefComplaint?: string | null;
  diagnosis?: string | null;
  allergies?: string[];
  codeStatus?: string | null;
  vitalsSummary?: string | null;
  oxygenDevice?: string | null;
  ivLines?: EdHosp1fIvLine[];
  orders?: EdHosp1fOrderLite[];
  acceptingProvider?: string | null;
  isolationRequired?: boolean;
  directoryAvailable?: boolean;
};

export function isEdHosp1fObservationUnitCode(code: string | null | undefined): boolean {
  const n = String(code ?? "").trim().toUpperCase();
  return n === "OBS" || n === "OBSERVATION";
}

export function isEdHosp1fUnitPending(code: string | null | undefined): boolean {
  return String(code ?? "").trim().toUpperCase() === ED_HOSP_1F_UNIT_PENDING;
}

/**
 * Production-visible receiving units from the existing hospital unit registry.
 * Development-only fixtures (PCU/PEDS/SURG/LD) are excluded unless already assigned.
 * Does not invent Telemetry / Step-down bed units — those are level-of-care, not bed codes.
 */
export function canonicalReceivingUnitDefinitions(includeDevelopmentFixtures = false) {
  return DEFAULT_FACILITY_CLINICAL_UNIT_DEFINITIONS.filter(
    (d) => includeDevelopmentFixtures || !d.developmentOnly
  );
}

export function receivingUnitOptionsForPathway(input: {
  pathway: EdHosp1fStructuredNursingPathway;
  assignedUnitCode?: string | null;
  availableUnitCodes?: readonly string[] | null;
}): string[] {
  const assigned = String(input.assignedUnitCode ?? "").trim().toUpperCase();
  const defs = canonicalReceivingUnitDefinitions(false);
  const pathwayCodes = defs
    .filter((d) =>
      input.pathway === "OBSERVATION" ? d.acceptsObservation : d.acceptsInpatient
    )
    .map((d) => d.code);
  const allowed =
    input.availableUnitCodes == null
      ? new Set(pathwayCodes)
      : new Set(
          [...input.availableUnitCodes.map((c) => String(c).trim().toUpperCase())].filter(Boolean)
        );
  const out: string[] = [];
  for (const code of pathwayCodes) {
    if (allowed.has(code) && !out.includes(code)) out.push(code);
  }
  if (assigned && !out.includes(assigned)) {
    const known =
      defs.some((d) => d.code === assigned) ||
      (ENCOUNTER_BED_UNIT_CODES as readonly string[]).includes(assigned) ||
      Boolean(normalizeBedUnitCode(assigned));
    if (known || assigned) out.unshift(assigned);
  }
  return out;
}

export function observationReceivingUnitOptions(assignedUnitCode?: string | null): string[] {
  return receivingUnitOptionsForPathway({
    pathway: "OBSERVATION",
    assignedUnitCode,
  });
}

export function admissionReceivingUnitOptions(assignedUnitCode?: string | null): string[] {
  return receivingUnitOptionsForPathway({
    pathway: "ADMISSION",
    assignedUnitCode,
  });
}

export function encodeIvAccessValue(code: string, line?: EdHosp1fIvLine | null): string {
  const base = String(code ?? "").trim().toUpperCase();
  if (!base) return "";
  const site = String(line?.site ?? "").trim();
  const gauge = String(line?.gauge ?? "").trim();
  if (!site && !gauge) return base;
  return [base, site ? `site:${site}` : "", gauge ? `gauge:${gauge}` : ""].filter(Boolean).join("|");
}

export function decodeIvAccessCode(raw: string | null | undefined): string {
  const head = String(raw ?? "").split("|")[0]?.trim().toUpperCase() ?? "";
  return head;
}

export function hydrateIvAccessFromChart(lines: EdHosp1fIvLine[] | undefined): string {
  const active = (lines ?? []).filter((l) => String(l.site ?? "").trim() || String(l.gauge ?? "").trim() || String(l.kind ?? "").trim());
  if (active.length === 0) return encodeIvAccessValue("NO_ACCESS");
  const first = active[0];
  const kind = String(first.kind ?? "PERIPHERAL").trim().toUpperCase();
  const code = (ED_HOSP_1F_IV_CODES as readonly string[]).includes(kind) ? kind : "PERIPHERAL";
  return encodeIvAccessValue(code, first);
}

export function hydrateOxygenFromChart(device: string | null | undefined): string {
  const n = String(device ?? "").trim().toUpperCase();
  if ((OXYGEN_DELIVERY_DEVICES as readonly string[]).includes(n)) return n;
  return "";
}

export function hydrateBedFromPlacement(assignedBedKey?: string | null, assignedRoomKey?: string | null): string {
  const bed = String(assignedBedKey ?? "").trim();
  if (bed) return bed;
  const room = String(assignedRoomKey ?? "").trim();
  if (room) return room;
  return ED_HOSP_1F_BED_PENDING;
}

export function hydrateReceivingUnitFromPlacement(
  assignedUnitCode?: string | null,
  pathway: EdHosp1fStructuredNursingPathway = "OBSERVATION"
): string {
  const unit = String(assignedUnitCode ?? "").trim().toUpperCase();
  if (unit) return unit;
  if (pathway === "ADMISSION") return ED_HOSP_1F_UNIT_PENDING;
  return "OBS";
}

export function deriveOrderAckFromOrders(orders: EdHosp1fOrderLite[] | undefined): string {
  const rows = orders ?? [];
  if (rows.length === 0) return "NO_OUTSTANDING";
  const pending = rows.some((o) => {
    const st = String(o.status ?? "").toUpperCase();
    return st === "PLACED" || st === "ACTIVE" || st === "PENDING" || st === "";
  });
  return pending ? "PENDING_IDENTIFIED" : "NO_OUTSTANDING";
}

export function deriveInfusionPresence(orders: EdHosp1fOrderLite[] | undefined): boolean {
  return (orders ?? []).some((o) => o.isInfusion === true);
}

export function encodeReceivingNurse(input: {
  userId?: string | null;
  displayName?: string | null;
  source: "SESSION" | "ASSIGNED";
}): string {
  const id = String(input.userId ?? "").trim();
  const name = String(input.displayName ?? "").trim();
  if (!id && !name) return "";
  return `${input.source}:${id}:${name}`;
}

export function isStructuredReceivingNurseValue(raw: string | null | undefined): boolean {
  const v = String(raw ?? "").trim();
  return v.startsWith("SESSION:") || v.startsWith("ASSIGNED:");
}

export function isIsoTimestamp(raw: string | null | undefined): boolean {
  const s = String(raw ?? "").trim();
  if (!s) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

export function isStructuredObservationNursingValue(
  fieldId: string,
  value: string | null | undefined
): boolean {
  const v = String(value ?? "").trim();
  if (!v) return false;
  switch (fieldId) {
    case "receivingUnit":
      if (v === ED_HOSP_1F_UNIT_PENDING) return true;
      return v === v.toUpperCase() && v.length <= 24 && !/\s{2,}/.test(v);
    case "assignedBed":
      return v === ED_HOSP_1F_BED_PENDING || v.length > 0;
    case "receivingNurse":
      return isStructuredReceivingNurseValue(v);
    case "handoff":
      return (ED_HOSP_1F_HANDOFF_CODES as readonly string[]).includes(v);
    case "admissionOrderAck":
      return (ED_HOSP_1F_ORDER_ACK_CODES as readonly string[]).includes(v);
    case "ivAccess":
      return (ED_HOSP_1F_IV_CODES as readonly string[]).includes(decodeIvAccessCode(v));
    case "oxygen":
      return (OXYGEN_DELIVERY_DEVICES as readonly string[]).includes(v as OxygenDeliveryDevice);
    case "infusions":
      return (ED_HOSP_1F_INFUSION_CODES as readonly string[]).includes(v);
    case "fallRisk":
      return (ED_HOSP_1F_FALL_CODES as readonly string[]).includes(v);
    case "skinWounds":
      return (ED_HOSP_1F_SKIN_CODES as readonly string[]).includes(v);
    case "belongingsValuables":
      return (
        (ED_HOSP_1F_BELONGINGS_CODES as readonly string[]).includes(v) ||
        (BELONGINGS_STORAGE_LOCATION_VALUES as readonly string[]).includes(
          v as (typeof BELONGINGS_STORAGE_LOCATION_VALUES)[number]
        )
      );
    case "transportMethod":
      return (ED_HOSP_1F_TRANSPORT_CODES as readonly string[]).includes(v);
    case "conditionLeavingEd":
      return (ED_HOSP_1F_CONDITION_CODES as readonly string[]).includes(v);
    case "edDepartureAt":
      return isIsoTimestamp(v);
    default:
      return v.length > 0;
  }
}

export type EdHosp1fReadinessChip = {
  groupId: EdHosp1fReadinessGroupId;
  ready: boolean;
};

export function projectNursingDepartureReadiness(input: {
  sections: AdaptiveNursingSectionValues;
  requiredFieldIds: readonly string[];
}): EdHosp1fReadinessChip[] {
  const filled = (id: string) => {
    const v = input.sections[id];
    if (typeof v === "boolean") return v;
    const s = String(v ?? "").trim();
    if (id === "receivingUnit" && s === ED_HOSP_1F_UNIT_PENDING) return false;
    return s.length > 0;
  };
  return ED_HOSP_1F_READINESS_GROUPS.map((group) => {
    const needed = group.fieldIds.filter((id) => input.requiredFieldIds.includes(id));
    const ids = needed.length > 0 ? needed : [...group.fieldIds];
    return {
      groupId: group.id,
      ready: ids.every((id) => filled(id)),
    };
  });
}

export function hydrateObservationNursingDefaults(input: {
  sections: AdaptiveNursingSectionValues;
  chart: EdHosp1fChartContext;
  pathway?: EdHosp1fStructuredNursingPathway;
}): AdaptiveNursingSectionValues {
  const next = { ...input.sections };
  const pathway = input.pathway ?? "OBSERVATION";
  const assigned = String(input.chart.assignedUnitCode ?? "").trim().toUpperCase();
  const currentUnit = String(next.receivingUnit ?? "").trim().toUpperCase();
  if (assigned) {
    next.receivingUnit = assigned;
  } else if (pathway === "ADMISSION") {
    if (!currentUnit || currentUnit === "OBS") {
      next.receivingUnit = ED_HOSP_1F_UNIT_PENDING;
    }
  } else if (!currentUnit) {
    next.receivingUnit = hydrateReceivingUnitFromPlacement(null, "OBSERVATION");
  }
  if (!String(next.assignedBed ?? "").trim()) {
    next.assignedBed = hydrateBedFromPlacement(input.chart.assignedBedKey, input.chart.assignedRoomKey);
  }
  if (!String(next.ivAccess ?? "").trim()) {
    next.ivAccess = hydrateIvAccessFromChart(input.chart.ivLines);
  }
  if (!String(next.oxygen ?? "").trim()) {
    const o2 = hydrateOxygenFromChart(input.chart.oxygenDevice);
    if (o2) next.oxygen = o2;
  }
  return next;
}

/** US EMTALA attestations may persist only for US facilities, and only from evidence. */
export type EdHosp1fEmtalaAttestationDerivation = {
  msePerformed: true | null;
  emergencyConditionConsidered: null;
  stabilizingTreatmentProvidedOrNotApplicable: null;
  mseStructuredGap: boolean;
  emcStructuredGap: boolean;
  stabilizingStructuredGap: boolean;
};

export function deriveEmtalaAttestationsFromEvidence(input: {
  mseDocumentedAt?: string | null;
  unitedStatesJurisdiction: boolean;
}): EdHosp1fEmtalaAttestationDerivation {
  if (!input.unitedStatesJurisdiction) {
    return {
      msePerformed: null,
      emergencyConditionConsidered: null,
      stabilizingTreatmentProvidedOrNotApplicable: null,
      mseStructuredGap: false,
      emcStructuredGap: true,
      stabilizingStructuredGap: true,
    };
  }
  const mseAt = String(input.mseDocumentedAt ?? "").trim();
  const mseYes = Boolean(mseAt);
  return {
    msePerformed: mseYes ? true : null,
    emergencyConditionConsidered: null,
    stabilizingTreatmentProvidedOrNotApplicable: null,
    mseStructuredGap: !mseYes,
    emcStructuredGap: true,
    stabilizingStructuredGap: true,
  };
}

export const UNITED_STATES_EMTALA_JURISDICTION_TOKENS = [
  "US",
  "USA",
  "UNITED STATES",
  "UNITED STATES OF AMERICA",
] as const;

export function isUnitedStatesEmtalaJurisdiction(
  facilityCountry: string | null | undefined
): boolean {
  const n = String(facilityCountry ?? "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "");
  if (!n) return false;
  return (UNITED_STATES_EMTALA_JURISDICTION_TOKENS as readonly string[]).includes(n);
}

export const SMART_ADMISSION_PROPOSAL_PREFIXES = {
  en: {
    chiefComplaint: "Chief complaint",
    admissionDiagnosis: "Admission diagnosis",
    abnormalResult: "Documented abnormal result",
    failedEdTherapy: "Insufficient ED therapy",
    continuedTreatment: "Continued treatment need",
    monitoring: "Monitoring required",
    consultRec: "Consultant recommendation",
    providerAssessment: "Provider assessment",
  },
  fr: {
    chiefComplaint: "Motif de consultation",
    admissionDiagnosis: "Diagnostic d'admission",
    abnormalResult: "Résultat anormal documenté",
    failedEdTherapy: "Thérapie urgences insuffisante",
    continuedTreatment: "Besoin de poursuite du traitement",
    monitoring: "Surveillance requise",
    consultRec: "Recommandation de consultation",
    providerAssessment: "Évaluation médecin",
  },
} as const;

export type SmartAdmissionProposalLocale = "en" | "fr";
