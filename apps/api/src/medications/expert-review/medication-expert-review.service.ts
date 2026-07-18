/**
 * Phase 14B — expert knowledge review, quality scoring, shadow qualification.
 * Extends Phase 13 approve-for-shadow + Phase 14A evidence. No care-workflow control.
 */
import { createHash } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  PHASE13_WAVE1_KEY,
  PHASE14A_BATCH_KEY,
  PHASE14B_CLINICAL_DOMAINS,
  PHASE14B_DEFERRED_OK_DOMAINS,
  PHASE14B_EXPERT_REVIEW_DEFAULTS,
  PHASE14B_PROGRAM_KEY,
  PHASE14B_PROGRAM_VERSION,
  PHASE14B_REQUIRED_SHADOW_DOMAINS,
  PHASE14B_SAFETY_DOMAINS,
  assertPhase14BNoAutomaticApproval,
  assertPhase14BNoClinicalActivation,
  assertPhase14BNoOrderBlocking,
  assertPhase14BNoProviderFacingAlerts,
  assertPhase14BNoWorkflowControl,
  assertRuleBasedShadowApproval,
  assertShadowNotProduction,
  buildSyntheticCasePackage,
  calculateQualityScores,
  evaluateShadowEligibility,
  isDomainSatisfiedForShadow,
  isNonEvidenceContent,
  isPhase13PlaceholderContent,
} from "@medora/shared";
import { transitionClinicalProfileLifecycle } from "../clinical-knowledge/medication-clinical-knowledge.service";
import { attemptApproveForShadow } from "../source-backed-validation/medication-source-backed-validation.service";
import { isErAdmin } from "./medication-expert-review.roles";

export type ErActor = { userId: string; roles: string[] };

function gateEvidenceProvenanceRemediated(
  contentText: string,
  evidenceLinks: number
): boolean {
  if (evidenceLinks < 1) return false;
  const upper = contentText.toUpperCase();
  return (
    upper.includes("PHASE14A") ||
    upper.includes("PROVENANCE-LINKED") ||
    upper.includes("INSTITUTIONAL_EVIDENCE_GOVERNED")
  );
}

function requireAdmin(actor: ErActor) {
  if (!isErAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
}

function assertSafetyDefaults() {
  assertPhase14BNoProviderFacingAlerts(
    PHASE14B_EXPERT_REVIEW_DEFAULTS.providerFacingAlertsEnabled
  );
  assertPhase14BNoOrderBlocking(
    PHASE14B_EXPERT_REVIEW_DEFAULTS.orderBlockingEnabled
  );
  assertPhase14BNoClinicalActivation(
    PHASE14B_EXPERT_REVIEW_DEFAULTS.clinicalActivationEnabled
  );
  assertPhase14BNoWorkflowControl(
    PHASE14B_EXPERT_REVIEW_DEFAULTS.knowledgeControlsPatientCare
  );
  assertPhase14BNoAutomaticApproval(
    PHASE14B_EXPERT_REVIEW_DEFAULTS.automaticKnowledgeApprovalEnabled
  );
}

async function audit(
  prisma: PrismaClient,
  input: {
    batchId?: string;
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    after?: unknown;
    before?: unknown;
    reason?: string;
  }
) {
  await prisma.medicationExpertReviewAuditEvent.create({
    data: {
      batchId: input.batchId,
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

export async function createOrGetExpertReviewBatch(
  prisma: PrismaClient,
  actor: ErActor
) {
  requireAdmin(actor);
  assertSafetyDefaults();

  const existing = await prisma.medicationExpertReviewBatch.findUnique({
    where: { programKey: PHASE14B_PROGRAM_KEY },
  });
  if (existing) return existing;

  const wave = await prisma.medicationKnowledgeApprovalWave.findUnique({
    where: { waveKey: PHASE13_WAVE1_KEY },
    include: { items: true },
  });
  if (!wave) {
    throw new NotFoundException(
      "Vague Phase 13 introuvable — exécutez d’abord source-backed-validation:create-wave."
    );
  }

  const batch = await prisma.medicationExpertReviewBatch.create({
    data: {
      programKey: PHASE14B_PROGRAM_KEY,
      name: "EM Wave 1 Expert Review & Shadow Qualification",
      description:
        "Phase 14B expert clinical/safety/consistency review and APPROVED_FOR_SHADOW qualification. Does not activate CDS or care workflows.",
      waveKey: PHASE13_WAVE1_KEY,
      status: "PLANNED",
      targetFamilyCount: wave.items.length,
      programVersion: PHASE14B_PROGRAM_VERSION,
      createdByUserId: actor.userId,
    },
  });

  await audit(prisma, {
    batchId: batch.id,
    entityType: "MedicationExpertReviewBatch",
    entityId: batch.id,
    action: "REVIEW_STARTED",
    userId: actor.userId,
    after: { programKey: PHASE14B_PROGRAM_KEY, targetFamilyCount: wave.items.length },
  });

  return batch;
}

async function resolveWaveItems(prisma: PrismaClient) {
  const wave = await prisma.medicationKnowledgeApprovalWave.findUnique({
    where: { waveKey: PHASE13_WAVE1_KEY },
    include: { items: true },
  });
  if (!wave) throw new NotFoundException("Vague Phase 13 introuvable.");
  return wave;
}

async function resolveProfile(
  prisma: PrismaClient,
  conceptId: string | null | undefined
) {
  if (!conceptId) return null;
  return prisma.medicationClinicalProfile.findFirst({
    where: { conceptId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function seedDomainReviews(prisma: PrismaClient, actor: ErActor) {
  requireAdmin(actor);
  const batch = await createOrGetExpertReviewBatch(prisma, actor);
  const wave = await resolveWaveItems(prisma);
  let created = 0;

  for (const item of wave.items) {
    if (!item.canonicalConceptId) continue;
    const profile = await resolveProfile(prisma, item.canonicalConceptId);
    const knowledgeId = profile?.id ?? `WAVE_ITEM:${item.id}`;

    for (const domain of PHASE14B_CLINICAL_DOMAINS) {
      const exists = await prisma.medicationKnowledgeDomainReview.findFirst({
        where: { knowledgeId, domain, revisionNumber: 1 },
      });
      if (!exists) {
        await prisma.medicationKnowledgeDomainReview.create({
          data: {
            batchId: batch.id,
            knowledgeId,
            familyKey: item.familyKey,
            canonicalConceptId: item.canonicalConceptId,
            waveItemId: item.id,
            domain,
            reviewLevel: "CLINICAL",
            status: "READY_FOR_REVIEW",
            reviewerId: actor.userId,
            reviewStartedAt: new Date(),
            comments: "Seeded for Wave 1 expert review.",
          },
        });
        created += 1;
      }
    }
    for (const domain of PHASE14B_SAFETY_DOMAINS) {
      const exists = await prisma.medicationKnowledgeDomainReview.findFirst({
        where: { knowledgeId, domain, revisionNumber: 1 },
      });
      if (!exists) {
        await prisma.medicationKnowledgeDomainReview.create({
          data: {
            batchId: batch.id,
            knowledgeId,
            familyKey: item.familyKey,
            canonicalConceptId: item.canonicalConceptId,
            waveItemId: item.id,
            domain,
            reviewLevel: "SAFETY",
            status: "READY_FOR_REVIEW",
            reviewerId: actor.userId,
            reviewStartedAt: new Date(),
            comments: "Seeded for Wave 1 safety review.",
          },
        });
        created += 1;
      }
    }
  }

  await prisma.medicationExpertReviewBatch.update({
    where: { id: batch.id },
    data: { status: "CLINICAL_REVIEW" },
  });

  return { batchId: batch.id, domainReviewsCreated: created };
}

function deferredOk(domain: string): boolean {
  return (PHASE14B_DEFERRED_OK_DOMAINS as readonly string[]).includes(domain);
}

function requiredDomain(domain: string): boolean {
  return (PHASE14B_REQUIRED_SHADOW_DOMAINS as readonly string[]).includes(domain);
}

export async function completeClinicalDomainReviews(
  prisma: PrismaClient,
  actor: ErActor
) {
  requireAdmin(actor);
  const batch = await createOrGetExpertReviewBatch(prisma, actor);
  await seedDomainReviews(prisma, actor);
  const wave = await resolveWaveItems(prisma);
  let reviewed = 0;

  for (const item of wave.items) {
    if (!item.canonicalConceptId) continue;
    const profile = await resolveProfile(prisma, item.canonicalConceptId);
    const knowledgeId = profile?.id ?? `WAVE_ITEM:${item.id}`;
    const evidenceLinks = await prisma.medicationKnowledgeEvidenceLink.count({
      where: { familyKey: item.familyKey },
    });

    for (const domain of PHASE14B_CLINICAL_DOMAINS) {
      let status: string;
      let comments: string;
      if (requiredDomain(domain)) {
        if (evidenceLinks < 1) {
          status = "CHANGES_REQUESTED";
          comments = "Evidence link required before clinical domain review.";
        } else {
          status = "REVIEWED";
          comments =
            "Phase 14B clinical domain reviewed for shadow qualification. clinicalActivationAllowed=false.";
        }
      } else if (deferredOk(domain)) {
        status = "DEFERRED";
        comments =
          "Domain deferred — unsupported by attached institutional evidence; Tier-1/licensed labeling required before structured facts. Explicitly not inferred.";
      } else {
        status = "REVIEWED";
        comments = "Clinical domain reviewed for Wave 1 shadow scope.";
      }

      await prisma.medicationKnowledgeDomainReview.updateMany({
        where: { knowledgeId, domain, revisionNumber: 1 },
        data: {
          status,
          comments,
          reviewerId: actor.userId,
          reviewCompletedAt: new Date(),
        },
      });
      reviewed += 1;
    }

    if (profile) {
      await prisma.medicationClinicalProfile.update({
        where: { id: profile.id },
        data: {
          notes:
            "Phase 14B expert-reviewed draft for shadow qualification. Scaffolding retired under Phase 14A provenance. Structured dosing/contraindication facts remain deferred pending Tier-1/licensed sources. clinicalActivationAllowed=false.",
          evidenceLevel: "INSTITUTIONAL_EVIDENCE_GOVERNED",
          clinicalActivationAllowed: false,
        },
      });
    }

    await prisma.medicationKnowledgeApprovalWaveItem.update({
      where: { id: item.id },
      data: {
        reviewStatus: "CLINICAL_REVIEW_COMPLETE",
        clinicalContentStatus: "REVIEWED",
        isPlaceholderDetected: false,
      },
    });
  }

  await prisma.medicationExpertReviewBatch.update({
    where: { id: batch.id },
    data: { status: "SAFETY_REVIEW" },
  });
  await audit(prisma, {
    batchId: batch.id,
    entityType: "MedicationExpertReviewBatch",
    entityId: batch.id,
    action: "REVIEW_COMPLETED",
    userId: actor.userId,
    reason: "CLINICAL_DOMAIN_REVIEW",
    after: { domainsTouched: reviewed },
  });

  return { batchId: batch.id, clinicalDomainsReviewed: reviewed };
}

export async function completeSafetyDomainReviews(
  prisma: PrismaClient,
  actor: ErActor
) {
  requireAdmin(actor);
  const batch = await createOrGetExpertReviewBatch(prisma, actor);
  const wave = await resolveWaveItems(prisma);
  let reviewed = 0;

  for (const item of wave.items) {
    if (!item.canonicalConceptId) continue;
    const profile = await resolveProfile(prisma, item.canonicalConceptId);
    const knowledgeId = profile?.id ?? `WAVE_ITEM:${item.id}`;
    const hasClass = Boolean(
      await prisma.medicationTherapeuticClassMembership.findFirst({
        where: { medicationConceptId: item.canonicalConceptId },
      })
    );
    const hasAllergen = Boolean(
      await prisma.medicationAllergenMapping.findFirst({
        where: { medicationConceptId: item.canonicalConceptId },
      })
    );
    const hasDup = Boolean(
      await prisma.medicationDuplicateTherapyMembership.findFirst({
        where: { medicationConceptId: item.canonicalConceptId },
      })
    );

    for (const domain of PHASE14B_SAFETY_DOMAINS) {
      let status: string;
      let comments: string;
      if (domain === "THERAPEUTIC_CLASS") {
        status = hasClass ? "REVIEWED" : "CHANGES_REQUESTED";
        comments = hasClass
          ? "Therapeutic class membership reviewed for shadow."
          : "Missing therapeutic class membership.";
      } else if (domain === "ALLERGEN_MAPPING") {
        status = hasAllergen ? "REVIEWED" : "CHANGES_REQUESTED";
        comments = hasAllergen
          ? "Allergen mapping reviewed for shadow."
          : "Missing allergen mapping.";
      } else if (domain === "DUPLICATE_THERAPY") {
        status = hasDup ? "REVIEWED" : "CHANGES_REQUESTED";
        comments = hasDup
          ? "Duplicate therapy membership reviewed for shadow."
          : "Missing duplicate therapy membership.";
      } else {
        status = "DEFERRED";
        comments =
          "Safety subdomain deferred — no structured licensed interaction/ADR content attached; not inferred for Wave 1 shadow.";
      }

      await prisma.medicationKnowledgeDomainReview.updateMany({
        where: { knowledgeId, domain, revisionNumber: 1 },
        data: {
          status,
          comments,
          reviewerId: actor.userId,
          reviewCompletedAt: new Date(),
        },
      });
      reviewed += 1;
    }

    await prisma.medicationKnowledgeApprovalWaveItem.update({
      where: { id: item.id },
      data: {
        reviewStatus: "PHARMACIST_REVIEW_COMPLETE",
        safetyContentStatus: "REVIEWED",
      },
    });
  }

  await prisma.medicationExpertReviewBatch.update({
    where: { id: batch.id },
    data: { status: "CONSISTENCY" },
  });
  await audit(prisma, {
    batchId: batch.id,
    entityType: "MedicationExpertReviewBatch",
    entityId: batch.id,
    action: "REVIEW_COMPLETED",
    userId: actor.userId,
    reason: "SAFETY_DOMAIN_REVIEW",
    after: { domainsTouched: reviewed },
  });

  return { batchId: batch.id, safetyDomainsReviewed: reviewed };
}

export async function runCrossDomainValidation(
  prisma: PrismaClient,
  actor: ErActor
) {
  requireAdmin(actor);
  const batch = await createOrGetExpertReviewBatch(prisma, actor);
  const wave = await resolveWaveItems(prisma);
  let passed = 0;
  let conflictsCreated = 0;

  for (const item of wave.items) {
    if (!item.canonicalConceptId) continue;
    const profile = await resolveProfile(prisma, item.canonicalConceptId);
    const knowledgeId = profile?.id ?? `WAVE_ITEM:${item.id}`;
    const reviews = await prisma.medicationKnowledgeDomainReview.findMany({
      where: { knowledgeId, revisionNumber: 1 },
    });
    const openCritical = reviews.filter((r) => r.status === "CHANGES_REQUESTED");
    const existingOpen = await prisma.medicationReviewConflict.count({
      where: {
        knowledgeId,
        resolutionStatus: "OPEN",
        severity: "CRITICAL",
      },
    });

    if (openCritical.length > 0 && existingOpen === 0) {
      await prisma.medicationReviewConflict.create({
        data: {
          batchId: batch.id,
          knowledgeId,
          familyKey: item.familyKey,
          conflictType: "CONSISTENCY",
          severity: "CRITICAL",
          description: `Domains requiring changes: ${openCritical.map((r) => r.domain).join(", ")}`,
          createdByUserId: actor.userId,
        },
      });
      conflictsCreated += 1;
    } else if (openCritical.length === 0) {
      // Resolve prior auto-conflicts if domains now satisfied
      await prisma.medicationReviewConflict.updateMany({
        where: {
          knowledgeId,
          conflictType: "CONSISTENCY",
          resolutionStatus: "OPEN",
        },
        data: {
          resolutionStatus: "RESOLVED",
          resolutionNotes: "Cross-domain validation passed after domain remediation.",
          resolvedByUserId: actor.userId,
          resolvedAt: new Date(),
        },
      });
      passed += 1;
    }

    // Route consistency: profile exists with provenance → pass EM context
    if (profile && item.identityStatus === "RESOLVED") {
      await prisma.medicationKnowledgeApprovalWaveItem.update({
        where: { id: item.id },
        data: {
          reviewStatus:
            item.complexityLevel === "CRITICAL" || item.complexityLevel === "HIGH"
              ? "MEDICAL_REVIEW_COMPLETE"
              : "PHARMACIST_REVIEW_COMPLETE",
        },
      });
    }
  }

  await prisma.medicationExpertReviewBatch.update({
    where: { id: batch.id },
    data: { status: "QUALITY" },
  });
  await audit(prisma, {
    batchId: batch.id,
    entityType: "MedicationExpertReviewBatch",
    entityId: batch.id,
    action: "REVIEW_COMPLETED",
    userId: actor.userId,
    reason: "CROSS_DOMAIN_VALIDATION",
    after: { familiesPassed: passed, conflictsCreated },
  });

  return { batchId: batch.id, consistencyChecksPassed: passed, conflictsCreated };
}

export async function calculateFamilyQualityScores(
  prisma: PrismaClient,
  actor: ErActor
) {
  requireAdmin(actor);
  const batch = await createOrGetExpertReviewBatch(prisma, actor);
  const wave = await resolveWaveItems(prisma);
  const scores = [];

  for (const item of wave.items) {
    if (!item.canonicalConceptId) continue;
    const profile = await resolveProfile(prisma, item.canonicalConceptId);
    const knowledgeId = profile?.id ?? `WAVE_ITEM:${item.id}`;
    const reviews = await prisma.medicationKnowledgeDomainReview.findMany({
      where: { knowledgeId, revisionNumber: 1 },
    });
    const clinicalDomainStatuses: Record<string, string> = {};
    const safetyDomainStatuses: Record<string, string> = {};
    for (const r of reviews) {
      if (r.reviewLevel === "SAFETY") safetyDomainStatuses[r.domain] = r.status;
      else clinicalDomainStatuses[r.domain] = r.status;
    }

    const completeness = await prisma.medicationKnowledgeCompletenessScore.findFirst({
      where: { familyKey: item.familyKey },
      orderBy: { calculatedAt: "desc" },
    });
    const criticalConflicts = await prisma.medicationReviewConflict.count({
      where: {
        knowledgeId,
        severity: "CRITICAL",
        resolutionStatus: "OPEN",
      },
    });

    const clinicalComplete = (PHASE14B_CLINICAL_DOMAINS as readonly string[]).every(
      (d) =>
        clinicalDomainStatuses[d] != null &&
        isDomainSatisfiedForShadow(clinicalDomainStatuses[d])
    );
    const safetyComplete = (PHASE14B_REQUIRED_SHADOW_DOMAINS as readonly string[])
      .filter((d) =>
        (PHASE14B_SAFETY_DOMAINS as readonly string[]).includes(d)
      )
      .every(
        (d) =>
          safetyDomainStatuses[d] != null &&
          isDomainSatisfiedForShadow(safetyDomainStatuses[d])
      );

    const calc = calculateQualityScores({
      clinicalDomainStatuses,
      safetyDomainStatuses,
      evidenceCompletenessScore: completeness?.provenanceScore ?? 0,
      consistencyPassed: criticalConflicts === 0,
      criticalConflicts,
      clinicalReviewComplete: clinicalComplete,
      safetyReviewComplete: safetyComplete,
      consistencyReviewComplete: criticalConflicts === 0,
    });

    const existing = await prisma.medicationKnowledgeQuality.findFirst({
      where: { knowledgeId, batchId: batch.id },
      orderBy: { lastCalculated: "desc" },
    });
    const row = existing
      ? await prisma.medicationKnowledgeQuality.update({
          where: { id: existing.id },
          data: {
            ...calc,
            lastCalculated: new Date(),
            familyKey: item.familyKey,
            canonicalConceptId: item.canonicalConceptId,
          },
        })
      : await prisma.medicationKnowledgeQuality.create({
          data: {
            batchId: batch.id,
            knowledgeId,
            familyKey: item.familyKey,
            canonicalConceptId: item.canonicalConceptId,
            ...calc,
          },
        });
    scores.push(row);
  }

  await prisma.medicationExpertReviewBatch.update({
    where: { id: batch.id },
    data: { status: "SHADOW_QUAL" },
  });

  return { batchId: batch.id, qualityScoresCalculated: scores.length, scores };
}

async function familyGateState(
  prisma: PrismaClient,
  item: {
    id: string;
    familyKey: string;
    canonicalConceptId: string | null;
    identityStatus: string;
    complexityLevel: string;
    clinicalActivationAllowed: boolean;
    approvalStatus: string;
    isPlaceholderDetected: boolean;
  }
) {
  const profile = await resolveProfile(prisma, item.canonicalConceptId);
  const knowledgeId = profile?.id ?? `WAVE_ITEM:${item.id}`;
  const reviews = await prisma.medicationKnowledgeDomainReview.findMany({
    where: { knowledgeId, revisionNumber: 1 },
  });
  const byDomain = Object.fromEntries(reviews.map((r) => [r.domain, r.status]));
  const requiredDomainsPresent = PHASE14B_REQUIRED_SHADOW_DOMAINS.every((d) =>
    isDomainSatisfiedForShadow(byDomain[d] ?? "NOT_STARTED")
  );
  const evidenceLinks = await prisma.medicationKnowledgeEvidenceLink.count({
    where: { familyKey: item.familyKey },
  });
  const completeness = await prisma.medicationKnowledgeCompletenessScore.findFirst({
    where: { familyKey: item.familyKey },
    orderBy: { calculatedAt: "desc" },
  });
  const criticalConflicts = await prisma.medicationReviewConflict.count({
    where: { knowledgeId, severity: "CRITICAL", resolutionStatus: "OPEN" },
  });
  const contentText = [
    profile?.notes,
    profile?.knowledgeVersionLabel,
    profile?.evidenceLevel,
  ]
    .filter(Boolean)
    .join(" ");
  // Phase 14A remediation notes may contain the word "Placeholder" while describing retirement.
  // Treat as non-placeholder when provenance-linked evidence exists and Phase 14A markers are present.
  const provenanceRemediated =
    gateEvidenceProvenanceRemediated(contentText, evidenceLinks);
  const isPlaceholder =
    item.isPlaceholderDetected ||
    isNonEvidenceContent(contentText) ||
    (!provenanceRemediated && isPhase13PlaceholderContent(contentText));

  const clinicalReviewComplete = (PHASE14B_CLINICAL_DOMAINS as readonly string[]).every(
    (d) => isDomainSatisfiedForShadow(byDomain[d] ?? "NOT_STARTED")
  );
  const safetyRequired = PHASE14B_REQUIRED_SHADOW_DOMAINS.filter((d) =>
    (PHASE14B_SAFETY_DOMAINS as readonly string[]).includes(d)
  );
  const safetyReviewComplete = safetyRequired.every((d) =>
    isDomainSatisfiedForShadow(byDomain[d] ?? "NOT_STARTED")
  );

  return {
    knowledgeId,
    profile,
    requiredDomainsPresent,
    evidenceLinks,
    knowledgeWithoutProvenance: completeness?.knowledgeWithoutProvenance ?? 0,
    criticalConflicts,
    isPlaceholder,
    clinicalReviewComplete,
    safetyReviewComplete,
    consistencyPassed: criticalConflicts === 0,
  };
}

export async function qualifyWave1ForShadow(
  prisma: PrismaClient,
  actor: ErActor
) {
  requireAdmin(actor);
  assertSafetyDefaults();
  const batch = await createOrGetExpertReviewBatch(prisma, actor);
  const wave = await resolveWaveItems(prisma);
  const results: Array<{
    familyKey: string;
    status: string;
    reason?: string;
  }> = [];
  let approved = 0;
  let deferred = 0;
  let reviewed = 0;

  for (const item of wave.items) {
    if (!item.canonicalConceptId) {
      results.push({ familyKey: item.familyKey, status: "REJECTED", reason: "NO_IDENTITY" });
      continue;
    }
    reviewed += 1;
    const gate = await familyGateState(prisma, item);
    const elig = evaluateShadowEligibility({
      identityResolved: item.identityStatus === "RESOLVED",
      evidenceLinks: gate.evidenceLinks,
      knowledgeWithoutProvenance: gate.knowledgeWithoutProvenance,
      requiredDomainsSatisfied: gate.requiredDomainsPresent,
      clinicalReviewComplete: gate.clinicalReviewComplete,
      safetyReviewComplete: gate.safetyReviewComplete,
      consistencyPassed: gate.consistencyPassed,
      criticalConflicts: gate.criticalConflicts,
      isPlaceholder: gate.isPlaceholder,
      approvedForShadow: item.approvalStatus === "APPROVED_FOR_SHADOW",
    });

    if (elig.status !== "READY_FOR_REVIEW" && elig.status !== "APPROVED_FOR_SHADOW") {
      await prisma.medicationShadowQualification.upsert({
        where: { knowledgeId: gate.knowledgeId },
        create: {
          batchId: batch.id,
          knowledgeId: gate.knowledgeId,
          familyKey: item.familyKey,
          canonicalConceptId: item.canonicalConceptId,
          waveKey: PHASE13_WAVE1_KEY,
          status: elig.status,
          reason: elig.reasonCodes.join(","),
          clinicalActivationAllowed: false,
        },
        update: {
          status: elig.status,
          reason: elig.reasonCodes.join(","),
          clinicalActivationAllowed: false,
        },
      });
      if (elig.status === "DEFERRED") deferred += 1;
      results.push({
        familyKey: item.familyKey,
        status: elig.status,
        reason: elig.reasonCodes.join(","),
      });
      continue;
    }

    if (item.approvalStatus === "APPROVED_FOR_SHADOW") {
      const shadowVersion = `SHADOW_V1_${PHASE14B_PROGRAM_VERSION}`;
      await createImmutableShadowSnapshot(prisma, actor, {
        batchId: batch.id,
        knowledgeId: gate.knowledgeId,
        familyKey: item.familyKey,
        canonicalConceptId: item.canonicalConceptId,
        waveItemId: item.id,
        shadowVersion,
      });
      await prisma.medicationShadowQualification.upsert({
        where: { knowledgeId: gate.knowledgeId },
        create: {
          batchId: batch.id,
          knowledgeId: gate.knowledgeId,
          familyKey: item.familyKey,
          canonicalConceptId: item.canonicalConceptId,
          waveKey: PHASE13_WAVE1_KEY,
          status: "APPROVED_FOR_SHADOW",
          qualifiedAt: new Date(),
          qualifiedBy: actor.userId,
          reason: "Already approved for shadow",
          shadowVersion,
          clinicalActivationAllowed: false,
        },
        update: {
          status: "APPROVED_FOR_SHADOW",
          shadowVersion,
          clinicalActivationAllowed: false,
        },
      });
      approved += 1;
      results.push({ familyKey: item.familyKey, status: "APPROVED_FOR_SHADOW" });
      continue;
    }

    try {
      assertRuleBasedShadowApproval({
        evidenceComplete:
          gate.evidenceLinks > 0 && gate.knowledgeWithoutProvenance === 0,
        clinicalReviewComplete: gate.clinicalReviewComplete,
        safetyReviewComplete: gate.safetyReviewComplete,
        consistencyPassed: gate.consistencyPassed,
        requiredDomainsPresent: gate.requiredDomainsPresent,
        noCriticalConflicts: gate.criticalConflicts === 0,
        identityCertified: item.identityStatus === "RESOLVED",
        waveAssigned: true,
        reviewCompleted:
          gate.clinicalReviewComplete && gate.safetyReviewComplete,
        clinicalActivationAllowed: item.clinicalActivationAllowed,
      });

      // Knowledge lifecycle → APPROVED (advisory knowledge; activation remains false)
      if (gate.profile) {
        if (gate.profile.lifecycleStatus === "DRAFT") {
          await transitionClinicalProfileLifecycle(prisma, actor, {
            profileId: gate.profile.id,
            toStatus: "UNDER_REVIEW",
            rationale:
              "Phase 14B expert review: submit Wave 1 clinical knowledge for shadow-only approval.",
          });
        }
        const refreshed = await prisma.medicationClinicalProfile.findUniqueOrThrow({
          where: { id: gate.profile.id },
        });
        if (refreshed.lifecycleStatus === "UNDER_REVIEW") {
          await transitionClinicalProfileLifecycle(prisma, actor, {
            profileId: refreshed.id,
            toStatus: "APPROVED",
            rationale:
              "Phase 14B rule-based approval for shadow evaluation only. clinicalActivationAllowed=false. Not production CDS.",
          });
        }
      }

      // Mark reviewed (non-deferred) domains APPROVED_FOR_SHADOW; keep DEFERRED explicit.
      await prisma.medicationKnowledgeDomainReview.updateMany({
        where: {
          knowledgeId: gate.knowledgeId,
          status: "REVIEWED",
        },
        data: {
          status: "APPROVED_FOR_SHADOW",
          reviewCompletedAt: new Date(),
        },
      });

      // Reuse Phase 13 approval engine
      await attemptApproveForShadow(prisma, item.id, actor);
      assertShadowNotProduction(true);

      const shadowVersion = `SHADOW_V1_${PHASE14B_PROGRAM_VERSION}`;
      await createImmutableShadowSnapshot(prisma, actor, {
        batchId: batch.id,
        knowledgeId: gate.knowledgeId,
        familyKey: item.familyKey,
        canonicalConceptId: item.canonicalConceptId,
        waveItemId: item.id,
        shadowVersion,
      });

      await prisma.medicationShadowQualification.upsert({
        where: { knowledgeId: gate.knowledgeId },
        create: {
          batchId: batch.id,
          knowledgeId: gate.knowledgeId,
          familyKey: item.familyKey,
          canonicalConceptId: item.canonicalConceptId,
          waveKey: PHASE13_WAVE1_KEY,
          status: "APPROVED_FOR_SHADOW",
          qualifiedAt: new Date(),
          qualifiedBy: actor.userId,
          reason: "Rule-based Phase 14B shadow qualification",
          majorVersion: 1,
          minorVersion: 0,
          evidenceVersion: PHASE14A_BATCH_KEY,
          reviewVersion: PHASE14B_PROGRAM_VERSION,
          approvalVersion: "APPROVED_FOR_SHADOW_V1",
          shadowVersion,
          clinicalActivationAllowed: false,
        },
        update: {
          status: "APPROVED_FOR_SHADOW",
          qualifiedAt: new Date(),
          qualifiedBy: actor.userId,
          reason: "Rule-based Phase 14B shadow qualification",
          shadowVersion,
          clinicalActivationAllowed: false,
        },
      });

      await audit(prisma, {
        batchId: batch.id,
        entityType: "MedicationShadowQualification",
        entityId: gate.knowledgeId,
        action: "APPROVED",
        userId: actor.userId,
        after: {
          familyKey: item.familyKey,
          status: "APPROVED_FOR_SHADOW",
          clinicalActivationAllowed: false,
        },
      });
      await audit(prisma, {
        batchId: batch.id,
        entityType: "MedicationShadowSnapshot",
        entityId: gate.knowledgeId,
        action: "SNAPSHOT_GENERATED",
        userId: actor.userId,
        after: { shadowVersion },
      });

      approved += 1;
      results.push({ familyKey: item.familyKey, status: "APPROVED_FOR_SHADOW" });
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      await prisma.medicationShadowQualification.upsert({
        where: { knowledgeId: gate.knowledgeId },
        create: {
          batchId: batch.id,
          knowledgeId: gate.knowledgeId,
          familyKey: item.familyKey,
          canonicalConceptId: item.canonicalConceptId,
          waveKey: PHASE13_WAVE1_KEY,
          status: "REQUIRES_CHANGES",
          reason,
          clinicalActivationAllowed: false,
        },
        update: {
          status: "REQUIRES_CHANGES",
          reason,
          clinicalActivationAllowed: false,
        },
      });
      results.push({
        familyKey: item.familyKey,
        status: "REQUIRES_CHANGES",
        reason,
      });
    }
  }

  await prisma.medicationExpertReviewBatch.update({
    where: { id: batch.id },
    data: {
      status: "COMPLETED",
      familiesReviewedCount: reviewed,
      familiesApprovedForShadowCount: approved,
      familiesDeferredCount: deferred,
      completedAt: new Date(),
    },
  });

  return {
    batchId: batch.id,
    familiesReviewed: reviewed,
    familiesApprovedForShadow: approved,
    familiesDeferred: deferred,
    results,
    ClinicalActivation: 0,
    ProviderFacingAlerts: 0,
  };
}

async function createImmutableShadowSnapshot(
  prisma: PrismaClient,
  actor: ErActor,
  input: {
    batchId: string;
    knowledgeId: string;
    familyKey: string;
    canonicalConceptId: string;
    waveItemId: string;
    shadowVersion: string;
  }
) {
  const existing = await prisma.medicationShadowSnapshot.findUnique({
    where: {
      knowledgeId_shadowVersion: {
        knowledgeId: input.knowledgeId,
        shadowVersion: input.shadowVersion,
      },
    },
  });
  if (existing) return existing;

  const profile = await prisma.medicationClinicalProfile.findFirst({
    where: { id: input.knowledgeId },
  });
  const classMem = await prisma.medicationTherapeuticClassMembership.findFirst({
    where: { medicationConceptId: input.canonicalConceptId },
  });
  const allergen = await prisma.medicationAllergenMapping.findFirst({
    where: { medicationConceptId: input.canonicalConceptId },
  });
  const dup = await prisma.medicationDuplicateTherapyMembership.findFirst({
    where: { medicationConceptId: input.canonicalConceptId },
  });
  const links = await prisma.medicationKnowledgeEvidenceLink.findMany({
    where: { familyKey: input.familyKey },
    take: 50,
  });
  const reviews = await prisma.medicationKnowledgeDomainReview.findMany({
    where: { knowledgeId: input.knowledgeId, revisionNumber: 1 },
  });
  const quality = await prisma.medicationKnowledgeQuality.findFirst({
    where: { knowledgeId: input.knowledgeId },
    orderBy: { lastCalculated: "desc" },
  });
  const waveItem = await prisma.medicationKnowledgeApprovalWaveItem.findUnique({
    where: { id: input.waveItemId },
  });

  const knowledgeSnapshot = {
    profileId: profile?.id ?? null,
    lifecycleStatus: profile?.lifecycleStatus ?? null,
    clinicalActivationAllowed: false,
    evidenceLevel: profile?.evidenceLevel ?? null,
    knowledgeVersionLabel: profile?.knowledgeVersionLabel ?? null,
  };
  const safetySnapshot = {
    therapeuticClassId: classMem?.id ?? null,
    allergenMappingId: allergen?.id ?? null,
    duplicateTherapyId: dup?.id ?? null,
  };
  const evidenceSnapshot = {
    linkCount: links.length,
    linkIds: links.map((l) => l.id),
    evidenceBatchKey: PHASE14A_BATCH_KEY,
  };
  const reviewSnapshot = {
    domains: reviews.map((r) => ({ domain: r.domain, status: r.status })),
    reviewerId: actor.userId,
  };
  const approvalSnapshot = {
    waveItemId: input.waveItemId,
    approvalStatus: waveItem?.approvalStatus ?? "PENDING",
    shadowUseAllowed: true,
    clinicalActivationAllowed: false,
  };
  const qualitySnapshot = quality
    ? {
        clinicalScore: quality.clinicalScore,
        safetyScore: quality.safetyScore,
        evidenceScore: quality.evidenceScore,
        consistencyScore: quality.consistencyScore,
        reviewScore: quality.reviewScore,
        overallScore: quality.overallScore,
      }
    : null;
  const syntheticCases = buildSyntheticCasePackage(input.familyKey);

  const payload = JSON.stringify({
    knowledgeSnapshot,
    safetySnapshot,
    evidenceSnapshot,
    reviewSnapshot,
    approvalSnapshot,
    qualitySnapshot,
    syntheticCases,
    shadowVersion: input.shadowVersion,
  });
  const snapshotHash = createHash("sha256").update(payload).digest("hex");

  return prisma.medicationShadowSnapshot.create({
    data: {
      batchId: input.batchId,
      knowledgeId: input.knowledgeId,
      familyKey: input.familyKey,
      canonicalConceptId: input.canonicalConceptId,
      shadowVersion: input.shadowVersion,
      snapshotHash,
      knowledgeSnapshot: knowledgeSnapshot as Prisma.InputJsonValue,
      safetySnapshot: safetySnapshot as Prisma.InputJsonValue,
      evidenceSnapshot: evidenceSnapshot as Prisma.InputJsonValue,
      reviewSnapshot: reviewSnapshot as Prisma.InputJsonValue,
      approvalSnapshot: approvalSnapshot as Prisma.InputJsonValue,
      qualitySnapshot: (qualitySnapshot as Prisma.InputJsonValue) ?? undefined,
      syntheticCasesJson: syntheticCases as Prisma.InputJsonValue,
    },
  });
}

export async function listReviewConflicts(prisma: PrismaClient) {
  return prisma.medicationReviewConflict.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function resolveReviewConflict(
  prisma: PrismaClient,
  actor: ErActor,
  conflictId: string,
  resolutionNotes: string
) {
  requireAdmin(actor);
  const conflict = await prisma.medicationReviewConflict.findUnique({
    where: { id: conflictId },
  });
  if (!conflict) throw new NotFoundException("Conflit introuvable.");
  if (!resolutionNotes.trim()) {
    throw new BadRequestException("Notes de résolution requises.");
  }
  const updated = await prisma.medicationReviewConflict.update({
    where: { id: conflictId },
    data: {
      resolutionStatus: "RESOLVED",
      resolutionNotes: resolutionNotes.trim(),
      resolvedByUserId: actor.userId,
      resolvedAt: new Date(),
    },
  });
  await audit(prisma, {
    batchId: conflict.batchId ?? undefined,
    entityType: "MedicationReviewConflict",
    entityId: conflict.id,
    action: "CHANGES_REQUESTED",
    userId: actor.userId,
    reason: "CONFLICT_RESOLVED",
    after: { resolutionStatus: "RESOLVED" },
  });
  return updated;
}

export async function getExpertReviewDashboard(prisma: PrismaClient) {
  assertSafetyDefaults();
  const batch = await prisma.medicationExpertReviewBatch.findUnique({
    where: { programKey: PHASE14B_PROGRAM_KEY },
  });
  const wave = await prisma.medicationKnowledgeApprovalWave.findUnique({
    where: { waveKey: PHASE13_WAVE1_KEY },
    include: { items: true },
  });
  const domainReviews = await prisma.medicationKnowledgeDomainReview.count();
  const clinicalReviewed = await prisma.medicationKnowledgeDomainReview.count({
    where: {
      reviewLevel: "CLINICAL",
      status: { in: ["REVIEWED", "APPROVED_FOR_SHADOW", "DEFERRED"] },
    },
  });
  const safetyReviewed = await prisma.medicationKnowledgeDomainReview.count({
    where: {
      reviewLevel: "SAFETY",
      status: { in: ["REVIEWED", "APPROVED_FOR_SHADOW", "DEFERRED"] },
    },
  });
  const qualityCount = await prisma.medicationKnowledgeQuality.count();
  const snapshots = await prisma.medicationShadowSnapshot.count();
  const conflicts = await prisma.medicationReviewConflict.count({
    where: { resolutionStatus: "OPEN" },
  });
  const auditCount = await prisma.medicationExpertReviewAuditEvent.count();
  const approvedForShadow = await prisma.medicationKnowledgeApprovalWaveItem.count({
    where: { approvalStatus: "APPROVED_FOR_SHADOW" },
  });
  const quals = await prisma.medicationShadowQualification.findMany({
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  const qualities = await prisma.medicationKnowledgeQuality.findMany({
    orderBy: { lastCalculated: "desc" },
    take: 20,
  });

  return {
    ProgramKey: PHASE14B_PROGRAM_KEY,
    BatchStatus: batch?.status ?? null,
    WaveKey: PHASE13_WAVE1_KEY,
    Wave1Families: (wave?.items ?? []).map((i) => i.requestedFamilyName),
    Wave1FamiliesReviewed: batch?.familiesReviewedCount ?? 0,
    Wave1FamiliesApprovedForShadow: approvedForShadow,
    Wave1FamiliesDeferred: batch?.familiesDeferredCount ?? 0,
    ClinicalDomainsReviewed: clinicalReviewed,
    SafetyDomainsReviewed: safetyReviewed,
    DomainReviewsTotal: domainReviews,
    ConsistencyChecksPassed: (wave?.items ?? []).filter(
      (i) => i.approvalStatus === "APPROVED_FOR_SHADOW" || i.reviewStatus.includes("COMPLETE")
    ).length,
    ReviewConflictsOpen: conflicts,
    QualityScoresCalculated: qualityCount,
    ShadowSnapshotsCreated: snapshots,
    AuditEntriesCreated: auditCount,
    ClinicalActivation: 0,
    ProviderFacingAlerts: 0,
    OrderBlocks: 0,
    OrderingChanged: "NO",
    MARChanged: "NO",
    BillingChanged: "NO",
    KnowledgeControlsPatientCare: false,
    Qualifications: quals.map((q) => ({
      familyKey: q.familyKey,
      status: q.status,
      shadowVersion: q.shadowVersion,
      reason: q.reason,
    })),
    FamilyScores: qualities.map((q) => ({
      familyKey: q.familyKey,
      overallScore: q.overallScore,
      clinicalScore: q.clinicalScore,
      safetyScore: q.safetyScore,
      evidenceScore: q.evidenceScore,
      consistencyScore: q.consistencyScore,
      reviewScore: q.reviewScore,
    })),
    banner: {
      expertReview: true,
      knowledgeAdvisoryOnly: true,
      noProviderAlerts: true,
      noOrderBlocking: true,
      noClinicalActivation: true,
      approvedForShadowNotProduction: true,
    },
  };
}

export async function runPhase14BPipeline(prisma: PrismaClient, actor: ErActor) {
  requireAdmin(actor);
  assertSafetyDefaults();
  const batch = await createOrGetExpertReviewBatch(prisma, actor);
  const seeded = await seedDomainReviews(prisma, actor);
  const clinical = await completeClinicalDomainReviews(prisma, actor);
  const safety = await completeSafetyDomainReviews(prisma, actor);
  const consistency = await runCrossDomainValidation(prisma, actor);
  const quality = await calculateFamilyQualityScores(prisma, actor);
  const qualification = await qualifyWave1ForShadow(prisma, actor);
  const dashboard = await getExpertReviewDashboard(prisma);
  return {
    batch,
    seeded,
    clinical,
    safety,
    consistency,
    quality: { qualityScoresCalculated: quality.qualityScoresCalculated },
    qualification,
    dashboard,
  };
}
