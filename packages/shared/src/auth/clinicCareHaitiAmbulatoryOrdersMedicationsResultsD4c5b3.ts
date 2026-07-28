/**
 * MEDUI.D4C.5B.3 — Haiti ambulatory evaluation simplification, medication/MAR
 * reconciliation, Rx separation, and diagnostic order completion helpers.
 *
 * Presentation / classification / localization only.
 * Jurisdiction = Facility.country via isHaitiPublicHealthJurisdiction — never UI locale.
 * Canonical Rx vs onsite discriminator = OrderItem.medicationFulfillmentIntent
 * (ADMINISTER_CHART | PHARMACY_DISPENSE). No ClinicMAR / ClinicPrescription / ClinicLabResult.
 */

import { isHaitiPublicHealthJurisdiction } from "./facilityClinicCareProfileD4c1.js";
import { isHaitiAmbulatoryWorkspaceContext } from "./clinicCareHaitiAmbulatoryWorkspaceD4c5b2.js";

export const CLINIC_CARE_HAITI_AMBULATORY_ORDERS_MEDS_RESULTS_CERTIFICATION_ID =
  "MEDUI.D4C.5B.3" as const;

/** Care setting token for ambulatory Clinic intake (presentation). */
export const D4C5B3_AMBULATORY_CARE_SETTING = "AMBULATORY" as const;

/** Jurisdiction token when Facility.country is Haiti. */
export const D4C5B3_HAITI_JURISDICTION = "HAITI" as const;

/**
 * Lightweight Clinic intake presentation — hides ED triage chrome.
 * Does not delete EmergencyTriagePanel; presentationMode only.
 */
export const D4C5B3_SIMPLE_CLINIC_INTAKE_PRESENTATION = "SIMPLE_CLINIC_INTAKE" as const;

export type D4c5b3AmbulatoryIntakePresentation = {
  careSetting: typeof D4C5B3_AMBULATORY_CARE_SETTING;
  jurisdiction: typeof D4C5B3_HAITI_JURISDICTION | "OTHER";
  presentationMode: typeof D4C5B3_SIMPLE_CLINIC_INTAKE_PRESENTATION | "FULL_ED_TRIAGE";
};

/** Resolve typed presentation for ambulatory intake mounts. */
export function resolveHaitiAmbulatoryIntakePresentation(input: {
  facilityCountry?: string | null;
  ambulatoryCareSetting: boolean;
}): D4c5b3AmbulatoryIntakePresentation {
  const haiti = isHaitiPublicHealthJurisdiction(input.facilityCountry ?? null);
  const ambulatory = input.ambulatoryCareSetting === true;
  if (haiti && ambulatory) {
    return {
      careSetting: D4C5B3_AMBULATORY_CARE_SETTING,
      jurisdiction: D4C5B3_HAITI_JURISDICTION,
      presentationMode: D4C5B3_SIMPLE_CLINIC_INTAKE_PRESENTATION,
    };
  }
  return {
    careSetting: D4C5B3_AMBULATORY_CARE_SETTING,
    jurisdiction: "OTHER",
    presentationMode: "FULL_ED_TRIAGE",
  };
}

export function isSimpleClinicIntakePresentation(
  presentation: D4c5b3AmbulatoryIntakePresentation | string | null | undefined
): boolean {
  if (presentation == null) return false;
  if (typeof presentation === "string") {
    return presentation === D4C5B3_SIMPLE_CLINIC_INTAKE_PRESENTATION;
  }
  return presentation.presentationMode === D4C5B3_SIMPLE_CLINIC_INTAKE_PRESENTATION;
}

/** ED fields hidden for Haiti ambulatory SIMPLE_CLINIC_INTAKE (display only). */
export const D4C5B3_SIMPLE_CLINIC_INTAKE_HIDDEN_FIELD_KEYS = [
  "esi",
  "trauma",
  "traumaActivation",
  "sepsis",
  "sepsisScreen",
  "stroke",
  "strokeScreen",
  "avc",
  "safetyRouting",
  "travel",
  "preferredPharmacy",
  "emergencyTriageUrgency",
  "rapidTriage",
] as const;

export function shouldHideEdTriageChromeForHaitiAmbulatory(input: {
  facilityCountry?: string | null;
  ambulatoryCareSetting: boolean;
}): boolean {
  return isSimpleClinicIntakePresentation(resolveHaitiAmbulatoryIntakePresentation(input));
}

/** Intake title i18n key for Haiti simple clinic intake. */
export function haitiAmbulatoryIntakeTitleKey(): string {
  return "clinicCareD4c5b3.intake.title";
}

export function haitiAmbulatoryIntakeSubtitleKey(): string {
  return "clinicCareD4c5b3.intake.subtitle";
}

/**
 * Canonical medication fulfillment intents (Prisma MedicationFulfillmentIntent).
 * Do not invent Clinic-only fields.
 */
export const D4C5B3_MEDICATION_FULFILLMENT_INTENTS = [
  "ADMINISTER_CHART",
  "PHARMACY_DISPENSE",
] as const;

export type D4c5b3MedicationFulfillmentIntent =
  (typeof D4C5B3_MEDICATION_FULFILLMENT_INTENTS)[number];

/** True when line is facility-administered → enterprise MAR. */
export function isOnsiteAdministerMedicationIntent(
  intent: string | null | undefined
): boolean {
  const s = String(intent ?? "")
    .trim()
    .toUpperCase();
  // Legacy empty intent treated as chart-admin (enterprise MAR default).
  return s === "" || s === "ADMINISTER_CHART";
}

/** True when line is take-home / external pharmacy prescription. */
export function isExternalPharmacyDispenseIntent(
  intent: string | null | undefined
): boolean {
  return (
    String(intent ?? "")
      .trim()
      .toUpperCase() === "PHARMACY_DISPENSE"
  );
}

export type D4c5b3OrderItemLike = {
  catalogItemType?: string | null;
  medicationFulfillmentIntent?: string | null;
  route?: string | null;
  status?: string | null;
  freeText?: string | null;
  displayLabel?: string | null;
  catalogItem?: { type?: string | null; category?: string | null; name?: string | null } | null;
  catalogMedication?: { route?: string | null; dosageForm?: string | null } | null;
};

function itemCatalogType(it: D4c5b3OrderItemLike): string {
  return String(it.catalogItemType ?? it.catalogItem?.type ?? "")
    .trim()
    .toUpperCase();
}

/** Lab / imaging / care protocol lines never belong on the Rx tile. */
export function isNonPrescriptionClinicalOrderItem(it: D4c5b3OrderItemLike): boolean {
  const t = itemCatalogType(it);
  if (
    t === "LAB_TEST" ||
    t === "LAB" ||
    t === "IMAGING_STUDY" ||
    t === "IMAGING" ||
    t === "CARE" ||
    t === "PROCEDURE" ||
    t === "PROTOCOL"
  ) {
    return true;
  }
  return false;
}

/**
 * Rx tile eligibility: MEDICATION + PHARMACY_DISPENSE only.
 * Excludes lab/imaging/protocols/procedures/onsite ADMINISTER_CHART / IV/infusion
 * (defense-in-depth even if a line is mis-tagged PHARMACY_DISPENSE — D4C.7E).
 */
export function isAmbulatoryExternalPrescriptionItem(it: D4c5b3OrderItemLike): boolean {
  if (isNonPrescriptionClinicalOrderItem(it)) return false;
  if (itemCatalogType(it) !== "MEDICATION" && itemCatalogType(it) !== "") return false;
  if (!isExternalPharmacyDispenseIntent(it.medicationFulfillmentIntent)) return false;
  const route = it.route ?? it.catalogMedication?.route;
  if (isIvOrInfusionRoute(route)) return false;
  return true;
}

/** IV / infusion routes that must stay Orders + MAR, never paper Rx. */
const IV_ROUTE_TOKENS = new Set([
  "IV",
  "IVP",
  "IVPB",
  "IV PUSH",
  "INTRAVENOUS",
  "INTRAVEINEUX",
  "INTRAVEINEUSE",
]);

export function isIvOrInfusionRoute(route: string | null | undefined): boolean {
  const r = String(route ?? "")
    .trim()
    .toUpperCase()
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ");
  if (!r) return false;
  if (IV_ROUTE_TOKENS.has(r)) return true;
  return r.startsWith("IV ") || r.includes(" IV ") || r === "IV";
}

/**
 * Onsite MAR eligibility for ambulatory Medications tile.
 * MEDICATION + ADMINISTER_CHART (or legacy empty). PHARMACY_DISPENSE excluded.
 */
export function isAmbulatoryOnsiteMarMedicationItem(it: D4c5b3OrderItemLike): boolean {
  const t = itemCatalogType(it);
  if (t && t !== "MEDICATION") return false;
  if (isNonPrescriptionClinicalOrderItem(it)) return false;
  return isOnsiteAdministerMedicationIntent(it.medicationFulfillmentIntent);
}

export type D4c5b3OrderLike = {
  id?: string;
  status?: string | null;
  type?: string | null;
  items?: D4c5b3OrderItemLike[] | null;
};

/** Filter encounter orders down to external Rx rows for the Rx tile / print. */
export function filterAmbulatoryExternalPrescriptionOrders<T extends D4c5b3OrderLike>(
  orders: readonly T[]
): T[] {
  const out: T[] = [];
  for (const order of orders) {
    if (String(order.status ?? "").toUpperCase() === "CANCELLED") {
      // Still include cancelled for "annulées" filter surfaces that re-query; default list drops empty.
    }
    const items = (order.items ?? []).filter((it) => isAmbulatoryExternalPrescriptionItem(it));
    if (items.length === 0) continue;
    out.push({ ...order, items } as T);
  }
  return out;
}

/** Count signed / printable external Rx medication lines. */
export function countAmbulatoryExternalPrescriptionLines(orders: readonly D4c5b3OrderLike[]): number {
  let n = 0;
  for (const order of filterAmbulatoryExternalPrescriptionOrders(orders)) {
    n += (order.items ?? []).length;
  }
  return n;
}

export function canPrintAmbulatoryExternalPrescriptions(
  orders: readonly D4c5b3OrderLike[]
): { ok: true; lineCount: number } | { ok: false; reasonKey: string } {
  const lineCount = countAmbulatoryExternalPrescriptionLines(orders);
  if (lineCount <= 0) {
    return { ok: false, reasonKey: "clinicCareD4c5b3.rx.printBlockedEmpty" };
  }
  return { ok: true, lineCount };
}

/** Destination display: Sur place vs Prescription externe. */
export type D4c5b3OrderDestinationKind = "ONSITE" | "EXTERNAL_RX" | "DIAGNOSTIC" | "OTHER";

export function classifyAmbulatoryOrderDestination(
  it: D4c5b3OrderItemLike
): D4c5b3OrderDestinationKind {
  if (isNonPrescriptionClinicalOrderItem(it)) return "DIAGNOSTIC";
  if (isExternalPharmacyDispenseIntent(it.medicationFulfillmentIntent)) return "EXTERNAL_RX";
  if (isOnsiteAdministerMedicationIntent(it.medicationFulfillmentIntent)) return "ONSITE";
  return "OTHER";
}

export function ambulatoryOrderDestinationDisplayKey(
  kind: D4c5b3OrderDestinationKind
): string {
  switch (kind) {
    case "ONSITE":
      return "clinicCareD4c5b3.destination.onsite";
    case "EXTERNAL_RX":
      return "clinicCareD4c5b3.destination.externalRx";
    case "DIAGNOSTIC":
      return "clinicCareD4c5b3.destination.diagnostic";
    default:
      return "clinicCareD4c5b3.destination.other";
  }
}

/** Display-layer route labels (stored enums unchanged). */
export function ambulatoryMedicationRouteDisplayKey(route: string | null | undefined): string {
  const r = String(route ?? "")
    .trim()
    .toUpperCase();
  const map: Record<string, string> = {
    PO: "clinicCareD4c5b3.route.po",
    ORAL: "clinicCareD4c5b3.route.po",
    IM: "clinicCareD4c5b3.route.im",
    IV: "clinicCareD4c5b3.route.iv",
    IVP: "clinicCareD4c5b3.route.ivp",
    IVPB: "clinicCareD4c5b3.route.ivpb",
    SQ: "clinicCareD4c5b3.route.sq",
    SC: "clinicCareD4c5b3.route.sq",
    INH: "clinicCareD4c5b3.route.inh",
    NEB: "clinicCareD4c5b3.route.neb",
    MDI: "clinicCareD4c5b3.route.mdi",
    DPI: "clinicCareD4c5b3.route.dpi",
    TOPICAL: "clinicCareD4c5b3.route.topical",
    PR: "clinicCareD4c5b3.route.pr",
    SL: "clinicCareD4c5b3.route.sl",
  };
  return map[r] ?? "clinicCareD4c5b3.route.other";
}

/** Display-layer dosage form labels. */
export function ambulatoryMedicationFormDisplayKey(form: string | null | undefined): string {
  const f = String(form ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!f) return "clinicCareD4c5b3.form.other";
  if (f.includes("tablet") || f.includes("compr")) return "clinicCareD4c5b3.form.tablet";
  if (f.includes("capsule") || f.includes("gelule")) return "clinicCareD4c5b3.form.capsule";
  if (f.includes("syrup") || f.includes("sirop") || f.includes("solution")) {
    return "clinicCareD4c5b3.form.solution";
  }
  if (f.includes("injection") || f.includes("inject")) return "clinicCareD4c5b3.form.injection";
  if (f.includes("cream") || f.includes("creme") || f.includes("ointment") || f.includes("pommade")) {
    return "clinicCareD4c5b3.form.topical";
  }
  if (f.includes("drop") || f.includes("goutte")) return "clinicCareD4c5b3.form.drops";
  if (f.includes("inhal") || f.includes("neb")) return "clinicCareD4c5b3.form.inhalation";
  if (f.includes("bag") || f.includes("poche") || f.includes("fluid") || f.includes("infusion")) {
    return "clinicCareD4c5b3.form.infusion";
  }
  return "clinicCareD4c5b3.form.other";
}

/** Pharmacy / order / admin status display keys (French UI via i18n). */
export function ambulatoryPharmacyStatusDisplayKey(status: string | null | undefined): string {
  const s = String(status ?? "")
    .trim()
    .toUpperCase();
  const map: Record<string, string> = {
    PLACED: "clinicCareD4c5b3.pharmacyStatus.placed",
    PENDING: "clinicCareD4c5b3.pharmacyStatus.pending",
    IN_PROGRESS: "clinicCareD4c5b3.pharmacyStatus.inProgress",
    INPROGRESS: "clinicCareD4c5b3.pharmacyStatus.inProgress",
    VERIFIED: "clinicCareD4c5b3.pharmacyStatus.verified",
    DISPENSED: "clinicCareD4c5b3.pharmacyStatus.dispensed",
    COMPLETED: "clinicCareD4c5b3.pharmacyStatus.completed",
    CANCELLED: "clinicCareD4c5b3.pharmacyStatus.cancelled",
    CANCELED: "clinicCareD4c5b3.pharmacyStatus.cancelled",
    HELD: "clinicCareD4c5b3.pharmacyStatus.held",
    ADMINISTERED: "clinicCareD4c5b3.pharmacyStatus.administered",
  };
  return map[s] ?? "clinicCareD4c5b3.pharmacyStatus.placed";
}

export function ambulatoryOrderedByRoleDisplayKey(role: string | null | undefined): string {
  const r = String(role ?? "")
    .trim()
    .toUpperCase();
  if (r === "PROVIDER" || r === "MD" || r === "DOCTOR") return "clinicCareD4c5b3.role.provider";
  if (r === "RN" || r === "NURSE") return "clinicCareD4c5b3.role.rn";
  if (r === "PHARMACIST" || r === "PHARMACY") return "clinicCareD4c5b3.role.pharmacist";
  if (r === "ADMIN") return "clinicCareD4c5b3.role.admin";
  return "clinicCareD4c5b3.role.other";
}

/**
 * Generate a French display sig from structured fields (display-layer only).
 * Does not mutate stored notes / enums.
 */
export function buildFrenchAmbulatoryMedicationSigDisplay(input: {
  dose?: string | null;
  formKey?: string | null;
  routeKey?: string | null;
  frequency?: string | null;
  timing?: string | null;
}): string {
  const parts: string[] = [];
  const dose = String(input.dose ?? "").trim();
  if (dose) parts.push(dose);
  const form = String(input.formKey ?? "").trim();
  if (form) parts.push(form);
  const route = String(input.routeKey ?? "").trim();
  if (route) parts.push(route);
  const freq = String(input.frequency ?? "").trim();
  if (freq) parts.push(freq);
  const timing = String(input.timing ?? "").trim();
  if (timing) parts.push(timing);
  return parts.join(" · ");
}

/** Common English sig fragments → French display replacements (display only). */
const ENGLISH_SIG_DISPLAY_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b1 tablet now\b/gi, "1 comprimé maintenant"],
  [/\btablet\b/gi, "comprimé"],
  [/\btablets\b/gi, "comprimés"],
  [/\bcapsule\b/gi, "gélule"],
  [/\bcapsules\b/gi, "gélules"],
  [/\bby mouth\b/gi, "par voie orale"],
  [/\borally\b/gi, "par voie orale"],
  [/\bnow\b/gi, "maintenant"],
  [/\bas needed\b/gi, "au besoin"],
  [/\bevery\b/gi, "toutes les"],
  [/\bhours?\b/gi, "heure(s)"],
  [/\bdaily\b/gi, "quotidien"],
  [/\btwice daily\b/gi, "deux fois par jour"],
  [/\bthree times daily\b/gi, "trois fois par jour"],
  [/\bwith food\b/gi, "avec les repas"],
  [/\bwithout food\b/gi, "à jeun"],
];

export function localizeAmbulatoryMedicationSigForFrenchDisplay(
  rawSig: string | null | undefined
): string {
  let s = String(rawSig ?? "").trim();
  if (!s) return "";
  for (const [re, fr] of ENGLISH_SIG_DISPLAY_REPLACEMENTS) {
    s = s.replace(re, fr);
  }
  return s;
}

/** Rx tile list filters (medication prescriptions only — no Protocoles/Lab/Imagerie). */
export const D4C5B3_RX_LIST_FILTERS = [
  "ALL_MEDICATIONS",
  "ACTIVE",
  "SENT",
  "PRINTED",
  "CANCELLED",
] as const;

export type D4c5b3RxListFilter = (typeof D4C5B3_RX_LIST_FILTERS)[number];

export function ambulatoryRxListFilterDisplayKey(filter: D4c5b3RxListFilter): string {
  switch (filter) {
    case "ALL_MEDICATIONS":
      return "clinicCareD4c5b3.rx.filters.medications";
    case "ACTIVE":
      return "clinicCareD4c5b3.rx.filters.active";
    case "SENT":
      return "clinicCareD4c5b3.rx.filters.sent";
    case "PRINTED":
      return "clinicCareD4c5b3.rx.filters.printed";
    case "CANCELLED":
      return "clinicCareD4c5b3.rx.filters.cancelled";
    default:
      return "clinicCareD4c5b3.rx.filters.medications";
  }
}

export function matchesAmbulatoryRxListFilter(
  order: D4c5b3OrderLike,
  filter: D4c5b3RxListFilter
): boolean {
  const status = String(order.status ?? "")
    .trim()
    .toUpperCase();
  switch (filter) {
    case "ALL_MEDICATIONS":
      return true;
    case "ACTIVE":
      return !["CANCELLED", "CANCELED", "COMPLETED"].includes(status);
    case "SENT":
      return ["PLACED", "SIGNED", "ACKNOWLEDGED", "IN_PROGRESS", "PENDING"].includes(status);
    case "PRINTED":
      return status === "COMPLETED" || status === "DISPENSED" || status === "PRINTED";
    case "CANCELLED":
      return status === "CANCELLED" || status === "CANCELED";
    default:
      return true;
  }
}

/**
 * Haiti ambulatory Orders tile: default meds to chart-admin so MAR receives them.
 * Rx tile remains PHARMACY_DISPENSE. Does not change U.S. ED global defaults.
 */
export function haitiAmbulatoryOrdersMedicationMode(input: {
  facilityCountry?: string | null;
  ambulatoryCareSetting: boolean;
}): "ER_ADMINISTER_ONLY" | "DEFAULT" {
  if (
    isHaitiAmbulatoryWorkspaceContext({
      facilityCountry: input.facilityCountry,
      ambulatoryCareSetting: input.ambulatoryCareSetting,
    })
  ) {
    return "ER_ADMINISTER_ONLY";
  }
  return "DEFAULT";
}

/** Result-entry capability audit tokens (enterprise — no Clinic statuses). */
export const D4C5B3_RESULT_ACTIONS = [
  "COLLECT",
  "RECEIVE",
  "ENTER",
  "VERIFY",
  "FINALIZE",
  "ACKNOWLEDGE",
] as const;

export type D4c5b3ResultAction = (typeof D4C5B3_RESULT_ACTIONS)[number];

export type D4c5b3ResultCapabilityDenial = {
  allowed: boolean;
  missingCapabilityKey: string | null;
  denialKind: "ROLE" | "FACILITY_POLICY" | "ACTION_SCOPE" | null;
};

/**
 * Map result-entry denial to exact user-facing i18n key.
 * Does not grant permissions — presentation of existing enterprise gates only.
 */
export function resolveAmbulatoryResultEntryDenialMessage(input: {
  action: D4c5b3ResultAction;
  hasRole: boolean;
  facilityAllowsRnLabEntry?: boolean;
  isRnOnly?: boolean;
  isLabTest?: boolean;
}): D4c5b3ResultCapabilityDenial {
  if (input.hasRole) {
    if (
      input.action === "ENTER" &&
      input.isRnOnly &&
      input.isLabTest &&
      input.facilityAllowsRnLabEntry === false
    ) {
      return {
        allowed: false,
        missingCapabilityKey: "clinicCareD4c5b3.results.deniedFacilityRnLabPolicy",
        denialKind: "FACILITY_POLICY",
      };
    }
    if (input.action === "ENTER" && input.isRnOnly && input.isLabTest === false) {
      return {
        allowed: false,
        missingCapabilityKey: "clinicCareD4c5b3.results.deniedRnImagingEntry",
        denialKind: "ACTION_SCOPE",
      };
    }
    return { allowed: true, missingCapabilityKey: null, denialKind: null };
  }
  switch (input.action) {
    case "ENTER":
      return {
        allowed: false,
        missingCapabilityKey: "clinicCareD4c5b3.results.deniedRoleEnter",
        denialKind: "ROLE",
      };
    case "FINALIZE":
      return {
        allowed: false,
        missingCapabilityKey: "clinicCareD4c5b3.results.deniedRoleFinalize",
        denialKind: "ROLE",
      };
    case "ACKNOWLEDGE":
      return {
        allowed: false,
        missingCapabilityKey: "clinicCareD4c5b3.results.deniedRoleAcknowledge",
        denialKind: "ROLE",
      };
    case "VERIFY":
      return {
        allowed: false,
        missingCapabilityKey: "clinicCareD4c5b3.results.deniedRoleVerify",
        denialKind: "ROLE",
      };
    case "COLLECT":
    case "RECEIVE":
      return {
        allowed: false,
        missingCapabilityKey: "clinicCareD4c5b3.results.deniedRoleCollect",
        denialKind: "ROLE",
      };
    default:
      return {
        allowed: false,
        missingCapabilityKey: "clinicCareD4c5b3.results.deniedRoleEnter",
        denialKind: "ROLE",
      };
  }
}

/**
 * Documented capability matrix (audit / certification) — does not grant seed permissions.
 * ENTER for RN remains gated by Facility.allowRnLabResultSubmission.
 */
export const D4C5B3_RESULT_CAPABILITY_MATRIX_DOC = {
  PROVIDER: ["ACKNOWLEDGE", "VERIFY"],
  RN: ["COLLECT", "ENTER_LAB_IF_FACILITY_POLICY", "ACKNOWLEDGE"],
  LAB_TECH: ["COLLECT", "RECEIVE", "ENTER", "VERIFY", "FINALIZE"],
  RAD_TECH: ["RECEIVE", "ENTER", "FINALIZE"],
  RADIOLOGIST: ["VERIFY", "FINALIZE", "ACKNOWLEDGE"],
  ADMIN: ["COLLECT", "RECEIVE", "ENTER", "VERIFY", "FINALIZE", "ACKNOWLEDGE"],
  FRONT_DESK: [],
} as const;

/**
 * STOP gate for production seed: Haiti Clinic RN lab entry requires existing
 * Facility.allowRnLabResultSubmission — do not silently flip in this certification.
 */
export function haitiAmbulatoryRnLabEntrySeedChangeRequired(input: {
  facilityAllowsRnLabResultSubmission: boolean | null | undefined;
}): {
  stop: boolean;
  authority: string;
  proposedChange: string | null;
} {
  if (input.facilityAllowsRnLabResultSubmission === true) {
    return {
      stop: false,
      authority: "Facility.allowRnLabResultSubmission",
      proposedChange: null,
    };
  }
  return {
    stop: true,
    authority: "Facility.allowRnLabResultSubmission (default false)",
    proposedChange:
      "Set Facility.allowRnLabResultSubmission=true for Haiti Clinic facilities that authorize RN lab result entry — requires explicit seed/admin approval; not applied by D4C.5B.3.",
  };
}

/** Acetaminophen / paracetamol family — must not map to vasopressor high-alert. */
export function isAcetaminophenAnalgesicFamily(input: {
  code?: string | null;
  name?: string | null;
  displayName?: string | null;
  genericName?: string | null;
  therapeuticClass?: string | null;
  manualLabel?: string | null;
}): boolean {
  const hay = [input.code, input.name, input.displayName, input.genericName, input.manualLabel, input.therapeuticClass]
    .map((v) =>
      String(v ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    )
    .join(" ");
  return (
    hay.includes("acetaminophen") ||
    hay.includes("paracetamol") ||
    hay.includes("paracetamol") ||
    /\baceta\b/.test(hay)
  );
}

export function shouldSuppressFalseVasopressorAlertForAnalgesic(input: {
  code?: string | null;
  name?: string | null;
  displayName?: string | null;
  genericName?: string | null;
  therapeuticClass?: string | null;
  manualLabel?: string | null;
}): boolean {
  if (!isAcetaminophenAnalgesicFamily(input)) return false;
  const pressorHay = [input.name, input.displayName, input.genericName, input.manualLabel, input.code]
    .map((v) =>
      String(v ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    )
    .join(" ");
  const realPressor =
    /\bnorepinephrine\b/.test(pressorHay) ||
    /\bepinephrine\b/.test(pressorHay) ||
    /\bphenylephrine\b/.test(pressorHay) ||
    /\bdopamine\b/.test(pressorHay) ||
    /\bdobutamine\b/.test(pressorHay) ||
    /\bvasopressin\b/.test(pressorHay) ||
    /\badrenaline\b/.test(pressorHay);
  return !realPressor;
}
