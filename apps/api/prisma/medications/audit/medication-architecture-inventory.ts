/**
 * Medication engine architecture and workflow inventory (read-only).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { CatalogMetricsSnapshot } from "./medication-catalog-metrics";
import { API_ROOT, auditBase, type AuditConfidence, type AuditDataSource } from "./medication-audit-types";

const MEDICATION_API_MODULES = [
  "medication-catalog",
  "medication-master",
  "medication-administration",
  "medication-dose",
  "medication-safety",
  "pharmacy-inventory",
  "order-catalog",
  "orders",
  "billing",
] as const;

const PRISMA_MEDICATION_MODELS = [
  "CatalogMedication",
  "MedicationAlias",
  "MedicationConcept",
  "MedicationProduct",
  "MedicationPackage",
  "MedicationConcentration",
  "MedicationSearchAlias",
  "MedicationSafetyProfile",
  "MedicationAdministrationProfile",
  "MedicationBillingProfile",
  "FacilityFormularyItem",
  "MedicationAdministration",
  "MedicationAdministrationVerification",
  "MedicationAdministrationOverride",
  "MedicationAdministrationCorrection",
  "MedicationFormularyImportStaging",
  "MedicationOrderSetLink",
  "InventoryItem",
  "MedicationDispense",
  "PharmacyVerification",
  "MedicationWasteDocumentation",
  "InfusionProfile",
  "InfusionSession",
  "BillingCatalog",
  "Order",
  "OrderItem",
] as const;

function listFilesRecursive(dir: string, suffix: string, max = 200): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (current: string) => {
    if (out.length >= max) return;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(suffix)) out.push(relative(API_ROOT, full));
    }
  };
  walk(dir);
  return out.sort();
}

function countSpecFiles(): number {
  const apiSrc = join(API_ROOT, "src");
  const sharedPkg = join(API_ROOT, "../../packages/shared/src/medication");
  return (
    listFilesRecursive(apiSrc, ".spec.ts").filter((path) => path.includes("medication")).length +
    listFilesRecursive(sharedPkg, ".test.ts").length
  );
}

function schemaHasModel(modelName: string): boolean {
  const schemaPath = join(API_ROOT, "prisma/schema.prisma");
  if (!existsSync(schemaPath)) return false;
  const schema = readFileSync(schemaPath, "utf8");
  return schema.includes(`model ${modelName} `);
}

export function buildEngineArchitectureInventory(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: CatalogMetricsSnapshot
) {
  const modules = MEDICATION_API_MODULES.map((moduleName) => {
    const path = join(API_ROOT, "src", moduleName);
    return {
      module: moduleName,
      present: existsSync(path),
      fileCount: existsSync(path) ? readdirSync(path).length : 0,
    };
  });

  return {
    ...auditBase(dataSource, confidence),
    engineLayers: {
      legacyCatalogLayer: {
        model: "CatalogMedication",
        rowCount: metrics.liveCounts.catalogMedication,
        activeCount: metrics.liveCounts.catalogMedicationActive,
        role: "Provider search, legacy MAR linkage, inventory FK",
      },
      canonicalConceptLayer: {
        models: ["MedicationConcept", "MedicationProduct", "MedicationPackage"],
        conceptCount: metrics.liveCounts.medicationConcept,
        productCount: metrics.liveCounts.medicationProduct,
        packageCount: metrics.liveCounts.medicationPackage,
        role: "Enterprise formulary, facility formulary, billing profiles",
      },
      dualIdentityStatus: {
        cutoverSafe: false,
        catalogWithoutLegacyProduct: metrics.orphanCounters.catalogWithoutLegacyProduct,
        productWithoutLegacyCatalog: metrics.orphanCounters.productWithoutLegacyCatalog,
        recommendation: "Complete RxNorm + legacy linkage before cutover",
      },
    },
    apiModules: modules,
    sharedMedicationTestFiles: listFilesRecursive(join(API_ROOT, "../../packages/shared/src/medication"), ".test.ts"),
    apiMedicationSpecEstimate: countSpecFiles(),
    stagingPipeline: {
      model: "MedicationFormularyImportStaging",
      rowCount: metrics.liveCounts.importStagingRows,
      promotionRequired: true,
    },
    auditToolingPath: "apps/api/prisma/medications/audit",
  };
}

export function buildDataModelInventory(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: CatalogMetricsSnapshot
) {
  const models = PRISMA_MEDICATION_MODELS.map((model) => ({
    model,
    presentInSchema: schemaHasModel(model),
  }));

  return {
    ...auditBase(dataSource, confidence),
    models,
    relationships: [
      {
        from: "CatalogMedication",
        to: "MedicationProduct",
        via: "legacyCatalogMedicationId",
        cardinality: "0..1:1",
        linkedCount:
          metrics.liveCounts.medicationProduct - metrics.orphanCounters.productWithoutLegacyCatalog,
      },
      {
        from: "MedicationConcept",
        to: "MedicationProduct",
        via: "conceptId",
        cardinality: "1:N",
        linkedCount: metrics.liveCounts.medicationProduct,
      },
      {
        from: "MedicationProduct",
        to: "MedicationPackage",
        via: "productId",
        cardinality: "1:N",
        linkedCount: metrics.liveCounts.medicationPackage,
      },
      {
        from: "MedicationPackage",
        to: "FacilityFormularyItem",
        via: "packageId",
        cardinality: "1:N",
        linkedCount: metrics.liveCounts.formularyItem,
      },
      {
        from: "OrderItem",
        to: "MedicationProduct/MedicationPackage",
        via: "medicationProductId/medicationPackageId",
        cardinality: "optional FK",
        linkedCount: metrics.liveCounts.orderMedicationItems,
      },
    ],
    prescriptionModelPresent: schemaHasModel("Prescription"),
    medicationReconciliationModelPresent: schemaHasModel("MedicationReconciliation"),
    concentrationModelPresent: schemaHasModel("MedicationConcentration"),
  };
}

export function buildOrderingAudit(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: CatalogMetricsSnapshot
) {
  return {
    ...auditBase(dataSource, confidence),
    orderModels: ["Order", "OrderItem"],
    medicationOrderItemCount: metrics.liveCounts.orderMedicationItems,
    catalogLinkage: {
      catalogMedicationCount: metrics.liveCounts.catalogMedication,
      canonicalProductCount: metrics.liveCounts.medicationProduct,
      orderUsesCanonicalIds: true,
    },
    maturityScore: 4,
    gaps: ["Order sentence normalization incomplete for all enterprise rows"],
  };
}

export function buildPrescriptionAudit(dataSource: AuditDataSource, confidence: AuditConfidence) {
  return {
    ...auditBase(dataSource, confidence),
    prescriptionModelPresent: schemaHasModel("Prescription"),
    dischargeRxWorkflowPresent: false,
    maturityScore: 1,
    gaps: ["No Prescription entity", "No structured discharge Rx document lifecycle"],
  };
}

export function buildMarAudit(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: CatalogMetricsSnapshot
) {
  return {
    ...auditBase(dataSource, confidence),
    marModel: "MedicationAdministration",
    administrationCount: metrics.liveCounts.medicationAdministration,
    appendOnlyCorrections: schemaHasModel("MedicationAdministrationCorrection"),
    witnessVerification: schemaHasModel("MedicationAdministrationVerification"),
    maturityScore: 4,
    gaps: ["Some vaccine-specific MAR flows not fully wired"],
  };
}

export function buildReconciliationAudit(dataSource: AuditDataSource, confidence: AuditConfidence) {
  return {
    ...auditBase(dataSource, confidence),
    medicationReconciliationModelPresent: schemaHasModel("MedicationReconciliation"),
    structuredMedRecEntity: false,
    maturityScore: 1,
    gaps: ["No clinical medication reconciliation entity or workflow"],
  };
}

export function buildSafetyEngineAudit(dataSource: AuditDataSource, confidence: AuditConfidence) {
  return {
    ...auditBase(dataSource, confidence),
    safetyProfileModel: "MedicationSafetyProfile",
    allergyChecking: {
      maturityScore: 2,
      mechanism: "Acknowledgement gates; free-text allergies on encounter",
      interactionEnginePresent: false,
    },
    interactionChecking: {
      maturityScore: 1,
      mechanism: "interactionGroupIds JSON only; no runtime interaction engine",
    },
    dosingIntelligence: {
      maturityScore: 2,
      mechanism: "Partial weight/frequency fields; no dosing knowledge base",
    },
    pediatricSupport: { maturityScore: 2, mechanism: "Partial pediatric manifests; no unified dosing" },
    renalHepaticSupport: { maturityScore: 1, mechanism: "Absent as structured knowledge source" },
    controlledSubstances: {
      maturityScore: 3,
      mechanism: "isControlled flags + waste/witness schema; limited enforcement breadth",
    },
  };
}

export function buildFormularyInventoryBillingAudit(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: CatalogMetricsSnapshot
) {
  return {
    ...auditBase(dataSource, confidence),
    formularyItemCount: metrics.liveCounts.formularyItem,
    inventoryItemCount: metrics.liveCounts.inventoryItem,
    ndcCatalogCount: metrics.liveCounts.ndcCatalog,
    ndcPackageCount: metrics.liveCounts.ndcPackage,
    hcpcsCatalogCount: metrics.liveCounts.hcpcsCatalog,
    hcpcsBillingProfileCount: metrics.liveCounts.hcpcsBilling,
    billingSeparationNote: "HCPCS/NDC billing mappings are suggestions; not clinical identity",
    maturityScores: { formulary: 3, inventory: 3, hcpcsBilling: 2 },
  };
}

export function buildExternalIntegrationReadiness(dataSource: AuditDataSource, confidence: AuditConfidence) {
  return {
    ...auditBase(dataSource, confidence),
    surescriptsRuntime: false,
    fhirMedicationRequestRuntime: false,
    rxNormImportPipeline: false,
    ndcOfficialImportPipeline: "partial CSV loader only",
    maturityScore: 1,
    gaps: ["No Surescripts/FHIR medication runtime integration"],
  };
}

export function buildSecurityDataIntegrityAudit(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: CatalogMetricsSnapshot
) {
  return {
    ...auditBase(dataSource, confidence),
    facilityScopedMar: true,
    marAuditTrail: schemaHasModel("MedicationAdministrationCorrection"),
    catalogMutable: true,
    marLabelSnapshots: true,
    inventoryFacilityScoped: true,
    maturityScore: 3,
    gaps: ["Catalog rows mutable without version history; rely on MAR snapshots"],
    administrationCount: metrics.liveCounts.medicationAdministration,
  };
}
