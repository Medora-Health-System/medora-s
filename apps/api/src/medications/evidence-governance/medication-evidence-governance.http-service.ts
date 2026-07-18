import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  completeWave1KnowledgeProvenance,
  createOrGetEvidenceBatch,
  getEvidenceGovernanceDashboard,
  recalculateCompletenessScores,
  registerEvidenceSources,
  runPhase14APipeline,
  type EgActor,
} from "./medication-evidence-governance.service";

function assertNoSpoof(body: unknown, userId: string) {
  if (!body || typeof body !== "object") return;
  const o = body as Record<string, unknown>;
  if ("roles" in o || "role" in o) {
    throw new BadRequestException("Role spoofing via request body is forbidden.");
  }
  if (
    o.providerFacingAlertsEnabled === true ||
    o.orderBlockingEnabled === true ||
    o.clinicalActivationEnabled === true ||
    o.autoApprove === true ||
    o.knowledgeControlsPatientCare === true
  ) {
    throw new BadRequestException(
      "Phase 14A forbids alerts, order blocking, clinical activation, auto-approve, and care-workflow control."
    );
  }
  void userId;
}

@Injectable()
export class MedicationEvidenceGovernanceHttpService {
  constructor(private readonly prisma: PrismaService) {}

  dashboard() {
    return getEvidenceGovernanceDashboard(this.prisma);
  }

  createBatch(actor: EgActor) {
    return createOrGetEvidenceBatch(this.prisma, actor);
  }

  async getBatch(id: string) {
    const row = await this.prisma.medicationEvidenceAcquisitionBatch.findUnique({
      where: { id },
      include: {
        sourceRegistrations: true,
        evidenceLinks: { take: 100 },
        completenessScores: { orderBy: { calculatedAt: "desc" }, take: 50 },
      },
    });
    if (!row) throw new NotFoundException("Lot évidence introuvable.");
    return row;
  }

  listBatches() {
    return this.prisma.medicationEvidenceAcquisitionBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  registerSources(body: unknown, actor: EgActor) {
    assertNoSpoof(body, actor.userId);
    return registerEvidenceSources(this.prisma, actor);
  }

  completeKnowledge(body: unknown, actor: EgActor) {
    assertNoSpoof(body, actor.userId);
    return completeWave1KnowledgeProvenance(this.prisma, actor);
  }

  completeness(actor: EgActor) {
    return recalculateCompletenessScores(this.prisma, actor);
  }

  pipeline(body: unknown, actor: EgActor) {
    assertNoSpoof(body, actor.userId);
    return runPhase14APipeline(this.prisma, actor);
  }

  listRegistrations() {
    return this.prisma.medicationEvidenceSourceRegistration.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  listLinks() {
    return this.prisma.medicationKnowledgeEvidenceLink.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  certification() {
    return {
      certificationId:
        "MEDUI.MEDICATION_INTELLIGENCE_PHASE_14A_SOURCE_ACQUISITION_EVIDENCE_GOVERNANCE_KNOWLEDGE_COMPLETION",
      ClinicalActivationEnabled: false,
      ProviderFacingAlertsEnabled: false,
      OrderBlockingEnabled: false,
      KnowledgeControlsPatientCare: false,
      OrderingChanged: "NO",
      MARChanged: "NO",
      BillingChanged: "NO",
    };
  }
}
