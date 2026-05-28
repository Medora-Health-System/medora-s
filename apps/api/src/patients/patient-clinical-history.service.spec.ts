import { NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  buildPatientHistoryReconciliationAuditMetadata,
  emptyPatientClinicalHistoryProfile,
  PATIENT_CLINICAL_HISTORY_PROFILE_VERSION,
  reconcileEncounterHistoryIntoPatientProfile,
  TRIAGE_CARRY_FORWARD_VERSION,
  type PatientClinicalHistoryProfile,
} from "@medora/shared";
import { PatientClinicalHistoryService } from "./patient-clinical-history.service";

describe("PatientClinicalHistoryService (19T.4)", () => {
  const facilityId = "facility-1";
  const patientId = "patient-1";
  const encounterId = "enc-1";

  function buildService(overrides?: {
    patient?: { id: string; clinicalHistoryProfileJson: unknown } | null;
  }) {
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue(overrides?.patient ?? null),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new PatientClinicalHistoryService(prisma as never, audit as never);
    return { service, prisma, audit };
  }

  function validProfile(): PatientClinicalHistoryProfile {
    return {
      ...emptyPatientClinicalHistoryProfile("2026-05-18T12:00:00.000Z"),
      allergies: { allergyNote: "Stored allergy" },
      provenance: {
        allergies: {
          sourceType: "reviewed_triage",
          sourceEncounterId: "enc-old",
          lastReviewedAt: "2026-05-18T12:00:00.000Z",
        },
      },
    };
  }

  it("returns null when clinicalHistoryProfileJson is null", async () => {
    const { service } = buildService({
      patient: { id: patientId, clinicalHistoryProfileJson: null },
    });
    await expect(service.getProfile(patientId, facilityId)).resolves.toBeNull();
  });

  it("returns null for malformed profile JSON without throwing", async () => {
    const { service } = buildService({
      patient: { id: patientId, clinicalHistoryProfileJson: { bad: true } },
    });
    await expect(service.getProfile(patientId, facilityId)).resolves.toBeNull();
  });

  it("throws NotFound when patient is outside facility scope", async () => {
    const { service } = buildService({ patient: null });
    await expect(service.getProfile(patientId, facilityId)).rejects.toBeInstanceOf(NotFoundException);
    expect(service).toBeDefined();
  });

  it("scopes patient lookup by facilityId", async () => {
    const { service, prisma } = buildService({
      patient: { id: patientId, clinicalHistoryProfileJson: null },
    });
    await service.getProfile(patientId, facilityId);
    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: patientId, facilityId },
      select: { clinicalHistoryProfileJson: true },
    });
  });

  it("reconcile audit metadata excludes clinical text", async () => {
    const draft = {
      allergyNote: "SecretAllergyName",
      erV1: { medicationsSummary: "SecretMed" },
    };
    const result = reconcileEncounterHistoryIntoPatientProfile({
      currentProfile: validProfile(),
      encounterDraft: {
        allergyNote: draft.allergyNote,
        erV1: {
          medicationAllergiesDetail: draft.allergyNote,
          foodAllergiesDetail: "",
          additionalAllergyInfo: "",
          allergyDetailSelections: [],
          medicationsSummary: draft.erV1.medicationsSummary,
          medicationSummarySelections: [],
          pastMedicalHistory: "",
          pastSurgicalHistory: "",
          smokingStatus: "",
          alcoholUse: "",
          marijuanaUse: "",
          stimulantUse: "",
          opioidHeroinUse: "",
          historySocialComments: "",
          socialHistorySelections: [],
        },
      },
      carryForwardMeta: {
        version: TRIAGE_CARRY_FORWARD_VERSION,
        sourceEncounterId: "enc-prior",
        sourceEncounterDate: "2025-12-01T00:00:00.000Z",
        carriedForwardAt: "2026-05-18T12:00:00.000Z",
        fields: { allergies: true, homeMedications: true },
        reviewStatus: "reviewed",
        sectionStatus: { allergies: "reviewed", homeMedications: "reviewed" },
      },
      encounterId,
      encounterDate: "2026-05-18T12:00:00.000Z",
      facilityId,
    });
    const audit = buildPatientHistoryReconciliationAuditMetadata({
      patientId,
      encounterId,
      result,
      reviewerId: "rn-1",
    });
    const serialized = JSON.stringify(audit);
    expect(serialized).not.toContain("SecretAllergyName");
    expect(serialized).not.toContain("SecretMed");
    expect(audit.patientId).toBe(patientId);
    expect(audit.encounterId).toBe(encounterId);
  });

  it("persists promoted profile JSON on reviewed reconciliation", async () => {
    const { service, prisma } = buildService({
      patient: {
        id: patientId,
        clinicalHistoryProfileJson: null,
      },
    });
    await service.reconcileFromEncounterTriage({
      patientId,
      facilityId,
      encounterId,
      encounterDate: "2026-05-18T12:00:00.000Z",
      vitalsJson: {
        allergyNote: "New allergy",
        triageCarryForwardMeta: {
          version: TRIAGE_CARRY_FORWARD_VERSION,
          sourceEncounterId: "enc-prior",
          sourceEncounterDate: "2025-12-01T00:00:00.000Z",
          carriedForwardAt: "2026-05-18T12:00:00.000Z",
          fields: { allergies: true },
          reviewStatus: "reviewed",
          sectionStatus: { allergies: "reviewed" },
        },
      },
      reviewerId: "rn-1",
    });
    expect(prisma.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clinicalHistoryProfileJson: expect.objectContaining({
            version: PATIENT_CLINICAL_HISTORY_PROFILE_VERSION,
            allergies: expect.objectContaining({ allergyNote: "New allergy" }),
          }),
        }),
      })
    );
  });

  it("does not clear profile on removed section without explicit confirmation", async () => {
    const { service, prisma } = buildService({
      patient: {
        id: patientId,
        clinicalHistoryProfileJson: validProfile(),
      },
    });
    await service.reconcileFromEncounterTriage({
      patientId,
      facilityId,
      encounterId,
      encounterDate: "2026-05-18T12:00:00.000Z",
      vitalsJson: {
        allergyNote: "",
        triageCarryForwardMeta: {
          version: TRIAGE_CARRY_FORWARD_VERSION,
          sourceEncounterId: "enc-prior",
          sourceEncounterDate: "2025-12-01T00:00:00.000Z",
          carriedForwardAt: "2026-05-18T12:00:00.000Z",
          fields: { allergies: true },
          reviewStatus: "pending_review",
          sectionStatus: { allergies: "removed" },
        },
      },
      reviewerId: "rn-1",
    });
    const updateArg = prisma.patient.update.mock.calls[0]?.[0];
    expect(updateArg?.data?.clinicalHistoryProfileJson).not.toBe(Prisma.JsonNull);
    expect(updateArg?.data?.clinicalHistoryProfileJson?.allergies?.allergyNote).toBe(
      "Stored allergy"
    );
  });

  it("does not expose encounter rows from getProfile", async () => {
    const profile = validProfile();
    const { service, prisma } = buildService({
      patient: {
        id: patientId,
        clinicalHistoryProfileJson: profile,
      },
    });
    const result = await service.getProfile(patientId, facilityId);
    expect(result?.version).toBe(PATIENT_CLINICAL_HISTORY_PROFILE_VERSION);
    expect(prisma.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { clinicalHistoryProfileJson: true },
      })
    );
    expect(result).not.toHaveProperty("encounters");
  });
});
