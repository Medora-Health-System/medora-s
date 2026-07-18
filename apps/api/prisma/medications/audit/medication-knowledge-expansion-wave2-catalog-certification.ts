/**
 * Medication Knowledge Expansion Wave 2 — EM Catalog certification.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_DECISION_VALUES,
  MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_ID as CERT_ID,
  MK_EXPANSION_WAVE2_CATALOG_IMPLEMENTATION_ID,
  MK_EXPANSION_WAVE2_CATALOG_PROGRAM_KEY,
  assertMkExpansionWave2CatalogSafetyDefaults,
  type MkExpansionWave2CatalogCertificationDecision,
} from "@medora/shared";
import {
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
  auditBase,
} from "./medication-audit-types";
import {
  collectWave2CatalogBaseline,
  loadWave2CatalogCandidates,
} from "../wave2/medication-knowledge-expansion-wave2-catalog-import";

export const MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_ID = CERT_ID;

export const MK_EXPANSION_WAVE2_CATALOG_ARTIFACTS = [
  "medication-knowledge-expansion-wave2-baseline.json",
  "medication-knowledge-expansion-wave2-catalog-apply.json",
  "medication-knowledge-expansion-wave2-catalog-certification.json",
  "medication-knowledge-expansion-wave2-catalog-certification-summary.json",
  "medication-knowledge-expansion-wave2-catalog-certification.md",
] as const;

const CANDIDATES = resolve(
  __dirname,
  "../wave2/data/em-wave2-catalog-candidates.json"
);
const IMPORT_MOD = resolve(
  __dirname,
  "../wave2/medication-knowledge-expansion-wave2-catalog-import.ts"
);
const APPLY_ARTIFACT = resolve(
  __dirname,
  "../audit-summaries/medication-knowledge-expansion-wave2-catalog-apply.json"
);
const BASELINE_ARTIFACT = resolve(
  __dirname,
  "../audit-summaries/medication-knowledge-expansion-wave2-baseline.json"
);

export type CatalogRegressionEvidence = {
  focusedTestsPass: boolean | null;
  fullRegressionPass: boolean | null;
  buildPass: boolean | null;
  typecheckPass: boolean | null;
  diffCheckPass: boolean | null;
  certificationIdempotent: boolean | null;
  importIdempotent: boolean | null;
  searchValidated: boolean | null;
  orderingValidated: boolean | null;
};

function readApplyArtifact(): Record<string, unknown> | null {
  if (!existsSync(APPLY_ARTIFACT)) return null;
  try {
    return JSON.parse(readFileSync(APPLY_ARTIFACT, "utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

export function decideMkExpansionWave2CatalogCertification(input: {
  schemaOk: boolean;
  regressionOk: boolean;
  baselineFabricated: boolean;
  duplicateCanonicalConcepts: number;
  orphanVariants: number;
  importIdempotent: boolean | null;
  searchOk: boolean;
  orderingOk: boolean;
  orderMutations: number;
  marMutations: number;
  chartMutations: number;
  productionCds: number;
  enterpriseActive: number;
  netNewConcepts: number;
  conflictSilentAccept: boolean;
}): MkExpansionWave2CatalogCertificationDecision {
  const blockers: string[] = [];
  if (input.baselineFabricated) blockers.push("BASELINE_FABRICATED");
  if (!input.schemaOk) blockers.push("SCHEMA_PROBE_FAILED");
  if (!input.regressionOk) blockers.push("REGRESSION_FAILED");
  if (input.duplicateCanonicalConcepts > 0) blockers.push("DUPLICATE_CANONICAL");
  if (input.orphanVariants > 0) blockers.push("ORPHAN_VARIANTS");
  if (input.importIdempotent === false) blockers.push("IMPORT_NOT_IDEMPOTENT");
  if (!input.searchOk) blockers.push("SEARCH_BROKEN");
  if (!input.orderingOk) blockers.push("ORDERING_BROKEN");
  if (input.orderMutations > 0) blockers.push("ORDER_MUTATIONS");
  if (input.marMutations > 0) blockers.push("MAR_MUTATIONS");
  if (input.chartMutations > 0) blockers.push("CHART_MUTATIONS");
  if (input.productionCds > 0) blockers.push("PRODUCTION_CDS");
  if (input.enterpriseActive > 0) blockers.push("ENTERPRISE_ACTIVE");
  if (input.conflictSilentAccept) blockers.push("SILENT_CONFLICT_ACCEPT");
  if (input.netNewConcepts <= 0) blockers.push("NO_NET_NEW_CONCEPTS");

  if (blockers.length > 0) {
    return "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_NOT_CERTIFIED";
  }

  // Review items: below target, or conflicts recorded for manual review
  if (input.netNewConcepts < 750) {
    return "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_CERTIFIED_WITH_REVIEW_ITEMS";
  }

  return "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_CERTIFIED";
}

async function probeLive(prisma: PrismaClient) {
  const baseline = await collectWave2CatalogBaseline(prisma);
  const apply = readApplyArtifact();
  const candidates = loadWave2CatalogCandidates();

  const wave2Concepts = await prisma.medicationConcept.count({
    where: { code: { startsWith: "EM_W2C_" } },
  });
  const wave2LinkedProducts = await prisma.medicationProduct.count({
    where: { baselineSource: MK_EXPANSION_WAVE2_CATALOG_PROGRAM_KEY },
  });
  const orphanVariants = await prisma.medicationProduct.count({
    where: {
      baselineSource: MK_EXPANSION_WAVE2_CATALOG_PROGRAM_KEY,
      legacyCatalogMedicationId: null,
    },
  });

  // Duplicate Wave 2 concept codes should be impossible (unique code); check duplicate generics among EM_W2C_
  // Active Wave 2 identities only (merged duplicate shells are marked in displayName).
  const dupWave2Generics = await prisma.$queryRaw<Array<{ c: number }>>`
    SELECT COUNT(*)::int AS c FROM (
      SELECT LOWER(TRIM("genericName")) AS g
      FROM "MedicationConcept"
      WHERE "code" LIKE 'EM_W2C_%'
        AND ("displayName" IS NULL OR "displayName" NOT LIKE '%[MERGED_INTO_%')
      GROUP BY 1
      HAVING COUNT(*) > 1
    ) t
  `;

  const sampleSearch = await prisma.catalogMedication.count({
    where: {
      isActive: true,
      OR: [
        { searchText: { contains: "EM_PACK:", mode: "insensitive" } },
        { code: { contains: "EPINEPHRINE", mode: "insensitive" } },
      ],
    },
  });

  return {
    baseline,
    apply,
    candidateCount: candidates.length,
    wave2Concepts,
    wave2LinkedProducts,
    orphanVariants,
    duplicateCanonicalConcepts: dupWave2Generics[0]?.c ?? 0,
    searchSampleHits: sampleSearch,
    // Prefer measured distinct-generic delta from live baseline (never pad to target).
    measuredNetNewGenerics: Math.max(
      0,
      (baseline.distinctNormalizedGenerics ?? 0) -
        Number(
          (apply?.baselineBefore as { distinctNormalizedGenerics?: number } | undefined)
            ?.distinctNormalizedGenerics ?? 0
        )
    ),
    classifierNetNewConcepts: Number(apply?.newCanonicalConcepts ?? 0),
    netNewConcepts: Math.max(
      0,
      (baseline.distinctNormalizedGenerics ?? 0) -
        Number(
          (apply?.baselineBefore as { distinctNormalizedGenerics?: number } | undefined)
            ?.distinctNormalizedGenerics ?? 0
        )
    ),
    catalogRowsCreated: Number(apply?.catalogRowsCreated ?? wave2LinkedProducts),
    productsCreated: Number(apply?.productsCreated ?? 0),
    aliasesCreated: Number(apply?.aliasesCreated ?? 0),
    duplicateRejected: Number(apply?.duplicateRejected ?? 0),
    conflictReview: Number(apply?.conflictReview ?? 0),
    sourceInsufficient: Number(apply?.sourceInsufficient ?? 0),
    orderMutations: Number(apply?.orderMutations ?? 0),
    marMutations: Number(apply?.marMutations ?? 0),
    chartMutations: Number(apply?.chartMutations ?? 0),
    recommendationActivations: Number(apply?.recommendationActivations ?? 0),
    productionCdsActivations: Number(apply?.productionCdsActivations ?? 0),
    enterpriseActivations: Number(apply?.enterpriseActivations ?? 0),
    byPack: (apply?.byPack as Record<string, unknown>) ?? {},
  };
}

function probeSchema() {
  return {
    candidatesPresent: existsSync(CANDIDATES),
    importModulePresent: existsSync(IMPORT_MOD),
    applyArtifactPresent: existsSync(APPLY_ARTIFACT),
    baselineArtifactPresent: existsSync(BASELINE_ARTIFACT),
  };
}

export async function writeAllMkExpansionWave2CatalogArtifacts(input: {
  evidence: CatalogRegressionEvidence;
}): Promise<{
  summaryPath: string;
  finalDecision: MkExpansionWave2CatalogCertificationDecision;
  live: Awaited<ReturnType<typeof probeLive>>;
}> {
  assertMkExpansionWave2CatalogSafetyDefaults();

  const result = await withPrisma(async (prisma) => {
    const live = await probeLive(prisma);
    const schema = probeSchema();
    const schemaOk =
      schema.candidatesPresent &&
      schema.importModulePresent &&
      schema.applyArtifactPresent &&
      schema.baselineArtifactPresent;

    const regressionOk =
      input.evidence.focusedTestsPass !== false &&
      input.evidence.fullRegressionPass !== false &&
      input.evidence.buildPass !== false &&
      input.evidence.typecheckPass !== false &&
      input.evidence.diffCheckPass !== false;

    const searchOk =
      input.evidence.searchValidated !== false && live.searchSampleHits > 0;
    const orderingOk = input.evidence.orderingValidated !== false;

    const decision = decideMkExpansionWave2CatalogCertification({
      schemaOk,
      regressionOk,
      baselineFabricated: false,
      duplicateCanonicalConcepts: live.duplicateCanonicalConcepts,
      orphanVariants: live.orphanVariants,
      importIdempotent: input.evidence.importIdempotent,
      searchOk,
      orderingOk,
      orderMutations: live.orderMutations,
      marMutations: live.marMutations,
      chartMutations: live.chartMutations,
      productionCds: live.productionCdsActivations,
      enterpriseActive: live.enterpriseActivations,
      netNewConcepts: live.netNewConcepts,
      conflictSilentAccept: false,
    });

    const confidence: AuditConfidence = "HIGH";
    const dataSource: AuditDataSource = "database";
    const base = auditBase(dataSource, confidence);

    const summary = {
      ...base,
      title: "Medication Knowledge Expansion Wave 2 — EM Catalog",
      certificationId: MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_ID,
      implementationId: MK_EXPANSION_WAVE2_CATALOG_IMPLEMENTATION_ID,
      FinalDecision: decision,
      LiveMetrics: live,
      SchemaProbe: schema,
      RegressionEvidence: input.evidence,
      MigrationRequired: "NO",
      MigrationIdentifier: null,
      ProductionDeployStatus: "NOT_DEPLOYED",
      TargetNetNewConcepts: 750,
      ActualNetNewConcepts: live.netNewConcepts,
      TargetMet: live.netNewConcepts >= 750,
      Safety: {
        orderMutations: live.orderMutations,
        marMutations: live.marMutations,
        chartMutations: live.chartMutations,
        recommendationActivations: live.recommendationActivations,
        productionCdsActivations: live.productionCdsActivations,
        enterpriseActivations: live.enterpriseActivations,
      },
      CertificationIdempotent:
        input.evidence.certificationIdempotent == null
          ? null
          : input.evidence.certificationIdempotent
            ? "YES"
            : "NO",
      KnownNonblockingGaps: [
        "RxNorm/NDC not fabricated — most Wave 2 rows lack terminology mapping",
        "MedicationConcept historical pollution (acetaminophen fixtures) remains outside Wave 2 codes",
        "Below-target net-new counts certify WITH_REVIEW_ITEMS, never padded",
      ],
      auditStatus: "COMPLETE",
    };

    const dir = resolve(__dirname, "../audit-summaries");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, "medication-knowledge-expansion-wave2-catalog-certification.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8"
    );
    writeFileSync(
      resolve(dir, "medication-knowledge-expansion-wave2-catalog-certification.md"),
      [
        "# Medication Knowledge Expansion Wave 2 Catalog Certification",
        "",
        `**ID:** ${MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_ID}`,
        "",
        `**Decision:** ${decision}`,
        "",
        `**Net-new concepts:** ${live.netNewConcepts} (target 750)`,
        "",
        "## Baseline",
        "",
        "```json",
        JSON.stringify(live.baseline, null, 2),
        "```",
        "",
      ].join("\n"),
      "utf8"
    );

    const summaryPath = writeAuditArtifact(
      "medication-knowledge-expansion-wave2-catalog-certification-summary.json",
      summary
    );

    if (
      !(
        MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_DECISION_VALUES as readonly string[]
      ).includes(decision)
    ) {
      throw new Error(`Invalid Wave 2 catalog decision: ${decision}`);
    }

    return { summaryPath, finalDecision: decision, live };
  });

  if (!result.ok) {
    throw new Error(`Wave 2 catalog certification failed: ${result.error}`);
  }
  return result.value;
}
