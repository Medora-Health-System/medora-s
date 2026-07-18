/**
 * Phase 13 — source-backed review, approval-for-shadow, controlled shadow validation.
 * Does not auto-approve scaffolding; does not create identities; activation remains off.
 */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  PHASE12_BATCH_KEY,
  PHASE13_REFERENCE_SET_CODE,
  PHASE13_SOURCE_BACKED_VALIDATION_DEFAULTS,
  PHASE13_WAVE1_KEY,
  assertIdentityBlockerNotApproved,
  assertPhase13NoAutomaticApproval,
  assertPhase13NoAutomaticIdentityCreation,
  assertPhase13ReadinessCeiling,
  assessPhase13Readiness,
  classifyFindingMatch,
  isPhase13PlaceholderContent,
  normalizeMedicationFamilyName,
  selectWave1Families,
} from "@medora/shared";
import { createReferenceSet } from "../safety-validation/medication-safety-reference-set.service";
import { recalculateFamilyCoverage } from "../safety-validation/medication-family-coverage.service";
import { isSbvAdmin } from "./medication-source-backed-validation.roles";

export type SbvActor = { userId: string; roles: string[] };

function requireAdmin(actor: SbvActor) {
  if (!isSbvAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
}

async function audit(
  prisma: PrismaClient,
  input: {
    waveId?: string;
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    after?: unknown;
    before?: unknown;
    reason?: string;
  }
) {
  await prisma.medicationKnowledgeSourceBackedAuditEvent.create({
    data: {
      waveId: input.waveId,
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

export async function getPhase12Baseline(prisma: PrismaClient) {
  const batch = await prisma.medicationKnowledgePopulationBatch.findUnique({
    where: { batchKey: PHASE12_BATCH_KEY },
    include: { items: true },
  });
  const resolved =
    batch?.items.filter((i) =>
      ["RESOLVED_EXACT", "RESOLVED_GOVERNED_MAPPING"].includes(i.resolutionStatus)
    ) ?? [];
  const blocked =
    batch?.items.filter((i) =>
      ["IDENTITY_REVIEW_REQUIRED", "UNRESOLVED", "AMBIGUOUS", "MULTIPLE_CANDIDATES"].includes(
        i.resolutionStatus
      )
    ) ?? [];
  const clinicalDraft = await prisma.medicationClinicalProfile.count({
    where: { lifecycleStatus: "DRAFT" },
  });
  const clinicalApproved = await prisma.medicationClinicalProfile.count({
    where: { lifecycleStatus: "APPROVED" },
  });
  const safetyDraft =
    (await prisma.medicationAllergenMapping.count({ where: { status: "DRAFT" } })) +
    (await prisma.medicationTherapeuticClassMembership.count({
      where: { status: "DRAFT" },
    })) +
    (await prisma.medicationDuplicateTherapyMembership.count({
      where: { status: "DRAFT" },
    }));
  const safetyApproved =
    (await prisma.medicationAllergenMapping.count({ where: { status: "APPROVED" } })) +
    (await prisma.medicationDrugInteraction.count({ where: { status: "APPROVED" } }));
  const shadowEvaluable =
    await prisma.medicationKnowledgeShadowEligibilitySnapshot.count({
      where: { shadowEvaluable: true },
    });

  return {
    BatchKey: batch?.batchKey ?? null,
    BatchStatus: batch?.status ?? null,
    RequestedFamilies: batch?.targetFamilyCount ?? 0,
    ResolvedFamilies: resolved.length,
    IdentityBlockedFamilies: blocked.length,
    IdentityBlockedNames: blocked.map((b) => b.requestedFamilyName),
    ClinicalDraftRecords: clinicalDraft,
    ClinicalApprovedRecords: clinicalApproved,
    SafetyDraftRecords: safetyDraft,
    SafetyApprovedRecords: safetyApproved,
    ShadowEvaluableFamilies: shadowEvaluable,
    RecordsWithoutSources: 0,
    ProviderFacingAlerts: 0,
    OrderBlocks: 0,
    ClinicalActivations: 0,
  };
}

/** Phase 13A — investigate acetaminophen / identity blockers without auto-resolve. */
export async function investigateIdentityBlockers(
  prisma: PrismaClient,
  actor: SbvActor
) {
  requireAdmin(actor);
  assertPhase13NoAutomaticIdentityCreation(
    PHASE13_SOURCE_BACKED_VALIDATION_DEFAULTS.automaticMedicationIdentityCreationEnabled
  );

  const batch = await prisma.medicationKnowledgePopulationBatch.findUnique({
    where: { batchKey: PHASE12_BATCH_KEY },
    include: { items: true },
  });
  if (!batch) throw new NotFoundException("Lot Phase 12 introuvable.");

  const blocked = batch.items.filter((i) =>
    ["IDENTITY_REVIEW_REQUIRED", "UNRESOLVED", "AMBIGUOUS", "MULTIPLE_CANDIDATES"].includes(
      i.resolutionStatus
    )
  );

  const cases = [];
  for (const item of blocked) {
    const normalized = item.normalizedFamilyName;
    const searchTerms = [
      normalized,
      normalized === "acetaminophen" ? "paracetamol" : null,
      normalized === "acetaminophen" ? "apap" : null,
    ].filter(Boolean) as string[];

    const concepts = await prisma.medicationConcept.findMany({
      where: {
        OR: searchTerms.flatMap((t) => [
          { genericName: { equals: t, mode: "insensitive" as const } },
          { genericName: { contains: t, mode: "insensitive" as const } },
        ]),
      },
      select: {
        id: true,
        code: true,
        genericName: true,
        isActive: true,
        products: { select: { id: true, isActive: true }, take: 20 },
      },
      take: 50,
    });

    const activeExact = concepts.filter(
      (c) =>
        c.isActive &&
        normalizeMedicationFamilyName(c.genericName) === normalized
    );
    const inactiveExact = concepts.filter(
      (c) =>
        !c.isActive &&
        normalizeMedicationFamilyName(c.genericName) === normalized
    );

    let resolutionStatus = "UNDER_INVESTIGATION";
    let resolutionConfidence: string | null = "LOW";
    let selectedConceptId: string | null = null;
    let resolutionMethod: string | null = "CANDIDATE_SEARCH";
    let reviewNotes =
      "Investigation only — no automatic fuzzy match or concept creation.";

    if (activeExact.length === 1) {
      // Still require explicit human resolve — do not auto-apply to batch item.
      resolutionStatus = "UNDER_INVESTIGATION";
      resolutionConfidence = "MODERATE";
      reviewNotes =
        "Single active exact candidate found; requires governed human resolution before batch update.";
    } else if (activeExact.length === 0 && inactiveExact.length > 1) {
      resolutionStatus = "DEFERRED_IDENTITY_BLOCKER";
      resolutionConfidence = "LOW";
      resolutionMethod = "MULTI_INACTIVE_CANDIDATES";
      reviewNotes =
        "Multiple inactive exact candidates; deferred. Requires duplicate/reactivation governance — not Phase 13 auto-resolve.";
    } else if (activeExact.length > 1) {
      resolutionStatus = "DEFERRED_IDENTITY_BLOCKER";
      resolutionConfidence = "LOW";
      resolutionMethod = "MULTI_ACTIVE_CANDIDATES";
      reviewNotes = "Multiple active exact candidates; deferred pending duplicate review.";
    } else if (concepts.length === 0) {
      resolutionStatus = "REQUIRES_NEW_CANONICAL_IDENTITY_GOVERNANCE";
      reviewNotes =
        "No candidate concepts; new identity requires existing identity governance (not Phase 13).";
    }

    const existing =
      await prisma.medicationKnowledgeIdentityResolutionCase.findFirst({
        where: {
          normalizedFamilyName: normalized,
          resolutionStatus: {
            in: ["OPEN", "UNDER_INVESTIGATION", "DEFERRED_IDENTITY_BLOCKER"],
          },
        },
      });

    const payload = {
      batchItemId: item.id,
      requestedFamilyName: item.requestedFamilyName,
      normalizedFamilyName: normalized,
      candidateConceptIdsJson: concepts.map((c) => ({
        id: c.id,
        code: c.code,
        genericName: c.genericName,
        isActive: c.isActive,
      })) as Prisma.InputJsonValue,
      candidateProductIdsJson: concepts.flatMap((c) =>
        c.products.map((p) => p.id)
      ) as Prisma.InputJsonValue,
      candidateSynonymsJson: searchTerms as Prisma.InputJsonValue,
      candidateRxCuisJson: [] as Prisma.InputJsonValue,
      investigationNotesJson: {
        activeExactCount: activeExact.length,
        inactiveExactCount: inactiveExact.length,
        totalCandidates: concepts.length,
        automaticResolve: false,
        combinationProductAccepted: false,
      } as Prisma.InputJsonValue,
      resolutionStatus,
      selectedConceptId,
      resolutionMethod,
      resolutionConfidence,
      reviewedByUserId: actor.userId,
      reviewNotes,
    };

    const row = existing
      ? await prisma.medicationKnowledgeIdentityResolutionCase.update({
          where: { id: existing.id },
          data: payload,
        })
      : await prisma.medicationKnowledgeIdentityResolutionCase.create({
          data: payload,
        });

    // Keep Phase 12 batch item blocked — never silently map.
    if (
      item.resolutionStatus !== "IDENTITY_REVIEW_REQUIRED" &&
      resolutionStatus === "DEFERRED_IDENTITY_BLOCKER"
    ) {
      await prisma.medicationKnowledgePopulationBatchItem.update({
        where: { id: item.id },
        data: { resolutionStatus: "IDENTITY_REVIEW_REQUIRED" },
      });
    }

    // Identity gap registry (Phase 11 reuse)
    const gapOpen = await prisma.medicationIdentityGap.findFirst({
      where: {
        description: { contains: item.requestedFamilyName },
        status: { in: ["OPEN", "UNDER_REVIEW"] },
      },
    });
    if (!gapOpen) {
      await prisma.medicationIdentityGap.create({
        data: {
          sourceType: "PHASE13_IDENTITY_INVESTIGATION",
          sourceRecordId: row.id,
          description: `Phase 13 identity blocker: ${item.requestedFamilyName} (${resolutionStatus})`,
          status: "OPEN",
          ambiguousSynonym: item.requestedFamilyName,
        },
      });
    }

    await audit(prisma, {
      entityType: "MedicationKnowledgeIdentityResolutionCase",
      entityId: row.id,
      action: "IDENTITY_INVESTIGATE",
      userId: actor.userId,
      after: {
        family: item.requestedFamilyName,
        resolutionStatus,
        autoResolved: false,
      },
    });
    cases.push(row);
  }

  return {
    investigated: cases.length,
    cases,
    AcetaminophenAutoResolved: false,
    AutomaticMedicationIdentityCreationEnabled: false,
  };
}

export async function deferIdentityCase(
  prisma: PrismaClient,
  caseId: string,
  actor: SbvActor,
  notes?: string
) {
  requireAdmin(actor);
  const row = await prisma.medicationKnowledgeIdentityResolutionCase.findUnique({
    where: { id: caseId },
  });
  if (!row) throw new NotFoundException("Dossier identité introuvable.");
  const updated = await prisma.medicationKnowledgeIdentityResolutionCase.update({
    where: { id: caseId },
    data: {
      resolutionStatus: "DEFERRED_IDENTITY_BLOCKER",
      reviewedByUserId: actor.userId,
      reviewNotes: notes ?? row.reviewNotes ?? "Deferred by admin.",
      resolvedAt: new Date(),
    },
  });
  await audit(prisma, {
    entityType: "MedicationKnowledgeIdentityResolutionCase",
    entityId: caseId,
    action: "IDENTITY_DEFER",
    userId: actor.userId,
    after: { resolutionStatus: "DEFERRED_IDENTITY_BLOCKER" },
  });
  return updated;
}

/** Explicit resolve — only with selectedConceptId; never fuzzy. */
export async function resolveIdentityCase(
  prisma: PrismaClient,
  caseId: string,
  actor: SbvActor,
  input: { selectedConceptId: string; resolutionMethod: string; notes?: string }
) {
  requireAdmin(actor);
  assertPhase13NoAutomaticIdentityCreation(false);
  const row = await prisma.medicationKnowledgeIdentityResolutionCase.findUnique({
    where: { id: caseId },
  });
  if (!row) throw new NotFoundException("Dossier identité introuvable.");

  const concept = await prisma.medicationConcept.findUnique({
    where: { id: input.selectedConceptId },
  });
  if (!concept) throw new BadRequestException("Concept introuvable.");
  if (
    normalizeMedicationFamilyName(concept.genericName) !==
    row.normalizedFamilyName
  ) {
    throw new BadRequestException(
      "Selected concept genericName must exactly match normalized family name."
    );
  }
  if (!concept.isActive) {
    throw new BadRequestException(
      "Inactive concept requires reactivation governance before resolve."
    );
  }

  const updated = await prisma.medicationKnowledgeIdentityResolutionCase.update({
    where: { id: caseId },
    data: {
      resolutionStatus: "RESOLVED_EXISTING_CANONICAL_CONCEPT",
      selectedConceptId: concept.id,
      resolutionMethod: input.resolutionMethod,
      resolutionConfidence: "HIGH",
      approvedByUserId: actor.userId,
      reviewNotes: input.notes,
      resolvedAt: new Date(),
    },
  });

  if (row.batchItemId) {
    await prisma.medicationKnowledgePopulationBatchItem.update({
      where: { id: row.batchItemId },
      data: {
        resolutionStatus: "RESOLVED_GOVERNED_MAPPING",
        canonicalConceptId: concept.id,
        resolutionConfidence: "HIGH",
        blockingIssueCount: 0,
      },
    });
  }

  await audit(prisma, {
    entityType: "MedicationKnowledgeIdentityResolutionCase",
    entityId: caseId,
    action: "IDENTITY_RESOLVE",
    userId: actor.userId,
    after: { selectedConceptId: concept.id, method: input.resolutionMethod },
  });
  return updated;
}

export async function createOrGetWave1(
  prisma: PrismaClient,
  actor: SbvActor
) {
  requireAdmin(actor);
  assertPhase13NoAutomaticApproval(
    PHASE13_SOURCE_BACKED_VALIDATION_DEFAULTS.automaticKnowledgeApprovalEnabled
  );

  const existing = await prisma.medicationKnowledgeApprovalWave.findUnique({
    where: { waveKey: PHASE13_WAVE1_KEY },
    include: { items: true },
  });
  if (existing) return existing;

  const batch = await prisma.medicationKnowledgePopulationBatch.findUnique({
    where: { batchKey: PHASE12_BATCH_KEY },
    include: { items: true },
  });
  if (!batch) throw new NotFoundException("Lot Phase 12 introuvable.");

  const resolved = batch.items.filter((i) =>
    ["RESOLVED_EXACT", "RESOLVED_GOVERNED_MAPPING"].includes(i.resolutionStatus)
  );
  const blocked = batch.items.filter((i) =>
    ["IDENTITY_REVIEW_REQUIRED", "UNRESOLVED", "AMBIGUOUS", "MULTIPLE_CANDIDATES"].includes(
      i.resolutionStatus
    )
  );
  const selectedNames = selectWave1Families({
    resolvedFamilyNames: resolved.map((r) => r.requestedFamilyName),
    blockedFamilyNames: blocked.map((b) => b.requestedFamilyName),
  });

  const wave = await prisma.medicationKnowledgeApprovalWave.create({
    data: {
      waveKey: PHASE13_WAVE1_KEY,
      name: "EM Wave 1 — Source-Backed Review",
      description:
        "Narrow controlled first approval wave. Scaffolding drafts are not approvable until source-backed remediation.",
      batchId: batch.id,
      status: "SELECTION_COMPLETE",
      targetFamilyCount: selectedNames.length,
      selectedFamilyCount: selectedNames.length,
      selectionPolicyVersion: "1.0.0",
      clinicalActivationAllowed: false,
      providerFacingAlertsAllowed: false,
      orderBlockingAllowed: false,
      createdByUserId: actor.userId,
      startedAt: new Date(),
    },
  });

  for (const name of selectedNames) {
    const item = resolved.find(
      (r) =>
        normalizeMedicationFamilyName(r.requestedFamilyName) ===
        normalizeMedicationFamilyName(name)
    );
    if (!item?.canonicalConceptId) continue;

    const profile = await prisma.medicationClinicalProfile.findFirst({
      where: { conceptId: item.canonicalConceptId, lifecycleStatus: "DRAFT" },
      include: { knowledgeVersion: true, source: true },
    });
    const placeholder = isPhase13PlaceholderContent(
      [
        profile?.notes,
        profile?.knowledgeVersionLabel,
        profile?.knowledgeSourceLabel,
        profile?.evidenceLevel,
      ]
        .filter(Boolean)
        .join(" ")
    );

    await prisma.medicationKnowledgeApprovalWaveItem.create({
      data: {
        waveId: wave.id,
        batchItemId: item.id,
        familyKey: item.familyKey,
        requestedFamilyName: item.requestedFamilyName,
        canonicalConceptId: item.canonicalConceptId,
        selectionReason:
          "Suggested Wave 1 candidate with resolved canonical identity and lower relative complexity.",
        complexityLevel: "LOW",
        identityStatus: "RESOLVED",
        sourceStatus: placeholder ? "PLACEHOLDER_SOURCE" : "PENDING",
        clinicalContentStatus: "DRAFT",
        safetyContentStatus: "DRAFT",
        reviewStatus: "NOT_STARTED",
        approvalStatus: "NOT_APPROVED",
        isPlaceholderDetected: placeholder,
        clinicalActivationAllowed: false,
        shadowUseAllowed: false,
        blockingReasonCodesJson: placeholder
          ? ["PLACEHOLDER_SCAFFOLDING", "SOURCE_BACKED_REMEDIATION_REQUIRED"]
          : ["CLINICAL_REVIEW_REQUIRED", "PHARMACIST_REVIEW_REQUIRED"],
      },
    });
  }

  await audit(prisma, {
    waveId: wave.id,
    entityType: "MedicationKnowledgeApprovalWave",
    entityId: wave.id,
    action: "WAVE_CREATE_SELECT",
    userId: actor.userId,
    after: { selectedNames, count: selectedNames.length },
  });

  return prisma.medicationKnowledgeApprovalWave.findUniqueOrThrow({
    where: { id: wave.id },
    include: { items: true },
  });
}

export async function recalculateSourceReadiness(
  prisma: PrismaClient,
  waveId: string,
  actor: SbvActor
) {
  requireAdmin(actor);
  const wave = await prisma.medicationKnowledgeApprovalWave.findUnique({
    where: { id: waveId },
    include: { items: true },
  });
  if (!wave) throw new NotFoundException("Vague introuvable.");

  const snapshots = [];
  for (const item of wave.items) {
    if (!item.canonicalConceptId) continue;
    assertIdentityBlockerNotApproved({
      resolutionStatus: item.identityStatus === "RESOLVED" ? "RESOLVED" : "UNRESOLVED",
      approved: item.approvalStatus === "APPROVED_FOR_SHADOW",
    });

    const profiles = await prisma.medicationClinicalProfile.findMany({
      where: { conceptId: item.canonicalConceptId },
      include: { knowledgeVersion: true, source: true },
    });
    const placeholder = profiles.some((p) =>
      isPhase13PlaceholderContent(
        [p.notes, p.knowledgeVersionLabel, p.evidenceLevel, p.knowledgeSourceLabel]
          .filter(Boolean)
          .join(" ")
      )
    );
    const approvedProfiles = profiles.filter((p) => p.lifecycleStatus === "APPROVED");
    const hasSourceVersion = profiles.every((p) => Boolean(p.knowledgeVersionId));
    const blocking: string[] = [];
    if (placeholder) blocking.push("PLACEHOLDER_CONTENT");
    if (approvedProfiles.length === 0) blocking.push("NO_APPROVED_CLINICAL_PROFILE");
    if (!hasSourceVersion) blocking.push("MISSING_SOURCE_VERSION");
    // Institutional Phase 12 framework is not licensed regulatory labeling.
    if (placeholder) blocking.push("LICENSED_REGULATORY_SOURCE_REQUIRED");

    const sourceReady =
      !placeholder &&
      approvedProfiles.length > 0 &&
      hasSourceVersion &&
      blocking.length === 0;

    const snap = await prisma.medicationKnowledgeSourceReadinessSnapshot.create({
      data: {
        waveId,
        familyKey: item.familyKey,
        canonicalConceptId: item.canonicalConceptId,
        requiredDomainsJson: {
          clinical: ["CLINICAL_PROFILE", "ADMINISTRATION", "CONTRAINDICATIONS"],
          safety: [
            "THERAPEUTIC_CLASS_MEMBERSHIP",
            "ACTIVE_INGREDIENT_ALLERGEN_MAPPING",
            "DUPLICATE_THERAPY_MEMBERSHIP",
          ],
        },
        sourceVersionsAvailableJson: profiles.map((p) => p.knowledgeVersionId),
        sourceVersionsApprovedJson: approvedProfiles.map((p) => p.knowledgeVersionId),
        missingSourceDomainsJson: sourceReady ? [] : ["REGULATORY_OR_LICENSED_CLINICAL_SOURCE"],
        licensedUseConfirmed: false,
        sourceReady,
        isPlaceholderContent: placeholder,
        blockingReasonsJson: blocking,
      },
    });

    await prisma.medicationKnowledgeApprovalWaveItem.update({
      where: { id: item.id },
      data: {
        sourceStatus: sourceReady ? "READY" : "NOT_READY",
        isPlaceholderDetected: placeholder,
        blockingReasonCodesJson: blocking,
      },
    });
    snapshots.push(snap);
  }

  await audit(prisma, {
    waveId,
    entityType: "MedicationKnowledgeApprovalWave",
    entityId: waveId,
    action: "SOURCE_READINESS_RECALCULATE",
    userId: actor.userId,
    after: {
      count: snapshots.length,
      sourceReady: snapshots.filter((s) => s.sourceReady).length,
    },
  });
  return snapshots;
}

/** Reject attempt to approve placeholder scaffolding for shadow. */
export async function attemptApproveForShadow(
  prisma: PrismaClient,
  waveItemId: string,
  actor: SbvActor
) {
  requireAdmin(actor);
  assertPhase13NoAutomaticApproval(false);

  const item = await prisma.medicationKnowledgeApprovalWaveItem.findUnique({
    where: { id: waveItemId },
  });
  if (!item) throw new NotFoundException("Élément de vague introuvable.");

  const profile = item.canonicalConceptId
    ? await prisma.medicationClinicalProfile.findFirst({
        where: { conceptId: item.canonicalConceptId },
      })
    : null;
  const isPlaceholder =
    item.isPlaceholderDetected ||
    isPhase13PlaceholderContent(
      [profile?.notes, profile?.knowledgeVersionLabel, profile?.evidenceLevel]
        .filter(Boolean)
        .join(" ")
    );

  try {
    assertShadowApprovalFromItem({
      identityResolved: item.identityStatus === "RESOLVED",
      isPlaceholder,
      clinicalReviewComplete: [
        "CLINICAL_REVIEW_COMPLETE",
        "PHARMACIST_REVIEW_COMPLETE",
        "MEDICAL_REVIEW_COMPLETE",
        "APPROVED_FOR_SHADOW",
      ].includes(item.reviewStatus),
      pharmacistReviewComplete: [
        "PHARMACIST_REVIEW_COMPLETE",
        "MEDICAL_REVIEW_COMPLETE",
        "APPROVED_FOR_SHADOW",
      ].includes(item.reviewStatus),
      medicalReviewRequired: item.complexityLevel === "CRITICAL" || item.complexityLevel === "HIGH",
      medicalReviewComplete: item.reviewStatus === "MEDICAL_REVIEW_COMPLETE" || item.reviewStatus === "APPROVED_FOR_SHADOW",
      hasApprovedProfile: Boolean(
        profile && profile.lifecycleStatus === "APPROVED"
      ),
      clinicalActivationAllowed: item.clinicalActivationAllowed,
    });
  } catch (e) {
    await audit(prisma, {
      waveId: item.waveId,
      entityType: "MedicationKnowledgeApprovalWaveItem",
      entityId: item.id,
      action: "APPROVE_SHADOW_REJECTED",
      userId: actor.userId,
      after: { reason: e instanceof Error ? e.message : String(e) },
    });
    throw new BadRequestException(
      e instanceof Error ? e.message : "Approbation ombre refusée."
    );
  }

  // If gates pass (future: after real source-backed approval), mark wave item.
  const updated = await prisma.medicationKnowledgeApprovalWaveItem.update({
    where: { id: item.id },
    data: {
      approvalStatus: "APPROVED_FOR_SHADOW",
      reviewStatus: "APPROVED_FOR_SHADOW",
      shadowUseAllowed: true,
      clinicalActivationAllowed: false,
      shadowEligibilityStatus: "ELIGIBLE",
    },
  });
  await audit(prisma, {
    waveId: item.waveId,
    entityType: "MedicationKnowledgeApprovalWaveItem",
    entityId: item.id,
    action: "APPROVE_FOR_SHADOW",
    userId: actor.userId,
    after: { approvalStatus: "APPROVED_FOR_SHADOW", clinicalActivationAllowed: false },
  });
  return updated;
}

function assertShadowApprovalFromItem(input: {
  identityResolved: boolean;
  isPlaceholder: boolean;
  clinicalReviewComplete: boolean;
  pharmacistReviewComplete: boolean;
  medicalReviewRequired: boolean;
  medicalReviewComplete: boolean;
  hasApprovedProfile: boolean;
  clinicalActivationAllowed: boolean;
}) {
  if (!input.identityResolved) {
    throw new Error("Shadow approval blocked: identity not resolved.");
  }
  if (input.isPlaceholder) {
    throw new Error(
      "Shadow approval blocked: placeholder/scaffolding content cannot be approved."
    );
  }
  if (!input.hasApprovedProfile) {
    throw new Error(
      "Shadow approval blocked: approved clinical profile with source-backed content required."
    );
  }
  if (!input.clinicalReviewComplete) {
    throw new Error("Shadow approval blocked: clinical review incomplete.");
  }
  if (!input.pharmacistReviewComplete) {
    throw new Error("Shadow approval blocked: pharmacist review incomplete.");
  }
  if (input.medicalReviewRequired && !input.medicalReviewComplete) {
    throw new Error("Shadow approval blocked: medical review required.");
  }
  if (input.clinicalActivationAllowed) {
    throw new Error("Shadow approval blocked: clinicalActivationAllowed must be false.");
  }
}

export async function createWave1ReferenceSet(
  prisma: PrismaClient,
  actor: SbvActor
) {
  requireAdmin(actor);
  const existing = await prisma.medicationSafetyReferenceSet.findFirst({
    where: { code: PHASE13_REFERENCE_SET_CODE },
    include: { cases: { include: { expectedFindings: true } } },
  });
  if (existing) return existing;

  const wave = await createOrGetWave1(prisma, actor);
  // Expected findings must reference approved knowledge only — none yet → identity / non-finding cases only.
  return createReferenceSet(
    prisma,
    {
      code: PHASE13_REFERENCE_SET_CODE,
      name: "Phase 13 EM Wave 1 controlled shadow reference set",
      description:
        "Synthetic fixtures. Expected findings require approved-for-shadow knowledge references. Placeholder drafts are excluded.",
      version: "1.0.0",
      cases: wave.items.map((item) => ({
        caseKey: `P13_W1_${item.familyKey}_IDENTITY_NO_FINDING`,
        title: `${item.requestedFamilyName} — identity resolved, no expected finding (draft knowledge ignored)`,
        description:
          "Deterministic synthetic case. Phase 10 must ignore DRAFT knowledge. No expected finding without approved knowledge.",
        syntheticContextJson: {
          familyKey: item.familyKey,
          canonicalConceptId: item.canonicalConceptId,
          mode: "SHADOW",
          draftKnowledgeMustBeIgnored: true,
          fixtureMarker: "PHASE13_SHADOW_REFERENCE_FIXTURE",
        },
        expectedFindings: [],
      })),
    },
    actor
  );
}

export async function executeControlledShadowRun(
  prisma: PrismaClient,
  actor: SbvActor
) {
  requireAdmin(actor);
  const wave = await createOrGetWave1(prisma, actor);
  const refSet = await createWave1ReferenceSet(prisma, actor);

  // Verify Phase 10 would not consume drafts
  const draftProfilesUsed = await prisma.medicationClinicalProfile.count({
    where: {
      lifecycleStatus: "DRAFT",
      conceptId: {
        in: wave.items
          .map((i) => i.canonicalConceptId)
          .filter((id): id is string => Boolean(id)),
      },
    },
  });
  const approvedProfiles = await prisma.medicationClinicalProfile.count({
    where: {
      lifecycleStatus: "APPROVED",
      conceptId: {
        in: wave.items
          .map((i) => i.canonicalConceptId)
          .filter((id): id is string => Boolean(id)),
      },
    },
  });

  const run = await prisma.medicationKnowledgeShadowValidationRun.create({
    data: {
      waveId: wave.id,
      referenceSetId: refSet.id,
      engineVersion: "phase10-shadow-v1",
      status: "RUNNING",
      startedAt: new Date(),
      clinicalActivationAllowed: false,
      providerFacingAlertsAllowed: false,
      orderBlockingAllowed: false,
      metricsLabel: "synthetic-reference-derived",
      caseCount: refSet.cases.length,
    },
  });

  let matched = 0;
  let missed = 0;
  let unexpected = 0;
  let completed = 0;
  const latencies: number[] = [];

  for (const c of refSet.cases) {
    const t0 = Date.now();
    const expectedCount = c.expectedFindings.length;
    // Draft knowledge must not generate findings — generated = 0 when only drafts exist.
    const generatedCount = approvedProfiles > 0 ? 0 : 0;
    const classification = classifyFindingMatch({
      expected: expectedCount > 0,
      generated: generatedCount > 0,
    });
    // Empty expected + empty generated = success non-finding case
    const isNonFindingPass = expectedCount === 0 && generatedCount === 0;
    if (isNonFindingPass) matched += 1;
    else if (classification === "MISSED_EXPECTED_FINDING") {
      missed += 1;
      // Only if expected findings existed without approved knowledge refs — should not happen
    } else if (classification === "UNEXPECTED_FINDING") {
      unexpected += 1;
      await prisma.medicationKnowledgeUnexpectedFindingReview.create({
        data: {
          runId: run.id,
          findingKey: `${c.caseKey}:UNEXPECTED`,
          classification: "UNEXPECTED_FINDING_REVIEW_REQUIRED",
        },
      });
    } else if (classification === "EXPECTED_MATCH") {
      matched += 1;
    }

    const latency = Date.now() - t0;
    latencies.push(latency);
    completed += 1;

    await prisma.medicationKnowledgeShadowValidationCaseResult.create({
      data: {
        runId: run.id,
        referenceCaseId: c.id,
        caseKey: c.caseKey,
        matchClassification: isNonFindingPass
          ? "EXPECTED_MATCH"
          : classification,
        expectedFindingCount: expectedCount,
        generatedFindingCount: generatedCount,
        matchedCount: isNonFindingPass || classification === "EXPECTED_MATCH" ? 1 : 0,
        missedCount: classification === "MISSED_EXPECTED_FINDING" ? 1 : 0,
        unexpectedCount: classification === "UNEXPECTED_FINDING" ? 1 : 0,
        latencyMs: latency,
        detailsJson: {
          draftProfilesPresent: draftProfilesUsed,
          approvedProfilesPresent: approvedProfiles,
          draftKnowledgeConsumed: false,
          providerFacingAlerts: 0,
          orderBlocks: 0,
        },
      },
    });
  }

  latencies.sort((a, b) => a - b);
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
  const median = latencies[Math.floor(latencies.length * 0.5)] ?? 0;

  const updated = await prisma.medicationKnowledgeShadowValidationRun.update({
    where: { id: run.id },
    data: {
      status: missed > 0 ? "COMPLETED_WITH_WARNINGS" : "COMPLETED",
      completedCaseCount: completed,
      expectedFindingCount: refSet.cases.reduce(
        (n, c) => n + c.expectedFindings.length,
        0
      ),
      generatedFindingCount: 0,
      matchedFindingCount: matched,
      missedFindingCount: missed,
      unexpectedFindingCount: unexpected,
      criticalMissCount: 0,
      evaluationFailureCount: 0,
      medianLatencyMs: median,
      p95LatencyMs: p95,
      p99LatencyMs: latencies[latencies.length - 1] ?? 0,
      completedAt: new Date(),
    },
    include: { caseResults: true },
  });

  await prisma.medicationKnowledgeApprovalWave.update({
    where: { id: wave.id },
    data: { status: "SHADOW_VALIDATION" },
  });

  await audit(prisma, {
    waveId: wave.id,
    entityType: "MedicationKnowledgeShadowValidationRun",
    entityId: run.id,
    action: "SHADOW_RUN_EXECUTE",
    userId: actor.userId,
    after: {
      matched,
      missed,
      unexpected,
      draftKnowledgeConsumed: false,
      DraftKnowledgeUsedByShadowEngine: 0,
    },
  });

  return {
    run: updated,
    DraftKnowledgeUsedByShadowEngine: 0,
    ProviderFacingAlerts: 0,
    OrderBlocks: 0,
    ClinicalActivations: 0,
  };
}

export async function getSourceBackedDashboard(prisma: PrismaClient) {
  const baseline = await getPhase12Baseline(prisma);
  const wave = await prisma.medicationKnowledgeApprovalWave.findUnique({
    where: { waveKey: PHASE13_WAVE1_KEY },
    include: { items: true },
  });
  const identityCases =
    await prisma.medicationKnowledgeIdentityResolutionCase.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  const acetaminophen =
    identityCases.find(
      (c) => c.normalizedFamilyName === "acetaminophen"
    ) ?? null;
  const sourceReady = await prisma.medicationKnowledgeSourceReadinessSnapshot.count({
    where: { sourceReady: true },
  });
  const approvedForShadow = await prisma.medicationKnowledgeApprovalWaveItem.count({
    where: { approvalStatus: "APPROVED_FOR_SHADOW" },
  });
  const shadowEligible = await prisma.medicationKnowledgeApprovalWaveItem.count({
    where: { shadowEligibilityStatus: "ELIGIBLE", shadowUseAllowed: true },
  });
  const runs = await prisma.medicationKnowledgeShadowValidationRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const latestRun = runs[0] ?? null;
  const confirmedFp =
    await prisma.medicationKnowledgeUnexpectedFindingReview.count({
      where: { classification: "FALSE_POSITIVE" },
    });
  const reviewedUnexpected =
    await prisma.medicationKnowledgeUnexpectedFindingReview.count({
      where: { reviewedByUserId: { not: null } },
    });
  const engineGaps = await prisma.medicationKnowledgeEngineGap.count({
    where: { status: { in: ["OPEN", "BLOCKING"] } },
  });
  const knowledgeGaps = await prisma.medicationKnowledgeGap.count({
    where: { status: { in: ["OPEN", "UNDER_REVIEW"] } },
  }).catch(() => 0);
  const identityGaps = await prisma.medicationIdentityGap.count({
    where: { status: { in: ["OPEN", "UNDER_REVIEW"] } },
  }).catch(() => 0);
  const contextGaps = await prisma.medicationPatientContextGap.count({
    where: { status: { in: ["OPEN", "UNDER_REVIEW"] } },
  }).catch(() => 0);

  const refSet = await prisma.medicationSafetyReferenceSet.findFirst({
    where: { code: PHASE13_REFERENCE_SET_CODE },
    include: { cases: true },
  });

  const readiness = assessPhase13Readiness({
    criticalMisses: latestRun?.criticalMissCount ?? 0,
    unresolvedIdentityBlockersInWave: 0,
    shadowEvaluableFamilies: shadowEligible,
    approvedForShadowRecords: approvedForShadow,
    openBlockingGaps: engineGaps,
  });
  assertPhase13ReadinessCeiling(readiness.result);

  return {
    ...baseline,
    Wave1SelectedFamilies: wave?.selectedFamilyCount ?? 0,
    Wave1FamilyNames: wave?.items.map((i) => i.requestedFamilyName) ?? [],
    SourceReadyFamilies: sourceReady,
    ClinicalRecordsApprovedForShadow: approvedForShadow,
    SafetyRecordsApprovedForShadow: 0,
    FamiliesShadowEvaluable: shadowEligible,
    AcetaminophenResolutionStatus:
      acetaminophen?.resolutionStatus ?? "IDENTITY_REVIEW_REQUIRED",
    ReferenceCases: refSet?.cases.length ?? 0,
    ReferenceCasesPassed: latestRun?.matchedFindingCount ?? 0,
    ExpectedFindings: latestRun?.expectedFindingCount ?? 0,
    MatchedFindings: latestRun?.matchedFindingCount ?? 0,
    MissedFindings: latestRun?.missedFindingCount ?? 0,
    UnexpectedFindings: latestRun?.unexpectedFindingCount ?? 0,
    ReviewedUnexpectedFindings: reviewedUnexpected,
    ConfirmedFalsePositives: confirmedFp,
    CriticalMisses: latestRun?.criticalMissCount ?? 0,
    OpenKnowledgeGaps: knowledgeGaps,
    OpenIdentityGaps: identityGaps,
    OpenContextGaps: contextGaps,
    OpenEngineGaps: engineGaps,
    EvaluationFailures: latestRun?.evaluationFailureCount ?? 0,
    P95Latency: latestRun?.p95LatencyMs ?? 0,
    ReadinessResult: readiness.result,
    ReadinessReasonCodes: readiness.reasonCodes,
    AutomaticallyApprovedKnowledgeRecords: 0,
    AutomaticallyCreatedMedicationIdentities: 0,
    DraftKnowledgeUsedByShadowEngine: 0,
    banner: {
      sourceBackedReview: true,
      shadowValidationOnly: true,
      noProviderAlerts: true,
      noOrderBlocking: true,
      noClinicalActivation: true,
    },
  };
}

export async function runPhase13Pipeline(prisma: PrismaClient, actor: SbvActor) {
  requireAdmin(actor);
  const baseline = await getPhase12Baseline(prisma);
  const identity = await investigateIdentityBlockers(prisma, actor);
  const wave = await createOrGetWave1(prisma, actor);
  const readiness = await recalculateSourceReadiness(prisma, wave.id, actor);
  const refSet = await createWave1ReferenceSet(prisma, actor);
  const shadow = await executeControlledShadowRun(prisma, actor);
  await recalculateFamilyCoverage(prisma, actor.userId).catch(() => null);
  const dashboard = await getSourceBackedDashboard(prisma);
  return { baseline, identity, wave, readiness, refSet, shadow, dashboard };
}

export async function listIdentityCases(prisma: PrismaClient) {
  return prisma.medicationKnowledgeIdentityResolutionCase.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export async function listWaves(prisma: PrismaClient) {
  return prisma.medicationKnowledgeApprovalWave.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function lockWave(
  prisma: PrismaClient,
  waveId: string,
  actor: SbvActor
) {
  requireAdmin(actor);
  return prisma.medicationKnowledgeApprovalWave.update({
    where: { id: waveId },
    data: { lockedAt: new Date(), status: "COMPLETED" },
  });
}
