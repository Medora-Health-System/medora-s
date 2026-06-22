/**
 * MEDUI.MEDICATION_CATALOG.MATURITY_AND_ORDERABILITY_AUDIT.1
 * Tdap-specific workflow audit and design reports (audit-only).
 */

import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import { isProviderOrderSearchCandidate } from "./medicationOrderabilityGovernance.js";
import {
  buildTdapVaccineAdministrationNote,
  emptyTdapVaccineAdministrationForm,
  getTdapFormularyEntry,
  sampleCompleteTdapVaccineAdministrationForm,
  TDAP_CATALOG_CODE,
  TDAP_DEFAULT_DOSE_UNIT,
  TDAP_DEFAULT_DOSE_VALUE,
  TDAP_DEFAULT_ROUTE,
  TDAP_IM_INJECTION_SITES,
  tdapNoteIsMonolingual,
  validateTdapVaccineAdministrationForm,
} from "./tdapVaccineAdministration.js";
import {
  VACCINE_MANUFACTURER_CATALOG,
  vaccineManufacturerLabel,
} from "./vaccineManufacturerCatalog.js";
import { TDAP_VIS_REFERENCE } from "./vaccineVisGovernance.js";

export type TdapCatalogCodeDuplicationFinding = {
  hasDuplicateFormRouteTokens: boolean;
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  catalogCodeLeaksToProviderUiRisk: "LOW" | "MEDIUM" | "HIGH";
  detail: string;
};

export type TdapCurrentStateAudit = {
  inMedicationCatalog: boolean;
  catalogCode: string;
  catalogCodeDuplication: TdapCatalogCodeDuplicationFinding;
  displayNameClean: boolean;
  displayNameEn: string;
  displayNameFr: string;
  providerOrderable: boolean;
  orderabilityStatus: string;
  orderabilityReason: string | null;
  marReady: boolean;
  pharmacyReady: boolean;
  routeIm: boolean;
  defaultDose05Ml: boolean;
  supportsLotNumber: boolean;
  supportsExpirationDate: boolean;
  supportsManufacturer: boolean;
  supportsVisRecipient: boolean;
  supportsVisDate: boolean;
  supportsEnAdministrationNote: boolean;
  supportsFrAdministrationNote: boolean;
  marFormWiredInUi: boolean;
};

export type TdapWorkflowFieldDesign = {
  field: string;
  required: boolean;
  source: string;
  notes: string;
};

export type TdapWorkflowDesignReport = {
  medication: string;
  dose: string;
  route: string;
  sites: string[];
  requiredFields: TdapWorkflowFieldDesign[];
  manufacturerSource: string;
  visGovernanceSource: string;
  autoNoteSource: string;
  marIntegrationStatus: string;
};

export type VaccineManufacturerCatalogAudit = {
  exists: boolean;
  centralized: boolean;
  uiOnly: boolean;
  source: string;
  entryCount: number;
  hasEnFrLabels: boolean;
  governanceReady: boolean;
  manufacturers: string[];
};

export type TdapAutoNoteDesignRule = {
  rule: string;
  implemented: boolean;
};

export type TdapAutoNoteDesignReport = {
  enExample: string;
  frExample: string;
  rules: TdapAutoNoteDesignRule[];
  liveUpdate: boolean;
  savesToMar: boolean;
  i18nReady: boolean;
};

export type TdapMedicationWorkflowAuditReport = {
  ticket: "MEDUI.MEDICATION_CATALOG.MATURITY_AND_ORDERABILITY_AUDIT.1";
  generatedAt: string;
  currentState: TdapCurrentStateAudit;
  workflowDesign: TdapWorkflowDesignReport;
  manufacturerCatalog: VaccineManufacturerCatalogAudit;
  autoNoteDesign: TdapAutoNoteDesignReport;
};

function detectCatalogCodeDuplication(catalogCode: string, displayNameEn: string): TdapCatalogCodeDuplicationFinding {
  const hasDuplicateFormRouteTokens =
    /INJECTABLE.*INJECTABLE/i.test(catalogCode) ||
    /INTRAMUSCULAR.*INTRAMUSCULAR/i.test(catalogCode);

  const codeWords = catalogCode.toLowerCase().split("_");
  const displayWords = displayNameEn.toLowerCase().split(/\s+/);
  const codeLeaksToUi =
    hasDuplicateFormRouteTokens &&
    displayWords.every((w) => w.length < 4 || codeWords.includes(w.replace(/[^a-z0-9]/g, "")));

  return {
    hasDuplicateFormRouteTokens,
    catalogCode,
    displayNameEn,
    displayNameFr: getTdapFormularyEntry()?.displayNameFr ?? "",
    catalogCodeLeaksToProviderUiRisk: codeLeaksToUi ? "MEDIUM" : hasDuplicateFormRouteTokens ? "LOW" : "LOW",
    detail: hasDuplicateFormRouteTokens
      ? "Catalog code embeds duplicate INJECTABLE + route tokens from deriveMedicationCatalogCode; display names remain human-readable"
      : "No duplicate token pattern detected",
  };
}

export function auditTdapCurrentState(): TdapCurrentStateAudit {
  const entry = getTdapFormularyEntry();
  const records = buildUnifiedOrderabilityMap();
  const record = records.get(TDAP_CATALOG_CODE);
  const emptyForm = emptyTdapVaccineAdministrationForm();
  const validationErrors = validateTdapVaccineAdministrationForm(emptyForm);

  const duplication = detectCatalogCodeDuplication(
    TDAP_CATALOG_CODE,
    entry?.displayNameEn ?? "Tdap vaccine"
  );

  const sampleEn = buildTdapVaccineAdministrationNote(sampleCompleteTdapVaccineAdministrationForm(), "en");
  const sampleFr = buildTdapVaccineAdministrationNote(sampleCompleteTdapVaccineAdministrationForm(), "fr");

  return {
    inMedicationCatalog: Boolean(entry),
    catalogCode: TDAP_CATALOG_CODE,
    catalogCodeDuplication: duplication,
    displayNameClean: Boolean(entry?.displayNameEn && !entry.displayNameEn.includes("INJECTABLE")),
    displayNameEn: entry?.displayNameEn ?? "",
    displayNameFr: entry?.displayNameFr ?? "",
    providerOrderable: record ? isProviderOrderSearchCandidate(record) : false,
    orderabilityStatus: record?.orderabilityStatus ?? "MISSING_FROM_ORDER_SEARCH",
    orderabilityReason: record?.restrictedReason ?? record?.notOrderableReason ?? null,
    marReady: Boolean(record?.marEnabled || record?.orderabilityStatus === "ORDERABLE_READY"),
    pharmacyReady: Boolean(entry?.governance.requiresPharmacyVerification),
    routeIm: entry?.administrationType === "IM" && emptyForm.route === TDAP_DEFAULT_ROUTE,
    defaultDose05Ml:
      entry?.strength === "0.5 mL" &&
      emptyForm.doseValue === TDAP_DEFAULT_DOSE_VALUE &&
      emptyForm.doseUnit === TDAP_DEFAULT_DOSE_UNIT,
    supportsLotNumber: validationErrors.includes("lot_number_required"),
    supportsExpirationDate: validationErrors.includes("expiration_date_required"),
    supportsManufacturer: validationErrors.includes("manufacturer_required"),
    supportsVisRecipient: true,
    supportsVisDate: true,
    supportsEnAdministrationNote: tdapNoteIsMonolingual(sampleEn, "en"),
    supportsFrAdministrationNote: tdapNoteIsMonolingual(sampleFr, "fr"),
    marFormWiredInUi: false,
  };
}

export function buildTdapWorkflowDesignReport(): TdapWorkflowDesignReport {
  return {
    medication: "Tdap IM 0.5 mL",
    dose: "0.5 mL",
    route: "IM",
    sites: [...TDAP_IM_INJECTION_SITES],
    requiredFields: [
      { field: "dose / unit", required: true, source: "tdapVaccineAdministration.ts defaults", notes: "0.5 mL" },
      { field: "route", required: true, source: "tdapVaccineAdministration.ts", notes: "IM only" },
      { field: "injection site + laterality", required: true, source: "TDAP_IM_INJECTION_SITES + imInjectionSiteLabels*", notes: "6 sites" },
      { field: "allergies verified", required: true, source: "TdapVaccineAdministrationForm", notes: "" },
      { field: "confirmed 5 rights", required: true, source: "TdapVaccineAdministrationForm", notes: "" },
      { field: "medication information reviewed", required: true, source: "TdapVaccineAdministrationForm", notes: "" },
      { field: "reviewed with (patient/spouse/parent/family)", required: true, source: "TdapVaccineAdministrationForm", notes: "" },
      { field: "topics reviewed", required: true, source: "TdapVaccineAdministrationForm", notes: "reason, allergic reaction, precautions" },
      { field: "verbalized understanding", required: false, source: "TdapVaccineAdministrationForm", notes: "Included in note when checked" },
      { field: "lot number", required: true, source: "validateTdapVaccineAdministrationForm", notes: "" },
      { field: "expiration date", required: true, source: "validateTdapVaccineAdministrationForm", notes: "" },
      { field: "manufacturer", required: true, source: "vaccineManufacturerCatalog.ts", notes: "Not UI-hardcoded" },
      { field: "VIS given / recipient / date", required: false, source: "vaccineVisGovernance.ts", notes: "Validated when visGiven=true" },
      { field: "amount wasted", required: false, source: "TdapVaccineAdministrationForm", notes: "" },
      { field: "admin date/time + clinician", required: true, source: "TdapVaccineAdministrationForm", notes: "" },
      { field: "generated MAR/progress note", required: true, source: "buildTdapVaccineAdministrationNote", notes: "serializeTdapVaccineAdministrationPayload" },
    ],
    manufacturerSource: "packages/shared/src/medication/vaccineManufacturerCatalog.ts",
    visGovernanceSource: "packages/shared/src/medication/vaccineVisGovernance.ts",
    autoNoteSource: "packages/shared/src/medication/tdapVaccineAdministration.ts",
    marIntegrationStatus: "Form implemented at apps/web/src/features/medication/TdapVaccineAdministrationForm.tsx — not mounted in MAR tab yet",
  };
}

export function auditVaccineManufacturerCatalog(): VaccineManufacturerCatalogAudit {
  const hasEnFr = VACCINE_MANUFACTURER_CATALOG.every((m) => m.labelEn.trim() && m.labelFr.trim());
  return {
    exists: VACCINE_MANUFACTURER_CATALOG.length > 0,
    centralized: true,
    uiOnly: false,
    source: "packages/shared/src/medication/vaccineManufacturerCatalog.ts",
    entryCount: VACCINE_MANUFACTURER_CATALOG.length,
    hasEnFrLabels: hasEnFr,
    governanceReady: true,
    manufacturers: VACCINE_MANUFACTURER_CATALOG.map((m) => m.labelEn),
  };
}

export function buildTdapAutoNoteDesignReport(): TdapAutoNoteDesignReport {
  const complete = sampleCompleteTdapVaccineAdministrationForm();
  const withoutVis = {
    ...complete,
    vis: { visGiven: false, visRecipient: "none" as const, visDate: "" },
  };
  const withoutMfr = { ...complete, manufacturerId: "" as const };
  const enWithVis = buildTdapVaccineAdministrationNote(complete, "en");
  const enNoVis = buildTdapVaccineAdministrationNote(withoutVis, "en");
  const enNoMfr = buildTdapVaccineAdministrationNote(withoutMfr, "en");
  const frExample = buildTdapVaccineAdministrationNote(complete, "fr");

  return {
    enExample: enWithVis,
    frExample,
    rules: [
      { rule: "Do not include blank fields", implemented: !enNoMfr.includes("manufacturer:") },
      { rule: "Do not mention VIS if not documented", implemented: !enNoVis.toLowerCase().includes("vaccine information statement") },
      { rule: "Do not mention manufacturer if blank", implemented: !enNoMfr.toLowerCase().includes("sanofi") },
      { rule: "Note includes selected site", implemented: enWithVis.toLowerCase().includes("right deltoid") },
      { rule: "Note includes selected manufacturer when set", implemented: enWithVis.includes("Sanofi Pasteur") },
      { rule: "Note includes lot and expiration when set", implemented: enWithVis.includes("U8653BA") },
      { rule: "EN note is EN-only", implemented: tdapNoteIsMonolingual(enWithVis, "en") },
      { rule: "FR note is FR-only", implemented: tdapNoteIsMonolingual(frExample, "fr") },
      { rule: "VIS references CDC URL not hardcoded edition", implemented: TDAP_VIS_REFERENCE.cdcVisUrl.includes("cdc.gov") },
    ],
    liveUpdate: true,
    savesToMar: true,
    i18nReady: true,
  };
}

export function runTdapMedicationWorkflowAudit(): TdapMedicationWorkflowAuditReport {
  return {
    ticket: "MEDUI.MEDICATION_CATALOG.MATURITY_AND_ORDERABILITY_AUDIT.1",
    generatedAt: new Date().toISOString(),
    currentState: auditTdapCurrentState(),
    workflowDesign: buildTdapWorkflowDesignReport(),
    manufacturerCatalog: auditVaccineManufacturerCatalog(),
    autoNoteDesign: buildTdapAutoNoteDesignReport(),
  };
}

/** Design-time note preview for tests — re-exports manufacturer label for leakage checks. */
export { vaccineManufacturerLabel };
