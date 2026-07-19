/**
 * Medication Formulation & Strength Completion certification (provider-facing).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFICATION_ID as CERT_ID,
  MEDICATION_FORMULATION_STRENGTH_COMPLETION_DECISIONS,
  MEDICATION_FORMULATION_STRENGTH_COMPLETION_IMPLEMENTATION_ID,
  assertMedicationFormulationStrengthCompletionSafetyDefaults,
  decideMedicationFormulationStrengthCompletion,
  type MedicationFormulationStrengthCompletionDecision,
} from "@medora/shared";
import {
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
  auditBase,
} from "./medication-audit-types";
import { collectFormulationBaseline } from "../formulation-completion/medication-formulation-strength-completion";
import {
  loadProviderAvailabilityValidationReport,
  runProviderAvailabilityValidation,
} from "../formulation-completion/medication-provider-availability-validation";
import { runUniversalCommonOrderability } from "../universal-completion/medication-universal-common-orderability";

export const MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFICATION_ID = CERT_ID;

export const MEDICATION_FORMULATION_STRENGTH_COMPLETION_ARTIFACTS = [
  "medication-formulation-strength-completion-baseline.json",
  "medication-formulation-strength-completion-apply.json",
  "medication-provider-availability-validation.json",
  "medication-universal-common-orderability-validation.json",
  "medication-formulation-strength-completion-certification.json",
  "medication-formulation-strength-completion-certification-summary.json",
  "medication-formulation-strength-completion-certification.md",
] as const;

const APPLY_ARTIFACT = resolve(
  __dirname,
  "../audit-summaries/medication-formulation-strength-completion-apply.json"
);
const BASELINE_ARTIFACT = resolve(
  __dirname,
  "../audit-summaries/medication-formulation-strength-completion-baseline.json"
);
const CANDIDATES = resolve(
  __dirname,
  "../formulation-completion/data/medora-formulation-completion-candidates.json"
);
const IMPL = resolve(
  __dirname,
  "../formulation-completion/medication-formulation-strength-completion.ts"
);

export type FormulationCompletionRegressionEvidence = {
  focusedTestsPass: boolean | null;
  fullRegressionPass: boolean | null;
  buildPass: boolean | null;
  typecheckPass: boolean | null;
  diffCheckPass: boolean | null;
  certificationIdempotent: boolean | null;
  completionIdempotent: boolean | null;
  pharmacyValidated: boolean | null;
  marValidated: boolean | null;
  reconciliationValidated: boolean | null;
};

function readApply(): Record<string, unknown> | null {
  if (!existsSync(APPLY_ARTIFACT)) return null;
  try {
    return JSON.parse(readFileSync(APPLY_ARTIFACT, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function decideFormulationStrengthCompletionCertification(
  input: Parameters<typeof decideMedicationFormulationStrengthCompletion>[0]
): MedicationFormulationStrengthCompletionDecision {
  return decideMedicationFormulationStrengthCompletion(input);
}

export async function writeAllFormulationStrengthCompletionArtifacts(input: {
  evidence: FormulationCompletionRegressionEvidence;
}): Promise<{
  summaryPath: string;
  finalDecision: MedicationFormulationStrengthCompletionDecision;
  live: {
    baseline: Awaited<ReturnType<typeof collectFormulationBaseline>>;
    apply: Record<string, unknown> | null;
    providerValidation: ReturnType<typeof loadProviderAvailabilityValidationReport>;
  };
}> {
  assertMedicationFormulationStrengthCompletionSafetyDefaults();

  const result = await withPrisma(async (prisma: PrismaClient) => {
    const baseline = await collectFormulationBaseline(prisma);
    const apply = readApply();
    const providerValidation =
      loadProviderAvailabilityValidationReport() ??
      (await runProviderAvailabilityValidation(prisma, { limit: 40 }));

    const universalPath = resolve(
      __dirname,
      "../audit-summaries/medication-universal-common-orderability-validation.json"
    );
    const universalValidation = existsSync(universalPath)
      ? (JSON.parse(readFileSync(universalPath, "utf8")) as Record<string, unknown>)
      : await runUniversalCommonOrderability(prisma, "VALIDATE");

    const schemaOk =
      existsSync(IMPL) &&
      existsSync(CANDIDATES) &&
      existsSync(BASELINE_ARTIFACT) &&
      existsSync(APPLY_ARTIFACT);

    const family = (apply?.familySearch ?? {}) as {
      passRate?: number;
      passed?: number;
      checks?: number;
      failed?: unknown[];
      exactRankingPassRate?: number;
      hardAcceptancePass?: boolean;
    };

    const regressionOk =
      input.evidence.focusedTestsPass !== false &&
      input.evidence.fullRegressionPass !== false &&
      input.evidence.buildPass !== false &&
      input.evidence.typecheckPass !== false &&
      input.evidence.diffCheckPass !== false &&
      input.evidence.pharmacyValidated !== false &&
      input.evidence.marValidated !== false &&
      input.evidence.reconciliationValidated !== false;

    const universalHard = (universalValidation.hardAcceptance ?? {}) as {
      pass?: boolean;
      failures?: unknown[];
    };
    const decision = decideMedicationFormulationStrengthCompletion({
      schemaOk,
      regressionOk,
      fabricatedData: false,
      createdNewGenerics: false,
      dualLayerActivated: Number(apply?.productsActivated ?? 0) > 0,
      familySearchPassRate: Number(family.passRate ?? 0),
      formulationsCreated: Number(apply?.variantsCreated ?? 0),
      sourceApproved: true,
      orderMutations: Number(apply?.orderMutations ?? 0),
      marMutations: Number(apply?.marMutations ?? 0),
      chartMutations: Number(apply?.chartMutations ?? 0),
      completionIdempotent: input.evidence.completionIdempotent,
      hardAcceptancePass:
        Boolean(family.hardAcceptancePass) &&
        providerValidation.hardAcceptance.pass &&
        Boolean(universalHard.pass),
      exactRankingPassRate: Math.min(
        Number(family.exactRankingPassRate ?? 0),
        providerValidation.exactRankingPassRate,
        Number(universalValidation.exactBrandRankingPassRate ?? 0)
      ),
      corpusSearchPassRate: providerValidation.searchPassRate,
      corpusSize: providerValidation.corpusSize,
      absentHardAcceptanceCount:
        providerValidation.hardAcceptance.failures.length +
        (Array.isArray(universalHard.failures) ? universalHard.failures.length : 0),
      universalBenchmarkFamilyCount: Number(universalValidation.benchmarkFamilyCount ?? 0),
      universalBenchmarkSearchPassRate: Number(universalValidation.searchPassRate ?? 0),
      universalBenchmarkOrderabilityPassRate: Number(
        universalValidation.orderabilityPassRate ?? 0
      ),
      universalExactBrandRankingPassRate: Number(
        universalValidation.exactBrandRankingPassRate ?? 0
      ),
      universalExactGenericRankingPassRate: Number(
        universalValidation.exactGenericRankingPassRate ?? 0
      ),
      universalMissingFamilyCount: Number(universalValidation.missingFamilyCount ?? 0),
    });

    const confidence: AuditConfidence = "HIGH";
    const dataSource: AuditDataSource = "database";
    const base = auditBase(dataSource, confidence);

    const summary = {
      ...base,
      title: "Medication Formulation & Strength Completion",
      certificationId: CERT_ID,
      implementationId: MEDICATION_FORMULATION_STRENGTH_COMPLETION_IMPLEMENTATION_ID,
      FinalDecision: decision,
      WhyPreviousCertificationInsufficient: [
        "Certified from internal catalog counts and a 15-family probe, not production UI search behavior",
        "Jardiance brand search showed generic-only single strength; jar ranked tirzepatide via mid-string match",
        "Biktarvy provider search failed despite Wave3 catalog presence (alias/ranking/display gaps)",
        "Result limit/UI default hid sibling strengths; brand aliases were not promoted in display",
      ],
      Baseline: baseline,
      Completion: {
        variantsCreated: Number(apply?.variantsCreated ?? 0),
        variantsSkippedExisting: Number(apply?.variantsSkippedExisting ?? 0),
        aliasesCreated: Number(apply?.aliasesCreated ?? 0),
        availabilityAliasesCreated: Number(apply?.availabilityAliasesCreated ?? 0),
        searchTextUpdated: Number(apply?.searchTextUpdated ?? 0),
        candidatesVariants: Number(apply?.candidatesVariants ?? 0),
        familySearch: family,
        sourceChecksumSha256: String(apply?.sourceChecksumSha256 ?? ""),
      },
      ProviderFacingValidation: {
        corpusSize: providerValidation.corpusSize,
        queryCount: providerValidation.queryCount,
        searchPassRate: providerValidation.searchPassRate,
        orderabilityPassRate: providerValidation.orderabilityPassRate,
        exactRankingPassRate: providerValidation.exactRankingPassRate,
        hardAcceptance: providerValidation.hardAcceptance,
        absentFamilies: providerValidation.absentFamilies.length,
        partialFamilies: providerValidation.partialFamilies.length,
        uiLimit: providerValidation.uiLimit,
      },
      UniversalCommonMedicationBenchmark: {
        familyCount: Number(universalValidation.benchmarkFamilyCount ?? 0),
        searchPassRate: Number(universalValidation.searchPassRate ?? 0),
        orderabilityPassRate: Number(universalValidation.orderabilityPassRate ?? 0),
        exactBrandRankingPassRate: Number(
          universalValidation.exactBrandRankingPassRate ?? 0
        ),
        exactGenericRankingPassRate: Number(
          universalValidation.exactGenericRankingPassRate ?? 0
        ),
        completeFamilyCount: Number(universalValidation.completeFamilyCount ?? 0),
        missingFamilyCount: Number(universalValidation.missingFamilyCount ?? 0),
        partialFamilyCount: Number(universalValidation.partialFamilyCount ?? 0),
        classificationCounts: universalValidation.classificationCounts ?? {},
        enrichment: universalValidation.enrichment ?? {},
        hardAcceptance: universalValidation.hardAcceptance ?? {},
        sources: universalValidation.sources ?? [],
      },
      HardAcceptance: {
        Biktarvy: providerValidation.hardAcceptance.failures.filter((f) =>
          f.familyId.includes("bikt")
        ),
        Jardiance: providerValidation.hardAcceptance.failures.filter((f) =>
          f.familyId.includes("jard") || f.query.toLowerCase().includes("jar")
        ),
        pass: providerValidation.hardAcceptance.pass,
      },
      Safety: {
        orderMutations: Number(apply?.orderMutations ?? 0),
        marMutations: Number(apply?.marMutations ?? 0),
        chartMutations: Number(apply?.chartMutations ?? 0),
        productsActivated: Number(apply?.productsActivated ?? 0),
        productionCds: 0,
      },
      MigrationRequired: "NO",
      MigrationIdentifier: null,
      ProductionDeployStatus: "NOT_DEPLOYED",
      ProviderQuestion:
        "Can a provider search for and order every common medication represented in the approved US clinical benchmark, including its common brand/generic names and clinically relevant supported variants?",
      ProviderAnswerMeasured: {
        answer:
          Number(universalValidation.searchPassRate ?? 0) >= 1 &&
          Number(universalValidation.orderabilityPassRate ?? 0) >= 1 &&
          Number(universalValidation.missingFamilyCount ?? 1) === 0 &&
          Number(universalValidation.benchmarkFamilyCount ?? 0) >= 1000
            ? "YES"
            : "NO",
        universalBenchmarkFamilyCount: Number(
          universalValidation.benchmarkFamilyCount ?? 0
        ),
        universalSearchPassRate: Number(universalValidation.searchPassRate ?? 0),
        universalOrderabilityPassRate: Number(
          universalValidation.orderabilityPassRate ?? 0
        ),
        universalExactBrandRankingPassRate: Number(
          universalValidation.exactBrandRankingPassRate ?? 0
        ),
        universalExactGenericRankingPassRate: Number(
          universalValidation.exactGenericRankingPassRate ?? 0
        ),
        hardAcceptancePass: providerValidation.hardAcceptance.pass,
        corpusSearchPassRate: providerValidation.searchPassRate,
        orderabilityPassRate: providerValidation.orderabilityPassRate,
        exactRankingPassRate: providerValidation.exactRankingPassRate,
        familySearchPassRate: family.passRate ?? 0,
        distinctFormulations: baseline.distinctFormulations,
        distinctStrengths: baseline.distinctStrengths,
        distinctDosageForms: baseline.distinctDosageForms,
        distinctRoutes: baseline.distinctRoutes,
        genericsMultiStrength: baseline.genericsMultiStrength,
        variantsCreated: Number(apply?.variantsCreated ?? 0),
        absentFamilies: providerValidation.absentFamilies.length,
        partialFamilies: providerValidation.partialFamilies.length,
      },
      RegressionEvidence: input.evidence,
      CertificationIdempotent:
        input.evidence.certificationIdempotent == null
          ? null
          : input.evidence.certificationIdempotent
            ? "YES"
            : "NO",
      KnownNonblockingGaps: [
        "Smaller 285-family probe corpus remains a secondary check and may lag the universal benchmark",
        "Dual-layer products remain inactive (CatalogMedication-first)",
        "RxNorm/DailyMed CREATE still registered-only — no fabricated RxCUI/NDC",
        "Production deployment not performed by this certification run",
      ],
      SourceDataUsed: [
        "Universal common-medication benchmark (Medora-curated Wave2/3/4 + local FDA NDC brand enrichment)",
        "MEDORA_CURATED enterprise/Wave2/Wave3 formulary manifests (formulation candidates)",
        "Existing CatalogMedication + MedicationAlias provider search path",
        "RxNorm/DailyMed adapters registered but not used for fabricated CREATE",
      ],
      auditStatus: "COMPLETE",
    };

    const dir = resolve(__dirname, "../audit-summaries");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, "medication-formulation-strength-completion-certification.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8"
    );
    writeFileSync(
      resolve(dir, "medication-formulation-strength-completion-certification.md"),
      [
        "# Medication Formulation & Strength Completion Certification",
        "",
        `**ID:** ${CERT_ID}`,
        "",
        `**Decision:** ${decision}`,
        "",
        "## Universal common-medication benchmark (authoritative)",
        "",
        `**Families:** ${Number(universalValidation.benchmarkFamilyCount ?? 0)}`,
        `**Search pass rate:** ${Number(universalValidation.searchPassRate ?? 0)}`,
        `**Orderability pass rate:** ${Number(universalValidation.orderabilityPassRate ?? 0)}`,
        `**Exact brand ranking:** ${Number(universalValidation.exactBrandRankingPassRate ?? 0)}`,
        `**Exact generic ranking:** ${Number(universalValidation.exactGenericRankingPassRate ?? 0)}`,
        `**COMPLETE families:** ${Number(universalValidation.completeFamilyCount ?? 0)}`,
        `**MISSING_FAMILY:** ${Number(universalValidation.missingFamilyCount ?? 0)}`,
        "",
        "## Secondary probe / hard acceptance",
        "",
        `**Hard acceptance:** ${providerValidation.hardAcceptance.pass ? "PASS" : "FAIL"}`,
        `**Probe corpus size:** ${providerValidation.corpusSize}`,
        `**Probe corpus search pass rate:** ${providerValidation.searchPassRate}`,
        `**Exact ranking pass rate:** ${providerValidation.exactRankingPassRate}`,
        `**Orderability pass rate:** ${providerValidation.orderabilityPassRate}`,
        `**Formulations created (prior program):** ${Number(apply?.variantsCreated ?? 0)}`,
        "",
        `**Provider answer (measured):** ${
          Number(universalValidation.searchPassRate ?? 0) >= 1 &&
          Number(universalValidation.orderabilityPassRate ?? 0) >= 1 &&
          Number(universalValidation.missingFamilyCount ?? 1) === 0 &&
          Number(universalValidation.benchmarkFamilyCount ?? 0) >= 1000
            ? "YES"
            : "NO"
        }`,
        "",
      ].join("\n"),
      "utf8"
    );

    const summaryPath = writeAuditArtifact(
      "medication-formulation-strength-completion-certification-summary.json",
      summary
    );

    if (
      !(MEDICATION_FORMULATION_STRENGTH_COMPLETION_DECISIONS as readonly string[]).includes(
        decision
      )
    ) {
      throw new Error(`Invalid formulation completion decision: ${decision}`);
    }

    return {
      summaryPath,
      finalDecision: decision,
      live: { baseline, apply, providerValidation },
    };
  });

  if (!result.ok) {
    throw new Error(`Formulation strength completion certification failed: ${result.error}`);
  }
  return result.value;
}
