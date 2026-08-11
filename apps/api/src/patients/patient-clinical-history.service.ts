import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import {
  allergySectionAuditSnapshot,
  buildPatientHistoryReconciliationAuditMetadata,
  emptyTriageCarryForwardDraft,
  PATIENT_CLINICAL_HISTORY_PROFILE_VERSION,
  patientClinicalHistoryProfileFromJson,
  profileHasClinicalContent,
  profilePrimaryProvenance,
  profileToCarryForwardExtraction,
  reconcileEncounterHistoryIntoPatientProfile,
  sanitizeEnterpriseAllergiesSection,
  syncLegacyAllergyTextFields,
  triageCarryForwardMetaFromVitalsJson,
  type PatientClinicalHistoryProfile,
  type PatientHistoryReconciliationResult,
  type TriageCarryForwardDraft,
  type PatientHistorySectionUpdate,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";

function draftFromTriageVitalsJson(vitalsJson: unknown): TriageCarryForwardDraft {
  const draft = emptyTriageCarryForwardDraft();
  if (vitalsJson == null || typeof vitalsJson !== "object" || Array.isArray(vitalsJson)) return draft;
  const root = vitalsJson as Record<string, unknown>;
  if (typeof root.allergyNote === "string") draft.allergyNote = root.allergyNote;
  const er = root.medoraErTriageV1;
  if (er != null && typeof er === "object" && !Array.isArray(er)) {
    const e = er as Record<string, unknown>;
    draft.erV1.medicationAllergiesDetail = typeof e.medicationAllergiesDetail === "string" ? e.medicationAllergiesDetail : "";
    draft.erV1.foodAllergiesDetail = typeof e.foodAllergiesDetail === "string" ? e.foodAllergiesDetail : "";
    draft.erV1.additionalAllergyInfo = typeof e.additionalAllergyInfo === "string" ? e.additionalAllergyInfo : "";
    draft.erV1.allergyDetailSelections = Array.isArray(e.allergyDetailSelections)
      ? e.allergyDetailSelections.filter((x): x is string => typeof x === "string")
      : [];
    draft.erV1.medicationsSummary = typeof e.medicationsSummary === "string" ? e.medicationsSummary : "";
    draft.erV1.medicationSummarySelections = Array.isArray(e.medicationSummarySelections)
      ? e.medicationSummarySelections.filter((x): x is string => typeof x === "string")
      : [];
    draft.erV1.pastMedicalHistory = typeof e.pastMedicalHistory === "string" ? e.pastMedicalHistory : "";
    draft.erV1.pastSurgicalHistory = typeof e.pastSurgicalHistory === "string" ? e.pastSurgicalHistory : "";
    draft.erV1.smokingStatus = typeof e.smokingStatus === "string" ? e.smokingStatus : "";
    draft.erV1.alcoholUse = typeof e.alcoholUse === "string" ? e.alcoholUse : "";
    draft.erV1.marijuanaUse = typeof e.marijuanaUse === "string" ? e.marijuanaUse : "";
    draft.erV1.stimulantUse = typeof e.stimulantUse === "string" ? e.stimulantUse : "";
    draft.erV1.opioidHeroinUse = typeof e.opioidHeroinUse === "string" ? e.opioidHeroinUse : "";
    draft.erV1.historySocialComments = typeof e.historySocialComments === "string" ? e.historySocialComments : "";
    draft.erV1.socialHistorySelections = Array.isArray(e.socialHistorySelections)
      ? e.socialHistorySelections.filter((x): x is string => typeof x === "string")
      : [];
  }
  return draft;
}

@Injectable()
export class PatientClinicalHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async getProfile(patientId: string, facilityId: string): Promise<PatientClinicalHistoryProfile | null> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId },
      select: { clinicalHistoryProfileJson: true },
    });
    if (!patient) throw new NotFoundException("Patient not found");
    return patientClinicalHistoryProfileFromJson(patient.clinicalHistoryProfileJson);
  }

  async reconcileFromEncounterTriage(input: {
    patientId: string;
    facilityId: string;
    encounterId: string;
    encounterDate: string;
    vitalsJson: unknown;
    reviewerId?: string;
    ip?: string;
    userAgent?: string;
  }): Promise<PatientHistoryReconciliationResult> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: input.patientId, facilityId: input.facilityId },
      select: { id: true, clinicalHistoryProfileJson: true },
    });
    if (!patient) throw new NotFoundException("Patient not found");

    const currentProfile = patientClinicalHistoryProfileFromJson(patient.clinicalHistoryProfileJson);
    const encounterDraft = draftFromTriageVitalsJson(input.vitalsJson);
    const carryForwardMeta = triageCarryForwardMetaFromVitalsJson(input.vitalsJson);

    const result = reconcileEncounterHistoryIntoPatientProfile({
      currentProfile,
      encounterDraft,
      carryForwardMeta,
      encounterId: input.encounterId,
      encounterDate: input.encounterDate,
      facilityId: input.facilityId,
      reviewerId: input.reviewerId,
    });

    await this.prisma.patient.update({
      where: { id: input.patientId },
      data: {
        clinicalHistoryProfileJson: result.profile
          ? (result.profile as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    if (result.changedSections.length) {
      await this.audit.log(AuditAction.PATIENT_UPDATE, "PatientClinicalHistoryProfile", {
        facilityId: input.facilityId,
        userId: input.reviewerId,
        patientId: input.patientId,
        entityId: input.patientId,
        ip: input.ip,
        userAgent: input.userAgent,
        metadata: buildPatientHistoryReconciliationAuditMetadata({
          patientId: input.patientId,
          encounterId: input.encounterId,
          result,
          reviewerId: input.reviewerId,
        }),
      });
    }

    return result;
  }

  /**
   * MEDUI.D4A.3.3A — Direct enterprise allergy section write on patient clinical history profile.
   * Zero migration: merges into clinicalHistoryProfileJson.allergies with provenance + audit.
   */
  async patchAllergies(input: {
    patientId: string;
    facilityId: string;
    actorUserId: string;
    allergies: unknown;
    encounterId?: string | null;
    originModule?: string | null;
    workstationId?: string | null;
    ip?: string;
    userAgent?: string;
  }): Promise<{ profile: PatientClinicalHistoryProfile }> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: input.patientId, facilityId: input.facilityId },
      select: { id: true, clinicalHistoryProfileJson: true },
    });
    if (!patient) throw new NotFoundException("Patient not found");

    const current = patientClinicalHistoryProfileFromJson(patient.clinicalHistoryProfileJson);
    const previousAllergies = current?.allergies ?? null;
    const sanitized = syncLegacyAllergyTextFields(sanitizeEnterpriseAllergiesSection(input.allergies));
    if (
      !sanitized.nkda &&
      !(sanitized.entries?.length) &&
      !sanitized.medicationAllergiesDetail &&
      !sanitized.allergyNote
    ) {
      throw new BadRequestException("Allergy payload empty");
    }

    const now = new Date().toISOString();
    const nextProfile: PatientClinicalHistoryProfile = {
      version: PATIENT_CLINICAL_HISTORY_PROFILE_VERSION,
      updatedAt: now,
      updatedBy: input.actorUserId,
      allergies: sanitized,
      homeMedications: current?.homeMedications,
      medicalHistory: current?.medicalHistory,
      surgicalHistory: current?.surgicalHistory,
      socialHistory: current?.socialHistory,
      provenance: {
        ...(current?.provenance ?? {}),
        allergies: {
          sourceEncounterId: input.encounterId ?? undefined,
          sourceFacilityId: input.facilityId,
          sourceType: "manually_entered",
          lastReviewedAt: now,
          reviewerId: input.actorUserId,
        },
      },
    };

    await this.prisma.patient.update({
      where: { id: input.patientId },
      data: {
        clinicalHistoryProfileJson: nextProfile as unknown as Prisma.InputJsonValue,
      },
    });

    await this.audit.log(AuditAction.PATIENT_UPDATE, "PatientClinicalHistoryProfile", {
      facilityId: input.facilityId,
      userId: input.actorUserId,
      patientId: input.patientId,
      entityId: input.patientId,
      encounterId: input.encounterId ?? undefined,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: {
        event: "ENTERPRISE_ALLERGIES_PATCHED",
        originModule: input.originModule ?? "inpatientHeaderAllergyEditor",
        workstationId: input.workstationId ?? null,
        previous: allergySectionAuditSnapshot(previousAllergies),
        next: allergySectionAuditSnapshot(sanitized),
      },
    });

    return { profile: nextProfile };
  }

  /** INP.1A section allow-list; never accepts paths or arbitrary JSON patch operations. */
  async patchSection(input: {
    patientId: string; facilityId: string; actorUserId: string;
    update: PatientHistorySectionUpdate; encounterId?: string | null; ip?: string; userAgent?: string;
  }): Promise<{ profile: PatientClinicalHistoryProfile }> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: input.patientId, facilityId: input.facilityId },
      select: { id: true, clinicalHistoryProfileJson: true },
    });
    if (!patient) throw new NotFoundException("Patient not found");
    if (input.encounterId) {
      const scopedEncounter = await this.prisma.encounter.findFirst({
        where: { id: input.encounterId, patientId: input.patientId, facilityId: input.facilityId }, select: { id: true },
      });
      if (!scopedEncounter) throw new NotFoundException("Encounter not found for patient");
    }
    const current = patientClinicalHistoryProfileFromJson(patient.clinicalHistoryProfileJson);
    const now = new Date().toISOString();
    const profile: PatientClinicalHistoryProfile = {
      ...(current ?? { version: PATIENT_CLINICAL_HISTORY_PROFILE_VERSION, provenance: {} }),
      updatedAt: now, updatedBy: input.actorUserId,
      provenance: { ...(current?.provenance ?? {}) },
    };
    const section = input.update.section;
    if (section === "medicalHistory" || section === "surgicalHistory" || section === "homeMedications") {
      profile[section] = input.update.value as never;
    } else {
      profile.socialHistory = { ...(current?.socialHistory ?? {}), ...input.update.value };
    }
    const provenanceSection = ["tobacco", "alcohol", "substances", "socialHistory"].includes(section) ? "socialHistory" : section;
    profile.provenance[provenanceSection as keyof typeof profile.provenance] = {
      sourceEncounterId: input.encounterId ?? undefined, sourceFacilityId: input.facilityId,
      sourceType: "manually_entered", lastReviewedAt: now, reviewerId: input.actorUserId,
    };
    await this.prisma.patient.update({ where: { id: input.patientId }, data: { clinicalHistoryProfileJson: profile as unknown as Prisma.InputJsonValue } });
    await this.audit.log(AuditAction.PATIENT_UPDATE, "PatientClinicalHistoryProfile", {
      facilityId: input.facilityId, userId: input.actorUserId, patientId: input.patientId,
      entityId: input.patientId, encounterId: input.encounterId ?? undefined, ip: input.ip, userAgent: input.userAgent,
      metadata: { section, operation: "SECTION_UPDATE", result: "SUCCESS", timestamp: now },
    });
    return { profile };
  }
}
