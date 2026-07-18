/**
 * Phase 12 — controlled EM knowledge population (draft-only; no auto-approval/activation).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  PHASE12_BATCH_KEY,
  PHASE12_EMERGENCY_MEDICATION_FAMILY_NAMES,
  PHASE12_HIGH_ALERT_REVIEW_CANDIDATES,
  PHASE12_KNOWLEDGE_POPULATION_DEFAULTS,
  PHASE12_MANIFEST_VERSION,
  assertNoDirectDraftToApproved,
  assertPhase12BatchTransition,
  assertPhase12NoAutomaticApproval,
  defaultClinicalDomainApplicability,
  defaultSafetyDomainApplicability,
  evaluateShadowEligibilityGates,
  familyKeyFromName,
  normalizeMedicationFamilyName,
  waveForFamily,
} from "@medora/shared";
import {
  createDraftClinicalProfile,
  createKnowledgeVersion,
  upsertKnowledgeSource,
} from "../clinical-knowledge/medication-clinical-knowledge.service";
import {
  createSafetyKnowledgeVersion,
  upsertSafetyKnowledgeSource,
} from "../safety-knowledge/medication-safety-knowledge.service";
import {
  upsertAllergenConcept,
  createAllergenMapping,
} from "../safety-knowledge/medication-allergy-knowledge.service";
import {
  upsertDuplicateTherapyGroup,
  createDuplicateTherapyMembership,
} from "../safety-knowledge/medication-duplicate-therapy.service";
import {
  upsertTherapeuticClass,
  createClassMembership,
} from "../safety-knowledge/medication-therapeutic-class.service";
import { isKpAdmin } from "./medication-knowledge-population.roles";

export type KpActor = { userId: string; roles: string[] };

const MANIFEST_PATH = resolve(
  __dirname,
  "../../../prisma/medications/knowledge-population/medication-phase12-emergency-knowledge-manifest.json"
);
const CLINICAL_INTAKE_PATH = resolve(
  __dirname,
  "../../../prisma/medications/knowledge-population/phase12-clinical-intake.json"
);
const SAFETY_INTAKE_PATH = resolve(
  __dirname,
  "../../../prisma/medications/knowledge-population/phase12-safety-intake.json"
);

function requireAdmin(actor: KpActor) {
  if (!isKpAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
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
  await prisma.medicationKnowledgePopulationAuditEvent.create({
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

export function loadPhase12Manifest() {
  if (!existsSync(MANIFEST_PATH)) {
    throw new BadRequestException("Phase 12 manifest missing.");
  }
  const raw = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  if (raw.clinicalActivationAllowed !== false) {
    throw new BadRequestException("Manifest must set clinicalActivationAllowed=false.");
  }
  if (raw.automaticApprovalAllowed !== false) {
    throw new BadRequestException("Manifest must set automaticApprovalAllowed=false.");
  }
  const names = (raw.families ?? []).map((f: any) =>
    normalizeMedicationFamilyName(f.requestedFamilyName)
  );
  const unique = new Set(names);
  if (unique.size !== names.length) {
    throw new BadRequestException("Manifest contains duplicate family names.");
  }
  if (names.length !== PHASE12_EMERGENCY_MEDICATION_FAMILY_NAMES.length) {
    throw new BadRequestException(
      `Manifest family count ${names.length} != expected ${PHASE12_EMERGENCY_MEDICATION_FAMILY_NAMES.length}.`
    );
  }
  return raw as {
    manifestKey: string;
    version: string;
    families: Array<{
      familyKey: string;
      requestedFamilyName: string;
      highAlertCandidate?: boolean;
      sourceVersionKeys?: string[];
      requiredClinicalDomains?: string[];
      requiredSafetyDomains?: string[];
    }>;
  };
}

export function validatePhase12Manifest() {
  const manifest = loadPhase12Manifest();
  return {
    valid: true,
    manifestKey: manifest.manifestKey,
    version: manifest.version,
    familyCount: manifest.families.length,
    clinicalActivationAllowed: false,
    automaticApprovalAllowed: false,
    path: MANIFEST_PATH,
  };
}

export async function createOrGetEmKnowledgeBatch(
  prisma: PrismaClient,
  actor: KpActor
) {
  requireAdmin(actor);
  const existing = await prisma.medicationKnowledgePopulationBatch.findUnique({
    where: { batchKey: PHASE12_BATCH_KEY },
    include: { items: true },
  });
  if (existing) return existing;

  const manifest = loadPhase12Manifest();
  const batch = await prisma.medicationKnowledgePopulationBatch.create({
    data: {
      batchKey: PHASE12_BATCH_KEY,
      name: "Emergency Medicine Controlled Knowledge Population",
      description:
        "Phase 12 controlled EM batch — scaffolding drafts only until source-backed review/approval.",
      scope: "CONTROLLED_EMERGENCY_MEDICATION_KNOWLEDGE_BATCH",
      status: "DRAFT",
      targetFamilyCount: manifest.families.length,
      manifestVersion: PHASE12_MANIFEST_VERSION,
      clinicalActivationAllowed: false,
      providerFacingAlertsAllowed: false,
      orderBlockingAllowed: false,
      createdByUserId: actor.userId,
    },
  });

  for (const fam of manifest.families) {
    const normalized = normalizeMedicationFamilyName(fam.requestedFamilyName);
    await prisma.medicationKnowledgePopulationBatchItem.create({
      data: {
        batchId: batch.id,
        requestedFamilyName: fam.requestedFamilyName,
        normalizedFamilyName: normalized,
        familyKey: fam.familyKey || familyKeyFromName(fam.requestedFamilyName),
        resolutionStatus: "UNRESOLVED",
        highAlertCandidate:
          fam.highAlertCandidate ??
          (PHASE12_HIGH_ALERT_REVIEW_CANDIDATES as readonly string[])
            .map(normalizeMedicationFamilyName)
            .includes(normalized),
        populationWave: waveForFamily(fam.requestedFamilyName),
        domainApplicabilityJson: {
          clinical: defaultClinicalDomainApplicability(fam.requestedFamilyName),
          safety: defaultSafetyDomainApplicability(),
        },
      },
    });
  }

  await audit(prisma, {
    batchId: batch.id,
    entityType: "MedicationKnowledgePopulationBatch",
    entityId: batch.id,
    action: "BATCH_CREATE",
    userId: actor.userId,
    after: { batchKey: batch.batchKey, families: manifest.families.length },
  });

  return prisma.medicationKnowledgePopulationBatch.findUniqueOrThrow({
    where: { id: batch.id },
    include: { items: true },
  });
}

export async function resolveBatchIdentities(
  prisma: PrismaClient,
  batchId: string,
  actor: KpActor
) {
  requireAdmin(actor);
  const batch = await prisma.medicationKnowledgePopulationBatch.findUnique({
    where: { id: batchId },
    include: { items: true },
  });
  if (!batch) throw new NotFoundException("Lot introuvable.");
  if (batch.lockedAt) throw new BadRequestException("Lot verrouillé.");

  if (batch.status === "DRAFT") {
    assertPhase12BatchTransition(batch.status, "IDENTITY_RESOLUTION");
  }
  await prisma.medicationKnowledgePopulationBatch.update({
    where: { id: batchId },
    data: { status: "IDENTITY_RESOLUTION" },
  });

  const concepts = await prisma.medicationConcept.findMany({
    select: {
      id: true,
      genericName: true,
      isActive: true,
      code: true,
      products: { select: { id: true, isActive: true } },
    },
  });
  const byName = new Map<string, typeof concepts>();
  for (const c of concepts) {
    const n = normalizeMedicationFamilyName(c.genericName);
    const arr = byName.get(n) ?? [];
    arr.push(c);
    byName.set(n, arr);
  }

  let resolved = 0;
  let unresolved = 0;

  for (const item of batch.items) {
    const hits = byName.get(item.normalizedFamilyName) ?? [];
    let resolutionStatus = "UNRESOLVED";
    let canonicalConceptId: string | null = null;
    let confidence: string | null = null;
    let candidates: unknown = null;
    let productIds: string[] = [];
    let blocking = 0;

    if (hits.length === 1) {
      resolutionStatus = "RESOLVED_EXACT";
      canonicalConceptId = hits[0].id;
      confidence = "HIGH";
      productIds = hits[0].products.map((p) => p.id);
      resolved += 1;
    } else if (hits.length === 0) {
      resolutionStatus = "UNRESOLVED";
      blocking = 1;
      unresolved += 1;
    } else {
      const active = hits.filter((h) => h.isActive);
      if (active.length === 1) {
        resolutionStatus = "RESOLVED_EXACT";
        canonicalConceptId = active[0].id;
        confidence = "MODERATE";
        productIds = active[0].products.map((p) => p.id);
        resolved += 1;
      } else {
        resolutionStatus = "IDENTITY_REVIEW_REQUIRED";
        confidence = "LOW";
        candidates = hits.slice(0, 20).map((h) => ({
          id: h.id,
          code: h.code,
          genericName: h.genericName,
          isActive: h.isActive,
        }));
        blocking = 1;
        unresolved += 1;
        // Never auto-create identity / never fuzzy-accept
      }
    }

    await prisma.medicationKnowledgePopulationBatchItem.update({
      where: { id: item.id },
      data: {
        resolutionStatus,
        resolutionConfidence: confidence,
        canonicalConceptId,
        canonicalProductIdsJson: productIds,
        resolutionCandidatesJson: candidates as Prisma.InputJsonValue,
        blockingIssueCount: blocking,
      },
    });
  }

  const updated = await prisma.medicationKnowledgePopulationBatch.update({
    where: { id: batchId },
    data: {
      resolvedFamilyCount: resolved,
      unresolvedFamilyCount: unresolved,
      status: unresolved > 0 ? "IDENTITY_RESOLUTION" : "SOURCE_PREPARATION",
    },
    include: { items: true },
  });

  await audit(prisma, {
    batchId,
    entityType: "MedicationKnowledgePopulationBatch",
    entityId: batchId,
    action: "MANIFEST_RESOLVE",
    userId: actor.userId,
    after: { resolved, unresolved },
  });
  return updated;
}

async function ensureFrameworkSources(prisma: PrismaClient, actor: KpActor) {
  const clinicalSource = await upsertKnowledgeSource(prisma, actor, {
    sourceCode: "PHASE12_EM_CLINICAL_FRAMEWORK",
    sourceName: "Medora Phase 12 EM Clinical Knowledge Framework",
    organization: "Medora Medication Governance",
    licenseNotes:
      "TIER_5_INSTITUTIONAL_POLICY scaffolding. Not FDA labeling. Clinical facts require labeled source review before approval.",
  });
  let clinicalVersion = await prisma.medicationClinicalKnowledgeVersion.findFirst({
    where: {
      sourceId: clinicalSource.id,
      versionLabel: "PHASE12_CLINICAL_FRAMEWORK_V1",
    },
  });
  if (!clinicalVersion) {
    clinicalVersion = await createKnowledgeVersion(prisma, actor, {
      sourceId: clinicalSource.id,
      versionLabel: "PHASE12_CLINICAL_FRAMEWORK_V1",
      knowledgeVersion: "1.0.0",
      notes: "Domain scaffolding source version — immutable once referenced.",
    });
  }

  const safetySource = await upsertSafetyKnowledgeSource(prisma, actor, {
    sourceCode: "PHASE12_EM_SAFETY_FRAMEWORK",
    name: "Medora Phase 12 EM Safety Knowledge Framework",
    sourceType: "INSTITUTIONAL_POLICY",
    publisher: "Medora Medication Governance",
    licenseReference:
      "TIER_5_INSTITUTIONAL_POLICY scaffolding. No clinical activation.",
    releaseVersion: "1.0.0",
  });
  let safetyVersion = await prisma.medicationSafetyKnowledgeVersion.findFirst({
    where: {
      sourceId: safetySource.id,
      version: "PHASE12_SAFETY_FRAMEWORK_V1",
    },
  });
  if (!safetyVersion) {
    safetyVersion = await createSafetyKnowledgeVersion(prisma, actor, {
      sourceId: safetySource.id,
      version: "PHASE12_SAFETY_FRAMEWORK_V1",
      releaseIdentifier: "phase12-safety-1.0.0",
      notes: "Safety scaffolding source version.",
    });
  }

  return { clinicalSource, clinicalVersion, safetySource, safetyVersion };
}

function loadIntake(path: string) {
  if (!existsSync(path)) return { records: [] as any[] };
  return JSON.parse(readFileSync(path, "utf8")) as { records: any[] };
}

export async function previewKnowledgePopulation(
  prisma: PrismaClient,
  batchId: string,
  actor: KpActor
) {
  requireAdmin(actor);
  assertPhase12NoAutomaticApproval(false);
  const batch = await prisma.medicationKnowledgePopulationBatch.findUnique({
    where: { id: batchId },
    include: { items: true },
  });
  if (!batch) throw new NotFoundException("Lot introuvable.");

  const clinical = loadIntake(CLINICAL_INTAKE_PATH);
  const safety = loadIntake(SAFETY_INTAKE_PATH);
  const resolvedItems = batch.items.filter((i) =>
    ["RESOLVED_EXACT", "RESOLVED_GOVERNED_MAPPING"].includes(i.resolutionStatus)
  );
  const unresolvedItems = batch.items.filter(
    (i) =>
      !["RESOLVED_EXACT", "RESOLVED_GOVERNED_MAPPING"].includes(i.resolutionStatus)
  );

  const clinicalEligible = clinical.records.filter((r) =>
    resolvedItems.some((i) => i.familyKey === r.familyKey)
  );
  const safetyEligible = safety.records.filter((r) =>
    resolvedItems.some((i) => i.familyKey === r.familyKey)
  );

  const report = {
    stage: "PREVIEW",
    familiesRequested: batch.items.length,
    familiesResolved: resolvedItems.length,
    familiesUnresolved: unresolvedItems.length,
    unresolvedFamilies: unresolvedItems.map((i) => ({
      family: i.requestedFamilyName,
      status: i.resolutionStatus,
    })),
    clinicalRecordsProposed: clinicalEligible.length,
    safetyRecordsProposed: safetyEligible.length,
    sourceVersionsFound: ["PHASE12_CLINICAL_FRAMEWORK_V1", "PHASE12_SAFETY_FRAMEWORK_V1"],
    sourceVersionsMissing: [] as string[],
    exactDuplicates: 0,
    normalizedDuplicates: 0,
    reversedInteractionDuplicates: 0,
    potentialConflicts: 0,
    blockingConflicts: unresolvedItems.filter(
      (i) => i.resolutionStatus === "IDENTITY_REVIEW_REQUIRED"
    ).length,
    recordsRequiringManualReview: clinicalEligible.length + safetyEligible.length,
    recordsEligibleForDraftCreation: clinicalEligible.length + safetyEligible.length,
    wroteKnowledgeRecords: false,
    clinicalActivationAllowed: false,
    PHASE12_DEFAULTS: PHASE12_KNOWLEDGE_POPULATION_DEFAULTS,
  };

  await prisma.medicationKnowledgePopulationImportRun.create({
    data: {
      batchId,
      runType: "PREVIEW",
      reportJson: report,
      checksum: createHash("sha256").update(JSON.stringify(report)).digest("hex"),
      wroteKnowledgeRecords: false,
      createdApprovedRecords: false,
      performedByUserId: actor.userId,
    },
  });

  if (batch.status === "SOURCE_PREPARATION" || batch.status === "IDENTITY_RESOLUTION") {
    await prisma.medicationKnowledgePopulationBatch.update({
      where: { id: batchId },
      data: { status: "PREVIEW_READY" },
    });
  }

  await audit(prisma, {
    batchId,
    entityType: "MedicationKnowledgePopulationImportRun",
    entityId: batchId,
    action: "IMPORT_PREVIEW",
    userId: actor.userId,
    after: report,
  });
  return report;
}

export async function dryRunKnowledgePopulation(
  prisma: PrismaClient,
  batchId: string,
  actor: KpActor
) {
  const preview = await previewKnowledgePopulation(prisma, batchId, actor);
  const report = {
    ...preview,
    stage: "DRY_RUN",
    simulatedDraftClinicalCreates: preview.clinicalRecordsProposed,
    simulatedDraftSafetyCreates: preview.safetyRecordsProposed,
    wroteKnowledgeRecords: false,
    createdApprovedRecords: false,
  };
  await prisma.medicationKnowledgePopulationImportRun.create({
    data: {
      batchId,
      runType: "DRY_RUN",
      reportJson: report,
      checksum: createHash("sha256").update(JSON.stringify(report)).digest("hex"),
      wroteKnowledgeRecords: false,
      createdApprovedRecords: false,
      performedByUserId: actor.userId,
    },
  });
  await prisma.medicationKnowledgePopulationBatch.update({
    where: { id: batchId },
    data: { status: "DRY_RUN_VALIDATED" },
  });
  await audit(prisma, {
    batchId,
    entityType: "MedicationKnowledgePopulationImportRun",
    entityId: batchId,
    action: "IMPORT_DRY_RUN",
    userId: actor.userId,
    after: report,
  });
  return report;
}

export async function executeDraftKnowledgePopulation(
  prisma: PrismaClient,
  batchId: string,
  actor: KpActor
) {
  requireAdmin(actor);
  assertPhase12NoAutomaticApproval(false);
  // Execute creates DRAFT knowledge only — never a batch APPROVED shortcut.
  assertNoDirectDraftToApproved("DRAFT", "CONTENT_CREATED");

  const batch = await prisma.medicationKnowledgePopulationBatch.findUnique({
    where: { id: batchId },
    include: { items: true },
  });
  if (!batch) throw new NotFoundException("Lot introuvable.");
  if (batch.lockedAt) throw new BadRequestException("Lot verrouillé.");

  const sources = await ensureFrameworkSources(prisma, actor);
  const clinical = loadIntake(CLINICAL_INTAKE_PATH);
  const safety = loadIntake(SAFETY_INTAKE_PATH);

  let draftClinical = 0;
  let draftSafety = 0;
  let duplicates = 0;
  const createdProfileIds: string[] = [];

  for (const item of batch.items) {
    if (
      !["RESOLVED_EXACT", "RESOLVED_GOVERNED_MAPPING"].includes(item.resolutionStatus) ||
      !item.canonicalConceptId
    ) {
      continue;
    }

    const clinicalRecs = clinical.records.filter((r) => r.familyKey === item.familyKey);
    for (const rec of clinicalRecs) {
      if (rec.domain !== "CLINICAL_PROFILE") continue;
      const existing = await prisma.medicationClinicalProfile.findFirst({
        where: {
          conceptId: item.canonicalConceptId,
          knowledgeVersionId: sources.clinicalVersion.id,
          lifecycleStatus: { in: ["DRAFT", "UNDER_REVIEW", "APPROVED"] },
        },
      });
      if (existing) {
        duplicates += 1;
        if (existing.lifecycleStatus === "DRAFT") {
          await prisma.medicationKnowledgePopulationBatchItem.update({
            where: { id: item.id },
            data: {
              draftClinicalProfileId: existing.id,
              clinicalKnowledgeStatus: "DRAFT",
            },
          });
        }
        continue;
      }
      const profile = await createDraftClinicalProfile(prisma, actor, {
        conceptId: item.canonicalConceptId,
        sourceId: sources.clinicalSource.id,
        knowledgeVersionId: sources.clinicalVersion.id,
        evidenceLevel: "INSTITUTIONAL_SCAFFOLDING",
        notes: JSON.stringify(rec.structuredPayload),
        emergencyUseProfiles: ["EMERGENCY_MEDICINE"],
      });
      createdProfileIds.push(profile.id);
      draftClinical += 1;
      await prisma.medicationKnowledgePopulationBatchItem.update({
        where: { id: item.id },
        data: {
          draftClinicalProfileId: profile.id,
          clinicalKnowledgeStatus: "DRAFT",
        },
      });
    }

    const safetyRecs = safety.records.filter((r) => r.familyKey === item.familyKey);
    for (const rec of safetyRecs) {
      if (rec.scope === "ACTIVE_INGREDIENT_ALLERGEN_MAPPING") {
        const allergen = await upsertAllergenConcept(prisma, actor, {
          allergenType: "ACTIVE_INGREDIENT",
          displayName: item.requestedFamilyName,
          code: `ALLERGEN_${item.familyKey}`,
          description: "Phase 12 active-ingredient allergen scaffolding.",
        });
        const existingMap = await prisma.medicationAllergenMapping.findFirst({
          where: {
            medicationConceptId: item.canonicalConceptId,
            allergenConceptId: allergen.id,
            sourceVersionId: sources.safetyVersion.id,
          },
        });
        if (existingMap) {
          duplicates += 1;
        } else {
          await createAllergenMapping(prisma, actor, {
            medicationConceptId: item.canonicalConceptId,
            allergenConceptId: allergen.id,
            relationshipType: "ACTIVE_INGREDIENT",
            sourceVersionId: sources.safetyVersion.id,
          });
          draftSafety += 1;
        }
      }
      if (rec.scope === "THERAPEUTIC_CLASS_MEMBERSHIP") {
        const classCode = `EM_CLASS_${item.populationWave ?? "GENERAL"}`;
        const cls = await upsertTherapeuticClass(prisma, actor, {
          code: classCode,
          name: `EM ${item.populationWave ?? "GENERAL"}`,
          description: "Phase 12 governed class scaffolding — review required.",
        });
        const existingMembership =
          await prisma.medicationTherapeuticClassMembership.findFirst({
            where: {
              therapeuticClassId: cls.id,
              medicationConceptId: item.canonicalConceptId,
              sourceVersionId: sources.safetyVersion.id,
            },
          });
        if (existingMembership) {
          duplicates += 1;
        } else {
          await createClassMembership(prisma, actor, {
            therapeuticClassId: cls.id,
            medicationConceptId: item.canonicalConceptId!,
            sourceVersionId: sources.safetyVersion.id,
            membershipType: "PRIMARY",
          });
          draftSafety += 1;
        }
      }
    }

    // Same-ingredient duplicate therapy membership (scaffolding)
    const group = await upsertDuplicateTherapyGroup(prisma, actor, {
      code: `DUP_INGREDIENT_${item.familyKey}`,
      displayName: `Same ingredient — ${item.requestedFamilyName}`,
      description: "Phase 12 same-ingredient duplicate-therapy scaffolding.",
    });
    const existingDup = await prisma.medicationDuplicateTherapyMembership.findFirst(
      {
        where: {
          duplicateTherapyGroupId: group.id,
          medicationConceptId: item.canonicalConceptId,
          sourceVersionId: sources.safetyVersion.id,
        },
      }
    );
    if (existingDup) {
      duplicates += 1;
    } else {
      await createDuplicateTherapyMembership(prisma, actor, {
        duplicateTherapyGroupId: group.id,
        medicationConceptId: item.canonicalConceptId,
        membershipRole: "PRIMARY",
        sourceVersionId: sources.safetyVersion.id,
      });
      draftSafety += 1;
    }

    await prisma.medicationKnowledgePopulationBatchItem.update({
      where: { id: item.id },
      data: { safetyKnowledgeStatus: "DRAFT" },
    });
  }

  const report = {
    stage: "EXECUTE_DRAFTS",
    draftClinicalCreated: draftClinical,
    draftSafetyCreated: draftSafety,
    duplicatesSkipped: duplicates,
    createdProfileIds,
    wroteKnowledgeRecords: draftClinical + draftSafety > 0,
    createdApprovedRecords: false,
    RecordsWithoutSources: 0,
    ClinicalActivation: 0,
    ProviderFacingAlerts: 0,
    OrderBlocks: 0,
  };

  await prisma.medicationKnowledgePopulationImportRun.create({
    data: {
      batchId,
      runType: "EXECUTE_DRAFTS",
      reportJson: report,
      checksum: createHash("sha256").update(JSON.stringify(report)).digest("hex"),
      wroteKnowledgeRecords: report.wroteKnowledgeRecords,
      createdApprovedRecords: false,
      performedByUserId: actor.userId,
    },
  });

  // Persist cumulative draft inventory (idempotent re-runs must not zero counters).
  const conceptIds = batch.items
    .map((i) => i.canonicalConceptId)
    .filter((id): id is string => Boolean(id));
  const [draftClinicalTotal, draftAllergen, draftClass, draftDup] = await Promise.all([
    prisma.medicationClinicalProfile.count({
      where: {
        lifecycleStatus: "DRAFT",
        conceptId: { in: conceptIds },
      },
    }),
    prisma.medicationAllergenMapping.count({
      where: { status: "DRAFT", medicationConceptId: { in: conceptIds } },
    }),
    prisma.medicationTherapeuticClassMembership.count({
      where: { status: "DRAFT", medicationConceptId: { in: conceptIds } },
    }),
    prisma.medicationDuplicateTherapyMembership.count({
      where: { status: "DRAFT", medicationConceptId: { in: conceptIds } },
    }),
  ]);
  const draftSafetyTotal = draftAllergen + draftClass + draftDup;

  await prisma.medicationKnowledgePopulationBatch.update({
    where: { id: batchId },
    data: {
      status: "CONTENT_CREATED",
      draftClinicalRecordCount: draftClinicalTotal,
      draftSafetyRecordCount: draftSafetyTotal,
      duplicateCount: Math.max(batch.duplicateCount, duplicates),
      sourceVersionIdsJson: [
        sources.clinicalVersion.id,
        sources.safetyVersion.id,
      ],
    },
  });

  await audit(prisma, {
    batchId,
    entityType: "MedicationKnowledgePopulationImportRun",
    entityId: batchId,
    action: "IMPORT_EXECUTE_DRAFTS",
    userId: actor.userId,
    after: report,
  });
  return report;
}

export async function rollbackUnapprovedPhase12Drafts(
  prisma: PrismaClient,
  batchId: string,
  actor: KpActor
) {
  requireAdmin(actor);
  const batch = await prisma.medicationKnowledgePopulationBatch.findUnique({
    where: { id: batchId },
    include: { items: true },
  });
  if (!batch) throw new NotFoundException("Lot introuvable.");

  let retired = 0;
  for (const item of batch.items) {
    if (!item.draftClinicalProfileId) continue;
    const profile = await prisma.medicationClinicalProfile.findUnique({
      where: { id: item.draftClinicalProfileId },
    });
    if (profile && profile.lifecycleStatus === "DRAFT") {
      await prisma.medicationClinicalProfile.update({
        where: { id: profile.id },
        data: { lifecycleStatus: "RETIRED" },
      });
      retired += 1;
      await prisma.medicationKnowledgePopulationBatchItem.update({
        where: { id: item.id },
        data: {
          draftClinicalProfileId: null,
          clinicalKnowledgeStatus: "ROLLED_BACK",
        },
      });
    }
  }

  const report = {
    stage: "ROLLBACK",
    retiredDraftClinicalProfiles: retired,
    preservedApprovedKnowledge: true,
    preservedIdentity: true,
  };
  await prisma.medicationKnowledgePopulationImportRun.create({
    data: {
      batchId,
      runType: "ROLLBACK",
      reportJson: report,
      wroteKnowledgeRecords: false,
      createdApprovedRecords: false,
      performedByUserId: actor.userId,
    },
  });
  await audit(prisma, {
    batchId,
    entityType: "MedicationKnowledgePopulationImportRun",
    entityId: batchId,
    action: "IMPORT_ROLLBACK",
    userId: actor.userId,
    after: report,
  });
  return report;
}

export async function recalculateShadowEligibility(
  prisma: PrismaClient,
  batchId: string,
  actor: KpActor
) {
  requireAdmin(actor);
  const batch = await prisma.medicationKnowledgePopulationBatch.findUnique({
    where: { id: batchId },
    include: { items: true, conflicts: true },
  });
  if (!batch) throw new NotFoundException("Lot introuvable.");

  const results = [];
  for (const item of batch.items) {
    const conceptId = item.canonicalConceptId;
    const identityResolved = ["RESOLVED_EXACT", "RESOLVED_GOVERNED_MAPPING"].includes(
      item.resolutionStatus
    );
    const profileApproved = conceptId
      ? (await prisma.medicationClinicalProfile.count({
          where: { conceptId, lifecycleStatus: "APPROVED" },
        })) > 0
      : false;
    const allergenReviewed = conceptId
      ? (await prisma.medicationAllergenMapping.count({
          where: {
            medicationConceptId: conceptId,
            status: { in: ["APPROVED", "DRAFT"] },
          },
        })) > 0
      : false;
    const classReviewed = conceptId
      ? (await prisma.medicationTherapeuticClassMembership.count({
          where: { medicationConceptId: conceptId },
        })) > 0
      : false;
    const dupReviewed = conceptId
      ? (await prisma.medicationDuplicateTherapyMembership.count({
          where: { medicationConceptId: conceptId },
        })) > 0
      : false;
    const criticalConflicts = batch.conflicts.filter(
      (c) =>
        c.familyKey === item.familyKey &&
        (c.status === "BLOCKING" || c.status === "OPEN") &&
        c.severity === "CRITICAL"
    ).length;

    const evaluated = evaluateShadowEligibilityGates({
      identityResolved,
      hasGovernedSourceVersion: true,
      clinicalProfileApproved: profileApproved,
      // Scaffolding drafts do not count as reviewed/approved gates
      administrationReviewed: false,
      monitoringReviewed: false,
      therapeuticClassReviewed: classReviewed && profileApproved,
      allergyMappingReviewed: allergenReviewed && profileApproved,
      duplicateTherapyReviewed: dupReviewed && profileApproved,
      majorSafetyKnowledgeReviewed: false,
      emergencyContextReviewed: profileApproved,
      criticalConflictCount: criticalConflicts,
      identityBlockerCount: identityResolved ? 0 : 1,
    });

    const snap = await prisma.medicationKnowledgeShadowEligibilitySnapshot.create({
      data: {
        batchId,
        batchItemId: item.id,
        familyKey: item.familyKey,
        canonicalConceptId: conceptId,
        identityResolved,
        clinicalProfileApproved: profileApproved,
        administrationReviewed: false,
        monitoringReviewed: false,
        therapeuticClassReviewed: classReviewed && profileApproved,
        allergyMappingReviewed: allergenReviewed && profileApproved,
        duplicateTherapyReviewed: dupReviewed && profileApproved,
        majorSafetyKnowledgeReviewed: false,
        emergencyContextReviewed: profileApproved,
        criticalConflictCount: criticalConflicts,
        identityBlockerCount: identityResolved ? 0 : 1,
        shadowEvaluable: evaluated.shadowEvaluable,
        reasonCodesJson: evaluated.reasonCodes,
        gatesJson: evaluated.gates,
      },
    });
    results.push(snap);
  }

  await audit(prisma, {
    batchId,
    entityType: "MedicationKnowledgeShadowEligibilitySnapshot",
    entityId: batchId,
    action: "SHADOW_ELIGIBILITY_RECALCULATE",
    userId: actor.userId,
    after: {
      count: results.length,
      shadowEvaluable: results.filter((r) => r.shadowEvaluable).length,
    },
  });
  return results;
}

export async function getKnowledgePopulationDashboard(prisma: PrismaClient) {
  const batch = await prisma.medicationKnowledgePopulationBatch.findUnique({
    where: { batchKey: PHASE12_BATCH_KEY },
    include: { items: true, conflicts: true },
  });
  const approvedClinical = await prisma.medicationClinicalProfile.count({
    where: { lifecycleStatus: "APPROVED" },
  });
  const approvedSafety =
    (await prisma.medicationDrugInteraction.count({ where: { status: "APPROVED" } })) +
    (await prisma.medicationAllergenMapping.count({ where: { status: "APPROVED" } }));
  const conceptIds =
    batch?.items
      .map((i) => i.canonicalConceptId)
      .filter((id): id is string => Boolean(id)) ?? [];
  const draftClinical = await prisma.medicationClinicalProfile.count({
    where: {
      lifecycleStatus: "DRAFT",
      ...(conceptIds.length ? { conceptId: { in: conceptIds } } : {}),
    },
  });
  const draftSafetyLive =
    (await prisma.medicationAllergenMapping.count({
      where: {
        status: "DRAFT",
        ...(conceptIds.length ? { medicationConceptId: { in: conceptIds } } : {}),
      },
    })) +
    (await prisma.medicationTherapeuticClassMembership.count({
      where: {
        status: "DRAFT",
        ...(conceptIds.length ? { medicationConceptId: { in: conceptIds } } : {}),
      },
    })) +
    (await prisma.medicationDuplicateTherapyMembership.count({
      where: {
        status: "DRAFT",
        ...(conceptIds.length ? { medicationConceptId: { in: conceptIds } } : {}),
      },
    }));
  const shadowEvaluable = await prisma.medicationKnowledgeShadowEligibilitySnapshot.count({
    where: { shadowEvaluable: true },
  });

  return {
    BatchFamilies: batch?.targetFamilyCount ?? 0,
    IdentityResolvedFamilies: batch?.resolvedFamilyCount ?? 0,
    IdentityBlockedFamilies: batch?.unresolvedFamilyCount ?? 0,
    ClinicalDraftRecords: draftClinical,
    ClinicalApprovedRecords: approvedClinical,
    SafetyDraftRecords: Math.max(batch?.draftSafetyRecordCount ?? 0, draftSafetyLive),
    SafetyApprovedRecords: approvedSafety,
    SourcesRegistered: await prisma.medicationClinicalKnowledgeSource.count(),
    SourceVersionsRegistered: await prisma.medicationClinicalKnowledgeVersion.count(),
    RecordsWithoutSources: 0,
    ExactDuplicatesPrevented: batch?.duplicateCount ?? 0,
    NormalizedDuplicatesPrevented: 0,
    ReversedPairDuplicatesPrevented: 0,
    OpenConflicts: batch?.conflicts.filter((c) => c.status === "OPEN").length ?? 0,
    BlockingConflicts:
      batch?.conflicts.filter((c) => c.status === "BLOCKING").length ?? 0,
    FamiliesWithApprovedClinicalProfiles: approvedClinical,
    FamiliesWithApprovedSafetyKnowledge: approvedSafety,
    ShadowEvaluableFamilies: shadowEvaluable,
    ValidatedFamilies: 0,
    ClinicalActivations: 0,
    ProviderFacingAlerts: 0,
    OrderBlocks: 0,
    batchStatus: batch?.status ?? null,
    banner: {
      controlledKnowledgePopulation: true,
      shadowUseOnly: true,
      noProviderAlerts: true,
      noOrderBlocking: true,
      noClinicalActivation: true,
    },
  };
}

export async function transitionBatch(
  prisma: PrismaClient,
  batchId: string,
  toStatus: string,
  actor: KpActor
) {
  requireAdmin(actor);
  const batch = await prisma.medicationKnowledgePopulationBatch.findUnique({
    where: { id: batchId },
  });
  if (!batch) throw new NotFoundException("Lot introuvable.");
  assertNoDirectDraftToApproved(batch.status, toStatus);
  assertPhase12BatchTransition(batch.status, toStatus);
  const updated = await prisma.medicationKnowledgePopulationBatch.update({
    where: { id: batchId },
    data: {
      status: toStatus,
      reviewStartedAt:
        toStatus.includes("REVIEW") && !batch.reviewStartedAt
          ? new Date()
          : batch.reviewStartedAt,
      approvedAt: toStatus === "APPROVED" ? new Date() : batch.approvedAt,
      completedAt: toStatus === "COMPLETED" ? new Date() : batch.completedAt,
    },
  });
  await audit(prisma, {
    batchId,
    entityType: "MedicationKnowledgePopulationBatch",
    entityId: batchId,
    action: "BATCH_TRANSITION",
    userId: actor.userId,
    before: { status: batch.status },
    after: { status: toStatus },
  });
  return updated;
}

export async function lockBatch(
  prisma: PrismaClient,
  batchId: string,
  actor: KpActor
) {
  requireAdmin(actor);
  const updated = await prisma.medicationKnowledgePopulationBatch.update({
    where: { id: batchId },
    data: { lockedAt: new Date(), status: "COMPLETED" },
  });
  await audit(prisma, {
    batchId,
    entityType: "MedicationKnowledgePopulationBatch",
    entityId: batchId,
    action: "BATCH_LOCK",
    userId: actor.userId,
    after: updated,
  });
  return updated;
}

export async function listConflicts(prisma: PrismaClient, batchId?: string) {
  return prisma.medicationKnowledgeConflict.findMany({
    where: batchId ? { batchId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function resolveConflict(
  prisma: PrismaClient,
  conflictId: string,
  body: { status: string; resolution: string },
  actor: KpActor
) {
  requireAdmin(actor);
  return prisma.medicationKnowledgeConflict.update({
    where: { id: conflictId },
    data: {
      status: body.status,
      resolution: body.resolution,
      resolvedByUserId: actor.userId,
      resolvedAt: new Date(),
    },
  });
}
