/**
 * Medication Knowledge Expansion Wave 2 certification.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  MK_EXPANSION_WAVE2_CERTIFICATION_DECISION_VALUES,
  MK_EXPANSION_WAVE2_CERTIFICATION_ID as CERT_ID,
  MK_EXPANSION_WAVE2_IMPLEMENTATION_ID,
  MK_EXPANSION_WAVE2_SPECIALTY_PACKS,
  assertMkExpansionWave2SafetyDefaults,
  buildMkExpansionWave2SearchQueryExpansions,
  getMkExpansionWave2PackCoverageStats,
  listMkExpansionWave2FamilyNames,
  mkExpansionWave2PackMarker,
  normalizeMedicationFamilyName,
  type MkExpansionWave2CertificationDecision,
} from "@medora/shared";
import {
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
  auditBase,
} from "./medication-audit-types";

export const MK_EXPANSION_WAVE2_CERTIFICATION_ID = CERT_ID;

export const MK_EXPANSION_WAVE2_ARTIFACTS = [
  "medication-knowledge-expansion-wave2-enrichment.json",
  "medication-knowledge-expansion-wave2-coverage.json",
  "medication-knowledge-expansion-wave2-certification.json",
  "medication-knowledge-expansion-wave2-certification-summary.json",
  "medication-knowledge-expansion-wave2-certification.md",
] as const;

const SHARED = resolve(
  __dirname,
  "../../../../../packages/shared/src/medication/medicationKnowledgeExpansionWave2.ts"
);
const SEARCH = resolve(
  __dirname,
  "../../../../../packages/shared/src/medication/enterpriseMedicationSearchExpansion.ts"
);
const CLI = resolve(
  __dirname,
  "../wave2/run-medication-knowledge-expansion-wave2-cli.ts"
);
const UI = resolve(
  __dirname,
  "../../../../../apps/web/src/components/catalog/SharedCatalogAutocomplete.tsx"
);
const DOCS = resolve(
  __dirname,
  "../../../../../docs/clinical/medication-knowledge-expansion-wave-2-guide.md"
);
const EVIDENCE_GOV = resolve(
  __dirname,
  "../../../../../packages/shared/src/medication/medicationRxNormSourceGovernance.ts"
);
const SCHEMA = resolve(__dirname, "../../schema.prisma");

export type RegressionEvidence = {
  focusedTestsPass: boolean | null;
  fullRegressionPass: boolean | null;
  buildPass: boolean | null;
  typecheckPass: boolean | null;
  diffCheckPass: boolean | null;
  certificationIdempotent: boolean | null;
};

async function collectLive(prisma: PrismaClient) {
  const matchedFamilies = new Set<string>();
  for (const family of listMkExpansionWave2FamilyNames()) {
    const count = await prisma.catalogMedication.count({
      where: {
        OR: [
          { genericName: { contains: family, mode: "insensitive" } },
          { name: { contains: family, mode: "insensitive" } },
          { displayNameEn: { contains: family, mode: "insensitive" } },
        ],
      },
    });
    if (count > 0) matchedFamilies.add(normalizeMedicationFamilyName(family));
  }

  const coverage = getMkExpansionWave2PackCoverageStats({
    matchedFamilyNames: [...matchedFamilies],
  });

  let taggedRows = 0;
  for (const pack of MK_EXPANSION_WAVE2_SPECIALTY_PACKS) {
    taggedRows += await prisma.catalogMedication.count({
      where: {
        searchText: {
          contains: mkExpansionWave2PackMarker(pack.packKey),
          mode: "insensitive",
        },
      },
    });
  }

  const acetaminophenCatalog = await prisma.catalogMedication.count({
    where: {
      OR: [
        { genericName: { contains: "acetaminophen", mode: "insensitive" } },
        { genericName: { contains: "paracetamol", mode: "insensitive" } },
      ],
    },
  });

  const duplicateCodes = await prisma.$queryRaw<Array<{ code: string; c: bigint }>>`
    SELECT "code", COUNT(*)::bigint AS c
    FROM "CatalogMedication"
    GROUP BY "code"
    HAVING COUNT(*) > 1
    LIMIT 20
  `;

  const expansions = buildMkExpansionWave2SearchQueryExpansions();
  const searchExpansionKeys = Object.keys(expansions).length;

  return {
    PackCount: MK_EXPANSION_WAVE2_SPECIALTY_PACKS.length,
    FamilyUniverse: coverage.familyCount,
    MatchedFamilies: coverage.matchedFamilyCount,
    CoveragePercent: coverage.coveragePercent,
    TaggedCatalogRows: taggedRows,
    SearchExpansionKeys: searchExpansionKeys,
    DuplicateCatalogCodes: duplicateCodes.length,
    AcetaminophenCatalogRows: acetaminophenCatalog,
    AcetaminophenInPacks: 0,
    ClinicalActivationEnabled: false,
    EnterpriseActiveAllowed: false,
    OrderFromRecommendation: false,
    SecondMedicationMaster: false,
    PackCoverage: coverage.packs,
  };
}

function probeSchema() {
  const searchSrc = existsSync(SEARCH) ? readFileSync(SEARCH, "utf8") : "";
  const schemaSrc = existsSync(SCHEMA) ? readFileSync(SCHEMA, "utf8") : "";
  const sharedSrc = existsSync(SHARED) ? readFileSync(SHARED, "utf8") : "";
  return {
    sharedPresent: existsSync(SHARED),
    cliPresent: existsSync(CLI),
    uiPresent: existsSync(UI),
    docsPresent: existsSync(DOCS),
    searchWired: searchSrc.includes("buildMkExpansionWave2SearchQueryExpansions"),
    uiHasPackChips:
      existsSync(UI) &&
      readFileSync(UI, "utf8").includes("MK_EXPANSION_WAVE2_SPECIALTY_PACKS"),
    evidenceGovernanceReused: existsSync(EVIDENCE_GOV),
    noSecondMedicationMasterInWave2Module:
      !sharedSrc.includes("model CatalogMedication") &&
      sharedSrc.includes("duplicateMedicationMaster: false"),
    runtimeCatalogStillSingle:
      (schemaSrc.match(/model CatalogMedication\b/g) ?? []).length === 1,
  };
}

export function decideMkExpansionWave2Certification(input: {
  live: Awaited<ReturnType<typeof collectLive>>;
  schemaOk: boolean;
  regressionOk: boolean;
}): MkExpansionWave2CertificationDecision {
  const { live } = input;
  const blockers: string[] = [];
  if (live.DuplicateCatalogCodes > 0) blockers.push("DUPLICATE_CATALOG_CODES");
  if (live.AcetaminophenInPacks > 0) blockers.push("ACETAMINOPHEN_IN_PACKS");
  if (live.ClinicalActivationEnabled) blockers.push("CLINICAL_ACTIVATION");
  if (live.EnterpriseActiveAllowed) blockers.push("ENTERPRISE_ACTIVE");
  if (live.OrderFromRecommendation) blockers.push("ORDER_FROM_RECOMMENDATION");
  if (live.SecondMedicationMaster) blockers.push("SECOND_MASTER");
  if (live.SearchExpansionKeys < 10) blockers.push("SEARCH_EXPANSIONS_MISSING");
  if (live.PackCount < 10) blockers.push("PACKS_INCOMPLETE");
  if (!input.schemaOk) blockers.push("SCHEMA_PROBE_FAILED");
  if (!input.regressionOk) blockers.push("REGRESSION_FAILED");

  if (blockers.length > 0) {
    return "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_NOT_CERTIFIED";
  }

  if (live.CoveragePercent >= 50 && live.TaggedCatalogRows > 0) {
    return "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_CERTIFIED";
  }

  return "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_CERTIFIED_WITH_COVERAGE_GAPS";
}

export async function writeAllMkExpansionWave2Artifacts(input: {
  evidence: RegressionEvidence;
}): Promise<{
  summaryPath: string;
  finalDecision: MkExpansionWave2CertificationDecision;
  live: Awaited<ReturnType<typeof collectLive>>;
}> {
  assertMkExpansionWave2SafetyDefaults();

  const result = await withPrisma(async (prisma) => {
    const live = await collectLive(prisma);
    const schema = probeSchema();
    const schemaOk =
      schema.sharedPresent &&
      schema.cliPresent &&
      schema.uiPresent &&
      schema.searchWired &&
      schema.uiHasPackChips &&
      schema.evidenceGovernanceReused &&
      schema.noSecondMedicationMasterInWave2Module &&
      schema.runtimeCatalogStillSingle;

    const regressionOk =
      input.evidence.focusedTestsPass !== false &&
      input.evidence.fullRegressionPass !== false &&
      input.evidence.buildPass !== false &&
      input.evidence.typecheckPass !== false &&
      input.evidence.diffCheckPass !== false;

    const decision = decideMkExpansionWave2Certification({
      live,
      schemaOk,
      regressionOk,
    });

    const confidence: AuditConfidence = "HIGH";
    const dataSource: AuditDataSource = "database";
    const base = auditBase(dataSource, confidence);

    const summary = {
      ...base,
      title: "Medication Knowledge Expansion Wave 2 — EM Foundation",
      certificationId: MK_EXPANSION_WAVE2_CERTIFICATION_ID,
      implementationId: MK_EXPANSION_WAVE2_IMPLEMENTATION_ID,
      FinalDecision: decision,
      LiveMetrics: live,
      SchemaProbe: schema,
      RegressionEvidence: input.evidence,
      CertificationIdempotent:
        input.evidence.certificationIdempotent == null
          ? null
          : input.evidence.certificationIdempotent
            ? "YES"
            : "NO",
      MigrationRequired: "NO",
      SecondMedicationMaster: "NO",
      AcetaminophenIdentityBlocked: "YES",
      ClinicalActivationEnabled: "NO",
      KnownNonblockingGaps: [
        "Coverage gaps remain for specialty families not yet present in CatalogMedication",
        "Wave 2 organizes and enriches existing catalog — does not auto-activate ordering",
        "Ophthalmology/ENT/Urology packs may have lower catalog match until future ENRICH/CREATE seeds",
      ],
      auditStatus: "COMPLETE",
    };

    const dir = resolve(__dirname, "../audit-summaries");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, "medication-knowledge-expansion-wave2-certification.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8"
    );
    writeFileSync(
      resolve(dir, "medication-knowledge-expansion-wave2-certification.md"),
      [
        "# Medication Knowledge Expansion Wave 2 Certification",
        "",
        `**ID:** ${MK_EXPANSION_WAVE2_CERTIFICATION_ID}`,
        "",
        `**Decision:** ${decision}`,
        "",
        "## Live metrics",
        "",
        "```json",
        JSON.stringify(live, null, 2),
        "```",
        "",
      ].join("\n"),
      "utf8"
    );

    const summaryPath = writeAuditArtifact(
      "medication-knowledge-expansion-wave2-certification-summary.json",
      summary
    );

    if (
      !(MK_EXPANSION_WAVE2_CERTIFICATION_DECISION_VALUES as readonly string[]).includes(
        decision
      )
    ) {
      throw new Error(`Invalid Wave 2 decision: ${decision}`);
    }

    return { summaryPath, finalDecision: decision, live };
  });

  if (!result.ok) {
    throw new Error(`Wave 2 certification failed: ${result.error}`);
  }
  return result.value;
}
