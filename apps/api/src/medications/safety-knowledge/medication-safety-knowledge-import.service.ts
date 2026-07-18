/**
 * Phase 9 — governed import preview / dry-run / rollback scaffolding.
 * Does not auto-approve or activate. Does not import large external datasets.
 */
import type { PrismaClient } from "@prisma/client";
import {
  checksumPayload,
  requireSafetyOperator,
  writeSafetyAudit,
  type SafetyKnowledgeActor,
} from "./medication-safety-knowledge.service";
import { checkDrugInteractionDuplicate } from "./medication-safety-duplicate-detection.service";

export type SafetyImportCandidate = {
  subjectMedicationConceptId?: string;
  objectMedicationConceptId?: string;
  interactionScope: string;
  interactionType: string;
  severity: string;
  evidenceLevel: string;
  directional?: boolean;
};

export async function previewSafetyKnowledgeImport(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  input: {
    sourceVersionId: string;
    candidates: SafetyImportCandidate[];
  }
) {
  requireSafetyOperator(actor);
  const unresolved: SafetyImportCandidate[] = [];
  const duplicates: Array<{ candidate: SafetyImportCandidate; existingId?: string }> =
    [];
  const accepted: SafetyImportCandidate[] = [];

  for (const candidate of input.candidates) {
    const left = candidate.subjectMedicationConceptId;
    const right = candidate.objectMedicationConceptId;
    if (!left || !right) {
      unresolved.push(candidate);
      continue;
    }
    const dup = await checkDrugInteractionDuplicate(prisma, {
      leftMedicationId: left,
      rightMedicationId: right,
      interactionScope: candidate.interactionScope,
      sourceVersionId: input.sourceVersionId,
      directional: candidate.directional,
    });
    if (
      dup.classification === "EXACT_DUPLICATE" ||
      dup.classification === "REVERSED_PAIR_DUPLICATE" ||
      dup.classification === "SOURCE_VERSION_DUPLICATE"
    ) {
      duplicates.push({ candidate, existingId: dup.existingId });
    } else if (dup.classification === "UNRESOLVED_IDENTITY") {
      unresolved.push(candidate);
    } else {
      accepted.push(candidate);
    }
  }

  const report = {
    stage: "PREVIEW" as const,
    autoApprove: false,
    autoActivate: false,
    checksum: checksumPayload(input.candidates),
    acceptedCount: accepted.length,
    duplicateCount: duplicates.length,
    unresolvedCount: unresolved.length,
    duplicates,
    unresolved,
    accepted,
  };

  await writeSafetyAudit(prisma, {
    entityType: "MedicationSafetyKnowledgeImport",
    entityId: input.sourceVersionId,
    action: "IMPORT_PREVIEW",
    performedByUserId: actor.userId,
    sourceVersionId: input.sourceVersionId,
    afterState: {
      acceptedCount: report.acceptedCount,
      duplicateCount: report.duplicateCount,
      unresolvedCount: report.unresolvedCount,
      autoApprove: false,
      autoActivate: false,
    },
  });
  return report;
}

export async function dryRunSafetyKnowledgeImport(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  input: {
    sourceVersionId: string;
    candidates: SafetyImportCandidate[];
  }
) {
  const preview = await previewSafetyKnowledgeImport(prisma, actor, input);
  return {
    ...preview,
    stage: "DRY_RUN" as const,
    wouldPersist: false,
    notes: "Dry run only — no rows written, no approvals, no activation.",
  };
}

export async function rollbackSafetyKnowledgeImportPreview(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  sourceVersionId: string,
  reason: string
) {
  requireSafetyOperator(actor);
  if (!actor.roles.includes("MEDICATION_ADMIN") && !actor.roles.includes("MEDORA_SUPER_ADMIN")) {
    throw new Error("Only MEDICATION_ADMIN may authorize safety import rollback.");
  }
  await writeSafetyAudit(prisma, {
    entityType: "MedicationSafetyKnowledgeImport",
    entityId: sourceVersionId,
    action: "IMPORT_ROLLBACK_AUTHORIZED",
    performedByUserId: actor.userId,
    reason,
    sourceVersionId,
    afterState: {
      rolledBack: true,
      patientDataTouched: false,
      clinicalActivationAllowed: false,
    },
  });
  return {
    ok: true,
    sourceVersionId,
    notes: "Rollback authorization recorded. No patient or clinical activation changes.",
  };
}
