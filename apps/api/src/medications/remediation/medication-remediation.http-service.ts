import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { Phase15WorkItemStatus } from "@medora/shared";
import type { RemediationActor } from "./medication-source-lifecycle.service";
import {
  applySupportedKnowledgeGuarded,
  attachEvidenceToRemediation,
  deferRemediationWorkItem,
  executeRemediationTransition,
  getAuthoritativeSourceDetail,
  getPhase15Dashboard,
  getPhase15FamilyDetail,
  getPhase15OperationalBaseline,
  getPhase15Readiness,
  getRemediationWorkItemDetail,
  listAuthoritativeSources,
  listPhase15Families,
  listRemediationWorkItems,
  markRemediationDeferredDomain,
  previewKnowledgeUpdate,
  previewRemediationTransition,
  promoteAuthoritativeSource,
  refreshRemediationQueue,
  reopenRemediationWorkItem,
  type RemediationListFilter,
  verifyRemediationSource,
} from "./medication-phase15-remediation-orchestrator.service";
import { recalculateWave1QualityAfterRemediation } from "./medication-quality-recalculation.service";
import { advanceEvidenceSourceLifecycle } from "./medication-source-lifecycle.service";

@Injectable()
export class MedicationRemediationHttpService {
  constructor(private readonly prisma: PrismaService) {}

  dashboard() {
    return getPhase15Dashboard(this.prisma);
  }

  baseline() {
    return getPhase15OperationalBaseline(this.prisma);
  }

  readiness() {
    return getPhase15Readiness(this.prisma);
  }

  families() {
    return listPhase15Families(this.prisma);
  }

  family(familyKey: string) {
    return getPhase15FamilyDetail(this.prisma, familyKey);
  }

  remediations(filter: RemediationListFilter) {
    return listRemediationWorkItems(this.prisma, filter);
  }

  remediation(id: string) {
    return getRemediationWorkItemDetail(this.prisma, id);
  }

  refresh(actor: RemediationActor) {
    return refreshRemediationQueue(this.prisma, actor);
  }

  preview(id: string, toStatus: Phase15WorkItemStatus) {
    return previewRemediationTransition(this.prisma, id, toStatus);
  }

  transition(
    actor: RemediationActor,
    body: {
      workItemId: string;
      toStatus: Phase15WorkItemStatus;
      reason: string;
      evidenceRegistrationId?: string;
      expectedStatus?: string;
    }
  ) {
    return executeRemediationTransition(this.prisma, actor, body);
  }

  defer(actor: RemediationActor, id: string, reason: string) {
    return deferRemediationWorkItem(this.prisma, actor, id, reason);
  }

  reopen(actor: RemediationActor, id: string, reason: string) {
    return reopenRemediationWorkItem(this.prisma, actor, id, reason);
  }

  attachEvidence(
    actor: RemediationActor,
    body: {
      workItemId: string;
      evidenceRegistrationId: string;
      reason: string;
    }
  ) {
    return attachEvidenceToRemediation(this.prisma, actor, body);
  }

  verifySource(actor: RemediationActor, id: string, reason: string) {
    return verifyRemediationSource(this.prisma, actor, id, reason);
  }

  knowledgePreview(id: string) {
    return previewKnowledgeUpdate(this.prisma, id);
  }

  applyKnowledge(
    actor: RemediationActor,
    body: { workItemId: string; reason: string }
  ) {
    return applySupportedKnowledgeGuarded(this.prisma, actor, body);
  }

  markDeferred(actor: RemediationActor, id: string, reason: string) {
    return markRemediationDeferredDomain(this.prisma, actor, id, reason);
  }

  sources(filter?: { sourceTier?: string; acquisitionStatus?: string }) {
    return listAuthoritativeSources(this.prisma, filter);
  }

  source(id: string) {
    return getAuthoritativeSourceDetail(this.prisma, id);
  }

  promoteSource(
    actor: RemediationActor,
    body: {
      registrationId: string;
      reason: string;
      licensingStatus?: "LICENSED" | "PUBLIC_DOMAIN" | "RESTRICTED" | "UNKNOWN";
    }
  ) {
    return promoteAuthoritativeSource(this.prisma, actor, body);
  }

  advanceSource(
    actor: RemediationActor,
    body: {
      registrationId: string;
      targetStatus: string;
      reason?: string;
      reviewStatus?: "PENDING" | "APPROVED" | "REJECTED";
      licensingStatus?: "LICENSED" | "PUBLIC_DOMAIN" | "RESTRICTED" | "UNKNOWN";
    }
  ) {
    return advanceEvidenceSourceLifecycle(this.prisma, actor, body);
  }

  qualityRecalc(actor: RemediationActor) {
    return recalculateWave1QualityAfterRemediation(this.prisma, actor);
  }
}
