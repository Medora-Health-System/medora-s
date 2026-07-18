import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { OpsActor } from "./medication-recommendation-ops.types";
import {
  captureOperationalSnapshot,
  captureQualitySnapshot,
  compareReplay,
  detectDrift,
  generateRegulatoryArtifacts,
  getDriftMetrics,
  getExplainabilityBundle,
  getGovernanceSummary,
  getLineage,
  getOperationsCenterDashboard,
  getPhase18Readiness,
  getProvenance,
  getSafetyMetrics,
  getVersionInfo,
  replayRecommendation,
  rollbackToPriorVersion,
  sealImmutableVersions,
  validateReplay,
} from "./medication-recommendation-ops.service";

@Injectable()
export class MedicationRecommendationOpsHttpService {
  constructor(private readonly prisma: PrismaService) {}

  dashboard() {
    return getOperationsCenterDashboard(this.prisma);
  }

  readiness() {
    return getPhase18Readiness(this.prisma);
  }

  explanation(definitionId: string) {
    return getExplainabilityBundle(this.prisma, definitionId);
  }

  lineage(definitionId: string) {
    return getLineage(this.prisma, definitionId);
  }

  provenance(definitionId: string) {
    return getProvenance(this.prisma, definitionId);
  }

  version(definitionId: string) {
    return getVersionInfo(this.prisma, definitionId);
  }

  operationalHealth() {
    return captureOperationalSnapshot(this.prisma);
  }

  qualityMetrics() {
    return captureQualitySnapshot(this.prisma);
  }

  safetyMetrics() {
    return getSafetyMetrics(this.prisma);
  }

  driftMetrics() {
    return getDriftMetrics(this.prisma);
  }

  governanceSummary() {
    return getGovernanceSummary(this.prisma);
  }

  seal(actor: OpsActor) {
    return sealImmutableVersions(this.prisma, actor);
  }

  replay(
    actor: OpsActor,
    body: {
      definitionId: string;
      recommendationVersion?: string;
      knowledgeVersion?: string;
      encounterId?: string;
      facilityId?: string;
    }
  ) {
    return replayRecommendation(this.prisma, actor, body);
  }

  validateReplay(replayRunId: string) {
    return validateReplay(this.prisma, replayRunId);
  }

  compareReplay(
    actor: OpsActor,
    body: {
      definitionId: string;
      recommendationVersion?: string;
      knowledgeVersion?: string;
    }
  ) {
    return compareReplay(this.prisma, actor, body);
  }

  getReplay(replayRunId: string) {
    return this.prisma.medicationRecommendationReplayRun.findUnique({
      where: { id: replayRunId },
      include: { failures: true },
    });
  }

  rollback(actor: OpsActor, body: { definitionId: string; reason: string }) {
    return rollbackToPriorVersion(this.prisma, actor, body);
  }

  detectDrift(actor: OpsActor) {
    return detectDrift(this.prisma, actor);
  }

  regulatory(actor: OpsActor) {
    return generateRegulatoryArtifacts(this.prisma, actor);
  }

  rollbacks() {
    return this.prisma.medicationRecommendationRollbackEvent.findMany({
      orderBy: { performedAt: "desc" },
      take: 50,
    });
  }

  driftAlerts() {
    return this.prisma.medicationRecommendationDriftAlert.findMany({
      where: { resolvedAt: null },
      orderBy: { detectedAt: "desc" },
      take: 100,
    });
  }

  audit() {
    return this.prisma.medicationRecommendationOpsAuditEvent.findMany({
      orderBy: { performedAt: "desc" },
      take: 100,
    });
  }
}
