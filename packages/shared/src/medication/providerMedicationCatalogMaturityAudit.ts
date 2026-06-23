/**
 * MEDUI.MEDICATION_CATALOG.MATURITY_AND_ORDERABILITY_AUDIT.1
 * Audit-only medication engine maturity and orderability pipeline analysis.
 * Does NOT activate medications or change provider search behavior.
 */

import { ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_CATALOG_CODES } from "./enterpriseFormularyPilotTrancheAManifest.js";
import { ENTERPRISE_WAVE1_FORMULARY_MANIFEST } from "./enterpriseWave1FormularyManifest.js";
import { ENTERPRISE_WAVE2_FORMULARY_MANIFEST } from "./enterpriseWave2FormularyManifest.js";
import { ENTERPRISE_WAVE3_FORMULARY_MANIFEST } from "./enterpriseWave3FormularyManifest.js";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";
import {
  HOSPITAL_MEDICATION_COVERAGE_GROUPS,
  type HospitalMedicationCoverageGroupId,
} from "./hospitalMedicationCoverageManifest.js";
import { buildMedicationCatalogSourceAudit } from "./medicationCatalogSourceRegistry.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import {
  isProviderOrderSearchCandidate,
  medicationHasDocumentedNonOrderableReason,
  type MedicationOrderabilityRecord,
  type MedicationOrderabilityStatus,
} from "./medicationOrderabilityGovernance.js";

export type MedicationEngineSourceRow = {
  source: string;
  fileOrModel: string;
  purpose: string;
  count: number | "runtime";
  providerOrderable: boolean | "gated" | "no";
  marReady: boolean | "via_orders" | "no";
  pharmacyReady: boolean | "required_fk" | "optional" | "no";
  risk: "LOW" | "MEDIUM" | "HIGH";
};

export type MedicationEngineMaturityRow = {
  domain: string;
  currentCapability: string;
  gaps: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  maturityScore: 0 | 1 | 2 | 3 | 4 | 5;
  recommendation: string;
};

export type MedicationOrderabilityPipelineStep = {
  step: string;
  requiredData: string;
  currentSource: string;
  failureMode: string;
  userFacingEffect: string;
};

export type MedicationOrderabilityGapCategory = {
  category: string;
  count: number;
  exampleMeds: string[];
  risk: "LOW" | "MEDIUM" | "HIGH";
};

export type HospitalCoreCoverageStatus =
  | "READY"
  | "PARTIAL"
  | "MISSING"
  | "RESTRICTED_REVIEW_REQUIRED";

export type HospitalCoreMedicationCoverageRow = {
  groupId: HospitalMedicationCoverageGroupId;
  group: string;
  expectedExamples: string[];
  presentInCatalog: number;
  providerOrderable: number;
  marReady: number;
  missing: string[];
  restricted: number;
  needsReview: boolean;
  status: HospitalCoreCoverageStatus;
};

export type MedicationOrderabilityGovernanceFieldDesign = {
  field: string;
  type: string;
  required: boolean;
  notes: string;
};

export type ProviderMedicationCatalogMaturityAuditReport = {
  ticket: "MEDUI.MEDICATION_CATALOG.MATURITY_AND_ORDERABILITY_AUDIT.1";
  generatedAt: string;
  engineSourceAudit: MedicationEngineSourceRow[];
  maturityReport: MedicationEngineMaturityRow[];
  pipelineAudit: MedicationOrderabilityPipelineStep[];
  gapQuantification: MedicationOrderabilityGapCategory[];
  hospitalCoverage: HospitalCoreMedicationCoverageRow[];
  governanceDesign: MedicationOrderabilityGovernanceFieldDesign[];
  catalogButNotOrderableAnswer: string;
  summary: {
    totalMedications: number;
    orderableReady: number;
    restrictedWithReason: number;
    needsReview: number;
    undocumentedGaps: number;
    hospitalGroupsReady: number;
    hospitalGroupsPartial: number;
    maturityAverage: number;
  };
};

function catalogSearchBlob(record: MedicationOrderabilityRecord): string {
  return [record.genericName, record.displayNameEn, record.displayNameFr, record.catalogCode]
    .join(" ")
    .toLowerCase();
}

export function buildMedicationEngineSourceAudit(): MedicationEngineSourceRow[] {
  const catalogRows = buildMedicationCatalogSourceAudit({
    haitiCatalog: HAITI_MEDICATION_FORMULARY_CATALOG.length,
    wave1: ENTERPRISE_WAVE1_FORMULARY_MANIFEST.length,
    wave2: ENTERPRISE_WAVE2_FORMULARY_MANIFEST.length,
    wave3: ENTERPRISE_WAVE3_FORMULARY_MANIFEST.length,
    wave4: ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.length,
    pilotTrancheA: ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_CATALOG_CODES.length,
    vaccineCatalogSeed: 8,
  });

  const serviceRows: MedicationEngineSourceRow[] = [
    {
      source: "Provider order search API",
      fileOrModel: "apps/api/src/order-catalog/order-catalog.controller.ts GET /catalog/medications/search",
      purpose: "Provider medication order typeahead",
      count: "runtime",
      providerOrderable: "gated",
      marReady: "no",
      pharmacyReady: "no",
      risk: "MEDIUM",
    },
    {
      source: "Medication catalog search service",
      fileOrModel: "apps/api/src/medication-catalog/medication-catalog.service.ts",
      purpose: "CatalogMedication query + canonical gate filter",
      count: "runtime",
      providerOrderable: "gated",
      marReady: "no",
      pharmacyReady: "no",
      risk: "MEDIUM",
    },
    {
      source: "Activation governance service",
      fileOrModel: "apps/api/src/medication-master/medication-product-activation-governance.service.ts",
      purpose: "filterProviderSearchCatalogIds + staged enable-order-search",
      count: "runtime",
      providerOrderable: "gated",
      marReady: "via_orders",
      pharmacyReady: "optional",
      risk: "HIGH",
    },
    {
      source: "MAR administration",
      fileOrModel: "apps/web/src/components/encounters/MedicationAdministrationTab.tsx",
      purpose: "Nurse medication administration + injection documentation",
      count: "runtime",
      providerOrderable: "no",
      marReady: "via_orders",
      pharmacyReady: "no",
      risk: "MEDIUM",
    },
    {
      source: "Pharmacy inventory",
      fileOrModel: "apps/api/src/pharmacy-inventory/pharmacy-inventory.service.ts",
      purpose: "InventoryItem.catalogMedicationId linkage",
      count: "runtime",
      providerOrderable: "no",
      marReady: "no",
      pharmacyReady: "required_fk",
      risk: "MEDIUM",
    },
    {
      source: "Medication governance admin",
      fileOrModel: "apps/web/src/lib/medicationMasterGovernanceApi.ts",
      purpose: "Duplicates, warnings, unmapped NDC review",
      count: "runtime",
      providerOrderable: "no",
      marReady: "no",
      pharmacyReady: "optional",
      risk: "LOW",
    },
    {
      source: "High-risk medication review",
      fileOrModel: "apps/api/src/medication-master/high-risk-medication-review.service.ts",
      purpose: "High-alert governance before activation",
      count: "runtime",
      providerOrderable: "gated",
      marReady: "via_orders",
      pharmacyReady: "optional",
      risk: "HIGH",
    },
    {
      source: "Tdap administration workflow (design)",
      fileOrModel: "packages/shared/src/medication/tdapVaccineAdministration.ts",
      purpose: "Vaccine MAR documentation + auto-note (not yet wired to MAR tab)",
      count: 1,
      providerOrderable: "gated",
      marReady: "via_orders",
      pharmacyReady: "optional",
      risk: "MEDIUM",
    },
  ];

  return [
    ...catalogRows.map((r) => ({
      source: r.source,
      fileOrModel: r.fileOrModel,
      purpose: r.notes,
      count: r.count,
      providerOrderable: (r.orderable === true
        ? true
        : r.orderable === false
          ? false
          : "gated") as MedicationEngineSourceRow["providerOrderable"],
      marReady: r.mar,
      pharmacyReady: r.pharmacy,
      risk: r.risk,
    })),
    ...serviceRows,
  ];
}

export function buildMedicationEngineMaturityReport(): MedicationEngineMaturityRow[] {
  return [
    {
      domain: "Medication master/catalog",
      currentCapability: "Dual model: Haiti CatalogMedication seed (251) + enterprise waves (477) + canonical MedicationProduct",
      gaps: "No single unified runtime master; static manifests vs DB can drift",
      risk: "MEDIUM",
      maturityScore: 3,
      recommendation: "Keep staged manifests; run certification audit before each activation tranche",
    },
    {
      domain: "Formulary activation",
      currentCapability: "Governed pipeline: approve-formulary → enable-order-search → enable-mar",
      gaps: "Most enterprise rows remain inactive until explicit activation",
      risk: "LOW",
      maturityScore: 4,
      recommendation: "Continue tranche-based activation; never bulk-enable",
    },
    {
      domain: "Provider order search",
      currentCapability: "GET /catalog/medications/search with canonical gate filter",
      gaps: "Only Haiti active + 12 pilot tranche A codes order-search-ready by default",
      risk: "MEDIUM",
      maturityScore: 3,
      recommendation: "Expand pilot tranches with pharmacist sign-off per medication class",
    },
    {
      domain: "Facility formulary mapping",
      currentCapability: "FacilityFormularyItem.isOnFormulary required for gated search",
      gaps: "Runtime mapping not represented in static audit universe",
      risk: "MEDIUM",
      maturityScore: 3,
      recommendation: "Add facility-scoped audit endpoint (future); static audit flags mapping as runtime gap",
    },
    {
      domain: "Dose/route/form/strength normalization",
      currentCapability: "deriveMedicationCatalogCode + administrationType + localization validation",
      gaps: "Some catalog codes embed duplicate form/route tokens (e.g. Tdap INJECTABLE_INJECTABLEINTRAMUSCULAR)",
      risk: "MEDIUM",
      maturityScore: 3,
      recommendation: "Normalize display vs code; preserve code for FK stability",
    },
    {
      domain: "Pharmacy review workflow",
      currentCapability: "requiresPharmacyVerification on enterprise governance; NDC review gates",
      gaps: "Not all catalog rows have pharmacy review flag surfaced in UI search",
      risk: "MEDIUM",
      maturityScore: 3,
      recommendation: "Surface review requirement in order dialog when RESTRICTED",
    },
    {
      domain: "MAR administration workflow",
      currentCapability: "MedicationAdministrationTab with injection sites, infusion, opioid flows",
      gaps: "Tdap vaccine-specific form exists but not mounted in MAR tab",
      risk: "MEDIUM",
      maturityScore: 3,
      recommendation: "Wire TdapVaccineAdministrationForm when catalogCode matches TDAP",
    },
    {
      domain: "Inventory/NDC linkage",
      currentCapability: "InventoryItem.catalogMedicationId FK; billing NDC manifests",
      gaps: "Enterprise vaccines may lack inventory linkage until pharmacy setup",
      risk: "MEDIUM",
      maturityScore: 3,
      recommendation: "Require NDC review gate before vaccine order-search activation",
    },
    {
      domain: "High-risk medication governance",
      currentCapability: "isHighAlert flags + HighRiskMedicationReviewService",
      gaps: "Static audit cannot verify runtime review completion",
      risk: "HIGH",
      maturityScore: 4,
      recommendation: "Block enable-order-search for high-alert until review recorded",
    },
    {
      domain: "Controlled substance restrictions",
      currentCapability: "isControlled → RESTRICTED_WITH_REASON + witness/double-sign MAR requirements",
      gaps: "Haiti controlled rows marked restricted; enterprise controlled blocked",
      risk: "HIGH",
      maturityScore: 4,
      recommendation: "Never auto-activate controlled substances",
    },
    {
      domain: "Vaccine administration support",
      currentCapability: "Tdap workflow types + manufacturer catalog + VIS governance",
      gaps: "VaccineCatalog (public health) separate; Tdap restricted until activation",
      risk: "MEDIUM",
      maturityScore: 3,
      recommendation: "Activate Tdap via governance UI after pharmacy + workflow certification",
    },
    {
      domain: "Billing/NDC support",
      currentCapability: "enterpriseWave*billing manifests; HCPCS/CVX for vaccines",
      gaps: "Billing readiness not automatic for all catalog rows",
      risk: "LOW",
      maturityScore: 3,
      recommendation: "Keep billing review as activation gate",
    },
    {
      domain: "Import/update pipeline",
      currentCapability: "MedicationFormularyImportStaging with importGateStatus",
      gaps: "Staging rows never silently promoted",
      risk: "LOW",
      maturityScore: 4,
      recommendation: "Maintain explicit promotion workflow",
    },
    {
      domain: "Duplicate detection",
      currentCapability: "Medication governance duplicates API + staging reconciliation",
      gaps: "Static manifests may overlap Haiti + enterprise codes",
      risk: "MEDIUM",
      maturityScore: 3,
      recommendation: "Resolve duplicates before activation",
    },
    {
      domain: "i18n support",
      currentCapability: "displayNameEn/Fr on catalog; medicationClinicalDisplayLocale",
      gaps: "Some enterprise display names identical EN/FR for vaccines",
      risk: "LOW",
      maturityScore: 4,
      recommendation: "Continue EN/FR parity validation on new entries",
    },
    {
      domain: "Audit logging",
      currentCapability: "Governance activation notes; MAR administration records",
      gaps: "No single orderability-status change audit trail in static layer",
      risk: "MEDIUM",
      maturityScore: 3,
      recommendation: "Log activation gate transitions with clinician note (existing pattern)",
    },
  ];
}

export function buildMedicationOrderabilityPipelineAudit(): MedicationOrderabilityPipelineStep[] {
  return [
    {
      step: "1. Catalog row exists",
      requiredData: "catalogCode, genericName, strength, dosageForm, route",
      currentSource: "haitiMedicationFormularyCatalog.ts / enterpriseWave*FormularyManifest.ts → CatalogMedication seed",
      failureMode: "Medication never seeded to DB",
      userFacingEffect: "Medication invisible everywhere",
    },
    {
      step: "2. Active flag",
      requiredData: "CatalogMedication.isActive / concept.isActive",
      currentSource: "Haiti row isActive; canonical MedicationConcept.isActive",
      failureMode: "isActive=false",
      userFacingEffect: "Excluded from search unless legacy preservation",
    },
    {
      step: "3. Canonical product linkage",
      requiredData: "MedicationProduct.legacyCatalogMedicationId",
      currentSource: "medication-master seed / import promotion",
      failureMode: "No canonical product",
      userFacingEffect: "Legacy Haiti rows may still search; enterprise CREATE rows invisible until seeded",
    },
    {
      step: "4. Formulary approval",
      requiredData: "FacilityFormularyItem.isOnFormulary",
      currentSource: "medication-product-activation-governance approve-formulary",
      failureMode: "FORMULARY_NOT_APPROVED",
      userFacingEffect: "Filtered from provider search",
    },
    {
      step: "5. Order search activation",
      requiredData: "governanceNotes.orderSearchEnabled",
      currentSource: "enable-order-search governance action",
      failureMode: "ORDER_SEARCH_NOT_ENABLED",
      userFacingEffect: "Exists in catalog admin but not in provider typeahead",
    },
    {
      step: "6. Provider search API",
      requiredData: "GET /catalog/medications/search + filterProviderSearchCatalogIds",
      currentSource: "order-catalog.controller.ts + medication-catalog.service.ts",
      failureMode: "Gate evaluation failure / inactive / duplicate blocked",
      userFacingEffect: "Provider cannot find medication when ordering",
    },
    {
      step: "7. Order template / dose options",
      requiredData: "strength, route, administrationType, defaultDoseOptions",
      currentSource: "CatalogMedication fields + order UI",
      failureMode: "Missing route or unsafe administration type",
      userFacingEffect: "Order blocked or requires manual entry",
    },
    {
      step: "8. Pharmacy review",
      requiredData: "requiresPharmacyVerification, NDC review",
      currentSource: "enterprise governance + activation gates",
      failureMode: "NDC_REVIEW_REQUIRED / pharmacy not verified",
      userFacingEffect: "Order may pend pharmacy verification",
    },
    {
      step: "9. MAR administration",
      requiredData: "MedicationOrder + marEnabled + documentation requirements",
      currentSource: "MedicationAdministrationTab",
      failureMode: "marEnabled=false or order not placed",
      userFacingEffect: "Cannot document administration on MAR",
    },
    {
      step: "10. Billing/NDC readiness",
      requiredData: "NDC, HCPCS/CVX for vaccines",
      currentSource: "enterpriseWave*billingManifest.ts",
      failureMode: "BILLING_REVIEW_REQUIRED",
      userFacingEffect: "Charge capture may be incomplete",
    },
  ];
}

export const CATALOG_BUT_NOT_ORDERABLE_ANSWER =
  "A medication can exist in Medora static/runtime catalogs but not appear for provider ordering when any activation gate fails: inactive catalog row, enterprise row not yet seeded, formulary not approved for the facility, orderSearchEnabled=false, canonical duplicate governance unresolved, controlled/high-alert/vaccine restriction without explicit activation, or medication exists only in import staging or separate VaccineCatalog (public health) rather than CatalogMedication.";

function exampleMeds(
  records: MedicationOrderabilityRecord[],
  predicate: (r: MedicationOrderabilityRecord) => boolean,
  limit = 3
): string[] {
  return records.filter(predicate).slice(0, limit).map((r) => r.displayNameEn || r.genericName);
}

export function quantifyMedicationOrderabilityGaps(
  records: Map<string, MedicationOrderabilityRecord>
): MedicationOrderabilityGapCategory[] {
  const all = [...records.values()];

  const byStatus = (status: MedicationOrderabilityStatus) =>
    all.filter((r) => r.orderabilityStatus === status).length;

  const haitiActive = HAITI_MEDICATION_FORMULARY_CATALOG.filter((r) => r.isActive).length;
  const haitiInactive = HAITI_MEDICATION_FORMULARY_CATALOG.filter((r) => !r.isActive).length;

  return [
    {
      category: "total_medication_master_rows",
      count: all.length,
      exampleMeds: exampleMeds(all, () => true),
      risk: "LOW",
    },
    {
      category: "active_catalog_rows",
      count: haitiActive + all.filter((r) => r.source === "enterprise" || r.source === "both").length,
      exampleMeds: exampleMeds(all, (r) => r.orderabilityStatus === "ORDERABLE_READY"),
      risk: "LOW",
    },
    {
      category: "inactive_catalog_rows",
      count: haitiInactive,
      exampleMeds: exampleMeds(
        all,
        (r) => r.orderabilityStatus === "CATALOG_ONLY_NOT_ORDERABLE" && Boolean(r.notOrderableReason?.includes("Inactive"))
      ),
      risk: "LOW",
    },
    {
      category: "orderable_rows",
      count: all.filter(isProviderOrderSearchCandidate).length,
      exampleMeds: exampleMeds(all, isProviderOrderSearchCandidate),
      risk: "LOW",
    },
    {
      category: "not_orderable_rows",
      count: all.filter((r) => !isProviderOrderSearchCandidate(r)).length,
      exampleMeds: exampleMeds(all, (r) => !isProviderOrderSearchCandidate(r)),
      risk: "MEDIUM",
    },
    {
      category: "restricted_rows",
      count: byStatus("RESTRICTED_WITH_REASON"),
      exampleMeds: exampleMeds(all, (r) => r.orderabilityStatus === "RESTRICTED_WITH_REASON"),
      risk: "HIGH",
    },
    {
      category: "missing_route",
      count: all.filter((r) => !r.route?.trim()).length,
      exampleMeds: exampleMeds(all, (r) => !r.route?.trim()),
      risk: "MEDIUM",
    },
    {
      category: "missing_strength",
      count: all.filter((r) => !r.strength?.trim()).length,
      exampleMeds: exampleMeds(all, (r) => !r.strength?.trim()),
      risk: "MEDIUM",
    },
    {
      category: "missing_dose_form",
      count: all.filter((r) => !r.dosageForm?.trim()).length,
      exampleMeds: exampleMeds(all, (r) => !r.dosageForm?.trim()),
      risk: "MEDIUM",
    },
    {
      category: "missing_facility_mapping",
      count: all.length,
      exampleMeds: ["(runtime — all rows require FacilityFormularyItem at activation)"],
      risk: "MEDIUM",
    },
    {
      category: "missing_order_template",
      count: all.filter((r) => !r.defaultDoseOptions?.length && !r.strength?.trim()).length,
      exampleMeds: exampleMeds(all, (r) => !r.defaultDoseOptions?.length && !r.strength?.trim()),
      risk: "MEDIUM",
    },
    {
      category: "missing_mar_documentation_requirements",
      count: all.filter((r) => r.marDocumentationRequirements.length === 0 && r.orderabilityStatus === "RESTRICTED_WITH_REASON").length,
      exampleMeds: exampleMeds(all, (r) => r.marDocumentationRequirements.length === 0),
      risk: "MEDIUM",
    },
    {
      category: "missing_inventory_ndc_linkage",
      count: all.filter((r) => !r.inventoryNdcLinked && r.source === "enterprise").length,
      exampleMeds: exampleMeds(all, (r) => !r.inventoryNdcLinked && r.source === "enterprise"),
      risk: "MEDIUM",
    },
    {
      category: "duplicate_or_ambiguous_rows",
      count: all.filter((r) => r.catalogCode.includes("INJECTABLE_INJECTABLE") || r.catalogCode.includes("__")).length,
      exampleMeds: exampleMeds(all, (r) => r.catalogCode.includes("INJECTABLE_INJECTABLE")),
      risk: "MEDIUM",
    },
    {
      category: "needs_pharmacist_review",
      count: all.filter((r) => r.requiresPharmacyReview).length,
      exampleMeds: exampleMeds(all, (r) => r.requiresPharmacyReview),
      risk: "HIGH",
    },
    {
      category: "needs_clinical_review",
      count: all.filter((r) => r.requiresClinicalReview).length,
      exampleMeds: exampleMeds(all, (r) => r.requiresClinicalReview),
      risk: "HIGH",
    },
    {
      category: "needs_review_status",
      count: byStatus("NEEDS_CLINICAL_REVIEW"),
      exampleMeds: exampleMeds(all, (r) => r.orderabilityStatus === "NEEDS_CLINICAL_REVIEW"),
      risk: "HIGH",
    },
    {
      category: "undocumented_non_orderable",
      count: all.filter((r) => !medicationHasDocumentedNonOrderableReason(r) && r.orderabilityStatus !== "ORDERABLE_READY").length,
      exampleMeds: exampleMeds(
        all,
        (r) => !medicationHasDocumentedNonOrderableReason(r) && r.orderabilityStatus !== "ORDERABLE_READY"
      ),
      risk: "HIGH",
    },
  ];
}

export function buildHospitalCoreMedicationCoverageAudit(
  records: Map<string, MedicationOrderabilityRecord>
): HospitalCoreMedicationCoverageRow[] {
  return HOSPITAL_MEDICATION_COVERAGE_GROUPS.map((group) => {
    const matched = new Set<string>();
    let providerOrderable = 0;
    let marReady = 0;
    let restricted = 0;

    for (const [code, record] of records) {
      const blob = catalogSearchBlob(record);
      const tokenHit = group.expectedTokens.some((t) => blob.includes(t.toLowerCase()));
      const explicitHit = group.explicitCatalogCodes?.includes(code) ?? false;
      if (tokenHit || explicitHit) {
        matched.add(code);
        if (isProviderOrderSearchCandidate(record)) providerOrderable += 1;
        if (record.marEnabled || record.orderabilityStatus === "ORDERABLE_READY") marReady += 1;
        if (record.orderabilityStatus === "RESTRICTED_WITH_REASON") restricted += 1;
      }
    }

    const missing = group.expectedTokens.filter((token) => {
      const hit = [...records.values()].some((r) => catalogSearchBlob(r).includes(token.toLowerCase()));
      return !hit;
    });

    const presentInCatalog = matched.size;
    const needsReview = missing.length > 0 || (restricted > 0 && providerOrderable === 0);

    let status: HospitalCoreCoverageStatus;
    if (presentInCatalog === 0) {
      status = "MISSING";
    } else if (restricted > 0 && providerOrderable === 0 && presentInCatalog > 0) {
      status = "RESTRICTED_REVIEW_REQUIRED";
    } else if (missing.length === 0 && presentInCatalog > 0) {
      status = "READY";
    } else {
      status = "PARTIAL";
    }

    return {
      groupId: group.groupId,
      group: group.labelEn,
      expectedExamples: [...group.expectedTokens],
      presentInCatalog,
      providerOrderable,
      marReady,
      missing,
      restricted,
      needsReview,
      status,
    };
  });
}

export function buildMedicationOrderabilityGovernanceDesign(): MedicationOrderabilityGovernanceFieldDesign[] {
  return [
    { field: "orderabilityStatus", type: "ORDERABLE | RESTRICTED | NOT_ORDERABLE | CATALOG_ONLY | NEEDS_REVIEW", required: true, notes: "Maps to MedicationOrderabilityStatus in static audit" },
    { field: "restrictedReason", type: "string | null", required: false, notes: "Required when RESTRICTED" },
    { field: "notOrderableReason", type: "string | null", required: false, notes: "Required when NOT_ORDERABLE or CATALOG_ONLY" },
    { field: "allowedCareSettings", type: "MedicationCareSetting[]", required: true, notes: "ED, INPATIENT, OUTPATIENT, MAR, PHARMACY" },
    { field: "allowedRoutes", type: "string[]", required: true, notes: "Normalized PO/IM/IV/SQ" },
    { field: "doseForm", type: "string", required: true, notes: "dosageForm on catalog row" },
    { field: "strength", type: "string", required: true, notes: "Display strength" },
    { field: "defaultDoseOptions", type: "string[] | undefined", required: false, notes: "Only when clinically safe defaults exist" },
    { field: "requiresPharmacyReview", type: "boolean", required: true, notes: "From enterprise governance.requiresPharmacyVerification" },
    { field: "requiresClinicalReview", type: "boolean", required: true, notes: "High-alert, controlled, anticoagulation" },
    { field: "highRiskFlag", type: "boolean", required: true, notes: "governance.isHighAlert" },
    { field: "controlledSubstanceFlag", type: "boolean", required: true, notes: "governance.isControlled" },
    { field: "vaccineFlag", type: "boolean", required: true, notes: "bucket === VACCINE" },
    { field: "marDocumentationRequirements", type: "string[]", required: true, notes: "e.g. injection_site, lot, expiration, witness" },
    { field: "inventoryRequired", type: "boolean", required: true, notes: "Pharmacy dispense workflows" },
    { field: "ndcRequired", type: "boolean", required: true, notes: "Billing activation gate" },
    { field: "billingReady", type: "boolean", required: true, notes: "From billing manifest validation" },
    { field: "facilityFormularyStatus", type: "runtime: isOnFormulary", required: true, notes: "Per-facility; not in static manifest" },
    { field: "orderSearchEnabled", type: "boolean", required: true, notes: "Runtime governanceNotes flag" },
    { field: "marEnabled", type: "boolean", required: true, notes: "Runtime governanceNotes flag" },
  ];
}

export function runProviderMedicationCatalogMaturityAudit(): ProviderMedicationCatalogMaturityAuditReport {
  const records = buildUnifiedOrderabilityMap();
  const all = [...records.values()];
  const gapQuantification = quantifyMedicationOrderabilityGaps(records);
  const hospitalCoverage = buildHospitalCoreMedicationCoverageAudit(records);
  const maturityReport = buildMedicationEngineMaturityReport();
  const maturityAverage =
    maturityReport.reduce((sum, r) => sum + r.maturityScore, 0) / maturityReport.length;

  const undocumented = all.filter(
    (r) => r.orderabilityStatus !== "ORDERABLE_READY" && !medicationHasDocumentedNonOrderableReason(r)
  );

  return {
    ticket: "MEDUI.MEDICATION_CATALOG.MATURITY_AND_ORDERABILITY_AUDIT.1",
    generatedAt: new Date().toISOString(),
    engineSourceAudit: buildMedicationEngineSourceAudit(),
    maturityReport,
    pipelineAudit: buildMedicationOrderabilityPipelineAudit(),
    gapQuantification,
    hospitalCoverage,
    governanceDesign: buildMedicationOrderabilityGovernanceDesign(),
    catalogButNotOrderableAnswer: CATALOG_BUT_NOT_ORDERABLE_ANSWER,
    summary: {
      totalMedications: all.length,
      orderableReady: all.filter((r) => r.orderabilityStatus === "ORDERABLE_READY").length,
      restrictedWithReason: all.filter((r) => r.orderabilityStatus === "RESTRICTED_WITH_REASON").length,
      needsReview: all.filter((r) => r.orderabilityStatus === "NEEDS_CLINICAL_REVIEW").length,
      undocumentedGaps: undocumented.length,
      hospitalGroupsReady: hospitalCoverage.filter((g) => g.status === "READY").length,
      hospitalGroupsPartial: hospitalCoverage.filter((g) => g.status === "PARTIAL").length,
      maturityAverage: Math.round(maturityAverage * 10) / 10,
    },
  };
}
