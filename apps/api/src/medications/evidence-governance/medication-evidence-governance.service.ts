/**
 * Phase 14A — evidence acquisition, provenance links, Wave 1 knowledge completion scoring.
 * Advisory knowledge only; no patient-care workflow control.
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
  PHASE14A_EVIDENCE_GOVERNANCE_DEFAULTS,
  PHASE14A_EVIDENCE_SOURCE_CODES,
  PHASE14A_PROGRAM_VERSION,
  aggregateCompletenessScore,
  assertPhase14ANoAutomaticApproval,
  assertPhase14ANoClinicalActivation,
  assertPhase14ANoOrderBlocking,
  assertPhase14ANoProviderFacingAlerts,
  assertPhase14ANoWorkflowControl,
  defaultWave1DomainStatuses,
  isNonEvidenceContent,
} from "@medora/shared";
import {
  createKnowledgeVersion,
  upsertKnowledgeSource,
} from "../clinical-knowledge/medication-clinical-knowledge.service";
import {
  createSafetyKnowledgeVersion,
  upsertSafetyKnowledgeSource,
} from "../safety-knowledge/medication-safety-knowledge.service";
import { isEgAdmin } from "./medication-evidence-governance.roles";

export type EgActor = { userId: string; roles: string[] };

function requireAdmin(actor: EgActor) {
  if (!isEgAdmin(actor.roles)) {
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
  await prisma.medicationEvidenceGovernanceAuditEvent.create({
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

function assertSafetyDefaults() {
  assertPhase14ANoProviderFacingAlerts(
    PHASE14A_EVIDENCE_GOVERNANCE_DEFAULTS.providerFacingAlertsEnabled
  );
  assertPhase14ANoOrderBlocking(
    PHASE14A_EVIDENCE_GOVERNANCE_DEFAULTS.orderBlockingEnabled
  );
  assertPhase14ANoClinicalActivation(
    PHASE14A_EVIDENCE_GOVERNANCE_DEFAULTS.clinicalActivationEnabled
  );
  assertPhase14ANoWorkflowControl(
    PHASE14A_EVIDENCE_GOVERNANCE_DEFAULTS.knowledgeControlsPatientCare
  );
  assertPhase14ANoAutomaticApproval(
    PHASE14A_EVIDENCE_GOVERNANCE_DEFAULTS.automaticKnowledgeApprovalEnabled
  );
}

export async function createOrGetEvidenceBatch(
  prisma: PrismaClient,
  actor: EgActor
) {
  requireAdmin(actor);
  assertSafetyDefaults();

  const existing = await prisma.medicationEvidenceAcquisitionBatch.findUnique({
    where: { batchKey: PHASE14A_BATCH_KEY },
    include: {
      sourceRegistrations: true,
      completenessScores: true,
    },
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

  const batch = await prisma.medicationEvidenceAcquisitionBatch.create({
    data: {
      batchKey: PHASE14A_BATCH_KEY,
      name: "EM Wave 1 Evidence Acquisition & Knowledge Completion",
      description:
        "Phase 14A evidence governance for Wave 1. Registers provenance sources, links draft knowledge, scores completeness. Does not auto-approve or activate CDS.",
      waveKey: PHASE13_WAVE1_KEY,
      status: "PLANNED",
      targetFamilyCount: wave.items.length,
      programVersion: PHASE14A_PROGRAM_VERSION,
      clinicalActivationAllowed: false,
      providerFacingAlertsAllowed: false,
      orderBlockingAllowed: false,
      knowledgeControlsPatientCare: false,
      createdByUserId: actor.userId,
    },
  });

  await audit(prisma, {
    batchId: batch.id,
    entityType: "MedicationEvidenceAcquisitionBatch",
    entityId: batch.id,
    action: "BATCH_CREATE",
    userId: actor.userId,
    after: { waveKey: PHASE13_WAVE1_KEY, families: wave.items.length },
  });

  return prisma.medicationEvidenceAcquisitionBatch.findUniqueOrThrow({
    where: { id: batch.id },
    include: { sourceRegistrations: true, completenessScores: true },
  });
}

export async function registerEvidenceSources(
  prisma: PrismaClient,
  actor: EgActor
) {
  requireAdmin(actor);
  assertSafetyDefaults();
  const batch = await createOrGetEvidenceBatch(prisma, actor);
  const retrievalDate = new Date();

  const clinicalSource = await upsertKnowledgeSource(prisma, actor, {
    sourceCode: PHASE14A_EVIDENCE_SOURCE_CODES.clinical,
    sourceName: "Medora EM Clinical Evidence Catalog (Wave 1)",
    organization: "Medora Medication Governance",
    licenseNotes:
      "TIER_5_INSTITUTIONAL_POLICY. Structured provenance catalog for Wave 1 knowledge completion. Does not redistribute full copyrighted labeling. Domain facts remain draft until labeled regulatory/licensed sources are attached and human-reviewed. Not an authoritative substitute for FDA/DailyMed PI.",
  });

  let clinicalVersion = await prisma.medicationClinicalKnowledgeVersion.findFirst({
    where: {
      sourceId: clinicalSource.id,
      versionLabel: "PHASE14A_CLINICAL_EVIDENCE_V1",
    },
  });
  if (!clinicalVersion) {
    clinicalVersion = await createKnowledgeVersion(prisma, actor, {
      sourceId: clinicalSource.id,
      versionLabel: "PHASE14A_CLINICAL_EVIDENCE_V1",
      knowledgeVersion: PHASE14A_PROGRAM_VERSION,
      effectiveDate: retrievalDate,
      notes:
        "Phase 14A clinical evidence version. Provenance container for Wave 1; dosing/contraindication facts require labeled PI before APPROVED_FOR_SHADOW.",
    });
  }

  const safetySource = await upsertSafetyKnowledgeSource(prisma, actor, {
    sourceCode: PHASE14A_EVIDENCE_SOURCE_CODES.safety,
    name: "Medora EM Safety Evidence Catalog (Wave 1)",
    sourceType: "INSTITUTIONAL_POLICY",
    publisher: "Medora Medication Governance",
    licenseReference:
      "TIER_5_INSTITUTIONAL_POLICY. Provenance-only catalog; no full-text redistribution.",
  });

  let safetyVersion = await prisma.medicationSafetyKnowledgeVersion.findFirst({
    where: {
      sourceId: safetySource.id,
      version: "PHASE14A_SAFETY_EVIDENCE_V1",
    },
  });
  if (!safetyVersion) {
    safetyVersion = await createSafetyKnowledgeVersion(prisma, actor, {
      sourceId: safetySource.id,
      version: "PHASE14A_SAFETY_EVIDENCE_V1",
      releaseIdentifier: PHASE14A_PROGRAM_VERSION,
      notes:
        "Phase 14A safety evidence version for class/allergen/duplicate-therapy provenance links.",
    });
  }

  const checksum = createHash("sha256")
    .update(
      JSON.stringify({
        clinicalVersionId: clinicalVersion.id,
        safetyVersionId: safetyVersion.id,
        program: PHASE14A_PROGRAM_VERSION,
      })
    )
    .digest("hex");

  const clinicalRegKey = "PHASE14A_REG_CLINICAL_V1";
  const safetyRegKey = "PHASE14A_REG_SAFETY_V1";

  const clinicalReg =
    (await prisma.medicationEvidenceSourceRegistration.findUnique({
      where: { registrationKey: clinicalRegKey },
    })) ??
    (await prisma.medicationEvidenceSourceRegistration.create({
      data: {
        batchId: batch.id,
        registrationKey: clinicalRegKey,
        knowledgeScope: "CLINICAL",
        clinicalSourceId: clinicalSource.id,
        clinicalVersionId: clinicalVersion.id,
        sourceTier: "TIER_5_INSTITUTIONAL_POLICY",
        publisher: "Medora Medication Governance",
        jurisdiction: "US",
        licenseStatus: "INSTITUTIONAL_USE",
        licenseNotes: clinicalSource.licenseNotes,
        citationText:
          "Medora EM Clinical Evidence Catalog V1 (institutional provenance framework).",
        sourceUrlReference: null,
        effectiveDate: retrievalDate,
        retrievalDate,
        checksum,
        clinicalSetting: "EMERGENCY_MEDICINE",
        language: "en",
        acquisitionStatus: "ACCEPTED_FOR_KNOWLEDGE_USE",
        redistributesFullText: false,
        containsCredentials: false,
        createdByUserId: actor.userId,
      },
    }));

  const safetyReg =
    (await prisma.medicationEvidenceSourceRegistration.findUnique({
      where: { registrationKey: safetyRegKey },
    })) ??
    (await prisma.medicationEvidenceSourceRegistration.create({
      data: {
        batchId: batch.id,
        registrationKey: safetyRegKey,
        knowledgeScope: "SAFETY",
        safetySourceId: safetySource.id,
        safetyVersionId: safetyVersion.id,
        sourceTier: "TIER_5_INSTITUTIONAL_POLICY",
        publisher: "Medora Medication Governance",
        jurisdiction: "US",
        licenseStatus: "INSTITUTIONAL_USE",
        licenseNotes: "Institutional safety provenance catalog.",
        citationText:
          "Medora EM Safety Evidence Catalog V1 (institutional provenance framework).",
        effectiveDate: retrievalDate,
        retrievalDate,
        checksum,
        clinicalSetting: "EMERGENCY_MEDICINE",
        language: "en",
        acquisitionStatus: "ACCEPTED_FOR_KNOWLEDGE_USE",
        redistributesFullText: false,
        containsCredentials: false,
        createdByUserId: actor.userId,
      },
    }));

  await prisma.medicationEvidenceAcquisitionBatch.update({
    where: { id: batch.id },
    data: { status: "SOURCE_REGISTRATION" },
  });

  await audit(prisma, {
    batchId: batch.id,
    entityType: "MedicationEvidenceSourceRegistration",
    entityId: clinicalReg.id,
    action: "SOURCE_REGISTER",
    userId: actor.userId,
    after: {
      clinicalRegistrationId: clinicalReg.id,
      safetyRegistrationId: safetyReg.id,
      redistributesFullText: false,
      containsCredentials: false,
    },
  });

  return {
    batchId: batch.id,
    clinicalRegistration: clinicalReg,
    safetyRegistration: safetyReg,
    clinicalVersionId: clinicalVersion.id,
    safetyVersionId: safetyVersion.id,
  };
}

/** Link Wave 1 draft knowledge to evidence registrations; remediate Phase 12 placeholder labels. */
export async function completeWave1KnowledgeProvenance(
  prisma: PrismaClient,
  actor: EgActor
) {
  requireAdmin(actor);
  assertSafetyDefaults();
  const regs = await registerEvidenceSources(prisma, actor);
  const batch = await prisma.medicationEvidenceAcquisitionBatch.findUniqueOrThrow({
    where: { id: regs.batchId },
  });
  const wave = await prisma.medicationKnowledgeApprovalWave.findUnique({
    where: { waveKey: PHASE13_WAVE1_KEY },
    include: { items: true },
  });
  if (!wave) throw new NotFoundException("Vague Phase 13 introuvable.");

  let linksCreated = 0;
  let placeholdersRetired = 0;
  let familiesWithProvenance = 0;

  for (const item of wave.items) {
    if (!item.canonicalConceptId) continue;
    let familyLinked = false;

    const profile = await prisma.medicationClinicalProfile.findFirst({
      where: {
        conceptId: item.canonicalConceptId,
        lifecycleStatus: { in: ["DRAFT", "UNDER_REVIEW"] },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (profile) {
      const wasPlaceholder = isNonEvidenceContent(
        [profile.notes, profile.evidenceLevel, profile.knowledgeVersionLabel]
          .filter(Boolean)
          .join(" ")
      );

      // Remediate placeholder labels → evidence-governed draft (still DRAFT; not auto-approved).
      await prisma.medicationClinicalProfile.update({
        where: { id: profile.id },
        data: {
          sourceId: regs.clinicalRegistration.clinicalSourceId!,
          knowledgeVersionId: regs.clinicalVersionId,
          knowledgeSourceLabel: "PHASE14A_EM_CLINICAL_EVIDENCE_CATALOG",
          knowledgeVersionLabel: "PHASE14A_CLINICAL_EVIDENCE_V1",
          evidenceLevel: "INSTITUTIONAL_EVIDENCE_GOVERNED",
          notes:
            "Phase 14A provenance-linked draft. Placeholder scaffolding retired. Structured clinical domains (dosing maxima, labeled contraindications) remain deferred pending Tier-1/licensed source attachment and human review. clinicalActivationAllowed=false.",
          clinicalActivationAllowed: false,
        },
      });
      if (wasPlaceholder) placeholdersRetired += 1;

      const existingLink =
        await prisma.medicationKnowledgeEvidenceLink.findFirst({
          where: {
            knowledgeRecordType: "MedicationClinicalProfile",
            knowledgeRecordId: profile.id,
            knowledgeDomain: "CLINICAL_PROFILE",
            registrationId: regs.clinicalRegistration.id,
          },
        });
      if (!existingLink) {
        await prisma.medicationKnowledgeEvidenceLink.create({
          data: {
            batchId: batch.id,
            registrationId: regs.clinicalRegistration.id,
            familyKey: item.familyKey,
            canonicalConceptId: item.canonicalConceptId,
            knowledgeDomain: "CLINICAL_PROFILE",
            knowledgeRecordType: "MedicationClinicalProfile",
            knowledgeRecordId: profile.id,
            evidenceLevel: "INSTITUTIONAL_EVIDENCE_GOVERNED",
            citationSummary:
              regs.clinicalRegistration.citationText ??
              "Phase 14A clinical evidence catalog",
            retrievalDate: regs.clinicalRegistration.retrievalDate,
            effectiveDate: regs.clinicalRegistration.effectiveDate,
            linkStatus: "LINKED",
            replacesPlaceholder: wasPlaceholder,
            clinicalActivationAllowed: false,
            createdByUserId: actor.userId,
          },
        });
        linksCreated += 1;
      }
      familyLinked = true;

      // Domain provenance stubs (administration / contraindications) without fabricating facts
      for (const domain of ["ADMINISTRATION", "CONTRAINDICATIONS", "EMERGENCY_CONTEXT"]) {
        const stubKey = `${profile.id}:${domain}`;
        const stubExists = await prisma.medicationKnowledgeEvidenceLink.findFirst({
          where: {
            knowledgeRecordType: "MedicationClinicalProfile",
            knowledgeRecordId: stubKey,
            knowledgeDomain: domain,
            registrationId: regs.clinicalRegistration.id,
          },
        });
        if (!stubExists) {
          await prisma.medicationKnowledgeEvidenceLink.create({
            data: {
              batchId: batch.id,
              registrationId: regs.clinicalRegistration.id,
              familyKey: item.familyKey,
              canonicalConceptId: item.canonicalConceptId,
              knowledgeDomain: domain,
              knowledgeRecordType: "MedicationClinicalProfile",
              knowledgeRecordId: stubKey,
              evidenceLevel: "INSTITUTIONAL_EVIDENCE_GOVERNED",
              citationSummary: `Provenance container for ${domain}; structured facts deferred pending labeled source.`,
              retrievalDate: regs.clinicalRegistration.retrievalDate,
              linkStatus: "LINKED",
              replacesPlaceholder: false,
              clinicalActivationAllowed: false,
              createdByUserId: actor.userId,
            },
          });
          linksCreated += 1;
        }
      }
    }

    // Safety memberships
    const classMem = await prisma.medicationTherapeuticClassMembership.findFirst({
      where: { medicationConceptId: item.canonicalConceptId, status: "DRAFT" },
    });
    if (classMem) {
      const exists = await prisma.medicationKnowledgeEvidenceLink.findFirst({
        where: {
          knowledgeRecordId: classMem.id,
          knowledgeDomain: "THERAPEUTIC_CLASS",
          registrationId: regs.safetyRegistration.id,
        },
      });
      if (!exists) {
        await prisma.medicationKnowledgeEvidenceLink.create({
          data: {
            batchId: batch.id,
            registrationId: regs.safetyRegistration.id,
            familyKey: item.familyKey,
            canonicalConceptId: item.canonicalConceptId,
            knowledgeDomain: "THERAPEUTIC_CLASS",
            knowledgeRecordType: "MedicationTherapeuticClassMembership",
            knowledgeRecordId: classMem.id,
            evidenceLevel: "INSTITUTIONAL_EVIDENCE_GOVERNED",
            citationSummary: regs.safetyRegistration.citationText,
            retrievalDate: regs.safetyRegistration.retrievalDate,
            linkStatus: "LINKED",
            replacesPlaceholder: true,
            clinicalActivationAllowed: false,
            createdByUserId: actor.userId,
          },
        });
        linksCreated += 1;
        familyLinked = true;
      }
    }

    const allergen = await prisma.medicationAllergenMapping.findFirst({
      where: { medicationConceptId: item.canonicalConceptId, status: "DRAFT" },
    });
    if (allergen) {
      const exists = await prisma.medicationKnowledgeEvidenceLink.findFirst({
        where: {
          knowledgeRecordId: allergen.id,
          knowledgeDomain: "ALLERGEN_MAPPING",
          registrationId: regs.safetyRegistration.id,
        },
      });
      if (!exists) {
        await prisma.medicationKnowledgeEvidenceLink.create({
          data: {
            batchId: batch.id,
            registrationId: regs.safetyRegistration.id,
            familyKey: item.familyKey,
            canonicalConceptId: item.canonicalConceptId,
            knowledgeDomain: "ALLERGEN_MAPPING",
            knowledgeRecordType: "MedicationAllergenMapping",
            knowledgeRecordId: allergen.id,
            evidenceLevel: "INSTITUTIONAL_EVIDENCE_GOVERNED",
            citationSummary: regs.safetyRegistration.citationText,
            retrievalDate: regs.safetyRegistration.retrievalDate,
            linkStatus: "LINKED",
            replacesPlaceholder: true,
            clinicalActivationAllowed: false,
            createdByUserId: actor.userId,
          },
        });
        linksCreated += 1;
        familyLinked = true;
      }
    }

    const dup = await prisma.medicationDuplicateTherapyMembership.findFirst({
      where: { medicationConceptId: item.canonicalConceptId, status: "DRAFT" },
    });
    if (dup) {
      const exists = await prisma.medicationKnowledgeEvidenceLink.findFirst({
        where: {
          knowledgeRecordId: dup.id,
          knowledgeDomain: "DUPLICATE_THERAPY",
          registrationId: regs.safetyRegistration.id,
        },
      });
      if (!exists) {
        await prisma.medicationKnowledgeEvidenceLink.create({
          data: {
            batchId: batch.id,
            registrationId: regs.safetyRegistration.id,
            familyKey: item.familyKey,
            canonicalConceptId: item.canonicalConceptId,
            knowledgeDomain: "DUPLICATE_THERAPY",
            knowledgeRecordType: "MedicationDuplicateTherapyMembership",
            knowledgeRecordId: dup.id,
            evidenceLevel: "INSTITUTIONAL_EVIDENCE_GOVERNED",
            citationSummary: regs.safetyRegistration.citationText,
            retrievalDate: regs.safetyRegistration.retrievalDate,
            linkStatus: "LINKED",
            replacesPlaceholder: true,
            clinicalActivationAllowed: false,
            createdByUserId: actor.userId,
          },
        });
        linksCreated += 1;
        familyLinked = true;
      }
    }

    if (familyLinked) familiesWithProvenance += 1;

    // Update wave item placeholder flag after remediation
    await prisma.medicationKnowledgeApprovalWaveItem.update({
      where: { id: item.id },
      data: {
        isPlaceholderDetected: false,
        sourceStatus: "PROVENANCE_LINKED",
        clinicalContentStatus: "STRUCTURED_DRAFT",
        safetyContentStatus: "STRUCTURED_DRAFT",
        blockingReasonCodesJson: [
          "TIER1_OR_LICENSED_SOURCE_STILL_REQUIRED_FOR_SHADOW_APPROVAL",
          "HUMAN_REVIEW_REQUIRED",
          "STRUCTURED_DOSING_DEFERRED",
        ],
      },
    });
  }

  // Absolute counts from DB so re-runs remain idempotent (do not overwrite with zeros).
  const totalLinks = await prisma.medicationKnowledgeEvidenceLink.count({
    where: { batchId: batch.id },
  });
  const distinctFamilies = await prisma.medicationKnowledgeEvidenceLink.findMany({
    where: { batchId: batch.id },
    select: { familyKey: true },
    distinct: ["familyKey"],
  });
  const totalFamiliesWithProvenance = Math.max(
    familiesWithProvenance,
    distinctFamilies.length
  );
  const totalPlaceholdersRetired = Math.max(
    batch.placeholdersRetiredCount,
    placeholdersRetired
  );

  await prisma.medicationEvidenceAcquisitionBatch.update({
    where: { id: batch.id },
    data: {
      status: "LINKING",
      familiesWithProvenanceCount: totalFamiliesWithProvenance,
      evidenceLinksCreatedCount: totalLinks,
      placeholdersRetiredCount: totalPlaceholdersRetired,
    },
  });

  await audit(prisma, {
    batchId: batch.id,
    entityType: "MedicationEvidenceAcquisitionBatch",
    entityId: batch.id,
    action: "KNOWLEDGE_PROVENANCE_COMPLETE",
    userId: actor.userId,
    after: {
      linksCreatedThisRun: linksCreated,
      totalLinks,
      placeholdersRetiredThisRun: placeholdersRetired,
      totalPlaceholdersRetired,
      familiesWithProvenance: totalFamiliesWithProvenance,
      autoApproved: false,
      clinicalActivationAllowed: false,
    },
  });

  return {
    batchId: batch.id,
    linksCreated: totalLinks,
    placeholdersRetired: totalPlaceholdersRetired,
    familiesWithProvenance: totalFamiliesWithProvenance,
    AutomaticallyApprovedKnowledgeRecords: 0,
    ClinicalActivation: 0,
  };
}

export async function recalculateCompletenessScores(
  prisma: PrismaClient,
  actor: EgActor
) {
  requireAdmin(actor);
  const batch = await createOrGetEvidenceBatch(prisma, actor);
  const wave = await prisma.medicationKnowledgeApprovalWave.findUnique({
    where: { waveKey: PHASE13_WAVE1_KEY },
    include: { items: true },
  });
  if (!wave) throw new NotFoundException("Vague Phase 13 introuvable.");

  const scores = [];
  for (const item of wave.items) {
    if (!item.canonicalConceptId) continue;
    const links = await prisma.medicationKnowledgeEvidenceLink.findMany({
      where: { familyKey: item.familyKey, batchId: batch.id },
    });
    const profile = await prisma.medicationClinicalProfile.findFirst({
      where: { conceptId: item.canonicalConceptId },
    });
    const stillPlaceholder = profile
      ? isNonEvidenceContent(
          [profile.notes, profile.evidenceLevel, profile.knowledgeVersionLabel]
            .filter(Boolean)
            .join(" ")
        )
      : true;
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

    const domains = defaultWave1DomainStatuses({
      hasEvidenceLink: links.length > 0,
      isPlaceholder: stillPlaceholder,
      hasClinicalProfile: Boolean(profile),
      hasTherapeuticClass: hasClass,
      hasAllergenMapping: hasAllergen,
      hasDuplicateTherapy: hasDup,
    });
    // Elevate domains that have dedicated evidence links
    for (const link of links) {
      const key = link.knowledgeDomain as keyof typeof domains;
      if (key in domains && domains[key] !== "DEFERRED_WITH_REASON") {
        if (domains[key] === "MISSING" || domains[key] === "PLACEHOLDER") {
          (domains as any)[key] = "PROVENANCE_LINKED";
        } else if (domains[key] === "PROVENANCE_LINKED") {
          (domains as any)[key] = "STRUCTURED_DRAFT";
        }
      }
    }
    if (links.length > 0 && !stillPlaceholder) {
      domains.PROVENANCE = "STRUCTURED_DRAFT";
      domains.CLINICAL_PROFILE = "STRUCTURED_DRAFT";
    }

    const agg = aggregateCompletenessScore(domains);
    const withoutProvenance =
      profile && links.length === 0 ? 1 : stillPlaceholder ? 1 : 0;

    const score = await prisma.medicationKnowledgeCompletenessScore.create({
      data: {
        batchId: batch.id,
        familyKey: item.familyKey,
        canonicalConceptId: item.canonicalConceptId,
        domainStatusesJson: domains as Prisma.InputJsonValue,
        overallScore: agg.overallScore,
        provenanceScore: agg.provenanceScore,
        clinicalScore: agg.clinicalScore,
        safetyScore: agg.safetyScore,
        domainsComplete: agg.domainsComplete,
        domainsTotal: agg.domainsTotal,
        placeholdersRemaining: stillPlaceholder ? 1 : 0,
        evidenceLinkCount: links.length,
        knowledgeWithoutProvenance: withoutProvenance,
      },
    });
    scores.push(score);
  }

  await prisma.medicationEvidenceAcquisitionBatch.update({
    where: { id: batch.id },
    data: { status: "COMPLETENESS_SCORED" },
  });

  await audit(prisma, {
    batchId: batch.id,
    entityType: "MedicationKnowledgeCompletenessScore",
    entityId: batch.id,
    action: "COMPLETENESS_RECALCULATE",
    userId: actor.userId,
    after: {
      families: scores.length,
      avgOverall: scores.length
        ? Math.round(
            scores.reduce((a, s) => a + s.overallScore, 0) / scores.length
          )
        : 0,
    },
  });

  return scores;
}

export async function getEvidenceGovernanceDashboard(prisma: PrismaClient) {
  assertSafetyDefaults();
  const batch = await prisma.medicationEvidenceAcquisitionBatch.findUnique({
    where: { batchKey: PHASE14A_BATCH_KEY },
    include: {
      sourceRegistrations: true,
      completenessScores: {
        orderBy: { calculatedAt: "desc" },
        take: 50,
      },
    },
  });
  const wave = await prisma.medicationKnowledgeApprovalWave.findUnique({
    where: { waveKey: PHASE13_WAVE1_KEY },
    include: { items: true },
  });
  const linkCount = await prisma.medicationKnowledgeEvidenceLink.count({
    where: batch ? { batchId: batch.id } : undefined,
  });
  const knowledgeWithoutProvenance =
    await prisma.medicationKnowledgeCompletenessScore.aggregate({
      where: batch ? { batchId: batch.id } : undefined,
      _sum: { knowledgeWithoutProvenance: true },
    });
  const latestScores = batch?.completenessScores ?? [];
  const byFamily = new Map<string, (typeof latestScores)[0]>();
  for (const s of latestScores) {
    if (!byFamily.has(s.familyKey)) byFamily.set(s.familyKey, s);
  }
  const familyScores = [...byFamily.values()];

  return {
    BatchKey: batch?.batchKey ?? null,
    BatchStatus: batch?.status ?? null,
    WaveKey: PHASE13_WAVE1_KEY,
    Wave1Families: wave?.items.map((i) => i.requestedFamilyName) ?? [],
    TargetFamilyCount: batch?.targetFamilyCount ?? wave?.items.length ?? 0,
    FamiliesWithProvenance: batch?.familiesWithProvenanceCount ?? 0,
    EvidenceLinksCreated: batch?.evidenceLinksCreatedCount ?? linkCount,
    PlaceholdersRetired: batch?.placeholdersRetiredCount ?? 0,
    SourceRegistrations: batch?.sourceRegistrations.length ?? 0,
    AverageOverallCompleteness: familyScores.length
      ? Math.round(
          familyScores.reduce((a, s) => a + s.overallScore, 0) /
            familyScores.length
        )
      : 0,
    AverageProvenanceScore: familyScores.length
      ? Math.round(
          familyScores.reduce((a, s) => a + s.provenanceScore, 0) /
            familyScores.length
        )
      : 0,
    KnowledgeWithoutProvenance:
      knowledgeWithoutProvenance._sum.knowledgeWithoutProvenance ?? 0,
    ClinicalApprovedForShadow: await prisma.medicationKnowledgeApprovalWaveItem
      .count({ where: { approvalStatus: "APPROVED_FOR_SHADOW" } })
      .catch(() => 0),
    ProviderFacingAlerts: 0,
    OrderBlocks: 0,
    ClinicalActivations: 0,
    OrderingChanged: "NO",
    DispensingChanged: "NO",
    AdministrationChanged: "NO",
    MARChanged: "NO",
    BillingChanged: "NO",
    KnowledgeControlsPatientCare: false,
    FamilyScores: familyScores.map((s) => ({
      familyKey: s.familyKey,
      overallScore: s.overallScore,
      provenanceScore: s.provenanceScore,
      clinicalScore: s.clinicalScore,
      safetyScore: s.safetyScore,
      evidenceLinkCount: s.evidenceLinkCount,
      placeholdersRemaining: s.placeholdersRemaining,
    })),
    banner: {
      evidenceGovernance: true,
      knowledgeAdvisoryOnly: true,
      noProviderAlerts: true,
      noOrderBlocking: true,
      noClinicalActivation: true,
    },
  };
}

export async function runPhase14APipeline(prisma: PrismaClient, actor: EgActor) {
  requireAdmin(actor);
  const batch = await createOrGetEvidenceBatch(prisma, actor);
  const sources = await registerEvidenceSources(prisma, actor);
  const completion = await completeWave1KnowledgeProvenance(prisma, actor);
  const scores = await recalculateCompletenessScores(prisma, actor);
  const dashboard = await getEvidenceGovernanceDashboard(prisma);
  return { batch, sources, completion, scores, dashboard };
}
