/**
 * MEDUI.MEDICATION_CATALOG.HOSPITAL_ORDERABILITY_AND_TDAP.1
 * Medication catalog orderability certification orchestrator.
 */

import { ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_CATALOG_CODES } from "./enterpriseFormularyPilotTrancheAManifest.js";
import { ENTERPRISE_WAVE1_FORMULARY_MANIFEST } from "./enterpriseWave1FormularyManifest.js";
import { ENTERPRISE_WAVE2_FORMULARY_MANIFEST } from "./enterpriseWave2FormularyManifest.js";
import { ENTERPRISE_WAVE3_FORMULARY_MANIFEST } from "./enterpriseWave3FormularyManifest.js";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import {
  HOSPITAL_MEDICATION_COVERAGE_GROUPS,
  type HospitalMedicationCoverageRow,
} from "./hospitalMedicationCoverageManifest.js";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";
import { buildMedicationCatalogSourceAudit } from "./medicationCatalogSourceRegistry.js";
import {
  buildOrderabilityFromEnterpriseEntry,
  buildOrderabilityFromHaitiRow,
  isProviderOrderSearchCandidate,
  type MedicationOrderabilityRecord,
  type MedicationOrderabilityStatus,
} from "./medicationOrderabilityGovernance.js";
import {
  getTdapFormularyEntry,
  TDAP_CATALOG_CODE,
  validateTdapVaccineAdministrationForm,
  emptyTdapVaccineAdministrationForm,
  buildTdapVaccineAdministrationNote,
  tdapNoteIsMonolingual,
  sampleCompleteTdapVaccineAdministrationForm,
} from "./tdapVaccineAdministration.js";
import type { EnterpriseWave1FormularyEntry } from "./enterpriseWave1Types.js";

export type MedicationCatalogSourceAudit = ReturnType<typeof buildMedicationCatalogSourceAudit>;

export type MedicationOrderabilityGapRow = {
  medication: string;
  generic: string;
  brand: string;
  route: string;
  form: string;
  strength: string;
  orderable: boolean;
  marReady: boolean;
  pharmacyReady: boolean;
  restricted: boolean;
  missingReason: string | null;
  status: MedicationOrderabilityStatus;
  catalogCode: string;
};

export type ProviderOrderSearchRootCause = {
  cause: string;
  fileOrField: string;
  detail: string;
};

export type MedicationOrderabilityCertificationDecision = "ORDERABILITY_READY" | "ORDERABILITY_NOT_READY";

export type MedicationOrderabilityCertificationReport = {
  ticket: "MEDUI.MEDICATION_CATALOG.HOSPITAL_ORDERABILITY_AND_TDAP.1";
  generatedAt: string;
  catalogSourceAudit: MedicationCatalogSourceAudit;
  orderabilityGaps: MedicationOrderabilityGapRow[];
  hospitalCoverage: HospitalMedicationCoverageRow[];
  providerOrderSearchRootCauses: ProviderOrderSearchRootCause[];
  governanceSummary: {
    totalMedications: number;
    orderableReady: number;
    restrictedWithReason: number;
    catalogOnlyNotOrderable: number;
    undocumentedGaps: number;
    tdapInCatalog: boolean;
    tdapWorkflowCertified: boolean;
  };
  tdapAdministration: {
    catalogCode: string;
    inEnterpriseWave1: boolean;
    inHaitiCatalog: boolean;
    route: string;
    defaultDose: string;
    validationFieldCount: number;
  };
  blockers: string[];
  decision: MedicationOrderabilityCertificationDecision;
};

type EnterpriseLike = {
  catalogCode: string;
  genericName: string;
  displayNameEn: string;
  displayNameFr: string;
  strength: string;
  dosageForm: string;
  route: string;
  aliases: readonly string[] | { en?: string; fr?: string }[];
  governance: EnterpriseWave1FormularyEntry["governance"];
  bucket?: string;
  administrationType?: string | null;
};

function normalizeAliases(aliases: EnterpriseLike["aliases"]): string[] {
  return aliases.map((a) => (typeof a === "string" ? a : a.en ?? a.fr ?? "")).filter(Boolean);
}

function toEnterpriseLike(entry: EnterpriseLike): EnterpriseWave1FormularyEntry {
  return {
    ...entry,
    aliases: normalizeAliases(entry.aliases),
    bucket: (entry.bucket as EnterpriseWave1FormularyEntry["bucket"]) ?? "CHRONIC_CARE",
    mode: "CREATE",
    searchTerms: [],
    therapeuticClass: "",
    isEssential: true,
    billingClass: "DRUG_SUPPLY",
  } as EnterpriseWave1FormularyEntry;
}

/** Unified static catalog universe for audit tooling (Haiti + enterprise waves, deduped). */
export function buildUnifiedOrderabilityMap(): Map<string, MedicationOrderabilityRecord> {
  const haitiCodes = new Set(HAITI_MEDICATION_FORMULARY_CATALOG.map((r) => r.code));
  const map = new Map<string, MedicationOrderabilityRecord>();

  for (const row of HAITI_MEDICATION_FORMULARY_CATALOG) {
    map.set(row.code, buildOrderabilityFromHaitiRow(row));
  }

  const enterpriseEntries = [
    ...ENTERPRISE_WAVE1_FORMULARY_MANIFEST,
    ...ENTERPRISE_WAVE2_FORMULARY_MANIFEST,
    ...ENTERPRISE_WAVE3_FORMULARY_MANIFEST,
    ...ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST,
  ] as EnterpriseLike[];

  for (const entry of enterpriseEntries) {
    const wave1Entry = toEnterpriseLike(entry);
    const existing = map.get(entry.catalogCode);
    if (existing) {
      map.set(entry.catalogCode, {
        ...buildOrderabilityFromEnterpriseEntry(wave1Entry, true),
        source: "both",
      });
    } else {
      map.set(entry.catalogCode, buildOrderabilityFromEnterpriseEntry(wave1Entry, false));
    }
  }

  return map;
}

function catalogSearchBlob(record: MedicationOrderabilityRecord): string {
  return [
    record.genericName,
    record.displayNameEn,
    record.displayNameFr,
    record.catalogCode,
  ]
    .join(" ")
    .toLowerCase();
}

function auditHospitalCoverage(
  records: Map<string, MedicationOrderabilityRecord>
): HospitalMedicationCoverageRow[] {
  return HOSPITAL_MEDICATION_COVERAGE_GROUPS.map((group) => {
    const matched = new Set<string>();
    let orderable = 0;
    let restricted = 0;

    for (const [code, record] of records) {
      const blob = catalogSearchBlob(record);
      const tokenHit = group.expectedTokens.some((t) => blob.includes(t.toLowerCase()));
      const explicitHit = group.explicitCatalogCodes?.includes(code) ?? false;
      if (tokenHit || explicitHit) {
        matched.add(code);
        if (isProviderOrderSearchCandidate(record)) orderable += 1;
        if (record.orderabilityStatus === "RESTRICTED_WITH_REASON") restricted += 1;
      }
    }

    const missingTokens = group.expectedTokens.filter((token) => {
      const hit = [...records.values()].some((r) => catalogSearchBlob(r).includes(token.toLowerCase()));
      return !hit;
    });

    const presentCount = matched.size;
    const expectedCount = group.expectedTokens.length;
    const status =
      missingTokens.length === 0 && presentCount > 0
        ? "COVERED"
        : presentCount > 0
          ? "PARTIAL"
          : "NEEDS_CLINICAL_REVIEW";

    return {
      groupId: group.groupId,
      labelEn: group.labelEn,
      expectedCount,
      presentCount,
      orderableCount: orderable,
      missingTokens,
      restrictedCount: restricted,
      status,
    };
  });
}

function buildProviderOrderSearchRootCauses(): ProviderOrderSearchRootCause[] {
  return [
    {
      cause: "inactive_formulary_flag",
      fileOrField: "CatalogMedication.isActive",
      detail: "Inactive rows excluded unless Haiti legacy preservation applies",
    },
    {
      cause: "missing_order_search_activation",
      fileOrField: "MedicationProduct.governanceNotes.orderSearchEnabled",
      detail: "Canonical products block provider search until enable-order-search governance step",
    },
    {
      cause: "formulary_not_approved",
      fileOrField: "FacilityFormularyItem.isOnFormulary",
      detail: "Gated search requires facility formulary approval",
    },
    {
      cause: "enterprise_not_in_pilot",
      fileOrField: "enterpriseFormularyPilotTrancheAManifest.ts",
      detail: `Only ${ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_CATALOG_CODES.length} pilot codes are designated order-search-ready without full activation`,
    },
    {
      cause: "vaccine_separate_catalog",
      fileOrField: "VaccineCatalog vs CatalogMedication",
      detail: "Public-health vaccine catalog does not feed provider medication order search",
    },
    {
      cause: "controlled_substance_restriction",
      fileOrField: "CatalogMedication.isControlled",
      detail: "Controlled substances marked RESTRICTED_WITH_REASON until governance activation",
    },
    {
      cause: "staging_not_promoted",
      fileOrField: "MedicationFormularyImportStaging.importGateStatus",
      detail: "Import staging rows never appear in provider search until promoted",
    },
  ];
}

function gapRowFromRecord(record: MedicationOrderabilityRecord): MedicationOrderabilityGapRow {
  return {
    medication: record.displayNameEn,
    generic: record.genericName,
    brand: record.displayNameEn,
    route: record.route,
    form: record.dosageForm,
    strength: record.strength,
    orderable: isProviderOrderSearchCandidate(record),
    marReady: record.marEnabled || record.orderabilityStatus === "ORDERABLE_READY",
    pharmacyReady: record.source !== "enterprise" || record.inventoryNdcLinked,
    restricted: record.orderabilityStatus === "RESTRICTED_WITH_REASON",
    missingReason: record.notOrderableReason ?? record.restrictedReason,
    status: record.orderabilityStatus,
    catalogCode: record.catalogCode,
  };
}

export function certifyMedicationOrderability(): MedicationOrderabilityCertificationReport {
  const records = buildUnifiedOrderabilityMap();
  const orderabilityGaps = [...records.values()].map(gapRowFromRecord);
  const hospitalCoverage = auditHospitalCoverage(records);

  const undocumented = orderabilityGaps.filter(
    (g) =>
      g.status !== "ORDERABLE_READY" &&
      !g.missingReason?.trim()
  );

  const tdapRecord = records.get(TDAP_CATALOG_CODE);
  const tdapEntry = getTdapFormularyEntry();
  const sampleTdap = sampleCompleteTdapVaccineAdministrationForm();
  const tdapNoteEn = buildTdapVaccineAdministrationNote(sampleTdap, "en");
  const tdapNoteFr = buildTdapVaccineAdministrationNote(sampleTdap, "fr");
  const tdapWorkflowCertified =
    Boolean(tdapEntry) &&
    validateTdapVaccineAdministrationForm(sampleTdap).length === 0 &&
    tdapNoteIsMonolingual(tdapNoteEn, "en") &&
    tdapNoteIsMonolingual(tdapNoteFr, "fr");

  const blockers: string[] = [];
  if (undocumented.length > 0) {
    blockers.push(`Undocumented non-orderable medications: ${undocumented.length}`);
  }
  if (!tdapRecord) {
    blockers.push("Tdap missing from unified orderability catalog");
  }
  if (!tdapWorkflowCertified) {
    blockers.push("Tdap administration workflow not certified");
  }
  const needsReviewGroups = hospitalCoverage.filter((g) => g.status === "NEEDS_CLINICAL_REVIEW");
  if (needsReviewGroups.length > 0) {
    blockers.push(`Hospital coverage groups need clinical review: ${needsReviewGroups.length}`);
  }

  const decision: MedicationOrderabilityCertificationDecision =
    blockers.length === 0 ? "ORDERABILITY_READY" : "ORDERABILITY_NOT_READY";

  return {
    ticket: "MEDUI.MEDICATION_CATALOG.HOSPITAL_ORDERABILITY_AND_TDAP.1",
    generatedAt: new Date().toISOString(),
    catalogSourceAudit: buildMedicationCatalogSourceAudit({
      haitiCatalog: HAITI_MEDICATION_FORMULARY_CATALOG.length,
      wave1: ENTERPRISE_WAVE1_FORMULARY_MANIFEST.length,
      wave2: ENTERPRISE_WAVE2_FORMULARY_MANIFEST.length,
      wave3: ENTERPRISE_WAVE3_FORMULARY_MANIFEST.length,
      wave4: ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.length,
      pilotTrancheA: ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_CATALOG_CODES.length,
      vaccineCatalogSeed: 8,
    }),
    orderabilityGaps,
    hospitalCoverage,
    providerOrderSearchRootCauses: buildProviderOrderSearchRootCauses(),
    governanceSummary: {
      totalMedications: records.size,
      orderableReady: orderabilityGaps.filter((g) => g.status === "ORDERABLE_READY").length,
      restrictedWithReason: orderabilityGaps.filter((g) => g.status === "RESTRICTED_WITH_REASON").length,
      catalogOnlyNotOrderable: orderabilityGaps.filter((g) => g.status === "CATALOG_ONLY_NOT_ORDERABLE").length,
      undocumentedGaps: undocumented.length,
      tdapInCatalog: Boolean(tdapRecord),
      tdapWorkflowCertified,
    },
    tdapAdministration: {
      catalogCode: TDAP_CATALOG_CODE,
      inEnterpriseWave1: Boolean(tdapEntry),
      inHaitiCatalog: HAITI_MEDICATION_FORMULARY_CATALOG.some((r) => r.code === TDAP_CATALOG_CODE),
      route: tdapEntry?.administrationType ?? "IM",
      defaultDose: tdapEntry?.strength ?? "0.5 mL",
      validationFieldCount: validateTdapVaccineAdministrationForm(emptyTdapVaccineAdministrationForm()).length,
    },
    blockers,
    decision,
  };
}

export function medicationOrderabilityGapsWithoutDocumentedReason(
  gaps: MedicationOrderabilityGapRow[]
): MedicationOrderabilityGapRow[] {
  return gaps.filter((g) => g.status !== "ORDERABLE_READY" && !g.missingReason?.trim());
}
