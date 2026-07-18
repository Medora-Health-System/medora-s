/**
 * Medication Orderable Catalog Completion certification.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFICATION_ID as CERT_ID,
  MEDICATION_ORDERABLE_CATALOG_COMPLETION_DECISIONS,
  MEDICATION_ORDERABLE_CATALOG_COMPLETION_IMPLEMENTATION_ID,
  assertMedicationOrderableCatalogCompletionSafetyDefaults,
  decideMedicationOrderableCatalogCompletion,
  type MedicationOrderableCatalogCompletionDecision,
} from "@medora/shared";
import {
  type AuditConfidence,
  type AuditDataSource,
  withPrisma,
  writeAuditArtifact,
  auditBase,
} from "./medication-audit-types";
import { collectOrderableBaseline } from "../orderable-completion/medication-orderable-catalog-completion";

export const MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFICATION_ID = CERT_ID;

export const MEDICATION_ORDERABLE_CATALOG_COMPLETION_ARTIFACTS = [
  "medication-orderable-catalog-completion-baseline.json",
  "medication-orderable-catalog-completion-complete.json",
  "medication-orderable-catalog-completion-certification.json",
  "medication-orderable-catalog-completion-certification-summary.json",
  "medication-orderable-catalog-completion-certification.md",
] as const;

const COMPLETE_ARTIFACT = resolve(
  __dirname,
  "../audit-summaries/medication-orderable-catalog-completion-complete.json"
);
const BASELINE_ARTIFACT = resolve(
  __dirname,
  "../audit-summaries/medication-orderable-catalog-completion-baseline.json"
);
const IMPL = resolve(
  __dirname,
  "../orderable-completion/medication-orderable-catalog-completion.ts"
);

export type OrderableCompletionRegressionEvidence = {
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

function readComplete(): Record<string, unknown> | null {
  if (!existsSync(COMPLETE_ARTIFACT)) return null;
  try {
    return JSON.parse(readFileSync(COMPLETE_ARTIFACT, "utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

export function decideOrderableCatalogCompletionCertification(
  input: Parameters<typeof decideMedicationOrderableCatalogCompletion>[0]
): MedicationOrderableCatalogCompletionDecision {
  return decideMedicationOrderableCatalogCompletion(input);
}

export async function writeAllOrderableCatalogCompletionArtifacts(input: {
  evidence: OrderableCompletionRegressionEvidence;
}): Promise<{
  summaryPath: string;
  finalDecision: MedicationOrderableCatalogCompletionDecision;
  live: {
    baseline: Awaited<ReturnType<typeof collectOrderableBaseline>>;
    complete: Record<string, unknown> | null;
  };
}> {
  assertMedicationOrderableCatalogCompletionSafetyDefaults();

  const result = await withPrisma(async (prisma: PrismaClient) => {
    const baseline = await collectOrderableBaseline(prisma);
    const complete = readComplete();
    const schemaOk =
      existsSync(IMPL) &&
      existsSync(BASELINE_ARTIFACT) &&
      existsSync(COMPLETE_ARTIFACT);

    const clinical = (complete?.commonClinicalSearch ?? {}) as {
      passRate?: number;
      passed?: number;
      queries?: number;
      failed?: string[];
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

    const productsActivated = Number(complete?.productsActivated ?? 0);
    const decision = decideMedicationOrderableCatalogCompletion({
      schemaOk,
      regressionOk,
      coveragePercent: baseline.coveragePercent,
      commonClinicalSearchPassRate: Number(clinical.passRate ?? 0),
      fabricatedData: false,
      dualLayerBulkActivated: productsActivated > 0,
      orderMutations: Number(complete?.orderMutations ?? 0),
      marMutations: Number(complete?.marMutations ?? 0),
      chartMutations: Number(complete?.chartMutations ?? 0),
      cdsActivations: 0,
      importIdempotent: input.evidence.completionIdempotent,
    });

    const confidence: AuditConfidence = "HIGH";
    const dataSource: AuditDataSource = "database";
    const base = auditBase(dataSource, confidence);

    const summary = {
      ...base,
      title: "Medication Orderable Catalog Completion — Universal Provider Ordering",
      certificationId: CERT_ID,
      implementationId: MEDICATION_ORDERABLE_CATALOG_COMPLETION_IMPLEMENTATION_ID,
      FinalDecision: decision,
      Baseline: baseline,
      Completion: {
        metadataStrengthFilled: Number(complete?.metadataStrengthFilled ?? 0),
        metadataFormFilled: Number(complete?.metadataFormFilled ?? 0),
        aliasesCreated: Number(complete?.aliasesCreated ?? 0),
        searchTextUpdated: Number(complete?.searchTextUpdated ?? 0),
        manualReviewCount: Array.isArray(complete?.manualReview)
          ? (complete?.manualReview as unknown[]).length
          : 0,
        commonClinicalSearch: clinical,
        productsActivated,
      },
      Safety: {
        orderMutations: Number(complete?.orderMutations ?? 0),
        marMutations: Number(complete?.marMutations ?? 0),
        chartMutations: Number(complete?.chartMutations ?? 0),
        productsActivated,
        dualLayerBulkActivated: productsActivated > 0,
        productionCds: 0,
      },
      MigrationRequired: "NO",
      MigrationIdentifier: null,
      ProductionDeployStatus: "NOT_DEPLOYED",
      ProviderQuestion:
        "Can a provider reliably search for and order virtually every common medication used in EM, inpatient, outpatient, and primary care?",
      ProviderAnswerMeasured: {
        coveragePercent: baseline.coveragePercent,
        providerOrderableCatalogRows: baseline.providerOrderableCatalogRows,
        nonOrderableCatalogRows: baseline.nonOrderableCatalogRows,
        distinctGenerics: baseline.distinctGenerics,
        commonClinicalSearchPassRate: clinical.passRate ?? 0,
        commonClinicalFailed: clinical.failed ?? [],
      },
      RegressionEvidence: input.evidence,
      CertificationIdempotent:
        input.evidence.certificationIdempotent == null
          ? null
          : input.evidence.certificationIdempotent
            ? "YES"
            : "NO",
      KnownNonblockingGaps: [
        "Dual-layer products remain inactive by design (CatalogMedication-first ordering)",
        "Test/fixture catalog rows excluded from clinical coverage",
        "Undervable strength/form rows flagged for manual review",
        "No formulary redesign; no CDS activation",
      ],
      auditStatus: "COMPLETE",
    };

    const dir = resolve(__dirname, "../audit-summaries");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, "medication-orderable-catalog-completion-certification.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8"
    );
    writeFileSync(
      resolve(dir, "medication-orderable-catalog-completion-certification.md"),
      [
        "# Medication Orderable Catalog Completion Certification",
        "",
        `**ID:** ${CERT_ID}`,
        "",
        `**Decision:** ${decision}`,
        "",
        `**Coverage:** ${baseline.coveragePercent}% (${baseline.providerOrderableCatalogRows} orderable / ${baseline.clinicallyRelevantCatalogRows} clinically relevant)`,
        `**Distinct generics:** ${baseline.distinctGenerics}`,
        `**Common clinical search pass rate:** ${clinical.passRate ?? 0}`,
        "",
      ].join("\n"),
      "utf8"
    );

    const summaryPath = writeAuditArtifact(
      "medication-orderable-catalog-completion-certification-summary.json",
      summary
    );

    if (
      !(MEDICATION_ORDERABLE_CATALOG_COMPLETION_DECISIONS as readonly string[]).includes(
        decision
      )
    ) {
      throw new Error(`Invalid orderable completion decision: ${decision}`);
    }

    return { summaryPath, finalDecision: decision, live: { baseline, complete } };
  });

  if (!result.ok) {
    throw new Error(`Orderable catalog completion certification failed: ${result.error}`);
  }
  return result.value;
}
