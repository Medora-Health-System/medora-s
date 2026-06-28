/**
 * MEDUI.MEDS.ENTERPRISE_IVPB_RUNTIME_METADATA_REMEDIATION_WAVE.1
 * Runtime-authoritative IVPB metadata reconciliation and post-remediation certification.
 * No activation. No provider registry changes.
 */

import {
  buildIvpbEnterpriseGovernanceAuditReport,
  buildIvpbGovernanceAuditRows,
  buildIvpbInfusionRuntimeCompatibilityReport,
  buildIvpbPharmacyCompatibilityReport,
  buildIvpbProviderGovernanceCompatibilityReport,
  buildIvpbRemainingBlockersReport,
  certifyReadyIvpbMedicationGovernance,
  expansionAuditInfusionMetadataPresent,
  isEnterpriseIvpbInventoryRow,
  resolveCatalogAdministrationType,
  resolveStagingCatalogAdministrationType,
  resetEnterpriseIvpbInfusionGovernanceCachesForTests,
  type IvpbGovernanceAuditRow,
} from "./enterpriseIvpbInfusionGovernanceWave.js";
import {
  buildEnterpriseMedicationInventoryReport,
  type EnterpriseMedicationInventoryRow,
} from "./enterpriseFormularyGapAnalysis.js";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import {
  getActiveProviderOrderableCatalogCodes,
  isActiveProviderOrderableCatalogCode,
} from "./providerOrderableCatalogCodesRegistry.js";

export type IvpbRuntimeReconciliationClassification =
  | "READY_RUNTIME"
  | "MISSING_RUNTIME_METADATA"
  | "MISMATCH_RUNTIME_VS_MANIFEST"
  | "INVALID_ROUTE"
  | "INVALID_ADMINISTRATION_TYPE"
  | "LEGACY_IVPB";

export type IvpbRuntimeReconciliationRow = {
  catalogCode: string;
  medicationName: string;
  route: string;
  administrationType: string | null;
  dosageForm: string;
  providerOrderable: boolean;
  marReady: boolean;
  pharmacyReady: boolean;
  infusionLifecycleCompatible: boolean;
  enterpriseManifestAdministrationType: string | null;
  haitiRuntimeAdministrationType: string | null;
  classification: IvpbRuntimeReconciliationClassification;
  blockers: string[];
};

export type IvpbRuntimeMetadataRemediationReport = {
  ticket: "MEDUI.MEDS.ENTERPRISE_IVPB_RUNTIME_METADATA_REMEDIATION_WAVE.1";
  totalIvpbMedications: number;
  runtimeMetadataComplete: number;
  runtimeMetadataMissing: number;
  readyRuntimeCount: number;
  readyForActivationCount: number;
  remainingBlockers: string[];
  finalDecision: "ENTERPRISE_IVPB_RUNTIME_METADATA_REMEDIATION_COMPLETE" | "ENTERPRISE_IVPB_RUNTIME_METADATA_REMEDIATION_BLOCKED";
  reconciliationRows: IvpbRuntimeReconciliationRow[];
};

export type IvpbRuntimeVsManifestReconciliationReport = {
  readyRuntime: string[];
  missingRuntimeMetadata: string[];
  mismatchRuntimeVsManifest: string[];
  invalidRoute: string[];
  invalidAdministrationType: string[];
  legacyIvpb: string[];
};

export type IvpbRuntimeCertificationReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  readyRowsCertified: number;
  readyRowsTotal: number;
  expansionAuditMissingInfusionMetadata: number;
  providerOrderableMissingRuntimeMetadata: number;
};

function haitiRuntimeAdmin(catalogCode: string): string | null {
  return HAITI_MEDICATION_FORMULARY_CATALOG.find((row) => row.code === catalogCode)?.administrationType ?? null;
}

function classifyReconciliationRow(
  inventoryRow: EnterpriseMedicationInventoryRow,
  auditRow: IvpbGovernanceAuditRow | undefined
): IvpbRuntimeReconciliationRow {
  const record = buildUnifiedOrderabilityMap().get(inventoryRow.catalogCode);
  const haitiAdmin = haitiRuntimeAdmin(inventoryRow.catalogCode);
  const stagingAdmin = resolveStagingCatalogAdministrationType(inventoryRow.catalogCode);
  const runtimeAdmin = resolveCatalogAdministrationType(inventoryRow.catalogCode, record);
  const blockers: string[] = [];

  const route = inventoryRow.route.trim().toLowerCase();
  const form = inventoryRow.form.trim().toLowerCase();
  const blob = [inventoryRow.catalogCode, inventoryRow.displayNameEn].join(" ").toLowerCase();

  let classification: IvpbRuntimeReconciliationClassification = "READY_RUNTIME";

  if (haitiAdmin === "INFUSION" || expansionAuditInfusionMetadataPresent(inventoryRow, record)) {
    classification = "READY_RUNTIME";
  } else if (!stagingAdmin) {
    classification = "MISSING_RUNTIME_METADATA";
    blockers.push("NO_RUNTIME_OR_STAGING_INFUSION_METADATA");
  } else if (stagingAdmin !== "INFUSION") {
    classification = "INVALID_ADMINISTRATION_TYPE";
    blockers.push("STAGING_NOT_INFUSION");
  } else if (stagingAdmin === "INFUSION" && haitiAdmin !== "INFUSION") {
    classification = "MISSING_RUNTIME_METADATA";
    blockers.push("STAGING_ONLY_INFUSION_METADATA");
  } else if (!route.includes("intrave") && route !== "injectable" && !route.includes("perfusion")) {
    classification = "INVALID_ROUTE";
    blockers.push("ROUTE_NOT_IVP_CAPABLE");
  } else if (form !== "perfusion" && form !== "injectable" && !blob.includes("perfusion")) {
    classification = "INVALID_ROUTE";
    blockers.push("DOSAGE_FORM_NOT_IVPB");
  } else if (haitiAdmin && stagingAdmin && haitiAdmin !== stagingAdmin) {
    classification = "MISMATCH_RUNTIME_VS_MANIFEST";
    blockers.push("RUNTIME_MANIFEST_ADMIN_MISMATCH");
  } else if (blob.includes("legacy") || inventoryRow.catalogCode.includes("_IV") && !inventoryRow.catalogCode.includes("PERFUSION")) {
    classification = "LEGACY_IVPB";
    if (!haitiAdmin) blockers.push("LEGACY_CODE_MISSING_RUNTIME_INFUSION");
  } else {
    classification = "MISSING_RUNTIME_METADATA";
    blockers.push("RUNTIME_INFUSION_METADATA_MISSING");
  }

  if (classification === "READY_RUNTIME" && auditRow?.classification !== "READY_FOR_ACTIVATION") {
    if (auditRow?.classification === "NEEDS_PROVIDER_GOVERNANCE") blockers.push("PROVIDER_GOVERNANCE_DEFER");
    if (auditRow?.classification === "NEEDS_PHARMACY_GOVERNANCE") blockers.push("PHARMACY_GOVERNANCE_DEFER");
  }

  return {
    catalogCode: inventoryRow.catalogCode,
    medicationName: inventoryRow.displayNameEn || inventoryRow.displayNameFr,
    route: inventoryRow.route,
    administrationType: runtimeAdmin,
    dosageForm: inventoryRow.form,
    providerOrderable: isActiveProviderOrderableCatalogCode(inventoryRow.catalogCode),
    marReady: inventoryRow.MARReady,
    pharmacyReady: inventoryRow.BillingReady && inventoryRow.InventoryReady,
    infusionLifecycleCompatible: auditRow?.runtimeCompatible ?? false,
    enterpriseManifestAdministrationType: stagingAdmin,
    haitiRuntimeAdministrationType: haitiAdmin,
    classification,
    blockers,
  };
}

export function buildIvpbRuntimeReconciliationTable(): IvpbRuntimeReconciliationRow[] {
  const inventory = buildEnterpriseMedicationInventoryReport();
  const auditByCode = new Map(buildIvpbGovernanceAuditRows().map((row) => [row.catalogCode, row]));
  return inventory.rows
    .filter(isEnterpriseIvpbInventoryRow)
    .map((row) => classifyReconciliationRow(row, auditByCode.get(row.catalogCode)));
}

export function buildIvpbRuntimeVsManifestReconciliationReport(): IvpbRuntimeVsManifestReconciliationReport {
  const rows = buildIvpbRuntimeReconciliationTable();
  const by = (cls: IvpbRuntimeReconciliationClassification) =>
    rows.filter((row) => row.classification === cls).map((row) => row.catalogCode);
  return {
    readyRuntime: by("READY_RUNTIME"),
    missingRuntimeMetadata: by("MISSING_RUNTIME_METADATA"),
    mismatchRuntimeVsManifest: by("MISMATCH_RUNTIME_VS_MANIFEST"),
    invalidRoute: by("INVALID_ROUTE"),
    invalidAdministrationType: by("INVALID_ADMINISTRATION_TYPE"),
    legacyIvpb: by("LEGACY_IVPB"),
  };
}

export function buildIvpbRuntimeMetadataRemediationReport(): IvpbRuntimeMetadataRemediationReport {
  const reconciliation = buildIvpbRuntimeReconciliationTable();
  const audit = buildIvpbEnterpriseGovernanceAuditReport();
  const runtimeComplete = reconciliation.filter((row) => row.classification === "READY_RUNTIME").length;
  const runtimeMissing = reconciliation.filter((row) => row.classification === "MISSING_RUNTIME_METADATA").length;
  const blockers: string[] = [];
  if (audit.expansionAuditMissingInfusionMetadataCount > 0) {
    blockers.push("EXPANSION_AUDIT_MISSING_INFUSION_METADATA");
  }
  const orderableMissing = reconciliation.filter(
    (row) => row.providerOrderable && row.classification === "MISSING_RUNTIME_METADATA"
  );
  if (orderableMissing.length > 0) blockers.push("PROVIDER_ORDERABLE_MISSING_RUNTIME_METADATA");

  return {
    ticket: "MEDUI.MEDS.ENTERPRISE_IVPB_RUNTIME_METADATA_REMEDIATION_WAVE.1",
    totalIvpbMedications: reconciliation.length,
    runtimeMetadataComplete: runtimeComplete,
    runtimeMetadataMissing: runtimeMissing,
    readyRuntimeCount: runtimeComplete,
    readyForActivationCount: audit.readyForActivationCount,
    remainingBlockers: [...new Set([...blockers, ...audit.blockers])],
    finalDecision:
      audit.expansionAuditMissingInfusionMetadataCount === 0 && orderableMissing.length === 0
        ? "ENTERPRISE_IVPB_RUNTIME_METADATA_REMEDIATION_COMPLETE"
        : "ENTERPRISE_IVPB_RUNTIME_METADATA_REMEDIATION_BLOCKED",
    reconciliationRows: reconciliation,
  };
}

export function buildIvpbRuntimeCertificationReport(): IvpbRuntimeCertificationReport {
  const audit = buildIvpbEnterpriseGovernanceAuditReport();
  const ready = audit.rows.filter((row) => row.classification === "READY_FOR_ACTIVATION");
  let certified = 0;
  for (const row of ready) {
    if (certifyReadyIvpbMedicationGovernance(row).certified) certified += 1;
  }
  const orderableMissing = audit.rows.filter(
    (row) => row.providerOrderable && !row.runtimeInfusionMetadataPresent
  ).length;

  return {
    decision: certified === ready.length && audit.expansionAuditMissingInfusionMetadataCount === 0 ? "PASS" : "PARTIAL",
    readyRowsCertified: certified,
    readyRowsTotal: ready.length,
    expansionAuditMissingInfusionMetadata: audit.expansionAuditMissingInfusionMetadataCount,
    providerOrderableMissingRuntimeMetadata: orderableMissing,
  };
}

export function buildIvpbRuntimeMetadataSafetyRegressionReport(): {
  decision: "PASS" | "FAIL";
  providerOrderableCountUnchanged: boolean;
  zosynActive: boolean;
  potassiumPoActive: boolean;
  marInvariantPreserved: boolean;
} {
  const beforeOrderable = getActiveProviderOrderableCatalogCodes().size;
  buildIvpbRuntimeMetadataRemediationReport();
  const afterOrderable = getActiveProviderOrderableCatalogCodes().size;
  const audit = buildIvpbEnterpriseGovernanceAuditReport();
  const orderableNotMar = audit.rows.filter((row) => row.providerOrderable && !row.marReady);

  return {
    decision:
      beforeOrderable === afterOrderable &&
      isActiveProviderOrderableCatalogCode("PIPERACILLIN_TAZOBACTAM_3_375_G_INJECTABLE_INJECTABLE") &&
      isActiveProviderOrderableCatalogCode("POTASSIUM_CHLORIDE_20_MEQ_COMPRIME_ORALE") &&
      orderableNotMar.length === 0
        ? "PASS"
        : "FAIL",
    providerOrderableCountUnchanged: beforeOrderable === afterOrderable,
    zosynActive: isActiveProviderOrderableCatalogCode("PIPERACILLIN_TAZOBACTAM_3_375_G_INJECTABLE_INJECTABLE"),
    potassiumPoActive: isActiveProviderOrderableCatalogCode("POTASSIUM_CHLORIDE_20_MEQ_COMPRIME_ORALE"),
    marInvariantPreserved: orderableNotMar.length === 0,
  };
}

export function resetIvpbRuntimeMetadataRemediationCachesForTests(): void {
  resetEnterpriseIvpbInfusionGovernanceCachesForTests();
}

export {
  buildIvpbInfusionRuntimeCompatibilityReport,
  buildIvpbPharmacyCompatibilityReport,
  buildIvpbProviderGovernanceCompatibilityReport,
  buildIvpbRemainingBlockersReport,
};
