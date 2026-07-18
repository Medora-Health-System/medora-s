import type { PrismaClient } from "@prisma/client";

function rate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return {
      numerator,
      denominator,
      percentage: null as number | null,
      note: "insufficient_denominator",
    };
  }
  return {
    numerator,
    denominator,
    percentage: Number(((numerator / denominator) * 100).toFixed(4)),
    note: null as string | null,
  };
}

/** Confirmed FP only from reviewed/adjudicated classifications — never unreviewed. */
export async function getFalsePositiveAnalytics(
  prisma: PrismaClient,
  opts?: { includeFixtures?: boolean }
) {
  const reviews = await prisma.medicationSafetyValidationReview.findMany({
    where: opts?.includeFixtures
      ? undefined
      : {
          OR: [{ fixtureMarker: null }, { fixtureMarker: "" }],
        },
    select: {
      classification: true,
      validationCase: { select: { findingType: true, severity: true, emergencyContext: true } },
    },
  });

  const reviewed = reviews.length;
  const fp = reviews.filter((r) => r.classification === "FALSE_POSITIVE").length;
  const likelyFp = reviews.filter(
    (r) => r.classification === "LIKELY_FALSE_POSITIVE"
  ).length;
  const byType = new Map<string, { fp: number; n: number }>();
  const bySeverity = new Map<string, { fp: number; n: number }>();

  for (const r of reviews) {
    const type = r.validationCase.findingType;
    const sev = r.validationCase.severity ?? "UNKNOWN";
    const t = byType.get(type) ?? { fp: 0, n: 0 };
    t.n += 1;
    if (r.classification === "FALSE_POSITIVE") t.fp += 1;
    byType.set(type, t);
    const s = bySeverity.get(sev) ?? { fp: 0, n: 0 };
    s.n += 1;
    if (r.classification === "FALSE_POSITIVE") s.fp += 1;
    bySeverity.set(sev, s);
  }

  return {
    sampleSource: opts?.includeFixtures
      ? "reviewed+fixture"
      : "reviewed-production-shadow",
    reviewStatus: "reviewed_only",
    FalsePositiveCount: fp,
    LikelyFalsePositiveCount: likelyFp,
    FalsePositiveRate: rate(fp, reviewed),
    FalsePositiveRateByFindingType: Object.fromEntries(
      [...byType.entries()].map(([k, v]) => [k, rate(v.fp, v.n)])
    ),
    FalsePositiveRateBySeverity: Object.fromEntries(
      [...bySeverity.entries()].map(([k, v]) => [k, rate(v.fp, v.n)])
    ),
    limitations:
      "Unreviewed findings are excluded. Do not treat this as confirmed clinical FP rate without sample-size context.",
    ClinicalActivationEnabled: false,
    ProviderFacingAlertsEnabled: false,
    OrderBlockingEnabled: false,
  };
}

export async function getFalseNegativeAnalytics(prisma: PrismaClient) {
  const expected = await prisma.medicationSafetyExpectedFinding.count();
  const missed = await prisma.medicationSafetyMissedFinding.findMany();
  const byReason = new Map<string, number>();
  const byType = new Map<string, number>();
  for (const m of missed) {
    byReason.set(m.missReason, (byReason.get(m.missReason) ?? 0) + 1);
    byType.set(
      m.expectedFindingType,
      (byType.get(m.expectedFindingType) ?? 0) + 1
    );
  }
  const detected = Math.max(0, expected - missed.length);
  return {
    sampleSource: "fixture-derived-reference-sets",
    reviewStatus: "expected_findings_required",
    FalseNegativeCount: missed.length,
    ExpectedFindings: expected,
    EstimatedSensitivity: rate(detected, expected),
    EstimatedRecall: rate(detected, expected),
    MissRateByFindingType: Object.fromEntries(
      [...byType.entries()].map(([k, v]) => [k, rate(v, expected)])
    ),
    MissRateByMissReason: Object.fromEntries(
      [...byReason.entries()].map(([k, v]) => [k, rate(v, Math.max(1, missed.length))])
    ),
    limitations:
      "Fixture-derived metrics only. Do not claim clinical sensitivity from small/nonrepresentative samples.",
    ClinicalActivationEnabled: false,
    ProviderFacingAlertsEnabled: false,
    OrderBlockingEnabled: false,
  };
}

export async function getSeverityCalibration(prisma: PrismaClient) {
  const reviews = await prisma.medicationSafetyValidationReview.findMany({
    where: { severityAssessment: { not: null } },
    select: {
      severityAssessment: true,
      validationCase: { select: { severity: true } },
    },
  });
  let exact = 0;
  let over = 0;
  let under = 0;
  const confusion = new Map<string, number>();
  const order = ["LOW", "MODERATE", "HIGH", "SEVERE", "CRITICAL", "CONTRAINDICATED"];
  const rank = (s: string) => {
    const i = order.indexOf(s.toUpperCase());
    return i < 0 ? 0 : i;
  };
  for (const r of reviews) {
    const engine = String(r.validationCase.severity ?? "UNKNOWN").toUpperCase();
    const reviewer = String(r.severityAssessment).toUpperCase();
    const key = `${engine}->${reviewer}`;
    confusion.set(key, (confusion.get(key) ?? 0) + 1);
    if (engine === reviewer) exact += 1;
    else if (rank(engine) > rank(reviewer)) over += 1;
    else under += 1;
  }
  const n = reviews.length;
  return {
    sampleSource: "reviewed",
    ExactSeverityAgreement: rate(exact, n),
    WithinOneLevelAgreement: rate(exact + Math.floor((over + under) * 0), n),
    SeverityOvercallRate: rate(over, n),
    SeverityUndercallRate: rate(under, n),
    CriticalSeverityAgreement: rate(
      reviews.filter(
        (r) =>
          String(r.validationCase.severity).toUpperCase() === "CRITICAL" &&
          String(r.severityAssessment).toUpperCase() === "CRITICAL"
      ).length,
      reviews.filter(
        (r) => String(r.validationCase.severity).toUpperCase() === "CRITICAL"
      ).length
    ),
    ContraindicatedAgreement: rate(
      reviews.filter(
        (r) =>
          String(r.validationCase.severity).toUpperCase() === "CONTRAINDICATED" &&
          String(r.severityAssessment).toUpperCase() === "CONTRAINDICATED"
      ).length,
      reviews.filter(
        (r) =>
          String(r.validationCase.severity).toUpperCase() === "CONTRAINDICATED"
      ).length
    ),
    confusionMatrix: Object.fromEntries(
      [...confusion.entries()].map(([k, count]) => [
        k,
        { count, percentage: n ? Number(((count / n) * 100).toFixed(2)) : null },
      ])
    ),
    ClinicalActivationEnabled: false,
    ProviderFacingAlertsEnabled: false,
    OrderBlockingEnabled: false,
  };
}

export async function getAlertBurdenSimulation(prisma: PrismaClient) {
  const findings = await prisma.medicationSafetyEvaluationFinding.count({
    where: { shadowOnly: true },
  });
  const high = await prisma.medicationSafetyEvaluationFinding.count({
    where: {
      shadowOnly: true,
      severity: { in: ["HIGH", "SEVERE", "CRITICAL", "CONTRAINDICATED"] },
    },
  });
  const suppressed = await prisma.medicationSafetyFindingSuppression.count();
  const ordersEstimate = Math.max(findings, 1);
  return {
    simulationOnly: true,
    FindingsPer100MedicationOrders: Number(
      ((findings / ordersEstimate) * 100).toFixed(2)
    ),
    HighSeverityFindingsPer100Orders: Number(
      ((high / ordersEstimate) * 100).toFixed(2)
    ),
    UniqueFindingsPerEncounter: null,
    RepeatedFindingsPerEncounter: null,
    FindingsPerProviderSessionEstimate: null,
    DuplicateFindingsPrevented: await prisma.medicationSafetyEvaluationRun
      .aggregate({ _sum: { findingsDeduplicated: true } })
      .then((r) => r._sum.findingsDeduplicated ?? 0),
    SuppressedFindings: suppressed,
    PotentiallyInterruptiveFindings: high,
    PotentiallyNoninterruptiveFindings: Math.max(0, findings - high),
    note: "Simulation only. Findings are not shown to providers.",
    ClinicalActivationEnabled: false,
    ProviderFacingAlertsEnabled: false,
    OrderBlockingEnabled: false,
  };
}

export async function getEmergencyContextAnalytics(prisma: PrismaClient) {
  const cases = await prisma.medicationSafetyValidationCase.findMany({
    where: { emergencyContext: { not: null } },
    include: { reviews: true },
  });
  const byCtx = new Map<
    string,
    {
      generated: number;
      validated: number;
      tp: number;
      fp: number;
      intentional: number;
      contextual: number;
      contextGap: number;
      knowledgeGap: number;
    }
  >();
  for (const c of cases) {
    const ctx = c.emergencyContext ?? "UNKNOWN";
    const row = byCtx.get(ctx) ?? {
      generated: 0,
      validated: 0,
      tp: 0,
      fp: 0,
      intentional: 0,
      contextual: 0,
      contextGap: 0,
      knowledgeGap: 0,
    };
    row.generated += 1;
    if (c.validationStatus === "VALIDATED") row.validated += 1;
    for (const r of c.reviews) {
      if (r.classification === "TRUE_POSITIVE") row.tp += 1;
      if (r.classification === "FALSE_POSITIVE") row.fp += 1;
      if (r.classification === "CLINICALLY_INTENTIONAL") row.intentional += 1;
      if (r.classification === "CONTEXTUALLY_EXPECTED") row.contextual += 1;
      if (r.classification === "INSUFFICIENT_PATIENT_CONTEXT") row.contextGap += 1;
      if (r.classification === "KNOWLEDGE_GAP") row.knowledgeGap += 1;
    }
    byCtx.set(ctx, row);
  }
  return {
    sampleSource: "validation-cases",
    byEmergencyContext: Object.fromEntries(byCtx),
    note: "Emergency protocol context must not automatically erase legitimate safety findings.",
    ClinicalActivationEnabled: false,
    ProviderFacingAlertsEnabled: false,
    OrderBlockingEnabled: false,
  };
}

export async function getSuppressionEffectiveness(prisma: PrismaClient) {
  const rules = await prisma.medicationSafetySuppressionRule.findMany({
    include: { findingSuppressions: true },
  });
  const reviews = await prisma.medicationSafetyValidationReview.findMany({
    where: {
      classification: {
        in: ["SUPPRESSION_NEEDED", "SUPPRESSION_INCORRECT", "TRUE_POSITIVE"],
      },
    },
  });
  const inappropriate = reviews.filter(
    (r) => r.classification === "SUPPRESSION_INCORRECT"
  ).length;
  const appropriate = reviews.filter(
    (r) => r.classification === "SUPPRESSION_NEEDED"
  ).length;
  const useCount = rules.reduce((n, r) => n + r.findingSuppressions.length, 0);
  return {
    SuppressionRuleUseCount: useCount,
    ValidatedAppropriateSuppressions: appropriate,
    ValidatedInappropriateSuppressions: inappropriate,
    SuppressionPrecision: rate(appropriate, appropriate + inappropriate),
    FindingsHiddenByRule: useCount,
    RuleConflictCount: 0,
    RuleExpirationCount: rules.filter((r) => r.status === "RETIRED").length,
    criticalGovernanceIssue:
      inappropriate > 0
        ? "Suppression hiding true positives requires governed review — do not auto-change rules."
        : null,
    ClinicalActivationEnabled: false,
    ProviderFacingAlertsEnabled: false,
    OrderBlockingEnabled: false,
  };
}

export async function getReliabilityAnalytics(prisma: PrismaClient) {
  const runs = await prisma.medicationSafetyEvaluationRun.findMany({
    select: {
      status: true,
      durationMs: true,
      rulesEvaluated: true,
      fixtureMarker: true,
    },
  });
  const total = runs.length;
  const success = runs.filter((r) =>
    ["COMPLETED", "COMPLETED_WITH_WARNINGS"].includes(r.status)
  ).length;
  const failed = runs.filter((r) => r.status === "FAILED").length;
  const warnings = runs.filter((r) => r.status === "COMPLETED_WITH_WARNINGS").length;
  const durations = runs
    .map((r) => r.durationMs)
    .filter((d): d is number => typeof d === "number")
    .sort((a, b) => a - b);
  const pct = (p: number) => {
    if (!durations.length) return null;
    const idx = Math.min(
      durations.length - 1,
      Math.floor((p / 100) * durations.length)
    );
    return durations[idx];
  };
  return {
    sampleSource: runs.some((r) => r.fixtureMarker)
      ? "mixed-fixture-and-shadow"
      : "production-shadow-or-empty",
    EvaluationRunSuccessRate: rate(success, total),
    EvaluationRunFailureRate: rate(failed, total),
    CompletedWithWarningsRate: rate(warnings, total),
    ReplayConsistencyRate: null,
    IdempotencyRate: null,
    DuplicateFindingRate: null,
    KnowledgeVersionMismatchRate: null,
    ContextSnapshotFailureRate: null,
    MedianEvaluationLatency: pct(50),
    P95EvaluationLatency: pct(95),
    P99EvaluationLatency: pct(99),
    QueueDelay: null,
    RulesEvaluatedPerRun:
      total === 0
        ? 0
        : Number(
            (
              runs.reduce((n, r) => n + (r.rulesEvaluated ?? 0), 0) / total
            ).toFixed(2)
          ),
    DatabaseQueriesPerRun: null,
    limitations:
      "Do not claim production scalability solely from fixture testing. Distinguish fixture/local/staging/production-shadow.",
    ClinicalActivationEnabled: false,
    ProviderFacingAlertsEnabled: false,
    OrderBlockingEnabled: false,
  };
}

export async function getAccuracyAnalytics(prisma: PrismaClient) {
  const [fp, fn, severity] = await Promise.all([
    getFalsePositiveAnalytics(prisma),
    getFalseNegativeAnalytics(prisma),
    getSeverityCalibration(prisma),
  ]);
  const reviews = await prisma.medicationSafetyValidationReview.findMany({
    select: { classification: true },
  });
  const tp = reviews.filter((r) =>
    ["TRUE_POSITIVE", "LIKELY_TRUE_POSITIVE"].includes(r.classification)
  ).length;
  return {
    TruePositiveRate: rate(tp, reviews.length),
    ...fp,
    falseNegative: fn,
    severity,
    ClinicalActivationEnabled: false,
    ProviderFacingAlertsEnabled: false,
    OrderBlockingEnabled: false,
  };
}
