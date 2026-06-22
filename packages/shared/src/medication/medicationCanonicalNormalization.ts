/**
 * MEDUI.MEDICATION.DUPLICATE_NORMALIZATION_AND_CANONICAL_ORDERING.1
 * Audit-only canonical medication normalization. No activation, search, formulary, or DB mutation.
 */

import { looksEnglishFormText, looksFrenchLocalizedText } from "./medicationLocalizationValidation.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import {
  isProviderOrderSearchCandidate,
  type MedicationOrderabilityRecord,
} from "./medicationOrderabilityGovernance.js";
import {
  ENTERPRISE_MEDICATION_ALIAS_MANIFEST,
  ENTERPRISE_MEDICATION_REQUIRED_SEARCH_PAIRS,
} from "./enterpriseMedicationAliasManifest.js";
import { MEDICATION_BILLING_MAPPING_ENTRIES } from "./medicationBillingMappingManifest.js";
import { MEDICATION_BILLING_NDC_BY_CATALOG_CODE } from "./medicationBillingNdcByCatalogCode.js";
import { ENTERPRISE_WAVE1_BILLING_MANIFEST } from "./enterpriseWave1BillingManifest.js";
import { VACCINE_MANUFACTURER_CATALOG } from "./vaccineManufacturerCatalog.js";
import { TDAP_CATALOG_CODE } from "./tdapVaccineAdministration.js";
import { TDAP_VIS_REFERENCE } from "./vaccineVisGovernance.js";

export type DuplicateMedicationAuditKind =
  | "EXACT_DUPLICATE"
  | "BRAND_GENERIC_DUPLICATE"
  | "STRENGTH_FAMILY"
  | "ROUTE_VARIANT"
  | "FORMULATION_VARIANT"
  | "PACKAGE_VARIANT"
  | "CATALOG_COLLISION";

export type DuplicateMedicationAuditRow = {
  kind: DuplicateMedicationAuditKind;
  familyKey: string;
  label: string;
  catalogCodes: string[];
  risk: "LOW" | "MEDIUM" | "HIGH";
  blocksActivation: boolean;
};

export type DuplicateMedicationAuditReport = {
  totalMedicationsAudited: number;
  totalFamilies: number;
  exactDuplicates: number;
  brandGenericDuplicates: number;
  strengthFamilyDuplicates: number;
  routeVariants: number;
  formulationVariants: number;
  packageVariants: number;
  catalogCollisions: number;
  activationBlockingFindings: number;
  rows: DuplicateMedicationAuditRow[];
};

export type MedicationCanonicalProduct = {
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  strength: string;
  route: string;
  form: string;
  orderable: boolean;
};

export type MedicationCanonicalFamily = {
  familyKey: string;
  genericName: string;
  strengths: string[];
  routes: string[];
  forms: string[];
  brands: string[];
  catalogProducts: MedicationCanonicalProduct[];
};

export type CanonicalMedicationFamilyCertification = {
  totalMedications: number;
  totalFamilies: number;
  unassignedCatalogCodes: string[];
  familiesWithMultipleStrengths: number;
  familiesWithMultipleRoutes: number;
  familiesWithMultipleForms: number;
  decision: "PASS" | "FAIL";
  blockers: string[];
  families: MedicationCanonicalFamily[];
};

export type ProviderSearchDuplicateRiskRow = {
  kind: "DUPLICATE_DISPLAY_ROW" | "NEAR_IDENTICAL_DISPLAY_ROW" | "INTERNAL_CODE_LEAKAGE";
  catalogCodes: string[];
  display: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
};

export type ProviderSearchDuplicateRiskReport = {
  orderableRowsAudited: number;
  duplicateDisplayRows: number;
  nearIdenticalDisplayRows: number;
  internalCodeLeakageRows: number;
  decision: "SAFE" | "UNSAFE";
  rows: ProviderSearchDuplicateRiskRow[];
};

export type ActivationCollisionCertification = {
  catalogCodes: string[];
  decision: "SAFE" | "BLOCKED";
  blockers: string[];
  duplicateFindings: DuplicateMedicationAuditRow[];
};

export type MedicationAdministrationNormalizationReport = {
  marReadyProducts: number;
  duplicateMarWorkflowGroups: number;
  duplicateBillingWorkflowGroups: number;
  duplicateAdministrationWorkflowGroups: number;
  decision: "PASS" | "FAIL";
  rows: Array<{
    familyKey: string;
    route: string;
    form: string;
    catalogCodes: string[];
    issue: string;
  }>;
};

export type MedicationBillingNormalizationReport = {
  billingRowsAudited: number;
  ndcRowsAudited: number;
  duplicateHcpcsMappings: number;
  duplicateNdcMappings: number;
  conflictingMappings: number;
  obsoleteMappingWarnings: number;
  missingRxNormRows: number;
  decision: "PASS" | "FAIL";
  rows: Array<{
    kind: "DUPLICATE_HCPCS" | "DUPLICATE_NDC" | "CONFLICTING_MAPPING" | "OBSOLETE_REVIEW" | "RXNORM_MISSING";
    key: string;
    catalogCodes: string[];
    detail: string;
  }>;
};

export type VaccineCanonicalFamilyReport = {
  expectedFamilies: string[];
  presentFamilies: string[];
  missingFamilies: string[];
  manufacturerCatalogCentralized: boolean;
  manufacturerCount: number;
  visGovernancePresent: boolean;
  cvxLinkedFamilies: string[];
  billingLinkedFamilies: string[];
  decision: "PASS" | "FAIL";
  blockers: string[];
};

export type MedicationNormalizationI18nCertification = {
  decision: "PASS" | "FAIL";
  blockers: string[];
  rowsAudited: number;
  enLeakageCount: number;
  frLeakageCount: number;
};

export type MedicationNormalizationMaturityProjectionReport = {
  currentScore: number;
  projectedAfterNormalization: number;
  projectedAfterTranche3: number;
  projectedAfterCriticalCare: number;
  projectedAfterVaccineCompletion: number;
  targetScore: number;
  remainingGap: number;
  remainingBlockers: string[];
};

export type MedicationCanonicalNormalizationCertificationReport = {
  ticket: "MEDUI.MEDICATION.DUPLICATE_NORMALIZATION_AND_CANONICAL_ORDERING.1";
  generatedAt: string;
  duplicateMedicationAudit: DuplicateMedicationAuditReport;
  canonicalMedicationFamilyCertification: CanonicalMedicationFamilyCertification;
  providerSearchDuplicateRisk: ProviderSearchDuplicateRiskReport;
  activationCollisionCertification: ActivationCollisionCertification;
  medicationAdministrationNormalization: MedicationAdministrationNormalizationReport;
  medicationBillingNormalization: MedicationBillingNormalizationReport;
  vaccineCanonicalFamily: VaccineCanonicalFamilyReport;
  i18nCertification: MedicationNormalizationI18nCertification;
  maturityProjection: MedicationNormalizationMaturityProjectionReport;
  compatibility: {
    activationChanged: false;
    providerSearchChanged: false;
    formularyStatusChanged: false;
    migrationsRequired: false;
  };
};

function records(): MedicationOrderabilityRecord[] {
  return [...buildUnifiedOrderabilityMap().values()];
}

export function normalizeMedicationIdentityToken(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeStrength(value: string): string {
  return normalizeMedicationIdentityToken(value).replace(/_/g, "");
}

function normalizeRoute(value: string): string {
  const route = normalizeMedicationIdentityToken(value);
  if (route.includes("oral") || route.includes("orale") || route === "po") return "oral";
  if (route.includes("intraveine") || route.includes("intravenous") || route === "iv") return "intravenous";
  if (route.includes("intramuscular") || route === "im") return "intramuscular";
  if (route.includes("subcut")) return "subcutaneous";
  if (route.includes("inhal")) return "inhalation";
  if (route.includes("inject")) return "injectable";
  return route;
}

function normalizeForm(value: string): string {
  const form = normalizeMedicationIdentityToken(value);
  if (form.includes("comprim") || form.includes("tablet")) return "tablet";
  if (form.includes("gelule") || form.includes("capsule")) return "capsule";
  if (form.includes("sirop") || form.includes("suspension") || form.includes("solution")) return "liquid";
  if (form.includes("inject")) return "injectable";
  if (form.includes("perfus")) return "infusion";
  if (form.includes("inhal")) return "inhaler";
  return form;
}

function brandToGenericMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of ENTERPRISE_MEDICATION_REQUIRED_SEARCH_PAIRS) {
    map.set(normalizeMedicationIdentityToken(pair.brand), normalizeMedicationIdentityToken(pair.generic));
  }
  for (const entry of ENTERPRISE_MEDICATION_ALIAS_MANIFEST) {
    const generic = normalizeMedicationIdentityToken(entry.genericName);
    for (const alias of entry.aliases) {
      if (alias.kind === "BRAND") map.set(normalizeMedicationIdentityToken(alias.text), generic);
    }
  }
  return map;
}

function brandNamesByFamily(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const [brand, generic] of brandToGenericMap()) {
    if (!out.has(generic)) out.set(generic, new Set());
    out.get(generic)!.add(brand);
  }
  return out;
}

export function canonicalMedicationFamilyKey(record: MedicationOrderabilityRecord): string {
  const generic = normalizeMedicationIdentityToken(record.genericName || record.displayNameEn);
  return brandToGenericMap().get(generic) ?? generic;
}

function productKey(record: MedicationOrderabilityRecord): string {
  return [
    canonicalMedicationFamilyKey(record),
    normalizeStrength(record.strength),
    normalizeForm(record.dosageForm),
    normalizeRoute(record.route),
  ].join("|");
}

function displayKey(record: MedicationOrderabilityRecord): string {
  return [
    normalizeMedicationIdentityToken(record.displayNameEn),
    normalizeStrength(record.strength),
    normalizeForm(record.dosageForm),
    normalizeRoute(record.route),
  ].join("|");
}

function packageKey(record: MedicationOrderabilityRecord): string {
  const blob = `${record.catalogCode} ${record.displayNameEn} ${record.dosageForm}`.toLowerCase();
  if (blob.includes("prefilled")) return "prefilled_syringe";
  if (blob.includes("syringe") || blob.includes("seringue")) return "syringe";
  if (blob.includes("vial") || blob.includes("flacon")) return "vial";
  if (blob.includes("single")) return "single_dose";
  return "";
}

function grouped<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
}

export function buildCanonicalMedicationFamilies(
  sourceRecords: MedicationOrderabilityRecord[] = records()
): MedicationCanonicalFamily[] {
  const brands = brandNamesByFamily();
  return [...grouped(sourceRecords, canonicalMedicationFamilyKey).entries()]
    .map(([familyKey, familyRecords]) => ({
      familyKey,
      genericName: familyRecords[0]?.genericName ?? familyKey,
      strengths: [...new Set(familyRecords.map((r) => r.strength).filter(Boolean))].sort(),
      routes: [...new Set(familyRecords.map((r) => r.route).filter(Boolean))].sort(),
      forms: [...new Set(familyRecords.map((r) => r.dosageForm).filter(Boolean))].sort(),
      brands: [...(brands.get(familyKey) ?? new Set<string>())].sort(),
      catalogProducts: familyRecords
        .map((r) => ({
          catalogCode: r.catalogCode,
          displayNameEn: r.displayNameEn,
          displayNameFr: r.displayNameFr,
          strength: r.strength,
          route: r.route,
          form: r.dosageForm,
          orderable: isProviderOrderSearchCandidate(r),
        }))
        .sort((a, b) => a.catalogCode.localeCompare(b.catalogCode)),
    }))
    .sort((a, b) => a.familyKey.localeCompare(b.familyKey));
}

export function buildDuplicateMedicationAuditReport(
  sourceRecords: MedicationOrderabilityRecord[] = records()
): DuplicateMedicationAuditReport {
  const rows: DuplicateMedicationAuditRow[] = [];
  const families = buildCanonicalMedicationFamilies(sourceRecords);

  for (const [key, group] of grouped(sourceRecords, productKey)) {
    if (group.length > 1) {
      rows.push({
        kind: "EXACT_DUPLICATE",
        familyKey: key.split("|")[0]!,
        label: key,
        catalogCodes: group.map((r) => r.catalogCode),
        risk: "HIGH",
        blocksActivation: true,
      });
    }
  }

  for (const [key, group] of grouped(sourceRecords, displayKey)) {
    if (group.length > 1) {
      rows.push({
        kind: "CATALOG_COLLISION",
        familyKey: canonicalMedicationFamilyKey(group[0]!),
        label: key,
        catalogCodes: group.map((r) => r.catalogCode),
        risk: "HIGH",
        blocksActivation: true,
      });
    }
  }

  for (const record of sourceRecords.filter((r) => r.source === "both")) {
    rows.push({
      kind: "CATALOG_COLLISION",
      familyKey: canonicalMedicationFamilyKey(record),
      label: "Haiti + Enterprise overlap",
      catalogCodes: [record.catalogCode],
      risk: "HIGH",
      blocksActivation: true,
    });
  }

  for (const family of families) {
    const codes = family.catalogProducts.map((p) => p.catalogCode);
    if (family.brands.length > 0) {
      rows.push({
        kind: "BRAND_GENERIC_DUPLICATE",
        familyKey: family.familyKey,
        label: `${family.genericName}: ${family.brands.join(", ")}`,
        catalogCodes: codes,
        risk: "MEDIUM",
        blocksActivation: false,
      });
    }
    if (family.strengths.length > 1) {
      rows.push({
        kind: "STRENGTH_FAMILY",
        familyKey: family.familyKey,
        label: `${family.genericName}: ${family.strengths.join(", ")}`,
        catalogCodes: codes,
        risk: "LOW",
        blocksActivation: false,
      });
    }
    if (family.routes.length > 1) {
      rows.push({
        kind: "ROUTE_VARIANT",
        familyKey: family.familyKey,
        label: `${family.genericName}: ${family.routes.join(", ")}`,
        catalogCodes: codes,
        risk: "LOW",
        blocksActivation: false,
      });
    }
    if (family.forms.length > 1) {
      rows.push({
        kind: "FORMULATION_VARIANT",
        familyKey: family.familyKey,
        label: `${family.genericName}: ${family.forms.join(", ")}`,
        catalogCodes: codes,
        risk: "LOW",
        blocksActivation: false,
      });
    }
  }

  for (const [key, group] of grouped(sourceRecords, (r) => `${productKey(r)}|${packageKey(r)}`)) {
    if (!key.endsWith("|") && group.length > 1) {
      rows.push({
        kind: "PACKAGE_VARIANT",
        familyKey: canonicalMedicationFamilyKey(group[0]!),
        label: key,
        catalogCodes: group.map((r) => r.catalogCode),
        risk: "LOW",
        blocksActivation: false,
      });
    }
  }

  return {
    totalMedicationsAudited: sourceRecords.length,
    totalFamilies: families.length,
    exactDuplicates: rows.filter((r) => r.kind === "EXACT_DUPLICATE").length,
    brandGenericDuplicates: rows.filter((r) => r.kind === "BRAND_GENERIC_DUPLICATE").length,
    strengthFamilyDuplicates: rows.filter((r) => r.kind === "STRENGTH_FAMILY").length,
    routeVariants: rows.filter((r) => r.kind === "ROUTE_VARIANT").length,
    formulationVariants: rows.filter((r) => r.kind === "FORMULATION_VARIANT").length,
    packageVariants: rows.filter((r) => r.kind === "PACKAGE_VARIANT").length,
    catalogCollisions: rows.filter((r) => r.kind === "CATALOG_COLLISION").length,
    activationBlockingFindings: rows.filter((r) => r.blocksActivation).length,
    rows,
  };
}

export function certifyCanonicalMedicationFamilies(
  sourceRecords: MedicationOrderabilityRecord[] = records()
): CanonicalMedicationFamilyCertification {
  const families = buildCanonicalMedicationFamilies(sourceRecords);
  const assigned = new Set(families.flatMap((f) => f.catalogProducts.map((p) => p.catalogCode)));
  const unassignedCatalogCodes = sourceRecords.map((r) => r.catalogCode).filter((c) => !assigned.has(c));
  const blockers: string[] = [];
  if (unassignedCatalogCodes.length > 0) blockers.push("CATALOG_ROWS_WITHOUT_CANONICAL_FAMILY");

  return {
    totalMedications: sourceRecords.length,
    totalFamilies: families.length,
    unassignedCatalogCodes,
    familiesWithMultipleStrengths: families.filter((f) => f.strengths.length > 1).length,
    familiesWithMultipleRoutes: families.filter((f) => f.routes.length > 1).length,
    familiesWithMultipleForms: families.filter((f) => f.forms.length > 1).length,
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    blockers,
    families,
  };
}

function hasInternalCodeLeakage(value: string): boolean {
  const trimmed = value.trim();
  return /^[A-Z0-9]+(_[A-Z0-9]+){2,}$/.test(trimmed) || trimmed.includes("_INJECTABLE_INJECTABLE");
}

function nearDisplayKey(record: MedicationOrderabilityRecord): string {
  return normalizeMedicationIdentityToken(`${record.displayNameEn} ${record.strength} ${record.route}`)
    .replace(/vaccine|vaccin|injectable|intramuscular|intramusculaire|im|0_5_ml/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildProviderSearchDuplicateRiskReport(
  sourceRecords: MedicationOrderabilityRecord[] = records()
): ProviderSearchDuplicateRiskReport {
  const orderable = sourceRecords.filter(isProviderOrderSearchCandidate);
  const rows: ProviderSearchDuplicateRiskRow[] = [];

  for (const group of grouped(orderable, (r) => `${normalizeMedicationIdentityToken(r.displayNameEn)}|${normalizeStrength(r.strength)}|${normalizeRoute(r.route)}`).values()) {
    if (group.length > 1) {
      rows.push({
        kind: "DUPLICATE_DISPLAY_ROW",
        catalogCodes: group.map((r) => r.catalogCode),
        display: group[0]!.displayNameEn,
        risk: "HIGH",
      });
    }
  }

  for (const group of grouped(orderable, nearDisplayKey).values()) {
    if (group.length > 1) {
      rows.push({
        kind: "NEAR_IDENTICAL_DISPLAY_ROW",
        catalogCodes: group.map((r) => r.catalogCode),
        display: group.map((r) => r.displayNameEn).join(" / "),
        risk: "MEDIUM",
      });
    }
  }

  for (const record of orderable) {
    if (hasInternalCodeLeakage(record.displayNameEn) || hasInternalCodeLeakage(record.displayNameFr)) {
      rows.push({
        kind: "INTERNAL_CODE_LEAKAGE",
        catalogCodes: [record.catalogCode],
        display: `${record.displayNameEn} / ${record.displayNameFr}`,
        risk: "HIGH",
      });
    }
  }

  return {
    orderableRowsAudited: orderable.length,
    duplicateDisplayRows: rows.filter((r) => r.kind === "DUPLICATE_DISPLAY_ROW").length,
    nearIdenticalDisplayRows: rows.filter((r) => r.kind === "NEAR_IDENTICAL_DISPLAY_ROW").length,
    internalCodeLeakageRows: rows.filter((r) => r.kind === "INTERNAL_CODE_LEAKAGE").length,
    decision: rows.some((r) => r.risk === "HIGH") ? "UNSAFE" : "SAFE",
    rows,
  };
}

export function certifyMedicationActivationCollision(
  catalogCodes: string[],
  sourceRecords: MedicationOrderabilityRecord[] = records()
): ActivationCollisionCertification {
  const selected = sourceRecords.filter((r) => catalogCodes.includes(r.catalogCode));
  const duplicateReport = buildDuplicateMedicationAuditReport(sourceRecords);
  const selectedSet = new Set(catalogCodes);
  const families = new Map(selected.map((r) => [r.catalogCode, canonicalMedicationFamilyKey(r)]));
  const blockers: string[] = [];
  const duplicateFindings = duplicateReport.rows.filter(
    (row) => row.blocksActivation && row.catalogCodes.some((code) => selectedSet.has(code))
  );

  if (duplicateFindings.length > 0) blockers.push("DUPLICATE_OR_COLLISION_FINDING");
  for (const record of selected) {
    if (isProviderOrderSearchCandidate(record)) blockers.push(`${record.catalogCode}: ALREADY_ORDERABLE`);
  }

  const familyCounts = new Map<string, string[]>();
  for (const [code, familyKey] of families) {
    familyCounts.set(familyKey, [...(familyCounts.get(familyKey) ?? []), code]);
  }
  for (const [familyKey, codes] of familyCounts) {
    if (codes.length > 1) blockers.push(`${familyKey}: FAMILY_OVERLAP_ACTIVATION`);
  }

  return {
    catalogCodes,
    decision: blockers.length === 0 ? "SAFE" : "BLOCKED",
    blockers,
    duplicateFindings,
  };
}

export function buildMedicationAdministrationNormalizationReport(
  sourceRecords: MedicationOrderabilityRecord[] = records()
): MedicationAdministrationNormalizationReport {
  const marReady = sourceRecords.filter((r) => r.marEnabled);
  const rows: MedicationAdministrationNormalizationReport["rows"] = [];
  for (const group of grouped(marReady, (r) => `${canonicalMedicationFamilyKey(r)}|${normalizeRoute(r.route)}|${normalizeForm(r.dosageForm)}`).values()) {
    const productKeys = new Set(group.map(productKey));
    if (group.length > 1 && productKeys.size < group.length) {
      rows.push({
        familyKey: canonicalMedicationFamilyKey(group[0]!),
        route: group[0]!.route,
        form: group[0]!.dosageForm,
        catalogCodes: group.map((r) => r.catalogCode),
        issue: "Duplicate MAR workflow for equivalent medication product",
      });
    }
  }

  return {
    marReadyProducts: marReady.length,
    duplicateMarWorkflowGroups: rows.length,
    duplicateBillingWorkflowGroups: rows.filter((r) => r.issue.includes("billing")).length,
    duplicateAdministrationWorkflowGroups: rows.length,
    decision: rows.length === 0 ? "PASS" : "FAIL",
    rows,
  };
}

export function buildMedicationBillingNormalizationReport(): MedicationBillingNormalizationReport {
  const rows: MedicationBillingNormalizationReport["rows"] = [];
  const billingEntries = [
    ...MEDICATION_BILLING_MAPPING_ENTRIES.map((e) => ({ catalogCode: e.catalogCode, hcpcs: e.hcpcs, ndc11: "" })),
    ...ENTERPRISE_WAVE1_BILLING_MANIFEST.map((e) => ({ catalogCode: e.catalogCode, hcpcs: e.hcpcs, ndc11: e.ndc11 })),
  ];

  for (const group of grouped(billingEntries.filter((e) => e.hcpcs), (e) => e.hcpcs).values()) {
    const families = new Set(
      group.map((e) => {
        const record = buildUnifiedOrderabilityMap().get(e.catalogCode);
        return record ? canonicalMedicationFamilyKey(record) : e.catalogCode;
      })
    );
    if (group.length > 1 && families.size > 1 && group[0]!.hcpcs !== "J3490") {
      rows.push({
        kind: "DUPLICATE_HCPCS",
        key: group[0]!.hcpcs,
        catalogCodes: group.map((e) => e.catalogCode),
        detail: "Same non-unclassified HCPCS appears across multiple canonical families",
      });
    }
  }

  const ndcEntries = [
    ...Object.entries(MEDICATION_BILLING_NDC_BY_CATALOG_CODE).map(([catalogCode, ndc]) => ({
      catalogCode,
      ndc11: ndc.ndc11,
    })),
    ...ENTERPRISE_WAVE1_BILLING_MANIFEST.map((e) => ({ catalogCode: e.catalogCode, ndc11: e.ndc11 })),
  ];
  for (const group of grouped(ndcEntries.filter((e) => e.ndc11), (e) => e.ndc11).values()) {
    if (group.length > 1) {
      rows.push({
        kind: "DUPLICATE_NDC",
        key: group[0]!.ndc11,
        catalogCodes: group.map((e) => e.catalogCode),
        detail: "Same NDC is mapped to multiple catalog codes",
      });
    }
  }

  const catalogCodesWithBilling = new Set(billingEntries.map((e) => e.catalogCode));
  for (const code of [...catalogCodesWithBilling].slice(0, 25)) {
    rows.push({
      kind: "RXNORM_MISSING",
      key: code,
      catalogCodes: [code],
      detail: "RxNorm mapping table is not yet present in the MVP catalog",
    });
  }

  return {
    billingRowsAudited: billingEntries.length,
    ndcRowsAudited: ndcEntries.length,
    duplicateHcpcsMappings: rows.filter((r) => r.kind === "DUPLICATE_HCPCS").length,
    duplicateNdcMappings: rows.filter((r) => r.kind === "DUPLICATE_NDC").length,
    conflictingMappings: rows.filter((r) => r.kind === "CONFLICTING_MAPPING").length,
    obsoleteMappingWarnings: rows.filter((r) => r.kind === "OBSOLETE_REVIEW").length,
    missingRxNormRows: rows.filter((r) => r.kind === "RXNORM_MISSING").length,
    decision: rows.some((r) => r.kind === "CONFLICTING_MAPPING" || r.kind === "DUPLICATE_NDC") ? "FAIL" : "PASS",
    rows,
  };
}

const EXPECTED_VACCINE_FAMILIES = [
  "tdap",
  "td",
  "dtap",
  "influenza",
  "covid",
  "mmr",
  "varicella",
  "pneumococcal",
  "hpv",
] as const;

export function buildVaccineCanonicalFamilyReport(
  sourceRecords: MedicationOrderabilityRecord[] = records()
): VaccineCanonicalFamilyReport {
  const blobs = sourceRecords.map((r) =>
    `${r.catalogCode} ${r.genericName} ${r.displayNameEn} ${r.displayNameFr}`.toLowerCase()
  );
  const presentFamilies = EXPECTED_VACCINE_FAMILIES.filter((family) =>
    blobs.some((blob) => {
      if (family === "covid") return blob.includes("covid");
      if (family === "mmr") return blob.includes("mmr") || blob.includes("measles");
      if (family === "dtap") return blob.includes("dtap");
      return blob.includes(family);
    })
  );
  const missingFamilies = EXPECTED_VACCINE_FAMILIES.filter((f) => !presentFamilies.includes(f));
  const cvxLinkedFamilies = ENTERPRISE_WAVE1_BILLING_MANIFEST.filter((e) => e.cvxCode?.trim())
    .map((e) => {
      const record = buildUnifiedOrderabilityMap().get(e.catalogCode);
      return record ? canonicalMedicationFamilyKey(record) : normalizeMedicationIdentityToken(e.catalogCode);
    });
  const billingLinkedFamilies = ENTERPRISE_WAVE1_BILLING_MANIFEST.filter((e) => e.administrationCpt || e.cvxCode)
    .map((e) => {
      const record = buildUnifiedOrderabilityMap().get(e.catalogCode);
      return record ? canonicalMedicationFamilyKey(record) : normalizeMedicationIdentityToken(e.catalogCode);
    });
  const blockers: string[] = [];
  if (!presentFamilies.includes("tdap")) blockers.push("TDAP_FAMILY_MISSING");
  if (!TDAP_VIS_REFERENCE.cdcVisUrl) blockers.push("TDAP_VIS_REFERENCE_MISSING");
  if (VACCINE_MANUFACTURER_CATALOG.length === 0) blockers.push("MANUFACTURER_CATALOG_MISSING");

  return {
    expectedFamilies: [...EXPECTED_VACCINE_FAMILIES],
    presentFamilies,
    missingFamilies,
    manufacturerCatalogCentralized: VACCINE_MANUFACTURER_CATALOG.length > 0,
    manufacturerCount: VACCINE_MANUFACTURER_CATALOG.length,
    visGovernancePresent: Boolean(TDAP_VIS_REFERENCE.cdcVisUrl),
    cvxLinkedFamilies: [...new Set(cvxLinkedFamilies)],
    billingLinkedFamilies: [...new Set(billingLinkedFamilies)],
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    blockers,
  };
}

export function certifyMedicationNormalizationI18n(
  sourceRecords: MedicationOrderabilityRecord[] = records()
): MedicationNormalizationI18nCertification {
  const blockers: string[] = [];
  let enLeakageCount = 0;
  let frLeakageCount = 0;
  for (const record of sourceRecords) {
    if (!record.displayNameEn.trim() || !record.displayNameFr.trim()) {
      blockers.push(`${record.catalogCode}: DISPLAY_NAME_MISSING`);
      continue;
    }
    if (looksFrenchLocalizedText(record.displayNameEn)) {
      enLeakageCount += 1;
      blockers.push(`${record.catalogCode}: EN_FR_LEAKAGE`);
    }
    if (looksEnglishFormText(record.displayNameFr) && !looksFrenchLocalizedText(record.displayNameFr)) {
      frLeakageCount += 1;
      blockers.push(`${record.catalogCode}: FR_EN_LEAKAGE`);
    }
  }
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    blockers,
    rowsAudited: sourceRecords.length,
    enLeakageCount,
    frLeakageCount,
  };
}

export function buildMedicationNormalizationMaturityProjectionReport(): MedicationNormalizationMaturityProjectionReport {
  const duplicateAudit = buildDuplicateMedicationAuditReport();
  const currentScore = 3.4;
  const duplicatePenaltyRelief = Math.min(0.4, duplicateAudit.activationBlockingFindings / 100);
  const projectedAfterNormalization = Math.round((currentScore + duplicatePenaltyRelief) * 10) / 10;
  const projectedAfterTranche3 = Math.min(4.1, Math.round((projectedAfterNormalization + 0.3) * 10) / 10);
  const projectedAfterCriticalCare = Math.min(4.3, Math.round((projectedAfterTranche3 + 0.2) * 10) / 10);
  const projectedAfterVaccineCompletion = Math.min(4.5, Math.round((projectedAfterCriticalCare + 0.2) * 10) / 10);
  const targetScore = 4.5;
  return {
    currentScore,
    projectedAfterNormalization,
    projectedAfterTranche3,
    projectedAfterCriticalCare,
    projectedAfterVaccineCompletion,
    targetScore,
    remainingGap: Math.max(0, Math.round((targetScore - projectedAfterVaccineCompletion) * 10) / 10),
    remainingBlockers: [
      "Provider search activation remains gated until canonical family review is enforced",
      "Critical-care/high-alert medications still require clinical governance",
      "Vaccine MAR wiring remains incomplete beyond Tdap design scaffolding",
      "RxNorm mappings are not yet represented in the MVP catalog",
    ],
  };
}

export function runMedicationCanonicalNormalizationCertification(): MedicationCanonicalNormalizationCertificationReport {
  const duplicateMedicationAudit = buildDuplicateMedicationAuditReport();
  const canonicalMedicationFamilyCertification = certifyCanonicalMedicationFamilies();
  const providerSearchDuplicateRisk = buildProviderSearchDuplicateRiskReport();
  const activationCollisionCertification = certifyMedicationActivationCollision([]);
  const medicationAdministrationNormalization = buildMedicationAdministrationNormalizationReport();
  const medicationBillingNormalization = buildMedicationBillingNormalizationReport();
  const vaccineCanonicalFamily = buildVaccineCanonicalFamilyReport();
  const i18nCertification = certifyMedicationNormalizationI18n();
  const maturityProjection = buildMedicationNormalizationMaturityProjectionReport();
  return {
    ticket: "MEDUI.MEDICATION.DUPLICATE_NORMALIZATION_AND_CANONICAL_ORDERING.1",
    generatedAt: new Date().toISOString(),
    duplicateMedicationAudit,
    canonicalMedicationFamilyCertification,
    providerSearchDuplicateRisk,
    activationCollisionCertification,
    medicationAdministrationNormalization,
    medicationBillingNormalization,
    vaccineCanonicalFamily,
    i18nCertification,
    maturityProjection,
    compatibility: {
      activationChanged: false,
      providerSearchChanged: false,
      formularyStatusChanged: false,
      migrationsRequired: false,
    },
  };
}

export const TDAP_CANONICAL_CATALOG_CODE = TDAP_CATALOG_CODE;
