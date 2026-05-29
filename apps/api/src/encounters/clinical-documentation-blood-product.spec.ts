import { BadRequestException } from "@nestjs/common";
import { AuditAction, EncounterStatus } from "@prisma/client";
import {
  BLOOD_PRODUCT_COMPLETION_CARD_ID,
  BLOOD_PRODUCT_INITIATION_CARD_ID,
  BLOOD_PRODUCT_REACTION_CARD_ID,
  BLOOD_PRODUCT_REASSESSMENT_CARD_ID,
  BLOOD_PRODUCT_VERIFICATION_CARD_ID,
  MASSIVE_TRANSFUSION_PROTOCOL_EVENT_CARD_ID,
} from "@medora/shared";
import { ClinicalDocumentationService } from "./clinical-documentation.service";

describe("ClinicalDocumentationService — blood product (EDOC.7)", () => {
  const entryRow = {
    id: "edoc-blood-1",
    encounterId: "e1",
    category: "BLOOD_PRODUCT_DOCUMENTATION",
    cardId: BLOOD_PRODUCT_VERIFICATION_CARD_ID,
    authorUserId: "u1",
    authorDisplayNameSnapshot: "Jane Nurse",
    authorRoleSnapshot: "RN",
    createdAt: new Date("2026-05-28T12:00:00.000Z"),
    payloadJson: {},
    voidedAt: null,
    requiresWitnessSignature: true,
    witnessedAt: null,
    witnessedByUserId: null,
    witnessDisplayNameSnapshot: null,
    witnessRoleSnapshot: null,
  };

  function buildService(overrides?: {
    existingEntry?: Record<string, unknown> | null;
    facilityPolicy?: Record<string, unknown> | null;
  }) {
    const create = jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        ...entryRow,
        id: "edoc-blood-new",
        cardId: String(data.cardId ?? entryRow.cardId),
        category: String(data.category ?? entryRow.category),
        payloadJson: data.payloadJson ?? entryRow.payloadJson,
        requiresWitnessSignature: Boolean(data.requiresWitnessSignature),
      })
    );
    const update = jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        ...(overrides?.existingEntry ?? entryRow),
        witnessedAt: data.witnessedAt ?? new Date("2026-05-28T13:00:00.000Z"),
        witnessedByUserId: data.witnessedByUserId ?? "u2",
        witnessDisplayNameSnapshot: data.witnessDisplayNameSnapshot ?? "Bob Witness",
        witnessRoleSnapshot: data.witnessRoleSnapshot ?? "RN",
      })
    );
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "e1",
          patientId: "p1",
          facilityId: "f1",
          status: EncounterStatus.OPEN,
        }),
      },
      facility: {
        findFirst: jest.fn().mockResolvedValue({
          clinicalDocumentationWitnessPolicyJson: overrides?.facilityPolicy ?? null,
        }),
      },
      encounterClinicalDocumentationEntry: {
        findMany: jest.fn().mockResolvedValue([entryRow]),
        findFirst: jest.fn().mockResolvedValue(overrides?.existingEntry ?? entryRow),
        create,
        update,
      },
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
          if (where.id === "u2") {
            return Promise.resolve({ firstName: "Bob", lastName: "Witness" });
          }
          return Promise.resolve({ firstName: "Jane", lastName: "Nurse" });
        }),
      },
      userRole: {
        findMany: jest.fn().mockResolvedValue([{ role: { code: "RN", name: "Infirmier(ère)" } }]),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          encounterClinicalDocumentationEntry: { create, update },
        })
      ),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    return {
      svc: new ClinicalDocumentationService(prisma as never, audit as never),
      create,
      update,
      audit,
    };
  }

  const VERIFICATION_PAYLOAD = {
    verificationTime: "2026-05-28T12:00:00.000Z",
    productType: "PRBC",
    unitIdentifier: "UNIT-ABC",
    patientIdentityVerified: true,
    bloodTypeVerified: true,
    crossmatchVerified: true,
    expirationVerified: true,
    consentVerified: true,
    specialRequirements: "NONE",
  };

  const INITIATION_PAYLOAD = {
    startTime: "2026-05-28T12:30:00.000Z",
    productType: "PRBC",
    unitIdentifier: "UNIT-ABC",
    baselineTemperature: "37.0",
    baselineHeartRate: 80,
    baselineRespRate: 16,
    baselineBloodPressure: "120/80",
    baselineSpo2: 98,
    preMedicationAdministered: false,
    providerOrderVerified: true,
    consentVerified: true,
    administrationStarted: true,
  };

  it("POST Blood Product Verification persists with PENDING_WITNESS status (EDOC.7)", async () => {
    const { svc, create } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "BLOOD_PRODUCT_DOCUMENTATION",
        cardId: BLOOD_PRODUCT_VERIFICATION_CARD_ID,
        payloadJson: VERIFICATION_PAYLOAD,
      },
      "u1"
    );
    expect(saved.cardId).toBe(BLOOD_PRODUCT_VERIFICATION_CARD_ID);
    expect(saved.payloadSummaryEn.some((l) => l.key === "Unit ID")).toBe(true);
    expect(saved.payloadSummaryFr.some((l) => l.key === "N° unité")).toBe(true);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requiresWitnessSignature: true,
          payloadJson: expect.objectContaining({ verificationStatus: "PENDING_WITNESS" }),
        }),
      })
    );
  });

  it("witnesses Blood Product Verification (EDOC.7)", async () => {
    const pendingEntry = {
      ...entryRow,
      id: "edoc-blood-pending",
      requiresWitnessSignature: true,
      witnessedAt: null,
    };
    const { svc, audit } = buildService({ existingEntry: pendingEntry });
    const witnessed = await svc.witnessEntry("f1", "e1", "edoc-blood-pending", "u2");
    expect(witnessed.witnessStatus).toBe("WITNESSED");
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ENCOUNTER_CLINICAL_DOCUMENTATION_WITNESSED,
      "ENCOUNTER_CLINICAL_DOCUMENTATION_ENTRY",
      expect.objectContaining({
        metadata: expect.objectContaining({
          entryId: "edoc-blood-pending",
          witnessUserId: "u2",
        }),
      })
    );
  });

  it("rejects self-witness on verification (EDOC.7)", async () => {
    const pendingEntry = {
      ...entryRow,
      id: "edoc-blood-pending",
      authorUserId: "u1",
      requiresWitnessSignature: true,
      witnessedAt: null,
    };
    const { svc } = buildService({ existingEntry: pendingEntry });
    await expect(svc.witnessEntry("f1", "e1", "edoc-blood-pending", "u1")).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("POST Blood Product Initiation persists (EDOC.7)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "BLOOD_PRODUCT_DOCUMENTATION",
        cardId: BLOOD_PRODUCT_INITIATION_CARD_ID,
        payloadJson: INITIATION_PAYLOAD,
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Start time")).toBe(true);
  });

  it("POST Reassessment persists (EDOC.7)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "BLOOD_PRODUCT_DOCUMENTATION",
        cardId: BLOOD_PRODUCT_REASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T13:00:00.000Z",
          temperature: "37.1",
          heartRate: 84,
          respRate: 16,
          bloodPressure: "118/76",
          spo2: 97,
          symptomsPresent: false,
          symptomChecklist: [],
          providerNotified: false,
          continuedAdministration: true,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Symptoms present")).toBe(true);
  });

  it("POST Reaction persists (EDOC.7)", async () => {
    const { svc, create } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "BLOOD_PRODUCT_DOCUMENTATION",
        cardId: BLOOD_PRODUCT_REACTION_CARD_ID,
        payloadJson: {
          reactionTime: "2026-05-28T13:30:00.000Z",
          reactionType: "FEBRILE",
          symptoms: ["FEVER", "CHILLS"],
          transfusionStopped: true,
          providerNotified: true,
          bloodBankNotified: true,
          reactionWorkupStarted: true,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Reaction type")).toBe(true);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requiresWitnessSignature: false }),
      })
    );
  });

  it("POST Completion persists with billing readiness metadata (EDOC.7)", async () => {
    const { svc, create } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "BLOOD_PRODUCT_DOCUMENTATION",
        cardId: BLOOD_PRODUCT_COMPLETION_CARD_ID,
        payloadJson: {
          completionTime: "2026-05-28T14:00:00.000Z",
          productType: "PRBC",
          unitIdentifier: "UNIT-ABC",
          volumeInfusedMl: 250,
          transfusionCompleted: true,
          reactionOccurred: false,
          postVitalsReviewed: true,
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payloadJson: expect.objectContaining({
            billingReadinessMetadata: expect.objectContaining({
              capturePhase: "EDOC.7",
              claimsGenerationDeferred: true,
            }),
          }),
        }),
      })
    );
  });

  it("POST MTP event persists (EDOC.7)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "BLOOD_PRODUCT_DOCUMENTATION",
        cardId: MASSIVE_TRANSFUSION_PROTOCOL_EVENT_CARD_ID,
        payloadJson: {
          eventTime: "2026-05-28T12:00:00.000Z",
          eventType: "ACTIVATED",
          initiatedBy: "provider-1",
          reason: "Massive hemorrhage",
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "MTP status")).toBe(true);
    expect(saved.payloadSummaryFr.some((l) => l.key === "Statut PTM")).toBe(true);
  });

  it("audit metadata safe on create (EDOC.7)", async () => {
    const { svc, audit } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "BLOOD_PRODUCT_DOCUMENTATION",
        cardId: BLOOD_PRODUCT_VERIFICATION_CARD_ID,
        payloadJson: VERIFICATION_PAYLOAD,
      },
      "u1"
    );
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ENCOUNTER_CLINICAL_DOCUMENTATION_CREATED,
      "ENCOUNTER_CLINICAL_DOCUMENTATION_ENTRY",
      expect.objectContaining({
        metadata: expect.objectContaining({
          cardId: BLOOD_PRODUCT_VERIFICATION_CARD_ID,
          payloadKeyCount: expect.any(Number),
        }),
      })
    );
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    expect(meta).not.toHaveProperty("notes");
    expect(meta).not.toHaveProperty("verificationNotes");
  });
});
