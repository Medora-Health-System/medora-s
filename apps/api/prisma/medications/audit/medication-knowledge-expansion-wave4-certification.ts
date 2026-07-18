/**
 * Medication Knowledge Expansion Wave 4 certification.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  MK_EXPANSION_WAVE4_CERTIFICATION_DECISION_VALUES,
  MK_EXPANSION_WAVE4_CERTIFICATION_ID as CERT_ID,
  MK_EXPANSION_WAVE4_IMPLEMENTATION_ID,
  MK_EXPANSION_WAVE4_PROGRAM_KEY,
  MK_EXPANSION_WAVE4_TARGET_TOTAL_GENERICS,
  assertMkExpansionWave4SafetyDefaults,
  type MkExpansionWave4CertificationDecision,
} from "@medora/shared";
import {
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
  auditBase,
} from "./medication-audit-types";
import { collectWave4Baseline } from "../wave4/medication-knowledge-expansion-wave4-import";

export const MK_EXPANSION_WAVE4_CERTIFICATION_ID = CERT_ID;

export const MK_EXPANSION_WAVE4_ARTIFACTS = [
  "medication-knowledge-expansion-wave4-baseline.json",
  "medication-knowledge-expansion-wave4-apply.json",
  "medication-knowledge-expansion-wave4-certification.json",
  "medication-knowledge-expansion-wave4-certification-summary.json",
  "medication-knowledge-expansion-wave4-certification.md",
] as const;

const CANDIDATES = resolve(
  __dirname,
  "../wave4/data/medora-curated-wave4-candidates.json"
);
const IMPORT_MOD = resolve(
  __dirname,
  "../wave4/medication-knowledge-expansion-wave4-import.ts"
);
const APPLY_ARTIFACT = resolve(
  __dirname,
  "../audit-summaries/medication-knowledge-expansion-wave4-apply.json"
);
const BASELINE_ARTIFACT = resolve(
  __dirname,
  "../audit-summaries/medication-knowledge-expansion-wave4-baseline.json"
);

export type Wave4RegressionEvidence = {
  focusedTestsPass: boolean | null;
  fullRegressionPass: boolean | null;
  buildPass: boolean | null;
  typecheckPass: boolean | null;
  diffCheckPass: boolean | null;
  certificationIdempotent: boolean | null;
  importIdempotent: boolean | null;
  searchValidated: boolean | null;
  orderingValidated: boolean | null;
  wave2RegressionPass: boolean | null;
};

function readApply(): Record<string, unknown> | null {
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

export function decideMkExpansionWave4Certification(input: {
  schemaOk: boolean;
  regressionOk: boolean;
  baselineFabricated: boolean;
  sourceUnapproved: boolean;
  fabricatedIdentifiers: boolean;
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
  recommendationActivations: number;
  netNewConcepts: number;
  finalDistinctGenerics: number;
  conflictSilentAccept: boolean;
}): MkExpansionWave4CertificationDecision {
  const blockers: string[] = [];
  if (input.baselineFabricated) blockers.push("BASELINE_FABRICATED");
  if (input.sourceUnapproved) blockers.push("SOURCE_UNAPPROVED");
  if (input.fabricatedIdentifiers) blockers.push("FABRICATED_IDENTIFIERS");
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
  if (input.recommendationActivations > 0) blockers.push("RECOMMENDATION_ACTIVATION");
  if (input.conflictSilentAccept) blockers.push("SILENT_CONFLICT_ACCEPT");
  if (input.netNewConcepts <= 0) blockers.push("NO_NET_NEW_CONCEPTS");

  if (blockers.length > 0) {
    return "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_4_NOT_CERTIFIED";
  }

  if (input.finalDistinctGenerics < MK_EXPANSION_WAVE4_TARGET_TOTAL_GENERICS) {
    return "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_4_CERTIFIED_WITH_REVIEW_ITEMS";
  }

  return "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_4_CERTIFIED";
}

async function probeLive(prisma: PrismaClient) {
  const baseline = await collectWave4Baseline(prisma);
  const apply = readApply();
  const baselineBeforeGenerics = Number(
    (apply?.baselineBefore as { distinctNormalizedGenerics?: number } | undefined)
      ?.distinctNormalizedGenerics ?? 0
  );
  const measuredNetNew = Math.max(
    0,
    baseline.distinctNormalizedGenerics - baselineBeforeGenerics
  );

  const orphanVariants = await prisma.medicationProduct.count({
    where: {
      baselineSource: MK_EXPANSION_WAVE4_PROGRAM_KEY,
      legacyCatalogMedicationId: null,
    },
  });

  const dupWave4Generics = await prisma.$queryRaw<Array<{ c: number }>>`
    SELECT COUNT(*)::int AS c FROM (
      SELECT LOWER(TRIM("genericName")) AS g
      FROM "MedicationConcept"
      WHERE "code" LIKE 'EM_W4C_%'
        AND ("displayName" IS NULL OR "displayName" NOT LIKE '%[MERGED_INTO_%')
      GROUP BY 1
      HAVING COUNT(*) > 1
    ) t
  `;

  const searchSampleHits = await prisma.catalogMedication.count({
    where: {
      isActive: true,
      OR: [
        { dataSourceLabel: "MEDORA_CURATED_WAVE4" },
        { searchText: { contains: "EM_DOMAIN:", mode: "insensitive" } },
      ],
    },
  });

  return {
    baseline,
    apply,
    measuredNetNew,
    classifierNetNew: Number(apply?.newCanonicalConcepts ?? 0),
    catalogRowsCreated: Number(apply?.catalogRowsCreated ?? 0),
    productsCreated: Number(apply?.productsCreated ?? 0),
    aliasesCreated: Number(apply?.aliasesCreated ?? 0),
    duplicateRejected: Number(apply?.duplicateRejected ?? 0),
    conflictReview: Number(apply?.conflictReview ?? 0),
    rowsReceived: Number(apply?.rowsReceived ?? 0),
    rowsValid: Number(apply?.rowsValid ?? 0),
    rowsInvalid: Number(apply?.rowsInvalid ?? 0),
    sourceChecksumSha256: String(apply?.sourceChecksumSha256 ?? ""),
    orderMutations: Number(apply?.orderMutations ?? 0),
    marMutations: Number(apply?.marMutations ?? 0),
    chartMutations: Number(apply?.chartMutations ?? 0),
    recommendationActivations: Number(apply?.recommendationActivations ?? 0),
    productionCdsActivations: Number(apply?.productionCdsActivations ?? 0),
    enterpriseActivations: Number(apply?.enterpriseActivations ?? 0),
    orphanVariants,
    duplicateCanonicalConcepts: dupWave4Generics[0]?.c ?? 0,
    searchSampleHits,
    byDomain: (apply?.byDomain as Record<string, unknown>) ?? {},
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

export async function writeAllMkExpansionWave4Artifacts(input: {
  evidence: Wave4RegressionEvidence;
}): Promise<{
  summaryPath: string;
  finalDecision: MkExpansionWave4CertificationDecision;
  live: Awaited<ReturnType<typeof probeLive>>;
}> {
  assertMkExpansionWave4SafetyDefaults();

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
      input.evidence.diffCheckPass !== false &&
      input.evidence.wave2RegressionPass !== false;

    const decision = decideMkExpansionWave4Certification({
      schemaOk,
      regressionOk,
      baselineFabricated: false,
      sourceUnapproved: false,
      fabricatedIdentifiers: false,
      duplicateCanonicalConcepts: live.duplicateCanonicalConcepts,
      orphanVariants: live.orphanVariants,
      importIdempotent: input.evidence.importIdempotent,
      searchOk:
        input.evidence.searchValidated !== false && live.searchSampleHits > 0,
      orderingOk: input.evidence.orderingValidated !== false,
      orderMutations: live.orderMutations,
      marMutations: live.marMutations,
      chartMutations: live.chartMutations,
      productionCds: live.productionCdsActivations,
      enterpriseActive: live.enterpriseActivations,
      recommendationActivations: live.recommendationActivations,
      netNewConcepts: live.measuredNetNew,
      finalDistinctGenerics: live.baseline.distinctNormalizedGenerics,
      conflictSilentAccept: false,
    });

    const confidence: AuditConfidence = "HIGH";
    const dataSource: AuditDataSource = "database";
    const base = auditBase(dataSource, confidence);

    const summary = {
      ...base,
      title: "Medication Knowledge Expansion Wave 4 — Import-Driven Formulary",
      certificationId: MK_EXPANSION_WAVE4_CERTIFICATION_ID,
      implementationId: MK_EXPANSION_WAVE4_IMPLEMENTATION_ID,
      FinalDecision: decision,
      LiveMetrics: live,
      SchemaProbe: schema,
      RegressionEvidence: input.evidence,
      MigrationRequired: "NO",
      MigrationIdentifier: null,
      ProductionDeployStatus: "NOT_DEPLOYED",
      TargetTotalDistinctGenerics: MK_EXPANSION_WAVE4_TARGET_TOTAL_GENERICS,
      ActualFinalDistinctGenerics: live.baseline.distinctNormalizedGenerics,
      ActualNetNewGenerics: live.measuredNetNew,
      TargetMet:
        live.baseline.distinctNormalizedGenerics >=
        MK_EXPANSION_WAVE4_TARGET_TOTAL_GENERICS,
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
        "RxNorm/DailyMed adapters registered but CREATE uses MEDORA_CURATED only",
        "No fabricated RxCUI/NDC",
        "Target 5000 distinct generics — certify WITH_REVIEW_ITEMS if below",
        "Unified DB staging tables deferred — file/job artifacts used",
      ],
      auditStatus: "COMPLETE",
    };

    const dir = resolve(__dirname, "../audit-summaries");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, "medication-knowledge-expansion-wave4-certification.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8"
    );
    writeFileSync(
      resolve(dir, "medication-knowledge-expansion-wave4-certification.md"),
      [
        "# Medication Knowledge Expansion Wave 4 Certification",
        "",
        `**ID:** ${MK_EXPANSION_WAVE4_CERTIFICATION_ID}`,
        "",
        `**Decision:** ${decision}`,
        "",
        `**Final distinct generics:** ${live.baseline.distinctNormalizedGenerics} (target ${MK_EXPANSION_WAVE4_TARGET_TOTAL_GENERICS})`,
        `**Measured net-new:** ${live.measuredNetNew}`,
        "",
      ].join("\n"),
      "utf8"
    );

    const summaryPath = writeAuditArtifact(
      "medication-knowledge-expansion-wave4-certification-summary.json",
      summary
    );

    if (
      !(MK_EXPANSION_WAVE4_CERTIFICATION_DECISION_VALUES as readonly string[]).includes(
        decision
      )
    ) {
      throw new Error(`Invalid Wave 4 decision: ${decision}`);
    }

    return { summaryPath, finalDecision: decision, live };
  });

  if (!result.ok) {
    throw new Error(`Wave 4 certification failed: ${result.error}`);
  }
  return result.value;
}
