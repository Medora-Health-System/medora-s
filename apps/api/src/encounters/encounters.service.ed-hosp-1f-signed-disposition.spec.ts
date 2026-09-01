import { EncounterType, EncounterWorkflowState } from "@prisma/client";
import { EncountersService } from "./encounters.service";
import { createMockBedBoardService } from "./encounters.service.test-bed-board.mock";
import { createMockInternalPlacementService } from "./encounters.service.test-internal-placement.mock";
import { createMockEnterpriseAssignmentService } from "./encounters.service.test-enterprise-assignment.mock";
import { createMockEnterpriseLifecycleService } from "./encounters.service.test-enterprise-lifecycle.mock";

const facilityId = "fac-a";
const encounterId = "enc-1";
const patientId = "pat-1";
const userId = "rn-1";

const SIGNED_PROVIDER_NA = {
  erDispositionV1: {
    documentationStatus: "SIGNED",
    signedAt: "2026-09-01T12:00:00.000Z",
    signedByDisplayName: "Dr. Provider",
    revision: 2,
    signature: {
      savedAt: "2026-09-01T12:00:00.000Z",
      savedByDisplayName: "Dr. Provider",
    },
  },
};

function baseEncounter(overrides?: Record<string, unknown>) {
  return {
    id: encounterId,
    facilityId,
    patientId,
    type: EncounterType.EMERGENCY,
    status: "OPEN",
    workflowState: EncounterWorkflowState.IN_TREATMENT,
    roomLabel: "ed-2",
    version: 1,
    providerDocumentationStatus: null,
    dischargeSummaryJson: null,
    nursingAssessment: SIGNED_PROVIDER_NA,
    admissionSummaryJson: {
      admissionDecisionMode: "SIGN",
      admissionDecisionAt: "2026-09-01T12:00:00.000Z",
      admissionDecisionByUserId: "provider-1",
      requestedEncounterType: "OBSERVATION",
      careLevel: "OBSERVATION",
    },
    billingCaptureJson: null,
    billingFinalizationStatus: null,
    physicianAssignedUserId: null,
    ...overrides,
  };
}

function buildUpdateMocks(encounter: Record<string, unknown>, roleCode = "RN") {
  const encounterUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const updatedRow = {
    ...encounter,
    patient: { id: patientId, firstName: "Jean", lastName: "Test", mrn: "MRN1" },
    physicianAssigned: null,
  };
  const encounterFindFirst = jest
    .fn()
    .mockResolvedValueOnce(encounter)
    .mockResolvedValue(updatedRow);
  const auditLog = jest.fn().mockResolvedValue(undefined);
  const prisma = {
    encounter: {
      findFirst: encounterFindFirst,
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: encounterUpdateMany,
    },
    userRole: {
      findFirst: jest.fn().mockResolvedValue({ userId, role: { code: roleCode } }),
      findMany: jest.fn().mockResolvedValue([{ role: { code: roleCode } }]),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: userId, firstName: "Marie", lastName: "Nurse" }),
    },
    encounterClinicalEvent: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
    },
    auditLog: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  return { prisma, auditLog, encounterUpdateMany };
}

function createService(prisma: unknown, auditLog: jest.Mock) {
  return new EncountersService(
    prisma as never,
    { log: auditLog } as never,
    {} as never,
    createMockBedBoardService() as never,
    createMockInternalPlacementService() as never,
    createMockEnterpriseAssignmentService() as never,
    createMockEnterpriseLifecycleService() as never
  );
}

describe("ED.HOSP.1F signed provider disposition is immutable from RN PATCH", () => {
  it("RN nursing draft save cannot downgrade signed Observation decision or signer", async () => {
    const encounter = baseEncounter();
    const { prisma, auditLog, encounterUpdateMany } = buildUpdateMocks(encounter, "RN");
    const svc = createService(prisma, auditLog);

    await svc.update(
      facilityId,
      encounterId,
      {
        nursingAssessment: {
          erDispositionV1: {
            documentationStatus: "DRAFT",
            signedAt: "2026-09-01T15:00:00.000Z",
            signedByDisplayName: "Synth EdHosp1fRn",
            revision: 9,
            signature: {
              savedAt: "2026-09-01T15:00:00.000Z",
              savedByDisplayName: "Synth EdHosp1fRn",
            },
          },
          edNursingDocumentationV1: { drafts: [{ draftId: "handoff" }] },
        },
      },
      userId
    );

    const persisted = encounterUpdateMany.mock.calls[0][0].data.nursingAssessment as {
      erDispositionV1: {
        documentationStatus: string;
        signedAt: string;
        signedByDisplayName: string;
        revision: number;
        signature: { savedByDisplayName: string; savedAt: string };
      };
      edNursingDocumentationV1: { drafts: { draftId: string }[] };
    };
    expect(persisted.erDispositionV1.documentationStatus).toBe("SIGNED");
    expect(persisted.erDispositionV1.signedByDisplayName).toBe("Dr. Provider");
    expect(persisted.erDispositionV1.signedAt).toBe("2026-09-01T12:00:00.000Z");
    expect(persisted.erDispositionV1.signature.savedByDisplayName).toBe("Dr. Provider");
    expect(persisted.erDispositionV1.signature.savedAt).toBe("2026-09-01T12:00:00.000Z");
    expect(persisted.edNursingDocumentationV1.drafts[0]?.draftId).toBe("handoff");
  });

  it("Admission and Transfer signed destinations stay SIGNED after RN nursing write", async () => {
    for (const requestedEncounterType of ["INPATIENT", "TRANSFER"] as const) {
      const encounter = baseEncounter({
        admissionSummaryJson: {
          admissionDecisionMode: "SIGN",
          admissionDecisionAt: "2026-09-01T12:00:00.000Z",
          admissionDecisionByUserId: "provider-1",
          requestedEncounterType,
        },
      });
      const { prisma, auditLog, encounterUpdateMany } = buildUpdateMocks(encounter, "RN");
      const svc = createService(prisma, auditLog);
      await svc.update(
        facilityId,
        encounterId,
        {
          nursingAssessment: {
            ...SIGNED_PROVIDER_NA,
            erHandoffV1: { handoffStatus: "IN_PROGRESS" },
          },
        },
        userId
      );
      const persisted = encounterUpdateMany.mock.calls[0][0].data.nursingAssessment as {
        erDispositionV1: { documentationStatus: string; signedByDisplayName: string };
        erHandoffV1: { handoffStatus: string };
      };
      expect(persisted.erDispositionV1.documentationStatus).toBe("SIGNED");
      expect(persisted.erDispositionV1.signedByDisplayName).toBe("Dr. Provider");
      expect(persisted.erHandoffV1.handoffStatus).toBe("IN_PROGRESS");
    }
  });
});
