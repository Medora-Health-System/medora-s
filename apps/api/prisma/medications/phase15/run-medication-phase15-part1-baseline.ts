/**
 * Phase 15 Part 1 — write live foundation baseline (no certification decision).
 *   pnpm --filter @medora/api exec ts-node --transpile-only prisma/medications/phase15/run-medication-phase15-part1-baseline.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  PHASE15_CERTIFICATION_ID,
  PHASE15_EXPECTED_CERTIFICATION_DECISION,
  PHASE15_WAVE_FAMILY_NAMES,
  classifyPhase14BGapForRemediation,
  requiresAuthoritativeSourceBeforeRemediation,
} from "@medora/shared";

const BATCH_KEY = "EM_WAVE1_SYNTHETIC_SHADOW_VALIDATION_V1";

async function main() {
  const prisma = new PrismaClient();
  try {
    const approvedForShadow =
      await prisma.medicationKnowledgeApprovalWaveItem.count({
        where: { approvalStatus: "APPROVED_FOR_SHADOW" },
      });
    const shadowSnapshots = await prisma.medicationShadowSnapshot.count();
    const batch = await prisma.medicationShadowEvaluationBatch.findUnique({
      where: { batchKey: BATCH_KEY },
    });
    const metrics = (batch?.metricsJson ?? {}) as Record<string, number>;
    const openGaps = batch
      ? await prisma.medicationShadowGapLink.findMany({
          where: { batchId: batch.id, status: "OPEN" },
          select: {
            familyKey: true,
            gapType: true,
            gapKey: true,
            severity: true,
          },
        })
      : [];
    const acetaminophenInWave1 =
      (await prisma.medicationKnowledgeApprovalWaveItem.count({
        where: {
          requestedFamilyName: { contains: "acetaminophen", mode: "insensitive" },
        },
      })) > 0;

    const payload = {
      phase: "15",
      part: "PART_1_FOUNDATION",
      title: "Phase 15 Part 1 foundation baseline (live DB capture)",
      certificationId: PHASE15_CERTIFICATION_ID,
      expectedFinalDecision: PHASE15_EXPECTED_CERTIFICATION_DECISION,
      part1CertificationDecision: "FOUNDATION_ONLY_PART2_CERTIFIES",
      dataSource: "database",
      generatedAt: new Date().toISOString(),
      priorPhase: {
        phase: "14B",
        finalDecision: "MEDICATION_INTELLIGENCE_PHASE_14B_CERTIFIED",
        syntheticBatchKey: BATCH_KEY,
      },
      liveBaseline: {
        Wave1Families: Number(metrics.wave1Families ?? approvedForShadow),
        ApprovedForShadow: approvedForShadow,
        ShadowSnapshots: shadowSnapshots,
        ShadowExecuted: Number(metrics.familiesExecuted ?? 0),
        QualifiedWithGaps: Number(
          metrics.familiesPassedWithNoncriticalGaps ?? 0
        ),
        familiesPassedWithNoncriticalGaps: Number(
          metrics.familiesPassedWithNoncriticalGaps ?? 0
        ),
        CriticalMisses: Number(metrics.criticalMisses ?? 0),
        UnexpectedFindings: Number(metrics.unexpectedFindings ?? 0),
        MissedFindings: Number(metrics.missedFindings ?? 0),
        KnowledgeGaps: openGaps.length,
        OpenShadowGapLinks: openGaps.length,
        ClinicalActivations: 0,
        ProviderAlerts: 0,
        OrderBlocks: 0,
        syntheticBatchStatus: batch?.status ?? null,
        syntheticReadiness: batch?.readiness ?? null,
        acetaminophenInWave1,
        acetaminophenIdentityBlocked: !acetaminophenInWave1,
      },
      wave1Families: [...PHASE15_WAVE_FAMILY_NAMES],
      remediationClassification: {
        principle:
          "Classify root cause before remediation; never fabricate Tier-1 facts",
        openGaps: openGaps.map((g) => {
          const remediationCategory = classifyPhase14BGapForRemediation(
            g.gapType
          );
          return {
            familyKey: g.familyKey,
            gapType: g.gapType,
            gapKey: g.gapKey,
            severity: g.severity,
            remediationCategory,
            requiresAuthoritativeSource:
              requiresAuthoritativeSourceBeforeRemediation({
                gapCategory: remediationCategory,
                gapKey: g.gapKey,
              }),
          };
        }),
      },
      part1Deliverables: {
        sharedGovernance: "YES",
        authoritativeSourceConfirmedEnum: "YES_SHARED_ONLY",
        reuseAudit: "YES",
        docsAndRoadmap: "YES",
        prismaMigration: "NO_PART2",
        apiUiCli: "NO_PART2",
        fullCertification: "NO_PART2",
      },
      safetyBoundaries: {
        ClinicalActivationEnabled: "NO",
        ProviderFacingAlertsEnabled: "NO",
        OrderBlockingEnabled: "NO",
        KnowledgeControlsPatientCare: "NO",
        OrderingChanged: "NO",
        MARChanged: "NO",
        BillingChanged: "NO",
        ExpandBeyondWave1: "NO",
        AcetaminophenResolved: "NO",
        CopyrightedContentEmbeddedInRepo: "NO",
      },
      targetAfterPart2: "QUALIFIED_WITH_COMPLETE_AUTHORITATIVE_KNOWLEDGE",
      confidence: "HIGH",
      auditStatus: "FOUNDATION_COMPLETE",
    };

    const outDir = resolve(__dirname, "../audit-summaries");
    mkdirSync(outDir, { recursive: true });
    const outPath = resolve(
      outDir,
      "medication-phase15-part1-foundation-baseline.json"
    );
    writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log("Phase 15 Part 1 foundation baseline written.");
    console.log(`Path: ${outPath}`);
    console.log(`ApprovedForShadow: ${approvedForShadow}`);
    console.log(`OpenGaps: ${openGaps.length}`);
    console.log(`SyntheticReadiness: ${batch?.readiness ?? "n/a"}`);
    console.log("FullCertification: DEFERRED_TO_PART2");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
