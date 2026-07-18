import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { PilotActor } from "./medication-recommendation-pilot.types";
import {
  activatePilot,
  addPilotProvider,
  approvePilot,
  capturePilotMonitoring,
  completePilot,
  createPilotProgram,
  evaluateAllWave1Qualifications,
  evaluateDefinitionQualification,
  getEncounterAdvisories,
  getExposureEvidence,
  getExposureExplanation,
  getPhase17Readiness,
  getPilotDashboard,
  getPilotProgram,
  getQualificationByDefinitionId,
  listPilotAudit,
  listPilotPrograms,
  listQualifications,
  pausePilot,
  recordProviderTraining,
  removePilotProvider,
  reportSafetyEvent,
  respondToExposure,
  revokePilot,
  schedulePilot,
  submitPilot,
  suspendPilot,
  resumePilot,
} from "./medication-recommendation-pilot.service";

@Injectable()
export class MedicationRecommendationPilotHttpService {
  constructor(private readonly prisma: PrismaService) {}

  dashboard() {
    return getPilotDashboard(this.prisma);
  }

  readiness() {
    return getPhase17Readiness(this.prisma);
  }

  qualifications() {
    return listQualifications(this.prisma);
  }

  qualification(definitionId: string) {
    return getQualificationByDefinitionId(this.prisma, definitionId);
  }

  evaluateAll(actor: PilotActor, facilityId?: string) {
    return evaluateAllWave1Qualifications(this.prisma, actor, facilityId);
  }

  evaluateOne(actor: PilotActor, definitionId: string, facilityId?: string) {
    return evaluateDefinitionQualification(
      this.prisma,
      actor,
      definitionId,
      facilityId
    );
  }

  programs() {
    return listPilotPrograms(this.prisma);
  }

  program(id: string) {
    return getPilotProgram(this.prisma, id);
  }

  createProgram(
    actor: PilotActor,
    body: {
      facilityId: string;
      title: string;
      description?: string;
      startAt: string;
      endAt: string;
      definitionIds: string[];
      dryRun?: boolean;
    }
  ) {
    return createPilotProgram(this.prisma, actor, body);
  }

  submit(actor: PilotActor, id: string, reason: string) {
    return submitPilot(this.prisma, actor, id, reason);
  }

  approve(actor: PilotActor, id: string, reason: string) {
    return approvePilot(this.prisma, actor, id, reason);
  }

  schedule(actor: PilotActor, id: string, reason: string) {
    return schedulePilot(this.prisma, actor, id, reason);
  }

  activate(actor: PilotActor, id: string, reason: string) {
    return activatePilot(this.prisma, actor, id, reason);
  }

  pause(actor: PilotActor, id: string, reason: string) {
    return pausePilot(this.prisma, actor, id, reason);
  }

  resume(actor: PilotActor, id: string, reason: string) {
    return resumePilot(this.prisma, actor, id, reason);
  }

  suspend(actor: PilotActor, id: string, reason: string) {
    return suspendPilot(this.prisma, actor, id, reason);
  }

  revoke(actor: PilotActor, id: string, reason: string) {
    return revokePilot(this.prisma, actor, id, reason);
  }

  complete(actor: PilotActor, id: string, reason: string) {
    return completePilot(this.prisma, actor, id, reason);
  }

  addProvider(
    actor: PilotActor,
    programId: string,
    body: { providerUserId: string; facilityId: string }
  ) {
    return addPilotProvider(this.prisma, actor, programId, body);
  }

  trainProvider(actor: PilotActor, programId: string, providerUserId: string) {
    return recordProviderTraining(this.prisma, actor, programId, providerUserId);
  }

  removeProvider(
    actor: PilotActor,
    programId: string,
    providerUserId: string,
    reason: string
  ) {
    return removePilotProvider(
      this.prisma,
      actor,
      programId,
      providerUserId,
      reason
    );
  }

  advisories(actor: PilotActor, encounterId: string, facilityId: string) {
    return getEncounterAdvisories(this.prisma, actor, encounterId, facilityId);
  }

  explanation(exposureId: string) {
    return getExposureExplanation(this.prisma, exposureId);
  }

  evidence(exposureId: string) {
    return getExposureEvidence(this.prisma, exposureId);
  }

  respond(
    actor: PilotActor,
    exposureId: string,
    response: "ACKNOWLEDGED" | "DISMISSED" | "DISAGREED",
    reason?: string
  ) {
    return respondToExposure(this.prisma, actor, exposureId, response, reason);
  }

  monitoring(programId: string) {
    return capturePilotMonitoring(this.prisma, programId);
  }

  safetyEvents(programId: string) {
    return this.prisma.medicationRecommendationPilotSafetyEvent.findMany({
      where: { pilotProgramId: programId },
      orderBy: { detectedAt: "desc" },
      take: 100,
    });
  }

  reportSafety(
    actor: PilotActor,
    programId: string,
    body: {
      eventType: string;
      description: string;
      severity?: string;
      requiresSuspension?: boolean;
      exposureId?: string;
    }
  ) {
    return reportSafetyEvent(this.prisma, actor, programId, body);
  }

  audit(programId: string) {
    return listPilotAudit(this.prisma, programId);
  }
}
