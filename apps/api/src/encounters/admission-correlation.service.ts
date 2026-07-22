/**
 * D3E.8 — Server-owned AdmissionCorrelationService.
 * Correlation is authoritative admission identity (JSON on Encounter).
 * Wrong open-IP reuse prevention is always enforced (not feature-flagged).
 */

import { Injectable } from "@nestjs/common";
import { EncounterStatus, EncounterType } from "@prisma/client";
import { randomUUID } from "crypto";
import {
  admissionCorrelationFlagsFromProcessEnv,
  admissionCorrelationUiEnabled,
  assertPlacementReceivingMatchesCorrelation,
  buildHospitalAdmissionCorrelationV1,
  diagnoseAdmissionCorrelation,
  evaluateDuplicateAdmission,
  evaluateLegacyAdmissionLinkage,
  planResolveOrCreateReceivingEncounter,
  resolveReceivingEncounterReuse,
  wrongOpenInpatientReusePreventionAlwaysOn,
  type AdmissionCorrelationReuseDecision,
  type HospitalAdmissionCorrelationV1,
  type HospitalAdmissionIntent,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdmissionCorrelationService {
  constructor(private readonly prisma: PrismaService) {}

  meta() {
    const env = admissionCorrelationFlagsFromProcessEnv();
    return {
      module: "ADMISSION_CORRELATION",
      certification: "MEDUI.INPATIENT_ADMISSION_CORRELATION.D3E8",
      storage: "OPTION_A_VERSIONED_JSON_ON_ENCOUNTER",
      structuredModel: false,
      wrongReusePreventionAlwaysOn: wrongOpenInpatientReusePreventionAlwaysOn(),
      uiEnabled: admissionCorrelationUiEnabled(env),
      productionDefaultsOff: !admissionCorrelationUiEnabled({}),
    };
  }

  /** Server-owned correlation id seed — clients must not forge authoritative ids. */
  newServerCorrelationSeed(): string {
    return randomUUID();
  }

  createAdmissionIntent(input: {
    admissionIntent: HospitalAdmissionIntent;
    patientId: string;
    facilityId: string;
    actorUserId: string;
    admissionSource?: string | null;
    destinationUnitId?: string | null;
    hospitalEpisodeId?: string | null;
    sourceEncounterId?: string | null;
    internalPlacementRequestId?: string | null;
    idempotencyKey?: string | null;
    /** Ignored for authority — server regenerates if unsafe/missing. */
    clientAdmissionCorrelationId?: string | null;
    requestedAdmissionAt?: string | null;
  }): HospitalAdmissionCorrelationV1 {
    // Client-supplied correlation ids are not authoritative.
    void input.clientAdmissionCorrelationId;
    return buildHospitalAdmissionCorrelationV1({
      admissionIntent: input.admissionIntent,
      status: input.internalPlacementRequestId ? "PLACEMENT_REQUESTED" : "INTENT_CREATED",
      patientId: input.patientId,
      facilityId: input.facilityId,
      admissionSource: input.admissionSource,
      destinationUnitId: input.destinationUnitId,
      hospitalEpisodeId: input.hospitalEpisodeId,
      sourceEncounterId: input.sourceEncounterId,
      internalPlacementRequestId: input.internalPlacementRequestId,
      idempotencyKey: input.idempotencyKey,
      initiatedByUserId: input.actorUserId,
      requestedAdmissionAt: input.requestedAdmissionAt,
      serverGeneratedId: this.newServerCorrelationSeed(),
    });
  }

  async listOpenInpatientCandidates(facilityId: string, patientId: string) {
    return this.prisma.encounter.findMany({
      where: {
        facilityId,
        patientId,
        status: EncounterStatus.OPEN,
        type: EncounterType.INPATIENT,
      },
      select: { id: true, hospitalEpisodeId: true, admissionSummaryJson: true },
    });
  }

  resolveReuse(input: {
    patientId: string;
    facilityId: string;
    admissionIntent: HospitalAdmissionIntent;
    hospitalEpisodeId?: string | null;
    sourceEncounterId?: string | null;
    internalPlacementRequestId?: string | null;
    idempotencyKey?: string | null;
    admissionCorrelationId?: string | null;
    placementReceivingEncounterId?: string | null;
    openInpatientCandidates: Array<{
      id: string;
      hospitalEpisodeId?: string | null;
      admissionSummaryJson?: unknown;
    }>;
  }): AdmissionCorrelationReuseDecision {
    void wrongOpenInpatientReusePreventionAlwaysOn();
    return resolveReceivingEncounterReuse(input);
  }

  resolveOrCreatePlan(input: {
    correlation: HospitalAdmissionCorrelationV1;
    actorUserId: string;
    expectedPatientId: string;
    expectedFacilityId: string;
    placementReceivingEncounterId?: string | null;
    openInpatientCandidates: Array<{
      id: string;
      hospitalEpisodeId?: string | null;
      admissionSummaryJson?: unknown;
    }>;
  }) {
    return planResolveOrCreateReceivingEncounter(input);
  }

  evaluateDuplicate(reuse: AdmissionCorrelationReuseDecision) {
    return evaluateDuplicateAdmission({ reuse });
  }

  evaluateLegacy(input: Parameters<typeof evaluateLegacyAdmissionLinkage>[0]) {
    return evaluateLegacyAdmissionLinkage(input);
  }

  assertPlacementConsistency(input: {
    placementReceivingEncounterId?: string | null;
    correlationReceivingEncounterId?: string | null;
  }) {
    return assertPlacementReceivingMatchesCorrelation(input);
  }

  diagnose(input: Parameters<typeof diagnoseAdmissionCorrelation>[0]) {
    return diagnoseAdmissionCorrelation(input);
  }
}
