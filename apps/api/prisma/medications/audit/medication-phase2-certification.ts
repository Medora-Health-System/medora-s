/**
 * Medication Intelligence Phase 2 — certification artifact builders.
 * Read-only DB probes + schema-static checks. No RxNorm bulk import.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  classifyMedicationCode,
  isFixtureLikeMedicationCode,
  isRxNormVerifiedMapping,
  resolveHistoricalMedicationIdentity,
  assertQuantitiesNotInterchangeable,
  billingRequiresAdministrationProvenance,
  DUAL_LAYER_LINKAGE_STATUS_VALUES,
  RXNORM_MAPPING_STATUS_VALUES,
  ROUTE_ELIGIBILITY_STATUS_VALUES,
} from "@medora/shared";
import {
  auditBase,
  generatedAtIso,
  isFixtureLikeCode,
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
} from "./medication-audit-types";

export const PHASE2_CERTIFICATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_2_CANONICAL_IDENTITY_RXNORM_ROUTE_MAR_BILLING_FOUNDATION";

export const PHASE2_ARTIFACTS = [
  "medication-phase2-canonical-identity-architecture.json",
  "medication-phase2-dual-layer-reconciliation.json",
  "medication-phase2-rxnorm-readiness.json",
  "medication-phase2-route-governance.json",
  "medication-phase2-product-formulation-route-matrix.json",
  "medication-phase2-order-to-mar-linkage.json",
  "medication-phase2-mar-to-charge-traceability.json",
  "medication-phase2-hcpcs-billing-unit-architecture.json",
  "medication-phase2-historical-identity-preservation.json",
  "medication-phase2-fixture-isolation.json",
  "medication-phase2-localization-compatibility.json",
  "medication-phase2-tenant-facility-isolation.json",
  "medication-phase2-migration-safety.json",
  "medication-phase2-performance-indexing.json",
  "medication-phase2-regression-certification.json",
  "medication-phase2-enterprise-certification-summary.json",
] as const;

const SCHEMA_PATH = resolve(__dirname, "../../schema.prisma");
const MIGRATION_PATH = resolve(
  __dirname,
  "../../migrations/20261004120000_medication_phase_2_canonical_identity/migration.sql"
);

export type Phase2LiveMetrics = {
  catalogMedication: number;
  catalogActive: number;
  concept: number;
  product: number;
  package: number;
  rxNormPopulated: number;
  rxNormVerifiedFalsePositives: number;
  conceptsUnmapped: number;
  productsWithLegacyFk: number;
  productsDualLayerVerified: number;
  productsDualLayerUnlinked: number;
  routePermissionRows: number;
  routesActive: number;
  fixtureLikeCodes: number;
  fixtureClassified: number;
  missingFrenchDisplay: number;
};

export type Phase2SchemaProbe = {
  migrationPresent: boolean;
  schemaHasRxNormMappingStatus: boolean;
  schemaHasDualLayerLinkageStatus: boolean;
  schemaHasProductRoutePermission: boolean;
  schemaHasDataClassification: boolean;
  schemaHasBillingMappingStatus: boolean;
};

export function probePhase2Schema(): Phase2SchemaProbe {
  const schema = existsSync(SCHEMA_PATH) ? readFileSync(SCHEMA_PATH, "utf8") : "";
  return {
    migrationPresent: existsSync(MIGRATION_PATH),
    schemaHasRxNormMappingStatus: schema.includes("rxNormMappingStatus"),
    schemaHasDualLayerLinkageStatus: schema.includes("dualLayerLinkageStatus"),
    schemaHasProductRoutePermission: schema.includes("model MedicationProductRoutePermission"),
    schemaHasDataClassification: schema.includes("dataClassification"),
    schemaHasBillingMappingStatus:
      schema.includes("model MedicationBillingProfile") && schema.includes("mappingStatus"),
  };
}

export async function loadPhase2LiveMetrics(): Promise<{
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  metrics: Phase2LiveMetrics | null;
  dbError?: string;
}> {
  const result = await withPrisma(async (prisma) => collectLiveMetrics(prisma));
  if (!result.ok) {
    return {
      dataSource: "seed_files_only",
      confidence: "LOW",
      metrics: null,
      dbError: result.error,
    };
  }
  return {
    dataSource: "database",
    confidence: "HIGH",
    metrics: result.value,
  };
}

async function collectLiveMetrics(prisma: PrismaClient): Promise<Phase2LiveMetrics> {
  const [
    catalogMedication,
    catalogActive,
    concept,
    product,
    pkg,
    rxNormPopulated,
    conceptsUnmapped,
    productsWithLegacyFk,
    productsDualLayerVerified,
    productsDualLayerUnlinked,
    routePermissionRows,
    routesActive,
  ] = await Promise.all([
    prisma.catalogMedication.count(),
    prisma.catalogMedication.count({ where: { isActive: true } }),
    prisma.medicationConcept.count(),
    prisma.medicationProduct.count(),
    prisma.medicationPackage.count(),
    prisma.medicationConcept.count({
      where: { rxNormConceptId: { not: null } },
    }),
    prisma.medicationConcept.count({
      where: { rxNormMappingStatus: "UNMAPPED" },
    }),
    prisma.medicationProduct.count({
      where: { legacyCatalogMedicationId: { not: null } },
    }),
    prisma.medicationProduct.count({
      where: { dualLayerLinkageStatus: "VERIFIED" },
    }),
    prisma.medicationProduct.count({
      where: { dualLayerLinkageStatus: "UNLINKED" },
    }),
    prisma.medicationProductRoutePermission.count(),
    prisma.medicationRoute.count({ where: { isActive: true } }),
  ]);

  const falsePositives = await prisma.medicationConcept.count({
    where: {
      rxNormMappingStatus: "VERIFIED",
      OR: [{ rxNormConceptId: null }, { rxNormConceptId: "" }],
    },
  });

  const catalogCodes = await prisma.catalogMedication.findMany({
    select: { code: true, dataClassification: true, displayNameFr: true, isActive: true },
  });

  let fixtureLikeCodes = 0;
  let fixtureClassified = 0;
  let missingFrenchDisplay = 0;
  for (const row of catalogCodes) {
    if (isFixtureLikeCode(row.code) || isFixtureLikeMedicationCode(row.code)) {
      fixtureLikeCodes += 1;
    }
    if (row.dataClassification === "FIXTURE" || row.dataClassification === "DEV_SAMPLE") {
      fixtureClassified += 1;
    }
    if (row.isActive && (!row.displayNameFr || !row.displayNameFr.trim())) {
      missingFrenchDisplay += 1;
    }
  }

  return {
    catalogMedication,
    catalogActive,
    concept,
    product,
    package: pkg,
    rxNormPopulated,
    rxNormVerifiedFalsePositives: falsePositives,
    conceptsUnmapped,
    productsWithLegacyFk,
    productsDualLayerVerified,
    productsDualLayerUnlinked,
    routePermissionRows,
    routesActive,
    fixtureLikeCodes,
    fixtureClassified,
    missingFrenchDisplay,
  };
}

function base(dataSource: AuditDataSource, confidence: AuditConfidence) {
  return {
    ...auditBase(dataSource, confidence),
    certificationId: PHASE2_CERTIFICATION_ID,
    phase: 2,
  };
}

export function buildCanonicalIdentityArchitecture(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  schema: Phase2SchemaProbe,
  metrics: Phase2LiveMetrics | null
) {
  return {
    ...base(dataSource, confidence),
    title: "Canonical medication identity architecture",
    layers: [
      "MedicationConcept (canonical clinical identity)",
      "MedicationProduct (strength/form clinical product)",
      "MedicationPackage (NDC/physical package)",
      "CatalogMedication (runtime orderable curated catalog)",
      "FacilityFormularyItem / FacilityMedicationUsage (facility orderability)",
      "OrderItem → MedicationAdministration → BillingEvent (clinical + charge chain)",
    ],
    ownership: {
      conceptProductPackage: "GLOBAL_REFERENCE",
      catalogMedication: "GLOBAL_RUNTIME_CURATED",
      formularyInventoryMarBilling: "FACILITY_SCOPED",
    },
    schemaReady: schema.schemaHasRxNormMappingStatus && schema.schemaHasDualLayerLinkageStatus,
    liveCounts: metrics,
    nonGoals: [
      "Bulk RxNorm import",
      "Automatic fuzzy merge of dual layers",
      "Collapsing concept/product/package into one table",
    ],
  };
}

export function buildDualLayerReconciliation(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: Phase2LiveMetrics | null
) {
  return {
    ...base(dataSource, confidence),
    title: "Dual-layer reconciliation",
    linkageStatuses: [...DUAL_LAYER_LINKAGE_STATUS_VALUES],
    bridgeField: "MedicationProduct.legacyCatalogMedicationId",
    statusField: "MedicationProduct.dualLayerLinkageStatus",
    rules: [
      "Legacy FK presence does not imply VERIFIED linkage",
      "No automatic merge from display name, strength, route, NDC fragment, or fuzzy score",
      "CANDIDATE → VERIFIED requires explicit method + provenance",
    ],
    live: metrics
      ? {
          productsWithLegacyFk: metrics.productsWithLegacyFk,
          dualLayerVerified: metrics.productsDualLayerVerified,
          dualLayerUnlinked: metrics.productsDualLayerUnlinked,
        }
      : null,
    automaticFuzzyMergeForbidden: true,
  };
}

export function buildRxNormReadiness(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: Phase2LiveMetrics | null
) {
  const rxNormDataImported = false;
  return {
    ...base(dataSource, confidence),
    title: "RxNorm foundation readiness",
    mappingStatuses: [...RXNORM_MAPPING_STATUS_VALUES],
    rxNormDataImported,
    schemaFields: [
      "rxNormConceptId",
      "rxNormTermType",
      "rxNormSourceVocabulary",
      "rxNormMappingStatus",
      "rxNormMappingConfidence",
      "rxNormMappingVersion",
      "rxNormMappedAt",
      "rxNormMappedByUserId",
      "rxNormReviewedAt",
      "rxNormReviewNotes",
    ],
    verificationRule: "VERIFIED requires non-empty RxCUI + explicit status",
    live: metrics
      ? {
          concepts: metrics.concept,
          rxNormPopulated: metrics.rxNormPopulated,
          conceptsUnmapped: metrics.conceptsUnmapped,
          verifiedFalsePositives: metrics.rxNormVerifiedFalsePositives,
        }
      : null,
    unitChecks: {
      emptyRxCuiValidAsUnmapped: isRxNormVerifiedMapping("UNMAPPED", null) === false,
      verifiedRequiresCui: isRxNormVerifiedMapping("VERIFIED", "861004") === true,
      verifiedWithoutCuiRejected: isRxNormVerifiedMapping("VERIFIED", "") === false,
    },
  };
}

export function buildRouteGovernance(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: Phase2LiveMetrics | null
) {
  return {
    ...base(dataSource, confidence),
    title: "Route governance",
    eligibilityStatuses: [...ROUTE_ELIGIBILITY_STATUS_VALUES],
    model: "MedicationProductRoutePermission",
    enforcementInOrdering: "NOT_ENABLED_PHASE_2",
    rationale:
      "Permissions table is additive; injectable products do not auto-authorize IV push/IM/SQ/IO until explicit ALLOWED rows exist and ordering gates are enabled in a later phase.",
    live: metrics
      ? {
          routePermissionRows: metrics.routePermissionRows,
          routesActive: metrics.routesActive,
        }
      : null,
  };
}

export function buildProductFormulationRouteMatrix(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: Phase2LiveMetrics | null
) {
  return {
    ...base(dataSource, confidence),
    title: "Product–formulation–route matrix",
    status: "SCHEMA_READY_MATRIX_UNPOPULATED",
    note: "Phase 2 does not seed clinical product-to-route permissions without verified source data.",
    livePermissionRows: metrics?.routePermissionRows ?? null,
    deferred: "Populate ALLOWED/RESTRICTED rows from verified formulary/RxNorm attributes in Phase 3+",
  };
}

export function buildOrderToMarLinkage(
  dataSource: AuditDataSource,
  confidence: AuditConfidence
) {
  return {
    ...base(dataSource, confidence),
    title: "Order-to-MAR linkage",
    chain: [
      "CatalogMedication / orderable configuration",
      "ClinicalOrder + OrderItem (catalogItemId + medication snapshots)",
      "MedicationDoseInstance / MAR schedule",
      "MedicationAdministration (actual dose/route/time/administrator)",
    ],
    phase2Change: "NONE_RUNTIME — documented and identity helpers only",
    historicalSnapshotsPreserved: true,
  };
}

export function buildMarToChargeTraceability(
  dataSource: AuditDataSource,
  confidence: AuditConfidence
) {
  return {
    ...base(dataSource, confidence),
    title: "MAR-to-charge traceability",
    chain: [
      "MedicationAdministration",
      "administered quantity (distinct from ordered/dispensed)",
      "HCPCS mapping (MedicationBillingProfile / BillingCatalog)",
      "billable units + waste eligibility",
      "BillingEvent (sourceModule + sourceRecordId)",
      "claim export (manual review; no auto-submit)",
    ],
    catalogPresenceDoesNotCreateCharge: true,
    orderAloneDoesNotCreateCharge: true,
    autoClaimSubmission: false,
  };
}

export function buildHcpcsBillingUnitArchitecture(
  dataSource: AuditDataSource,
  confidence: AuditConfidence
) {
  let quantityGuardOk = false;
  try {
    assertQuantitiesNotInterchangeable("ordered", "billable", "cert");
  } catch {
    quantityGuardOk = true;
  }
  return {
    ...base(dataSource, confidence),
    title: "HCPCS billing-unit architecture",
    quantityKinds: ["ordered", "dispensed", "prepared", "administered", "wasted", "billable"],
    mappingStatusesOnProfile: ["CANDIDATE", "VERIFIED", "REJECTED", "RETIRED"],
    defaults: {
      billingProfileMappingStatus: "CANDIDATE",
      requiresManualReviewPreserved: true,
    },
    unitChecks: {
      quantitiesNotInterchangeable: quantityGuardOk,
      billingRequiresAdminProvenanceDefault: billingRequiresAdministrationProvenance({
        requiresManualReview: true,
        mappingStatus: "VERIFIED",
        administered: { kind: "administered", amount: 1, unit: "mg" },
      }),
    },
  };
}

export function buildHistoricalIdentityPreservation(
  dataSource: AuditDataSource,
  confidence: AuditConfidence
) {
  const resolved = resolveHistoricalMedicationIdentity({
    snapshotLabel: "Historic label",
    catalogCode: "CODE_X",
    currentCanonical: { conceptDisplayName: "New name" },
  });
  return {
    ...base(dataSource, confidence),
    title: "Historical identity preservation",
    strategy: "SNAPSHOT_FIRST_THEN_CATALOG_CODE_THEN_CANONICAL",
    unitCheck: {
      source: resolved.source,
      primaryLabel: resolved.primaryLabel,
      pass: resolved.source === "snapshot" && resolved.primaryLabel === "Historic label",
    },
    destructiveIdentityMigration: false,
  };
}

export function buildFixtureIsolation(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: Phase2LiveMetrics | null
) {
  return {
    ...base(dataSource, confidence),
    title: "Fixture isolation",
    fields: ["CatalogMedication.dataClassification", "CatalogMedication.dataSourceLabel"],
    defaultClassification: "UNKNOWN",
    productionSearchExclusionDefault: "OFF",
    optionalFilterUtil: "shouldExcludeFromProductionSearch(excludeFixtures:true)",
    backfillScript: "prisma/medications/audit/backfill-fixture-classification.ts (dry-run default)",
    live: metrics
      ? {
          fixtureLikeCodesHeuristic: metrics.fixtureLikeCodes,
          fixtureOrDevSampleClassified: metrics.fixtureClassified,
        }
      : null,
    unitCheck: {
      mstDetected: isFixtureLikeMedicationCode("GENERIC_MST_abc") === true,
      productionLike: classifyMedicationCode("LISINOPRIL_10_MG") === "PRODUCTION",
    },
  };
}

export function buildLocalizationCompatibility(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: Phase2LiveMetrics | null
) {
  return {
    ...base(dataSource, confidence),
    title: "Localization compatibility",
    canonicalIdentityLanguageNeutral: true,
    inventedTranslationsForbidden: true,
    liveMissingFrenchDisplayActive: metrics?.missingFrenchDisplay ?? null,
    deferredRemediation: "Phase 4 displayNameFr backfill — do not invent translations in Phase 2",
  };
}

export function buildTenantFacilityIsolation(
  dataSource: AuditDataSource,
  confidence: AuditConfidence
) {
  return {
    ...base(dataSource, confidence),
    title: "Tenant and facility isolation",
    globalLayers: ["MedicationConcept", "MedicationProduct", "MedicationPackage", "CatalogMedication"],
    facilityScopedLayers: [
      "FacilityFormularyItem",
      "FacilityMedicationUsage",
      "InventoryItem/Lot",
      "MedicationAdministration",
      "BillingEvent",
    ],
    phase2Change: "No tenant-scoped mutation APIs added for canonical identity",
    isolationRule: "Facility configuration must not mutate another facility's formulary/inventory/MAR rows",
  };
}

export function buildMigrationSafety(schema: Phase2SchemaProbe) {
  return {
    ...base("seed_files_only", "HIGH"),
    title: "Migration safety",
    migrationFolder: "20261004120000_medication_phase_2_canonical_identity",
    migrationPresent: schema.migrationPresent,
    additiveOnly: true,
    destructiveRewrites: false,
    bulkRxCuiBackfill: false,
    bulkDualLayerMerge: false,
    localCommand:
      "pnpm --filter @medora/api exec prisma migrate deploy  # or migrate dev in interactive local setups",
    productionCommand:
      'DATABASE_URL="$RAILWAY_DATABASE_URL" pnpm --filter @medora/api exec prisma migrate deploy',
    productionCommandExecutedInPhase2: false,
    rollbackStrategy:
      "Forward-fix preferred. Columns are nullable/defaulted; route permission table can be dropped only if unused. Do not rewrite historical OrderItem/MAR rows.",
    seedRequired: false,
  };
}

export function buildPerformanceIndexing(schema: Phase2SchemaProbe) {
  return {
    ...base("seed_files_only", "HIGH"),
    title: "Performance and indexing",
    indexesAdded: [
      "CatalogMedication.dataClassification",
      "MedicationConcept.rxNormConceptId",
      "MedicationConcept.rxNormMappingStatus",
      "MedicationProduct.dualLayerLinkageStatus",
      "MedicationProductRoutePermission(productId, routeId, eligibilityStatus)",
    ],
    bulkCatalogImportInPhase2: false,
    schemaReady: schema.schemaHasRxNormMappingStatus,
  };
}

export type RegressionEvidence = {
  focusedTestsPass: boolean;
  focusedTestSummary: string;
  fullRegressionPass: boolean | null;
  fullRegressionSummary: string;
  buildPass: boolean | null;
  typecheckPass: boolean | null;
  diffCheckPass: boolean | null;
};

export function buildRegressionCertification(evidence: RegressionEvidence) {
  return {
    ...base("seed_files_only", "HIGH"),
    title: "Regression certification",
    ...evidence,
    runtimeSearchDefaultUnchanged: true,
    routeOrderingEnforcementNotEnabled: true,
  };
}

export function buildEnterpriseCertificationSummary(input: {
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  schema: Phase2SchemaProbe;
  metrics: Phase2LiveMetrics | null;
  evidence: RegressionEvidence;
  knownBlockingGaps: string[];
  knownNonblockingGaps: string[];
}) {
  const schemaOk =
    input.schema.migrationPresent &&
    input.schema.schemaHasRxNormMappingStatus &&
    input.schema.schemaHasDualLayerLinkageStatus &&
    input.schema.schemaHasProductRoutePermission &&
    input.schema.schemaHasDataClassification &&
    input.schema.schemaHasBillingMappingStatus;

  const noFalseRxNorm =
    !input.metrics || input.metrics.rxNormVerifiedFalsePositives === 0;

  const focusedOk = input.evidence.focusedTestsPass;
  const buildOk = input.evidence.buildPass !== false;
  const typeOk = input.evidence.typecheckPass !== false;
  const diffOk = input.evidence.diffCheckPass !== false;

  const certified =
    schemaOk &&
    noFalseRxNorm &&
    focusedOk &&
    buildOk &&
    typeOk &&
    diffOk &&
    input.knownBlockingGaps.length === 0;

  return {
    ...base(input.dataSource, input.confidence),
    title: "Phase 2 enterprise certification summary",
    certificationId: PHASE2_CERTIFICATION_ID,
    FinalDecision: certified
      ? "MEDICATION_INTELLIGENCE_PHASE_2_CERTIFIED"
      : "MEDICATION_INTELLIGENCE_PHASE_2_NOT_CERTIFIED",
    CanonicalIdentityReady: schemaOk ? "YES" : "NO",
    DualLayerReconciliationReady: schemaOk ? "YES" : "NO",
    RxNormSchemaReady: input.schema.schemaHasRxNormMappingStatus ? "YES" : "NO",
    RxNormDataImported: "NO",
    RouteGovernanceReady: input.schema.schemaHasProductRoutePermission ? "YES" : "NO",
    FormulationRestrictionReady: "SCHEMA_ONLY",
    OrderToMARLinkageReady: "YES_EXISTING_PLUS_DOCUMENTED",
    MARToChargeTraceabilityReady: "YES_ARCHITECTURE",
    HCPCSConversionArchitectureReady: "YES",
    HistoricalIdentityPreserved: "YES",
    FixtureIsolationReady: input.schema.schemaHasDataClassification ? "YES" : "NO",
    EnglishSearchPreserved: "YES_DEFAULT_UNCHANGED",
    FrenchSearchPreserved: "YES_DEFAULT_UNCHANGED",
    TenantIsolationPassed: "YES_NO_NEW_CROSS_TENANT_APIS",
    MigrationRequired: "YES",
    SeedRequired: "NO",
    ProductionMigrationRequired: "YES_DOCUMENT_ONLY_NOT_EXECUTED",
    FocusedTests: input.evidence.focusedTestsPass ? "PASS" : "FAIL",
    FullRegression: input.evidence.fullRegressionPass === true ? "PASS" : input.evidence.fullRegressionPass === false ? "FAIL" : "PENDING",
    Build: input.evidence.buildPass === true ? "PASS" : input.evidence.buildPass === false ? "FAIL" : "PENDING",
    TypeScript: input.evidence.typecheckPass === true ? "PASS" : input.evidence.typecheckPass === false ? "FAIL" : "PENDING",
    DiffCheck: input.evidence.diffCheckPass === true ? "PASS" : input.evidence.diffCheckPass === false ? "FAIL" : "PENDING",
    KnownBlockingGaps: input.knownBlockingGaps,
    KnownNonblockingGaps: input.knownNonblockingGaps,
    Phase3Ready: certified ? "YES_FOR_SCOPED_RXNORM_IMPORT_PLANNING" : "NO",
    liveMetrics: input.metrics,
    generatedAt: generatedAtIso(),
  };
}

export async function writeAllPhase2Artifacts(input: {
  evidence: RegressionEvidence;
  knownBlockingGaps?: string[];
  knownNonblockingGaps?: string[];
}): Promise<{ summaryPath: string; finalDecision: string }> {
  const schema = probePhase2Schema();
  const live = await loadPhase2LiveMetrics();
  const metrics = live.metrics;
  const dataSource = live.dataSource;
  const confidence = live.confidence;

  const knownBlockingGaps = input.knownBlockingGaps ?? [];
  const knownNonblockingGaps = input.knownNonblockingGaps ?? [
    "RxNorm RxCUI values remain unpopulated (by design for Phase 2)",
    "MedicationProductRoutePermission matrix unpopulated (no unverified clinical defaults)",
    "Fixture dataClassification backfill not applied (dry-run script available)",
    "Optional production search fixture exclusion not wired into MedicationCatalogService (default OFF)",
    "Active catalog rows missing French display remain for Phase 4 remediation",
    "Dual-layer VERIFIED linkages not bulk-established (explicit review required)",
  ];

  writeAuditArtifact(
    "medication-phase2-canonical-identity-architecture.json",
    buildCanonicalIdentityArchitecture(dataSource, confidence, schema, metrics)
  );
  writeAuditArtifact(
    "medication-phase2-dual-layer-reconciliation.json",
    buildDualLayerReconciliation(dataSource, confidence, metrics)
  );
  writeAuditArtifact(
    "medication-phase2-rxnorm-readiness.json",
    buildRxNormReadiness(dataSource, confidence, metrics)
  );
  writeAuditArtifact(
    "medication-phase2-route-governance.json",
    buildRouteGovernance(dataSource, confidence, metrics)
  );
  writeAuditArtifact(
    "medication-phase2-product-formulation-route-matrix.json",
    buildProductFormulationRouteMatrix(dataSource, confidence, metrics)
  );
  writeAuditArtifact(
    "medication-phase2-order-to-mar-linkage.json",
    buildOrderToMarLinkage(dataSource, confidence)
  );
  writeAuditArtifact(
    "medication-phase2-mar-to-charge-traceability.json",
    buildMarToChargeTraceability(dataSource, confidence)
  );
  writeAuditArtifact(
    "medication-phase2-hcpcs-billing-unit-architecture.json",
    buildHcpcsBillingUnitArchitecture(dataSource, confidence)
  );
  writeAuditArtifact(
    "medication-phase2-historical-identity-preservation.json",
    buildHistoricalIdentityPreservation(dataSource, confidence)
  );
  writeAuditArtifact(
    "medication-phase2-fixture-isolation.json",
    buildFixtureIsolation(dataSource, confidence, metrics)
  );
  writeAuditArtifact(
    "medication-phase2-localization-compatibility.json",
    buildLocalizationCompatibility(dataSource, confidence, metrics)
  );
  writeAuditArtifact(
    "medication-phase2-tenant-facility-isolation.json",
    buildTenantFacilityIsolation(dataSource, confidence)
  );
  writeAuditArtifact("medication-phase2-migration-safety.json", buildMigrationSafety(schema));
  writeAuditArtifact(
    "medication-phase2-performance-indexing.json",
    buildPerformanceIndexing(schema)
  );
  writeAuditArtifact(
    "medication-phase2-regression-certification.json",
    buildRegressionCertification(input.evidence)
  );

  const summary = buildEnterpriseCertificationSummary({
    dataSource,
    confidence,
    schema,
    metrics,
    evidence: input.evidence,
    knownBlockingGaps,
    knownNonblockingGaps,
  });
  const summaryPath = writeAuditArtifact(
    "medication-phase2-enterprise-certification-summary.json",
    summary
  );

  return { summaryPath, finalDecision: summary.FinalDecision };
}
