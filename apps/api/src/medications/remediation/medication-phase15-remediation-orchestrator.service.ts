/**
 * Phase 15 Part 2B — operational orchestrator over Part 2A remediation infrastructure.
 * Administrative / advisory only. No CDS, alerts, or care-workflow control.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  PHASE13_WAVE1_KEY,
  PHASE14B_SYNTHETIC_BATCH_KEY,
  PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS,
  PHASE15_PART2B_IMPLEMENTATION_ID,
  PHASE15_PROGRAM_KEY,
  PHASE15_WAVE_FAMILY_NAMES,
  assertPhase15NoAcetaminophenResolution,
  assertPhase15NoClinicalActivation,
  assertPhase15NoFabricatedFacts,
  assertPhase15NoWorkflowControl,
  assertPhase15Wave1Only,
  canTransitionRemediationWorkItem,
  classifyPhase14BGapForRemediation,
  evaluatePhase15OperationalReadiness,
  isTier1PositiveKnowledgeGap,
  requiresAuthoritativeSourceBeforeRemediation,
  type Phase15MutationResult,
  type Phase15WorkItemStatus,
} from "@medora/shared";
import { isRemediationAdmin } from "./medication-remediation.roles";
import {
  getRemediationProgramSnapshot,
  listOpenPhase14BShadowGaps,
  routeRemediationWorkItem,
  seedRemediationWorkItemsFromPhase14BGaps,
  transitionRemediationWorkItem,
} from "./medication-remediation.service";
import { recalculateWave1QualityAfterRemediation } from "./medication-quality-recalculation.service";
import {
  advanceEvidenceSourceLifecycle,
  isAuthoritativeRegistrationStatus,
  type RemediationActor,
} from "./medication-source-lifecycle.service";

function requireAdmin(actor: RemediationActor) {
  if (!isRemediationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
}

function assertSafetyDefaults() {
  assertPhase15NoWorkflowControl(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.knowledgeControlsPatientCare
  );
  assertPhase15NoClinicalActivation(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.clinicalActivationEnabled
  );
  assertPhase15NoFabricatedFacts(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.fabricateUnsupportedFacts
  );
  assertPhase15Wave1Only(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.expandBeyondWave1
  );
  assertPhase15NoAcetaminophenResolution(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.resolveAcetaminophenIdentity
  );
}

function assertWave1FamilyKey(familyKey: string) {
  if (/acetaminophen/i.test(familyKey)) {
    throw new BadRequestException("IDENTITY_BLOCKED_OUT_OF_SCOPE");
  }
}

function assertZeroActivation() {
  if (
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.clinicalActivationEnabled ||
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.providerFacingAlertsEnabled ||
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.orderBlockingEnabled
  ) {
    throw new BadRequestException(
      "Phase 15 Part 2B: activation/alerts/blocks must remain off."
    );
  }
}

async function audit(
  prisma: PrismaClient,
  input: {
    programId?: string | null;
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
  }
) {
  await prisma.medicationRemediationAuditEvent.create({
    data: {
      programId: input.programId ?? undefined,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeState: (input.before as Prisma.InputJsonValue) ?? undefined,
      afterState: (input.after as Prisma.InputJsonValue) ?? undefined,
      performedByUserId: input.userId,
      reason: input.reason,
    },
  });
}

export async function getPhase15OperationalBaseline(prisma: PrismaClient) {
  assertSafetyDefaults();
  assertZeroActivation();
  const snapshot = await getRemediationProgramSnapshot(prisma);
  const program = snapshot.program;
  const workItems = program?.workItems ?? [];
  const byStatus: Record<string, number> = {};
  for (const w of workItems) {
    byStatus[w.status] = (byStatus[w.status] ?? 0) + 1;
  }
  const regs = await prisma.medicationEvidenceSourceRegistration.findMany({
    select: { acquisitionStatus: true },
  });
  const sourcesByLifecycle: Record<string, number> = {};
  for (const r of regs) {
    sourcesByLifecycle[r.acquisitionStatus] =
      (sourcesByLifecycle[r.acquisitionStatus] ?? 0) + 1;
  }
  const openTier1 = (await listOpenPhase14BShadowGaps(prisma)).filter((g) =>
    isTier1PositiveKnowledgeGap(g.gapKey)
  ).length;
  const deferredWorkItems = byStatus["DEFERRED"] ?? 0;
  const readiness = evaluatePhase15OperationalReadiness({
    openWorkItems: program?.openWorkItemCount ?? 0,
    blockedWorkItems: program?.blockedWorkItemCount ?? 0,
    openTier1Gaps: openTier1,
    resolvedWorkItems: program?.resolvedWorkItemCount ?? 0,
    deferredWorkItems,
    syntheticQualifiedWithGaps:
      snapshot.syntheticReadiness === "QUALIFIED_WITH_GAPS",
  });
  const certification = loadPhase15CertificationSummary();

  return {
    implementationId: PHASE15_PART2B_IMPLEMENTATION_ID,
    phase: "15",
    part: "PART_2C_OPERATIONAL",
    certificationClaimed: false,
    certificationLabel: "KNOWLEDGE_GOVERNANCE_CERTIFICATION",
    notProductionClinicalActivation: true,
    generatedAt: new Date().toISOString(),
    waveKey: PHASE13_WAVE1_KEY,
    programKey: PHASE15_PROGRAM_KEY,
    wave1Families: [...PHASE15_WAVE_FAMILY_NAMES],
    liveBaseline: {
      Wave1Families: PHASE15_WAVE_FAMILY_NAMES.length,
      ApprovedForShadow: snapshot.approvedForShadow,
      OpenPhase14BGaps: snapshot.openPhase14BGaps,
      OpenTier1KnowledgeGaps: openTier1,
      OpenWorkItems: program?.openWorkItemCount ?? 0,
      ResolvedWorkItems: program?.resolvedWorkItemCount ?? 0,
      BlockedWorkItems: program?.blockedWorkItemCount ?? 0,
      DeferredWorkItems: deferredWorkItems,
      WorkItemsByStatus: byStatus,
      SourcesByLifecycle: sourcesByLifecycle,
      SyntheticReadiness: snapshot.syntheticReadiness,
      OperationalReadiness: readiness,
      FinalReadiness:
        deferredWorkItems > 0 || openTier1 > 0
          ? "QUALIFIED_WITH_GOVERNED_DEFERRALS"
          : readiness,
      CertificationDecision: certification?.FinalDecision ?? null,
      CertificationLimitations: certification?.KnownNonblockingGaps ?? [],
      AcetaminophenIdentityBlocked: true,
      ClinicalActivations: 0,
      ProviderAlerts: 0,
      OrderBlocks: 0,
      ProductionCds: "OFF",
    },
    banner: {
      administrativeOnly: true,
      noProductionCds: true,
      noPatientCareWorkflowImpact: true,
      knowledgeGovernanceCertificationOnly: true,
    },
  };
}

function loadPhase15CertificationSummary(): {
  FinalDecision?: string;
  KnownNonblockingGaps?: string[];
} | null {
  try {
    const path = resolve(
      __dirname,
      "../../../prisma/medications/audit-summaries/medication-phase15-certification-summary.json"
    );
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as {
      FinalDecision?: string;
      KnownNonblockingGaps?: string[];
    };
  } catch {
    return null;
  }
}

export async function getPhase15Readiness(prisma: PrismaClient) {
  const baseline = await getPhase15OperationalBaseline(prisma);
  const decision = baseline.liveBaseline.CertificationDecision;
  const certified =
    typeof decision === "string" &&
    decision.startsWith("MEDICATION_INTELLIGENCE_PHASE_15_CERTIFIED");
  return {
    readiness: baseline.liveBaseline.FinalReadiness,
    operationalReadiness: baseline.liveBaseline.OperationalReadiness,
    syntheticReadiness: baseline.liveBaseline.SyntheticReadiness,
    certificationDecision: decision,
    phase15Certified: certified,
    certificationKind: "KNOWLEDGE_GOVERNANCE_CERTIFICATION",
    notProductionClinicalActivation: true,
    limitations: baseline.liveBaseline.CertificationLimitations,
    blockers: [
      ...(baseline.liveBaseline.BlockedWorkItems > 0
        ? ["BLOCKED_PENDING_AUTHORITATIVE_SOURCE"]
        : []),
      ...(baseline.liveBaseline.OpenTier1KnowledgeGaps > 0
        ? ["OPEN_TIER1_KNOWLEDGE_GAPS_GOVERNED_DEFERRED"]
        : []),
    ],
    deferredWorkItems: baseline.liveBaseline.DeferredWorkItems,
    clinicalActivation: 0,
    providerAlerts: 0,
    orderBlocks: 0,
  };
}

export async function listPhase15Families(prisma: PrismaClient) {
  assertSafetyDefaults();
  const waveItems = await prisma.medicationKnowledgeApprovalWaveItem.findMany({
    where: { approvalStatus: "APPROVED_FOR_SHADOW" },
    orderBy: { familyKey: "asc" },
  });
  const program = await prisma.medicationRemediationProgram.findUnique({
    where: { programKey: PHASE15_PROGRAM_KEY },
    include: { workItems: true },
  });
  const gaps = await listOpenPhase14BShadowGaps(prisma);
  const snapshots = await prisma.medicationShadowSnapshot.findMany({
    orderBy: { createdAt: "desc" },
  });
  const latestSnapByFamily = new Map<string, (typeof snapshots)[0]>();
  for (const s of snapshots) {
    if (!latestSnapByFamily.has(s.familyKey)) {
      latestSnapByFamily.set(s.familyKey, s);
    }
  }

  type FamilyRow = {
    familyName: string;
    familyKey: string;
    canonicalConceptId: string | null;
    wave1Member: boolean;
    identityStatus: string;
    approvalStatus: string;
    openGaps: number;
    workItemsOpen: number;
    workItemsBlocked: number;
    workItemsResolved: number;
    latestShadowSnapshotId: string | null;
    acetaminophen: boolean;
  };

  const wave1: FamilyRow[] = PHASE15_WAVE_FAMILY_NAMES.map((name) => {
    const item = waveItems.find(
      (w) =>
        w.familyKey?.toLowerCase().includes(name) ||
        w.requestedFamilyName?.toLowerCase() === name
    );
    const familyKey = item?.familyKey ?? `EM_FAM_${name.toUpperCase()}`;
    const familyGaps = gaps.filter((g) => g.familyKey === familyKey);
    const familyWork = (program?.workItems ?? []).filter(
      (w) => w.familyKey === familyKey
    );
    return {
      familyName: name,
      familyKey,
      canonicalConceptId: item?.canonicalConceptId ?? null,
      wave1Member: true,
      identityStatus: "RESOLVED",
      approvalStatus: item?.approvalStatus ?? "UNKNOWN",
      openGaps: familyGaps.length,
      workItemsOpen: familyWork.filter(
        (w) => w.status !== "RESOLVED" && w.status !== "CANCELLED"
      ).length,
      workItemsBlocked: familyWork.filter(
        (w) => w.status === "BLOCKED_PENDING_AUTHORITATIVE_SOURCE"
      ).length,
      workItemsResolved: familyWork.filter((w) => w.status === "RESOLVED")
        .length,
      latestShadowSnapshotId: latestSnapByFamily.get(familyKey)?.id ?? null,
      acetaminophen: false,
    };
  });

  const acetaminophenRow: FamilyRow = {
    familyName: "acetaminophen",
    familyKey: "ACETAMINOPHEN",
    canonicalConceptId: null,
    wave1Member: false,
    identityStatus: "IDENTITY_BLOCKED",
    approvalStatus: "OUT_OF_SCOPE",
    openGaps: 0,
    workItemsOpen: 0,
    workItemsBlocked: 0,
    workItemsResolved: 0,
    latestShadowSnapshotId: null,
    acetaminophen: true,
  };

  return [...wave1, acetaminophenRow];
}

export async function getPhase15FamilyDetail(
  prisma: PrismaClient,
  familyKeyOrName: string
) {
  if (/acetaminophen/i.test(familyKeyOrName)) {
    return {
      familyKey: "ACETAMINOPHEN",
      identityStatus: "IDENTITY_BLOCKED",
      wave1Member: false,
      remediableInPhase15: false,
      outsideScope: true,
      message: "IDENTITY_BLOCKED_OUT_OF_SCOPE",
    };
  }
  const families = await listPhase15Families(prisma);
  const fam =
    families.find(
      (f) =>
        f.familyKey === familyKeyOrName ||
        f.familyName === familyKeyOrName.toLowerCase()
    ) ?? null;
  if (!fam || fam.acetaminophen) {
    throw new NotFoundException("Famille Wave 1 introuvable.");
  }
  const workItems = await prisma.medicationRemediationWorkItem.findMany({
    where: { familyKey: fam.familyKey },
    orderBy: { updatedAt: "desc" },
  });
  const quality = await prisma.medicationKnowledgeQuality.findFirst({
    where: { familyKey: fam.familyKey },
    orderBy: { lastCalculated: "desc" },
  });
  const completeness =
    await prisma.medicationKnowledgeCompletenessScore.findFirst({
      where: { familyKey: fam.familyKey },
      orderBy: { calculatedAt: "desc" },
    });
  return {
    ...fam,
    remediableInPhase15: true,
    outsideScope: false,
    workItems,
    quality,
    completeness,
    clinicalOrderingControls: false,
  };
}

export type RemediationListFilter = {
  familyKey?: string;
  gapCategory?: string;
  status?: string;
  severity?: string;
};

export async function listRemediationWorkItems(
  prisma: PrismaClient,
  filter: RemediationListFilter = {}
) {
  assertSafetyDefaults();

  const where: Prisma.MedicationRemediationWorkItemWhereInput = {};
  if (filter.familyKey) where.familyKey = filter.familyKey;
  if (filter.gapCategory) where.gapCategory = filter.gapCategory;
  if (filter.status) where.status = filter.status;
  if (filter.severity) where.severity = filter.severity;

  const items = await prisma.medicationRemediationWorkItem.findMany({
    where,
    orderBy: [{ familyKey: "asc" }, { updatedAt: "desc" }],
    include: {
      shadowGapLink: true,
      evidenceRegistration: true,
    },
  });

  return items.map((item) => ({
    ...item,
    gapCategoryDisplay: `${item.gapCategory}_GAP`,
    remediableInPhase15: item.gapCategory !== "IDENTITY",
    mustRemainDeferred: false,
    outsidePhase15Scope: /acetaminophen/i.test(item.familyKey),
    eligibleNextActions: eligibleNextActions(item.status as Phase15WorkItemStatus),
    blockingReason:
      item.status === "BLOCKED_PENDING_AUTHORITATIVE_SOURCE"
        ? "AUTHORITATIVE_SOURCE_REQUIRED"
        : null,
  }));
}

function eligibleNextActions(status: Phase15WorkItemStatus): string[] {
  const candidates: Phase15WorkItemStatus[] = [
    "TRIAGED",
    "ROUTED",
    "IN_REMEDIATION",
    "BLOCKED_PENDING_AUTHORITATIVE_SOURCE",
    "AWAITING_QUALITY_RECALC",
    "RESOLVED",
    "DEFERRED",
    "CANCELLED",
  ];
  return candidates.filter((to) => canTransitionRemediationWorkItem(status, to));
}

export async function getRemediationWorkItemDetail(
  prisma: PrismaClient,
  workItemId: string
) {
  const item = await prisma.medicationRemediationWorkItem.findUnique({
    where: { id: workItemId },
    include: {
      shadowGapLink: true,
      evidenceRegistration: true,
      program: true,
    },
  });
  if (!item) throw new NotFoundException("Élément de remédiation introuvable.");
  const audits = await prisma.medicationRemediationAuditEvent.findMany({
    where: {
      OR: [
        { entityId: item.id },
        { entityId: item.workItemKey },
      ],
    },
    orderBy: { performedAt: "desc" },
    take: 50,
  });
  return {
    ...item,
    gapCategoryDisplay: `${item.gapCategory}_GAP`,
    rootCause: item.description,
    remediationRecommendation: item.recommendedAction,
    eligibleNextActions: eligibleNextActions(item.status as Phase15WorkItemStatus),
    remediableInPhase15: item.gapCategory !== "IDENTITY",
    appliesCds: false,
    auditTimeline: audits,
  };
}

export async function refreshRemediationQueue(
  prisma: PrismaClient,
  actor: RemediationActor
) {
  requireAdmin(actor);
  assertSafetyDefaults();
  const before = await prisma.medicationRemediationWorkItem.count({
    where: {
      program: { programKey: PHASE15_PROGRAM_KEY },
    },
  });
  const seeded = await seedRemediationWorkItemsFromPhase14BGaps(prisma, actor);
  const after = seeded.workItems.length;
  const result: Phase15MutationResult =
    after > before ? "CREATED" : before === after ? "NO_CHANGE" : "UPDATED";
  return {
    result,
    createdOrExisting: after,
    previousCount: before,
    program: seeded.program,
  };
}

export async function previewRemediationTransition(
  prisma: PrismaClient,
  workItemId: string,
  toStatus: Phase15WorkItemStatus
) {
  assertSafetyDefaults();
  const item = await getRemediationWorkItemDetail(prisma, workItemId);
  const from = item.status as Phase15WorkItemStatus;
  const allowed = canTransitionRemediationWorkItem(from, toStatus);
  const sourceOk = item.evidenceRegistrationId
    ? isAuthoritativeRegistrationStatus(
        item.evidenceRegistration?.acquisitionStatus ?? ""
      )
    : !item.requiresAuthoritativeSource;

  return {
    workItemId: item.id,
    workItemKey: item.workItemKey,
    familyKey: item.familyKey,
    currentState: from,
    proposedTransition: toStatus,
    allowed,
    blockers: [
      ...(!allowed ? ["INVALID_LIFECYCLE_TRANSITION"] : []),
      ...(toStatus === "RESOLVED" && !sourceOk
        ? ["AUTHORITATIVE_SOURCE_REQUIRED"]
        : []),
    ],
    sourceEligibility: sourceOk ? "ELIGIBLE" : "NOT_ELIGIBLE",
    provenanceStatus: item.evidenceRegistration?.acquisitionStatus ?? null,
    qualityImpactEstimate: "REQUIRES_RECALC_AFTER_APPLY",
    shadowRequalificationRequired: toStatus === "RESOLVED",
    mutates: false,
    appliesCds: false,
    expectedResult: allowed && (toStatus !== "RESOLVED" || sourceOk)
      ? "WOULD_TRANSITION"
      : "WOULD_BLOCK",
  };
}

export async function executeRemediationTransition(
  prisma: PrismaClient,
  actor: RemediationActor,
  input: {
    workItemId: string;
    toStatus: Phase15WorkItemStatus;
    reason: string;
    evidenceRegistrationId?: string;
    expectedStatus?: string;
  }
) {
  requireAdmin(actor);
  assertSafetyDefaults();
  if (!input.reason?.trim()) {
    throw new BadRequestException("Raison de transition obligatoire.");
  }
  const item = await prisma.medicationRemediationWorkItem.findUnique({
    where: { id: input.workItemId },
  });
  if (!item) throw new NotFoundException("Élément de remédiation introuvable.");
  assertWave1FamilyKey(item.familyKey);
  if (input.expectedStatus && item.status !== input.expectedStatus) {
    throw new BadRequestException(
      `Conflit de version: attendu ${input.expectedStatus}, actuel ${item.status}`
    );
  }

  if (input.toStatus === "ROUTED") {
    const updated = await routeRemediationWorkItem(prisma, actor, {
      workItemId: input.workItemId,
      evidenceRegistrationId: input.evidenceRegistrationId,
      reason: input.reason,
    });
    return { result: "UPDATED" as Phase15MutationResult, workItem: updated };
  }

  const updated = await transitionRemediationWorkItem(prisma, actor, {
    workItemId: input.workItemId,
    toStatus: input.toStatus,
    reason: input.reason,
    evidenceRegistrationId: input.evidenceRegistrationId,
  });
  return { result: "UPDATED" as Phase15MutationResult, workItem: updated };
}

export async function deferRemediationWorkItem(
  prisma: PrismaClient,
  actor: RemediationActor,
  workItemId: string,
  reason: string
) {
  return executeRemediationTransition(prisma, actor, {
    workItemId,
    toStatus: "DEFERRED",
    reason,
  });
}

export async function reopenRemediationWorkItem(
  prisma: PrismaClient,
  actor: RemediationActor,
  workItemId: string,
  reason: string
) {
  return executeRemediationTransition(prisma, actor, {
    workItemId,
    toStatus: "OPEN",
    reason,
  });
}

export async function attachEvidenceToRemediation(
  prisma: PrismaClient,
  actor: RemediationActor,
  input: {
    workItemId: string;
    evidenceRegistrationId: string;
    reason: string;
  }
) {
  requireAdmin(actor);
  assertSafetyDefaults();
  const reg = await prisma.medicationEvidenceSourceRegistration.findUnique({
    where: { id: input.evidenceRegistrationId },
  });
  if (!reg) throw new NotFoundException("Enregistrement source introuvable.");
  if (
    reg.acquisitionStatus === "RETIRED" ||
    reg.acquisitionStatus === "SUPERSEDED" ||
    reg.acquisitionStatus === "REJECTED"
  ) {
    throw new BadRequestException(
      `Source non éligible: ${reg.acquisitionStatus}`
    );
  }
  const item = await prisma.medicationRemediationWorkItem.findUnique({
    where: { id: input.workItemId },
  });
  if (!item) throw new NotFoundException("Élément de remédiation introuvable.");
  assertWave1FamilyKey(item.familyKey);

  const updated = await prisma.medicationRemediationWorkItem.update({
    where: { id: item.id },
    data: { evidenceRegistrationId: reg.id },
  });
  await audit(prisma, {
    programId: item.programId,
    entityType: "MedicationRemediationWorkItem",
    entityId: item.id,
    action: "EVIDENCE_LINKED",
    userId: actor.userId,
    before: { evidenceRegistrationId: item.evidenceRegistrationId },
    after: { evidenceRegistrationId: reg.id },
    reason: input.reason,
  });
  return { result: "UPDATED" as Phase15MutationResult, workItem: updated, registration: reg };
}

export async function verifyRemediationSource(
  prisma: PrismaClient,
  actor: RemediationActor,
  workItemId: string,
  reason: string
) {
  requireAdmin(actor);
  const item = await prisma.medicationRemediationWorkItem.findUnique({
    where: { id: workItemId },
  });
  if (!item?.evidenceRegistrationId) {
    throw new BadRequestException("Aucune source liée à vérifier.");
  }
  const updated = await advanceEvidenceSourceLifecycle(prisma, actor, {
    registrationId: item.evidenceRegistrationId,
    targetStatus: "verified",
    reviewStatus: "APPROVED",
    reason,
  });
  return {
    result: "UPDATED" as Phase15MutationResult,
    registration: updated,
    authoritative: isAuthoritativeRegistrationStatus(updated.acquisitionStatus),
  };
}

export async function listAuthoritativeSources(
  prisma: PrismaClient,
  filter?: { sourceTier?: string; acquisitionStatus?: string }
) {
  assertSafetyDefaults();
  return prisma.medicationEvidenceSourceRegistration.findMany({
    where: {
      ...(filter?.sourceTier ? { sourceTier: filter.sourceTier } : {}),
      ...(filter?.acquisitionStatus
        ? { acquisitionStatus: filter.acquisitionStatus }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

export async function getAuthoritativeSourceDetail(
  prisma: PrismaClient,
  registrationId: string
) {
  const reg = await prisma.medicationEvidenceSourceRegistration.findUnique({
    where: { id: registrationId },
    include: {
      evidenceLinks: { take: 50 },
      remediationWorkItems: { take: 50 },
    },
  });
  if (!reg) throw new NotFoundException("Source introuvable.");
  return {
    ...reg,
    promotionReady: isAuthoritativeRegistrationStatus(reg.acquisitionStatus),
    copyrightedContentEmbedded: false,
  };
}

export async function promoteAuthoritativeSource(
  prisma: PrismaClient,
  actor: RemediationActor,
  input: {
    registrationId: string;
    reason: string;
    licensingStatus?: "LICENSED" | "PUBLIC_DOMAIN" | "RESTRICTED" | "UNKNOWN";
  }
) {
  requireAdmin(actor);
  try {
    const updated = await advanceEvidenceSourceLifecycle(prisma, actor, {
      registrationId: input.registrationId,
      targetStatus: "authoritative",
      reviewStatus: "APPROVED",
      licensingStatus: input.licensingStatus ?? "PUBLIC_DOMAIN",
      reason: input.reason,
    });
    return { result: "UPDATED" as Phase15MutationResult, registration: updated };
  } catch (e) {
    if (e instanceof BadRequestException) {
      return {
        result: "BLOCKED" as Phase15MutationResult,
        error: e.message,
        unmetCriteria: ["TIER_OR_LICENSE_OR_REVIEW"],
      };
    }
    throw e;
  }
}

export async function previewKnowledgeUpdate(
  prisma: PrismaClient,
  workItemId: string
) {
  const item = await getRemediationWorkItemDetail(prisma, workItemId);
  const hasAuth =
    item.evidenceRegistration != null &&
    isAuthoritativeRegistrationStatus(
      item.evidenceRegistration.acquisitionStatus
    );
  return {
    workItemId: item.id,
    familyKey: item.familyKey,
    domain: "TIER1_POSITIVE_EXPECTED_FINDING",
    currentRevision: null,
    proposedRevision: null,
    supportingSourceId: item.evidenceRegistrationId,
    fieldsChanging: [],
    fieldsUnchanged: ["all_clinical_domains"],
    deferredFacts: [
      "Positive Tier-1 clinical expected findings remain deferred until Part 2C governed completion with licensed sources.",
    ],
    conflicts: hasAuth ? [] : ["AUTHORITATIVE_SOURCE_REQUIRED"],
    qualityScoreEstimate: "UNCHANGED_UNTIL_PART_2C",
    shadowRequalificationRequired: true,
    newSnapshotRequiredInPart2C: true,
    mutates: false,
    activatesCds: false,
    note: "Part 2B preview only — no clinical facts applied.",
  };
}

export async function markRemediationDeferredDomain(
  prisma: PrismaClient,
  actor: RemediationActor,
  workItemId: string,
  reason: string
) {
  return deferRemediationWorkItem(prisma, actor, workItemId, reason);
}

/**
 * Part 2B apply path: does NOT invent clinical knowledge.
 * With authoritative source linked, advances to AWAITING_QUALITY_RECALC and recalculates scores.
 * Full knowledge completion remains Part 2C.
 */
export async function applySupportedKnowledgeGuarded(
  prisma: PrismaClient,
  actor: RemediationActor,
  input: { workItemId: string; reason: string }
) {
  requireAdmin(actor);
  assertSafetyDefaults();
  const item = await prisma.medicationRemediationWorkItem.findUnique({
    where: { id: input.workItemId },
    include: { evidenceRegistration: true },
  });
  if (!item) throw new NotFoundException("Élément de remédiation introuvable.");
  assertWave1FamilyKey(item.familyKey);
  if (
    !item.evidenceRegistration ||
    !isAuthoritativeRegistrationStatus(
      item.evidenceRegistration.acquisitionStatus
    )
  ) {
    throw new BadRequestException(
      "Application refusée: source autoritative confirmée requise. Aucune fabrication."
    );
  }

  let currentStatus = item.status as Phase15WorkItemStatus;
  const workItemId = item.id;
  if (currentStatus === "BLOCKED_PENDING_AUTHORITATIVE_SOURCE") {
    const routed = await routeRemediationWorkItem(prisma, actor, {
      workItemId,
      evidenceRegistrationId: item.evidenceRegistrationId!,
      reason: input.reason,
    });
    currentStatus = routed.status as Phase15WorkItemStatus;
  }
  if (canTransitionRemediationWorkItem(currentStatus, "IN_REMEDIATION")) {
    const next = await transitionRemediationWorkItem(prisma, actor, {
      workItemId,
      toStatus: "IN_REMEDIATION",
      reason: input.reason,
      evidenceRegistrationId: item.evidenceRegistrationId!,
    });
    currentStatus = next.status as Phase15WorkItemStatus;
  }
  if (
    canTransitionRemediationWorkItem(currentStatus, "AWAITING_QUALITY_RECALC")
  ) {
    const next = await transitionRemediationWorkItem(prisma, actor, {
      workItemId,
      toStatus: "AWAITING_QUALITY_RECALC",
      reason: input.reason,
      evidenceRegistrationId: item.evidenceRegistrationId!,
    });
    currentStatus = next.status as Phase15WorkItemStatus;
  }

  const workItem = await prisma.medicationRemediationWorkItem.findUniqueOrThrow({
    where: { id: workItemId },
  });
  const quality = await recalculateWave1QualityAfterRemediation(prisma, actor);
  await audit(prisma, {
    programId: item.programId,
    entityType: "MedicationRemediationWorkItem",
    entityId: item.id,
    action: "SUPPORTED_KNOWLEDGE_PATH_ADVANCED",
    userId: actor.userId,
    after: {
      status: workItem.status,
      note: "No fabricated clinical facts; Part 2C completes knowledge.",
    },
    reason: input.reason,
  });

  return {
    result: "UPDATED" as Phase15MutationResult,
    workItem,
    qualityRecalculated: true,
    qualityScores: quality.quality.qualityScoresCalculated,
    clinicalFactsFabricated: false,
    activatesCds: false,
    part2cRequired: true,
  };
}

export async function getPhase15Dashboard(prisma: PrismaClient) {
  const baseline = await getPhase15OperationalBaseline(prisma);
  const families = await listPhase15Families(prisma);
  const remediations = await listRemediationWorkItems(prisma);
  return {
    ...baseline,
    Families: families.filter((f) => !f.acetaminophen),
    Acetaminophen: families.find((f) => f.acetaminophen),
    Remediations: remediations.slice(0, 100),
    Program: await getRemediationProgramSnapshot(prisma),
  };
}

export function classifyGapForApi(gapType: string) {
  const cat = classifyPhase14BGapForRemediation(gapType);
  return {
    category: cat,
    display: `${cat}_GAP`,
    requiresAuthoritativeSource: requiresAuthoritativeSourceBeforeRemediation({
      gapCategory: cat,
      gapKey: "",
    }),
  };
}
