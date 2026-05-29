import { BadRequestException } from "@nestjs/common";
import { AuditAction, EncounterStatus } from "@prisma/client";
import {
  BELONGINGS_ALTERED_PATIENT_CARD_ID,
  BELONGINGS_INVENTORY_CARD_ID,
  BELONGINGS_TRANSFER_SECURITY_CARD_ID,
  BLOOD_PRODUCT_INITIATION_CARD_ID,
  BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID,
  BLOOD_PRODUCT_VERIFICATION_CARD_ID,
  HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID,
  RESTRAINT_INITIATION_CARD_ID,
  VALUABLES_INVENTORY_CARD_ID,
} from "@medora/shared";
import { ClinicalDocumentationService } from "./clinical-documentation.service";

describe("ClinicalDocumentationService — immediate witness (EDOC.8B)", () => {
  const entryRow = {
    id: "edoc-iw-1",
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

  const VERIFICATION_PAYLOAD = {
    verificationTime: "2026-05-28T12:00:00.000Z",
    productType: "PRBC",
    unitIdentifier: "UNIT-ABC",
    unitVolumeMl: 250,
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
    unitVolumeMl: 250,
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

  function buildService() {
    const create = jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        ...entryRow,
        id: "edoc-iw-new",
        cardId: String(data.cardId ?? entryRow.cardId),
        category: String(data.category ?? entryRow.category),
        payloadJson: data.payloadJson ?? entryRow.payloadJson,
        requiresWitnessSignature: Boolean(data.requiresWitnessSignature),
        witnessedAt: data.witnessedAt ?? null,
        witnessedByUserId: data.witnessedByUserId ?? null,
        witnessDisplayNameSnapshot: data.witnessDisplayNameSnapshot ?? null,
        witnessRoleSnapshot: data.witnessRoleSnapshot ?? null,
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
        findFirst: jest.fn().mockResolvedValue({ clinicalDocumentationWitnessPolicyJson: null }),
      },
      encounterClinicalDocumentationEntry: {
        create,
      },
      user: {
        findFirst: jest.fn().mockImplementation(({ where }: { where: { id: string; isActive?: boolean } }) => {
          if (where.id === "u2") return Promise.resolve({ id: "u2", isActive: true });
          if (where.id === "u-inactive") return Promise.resolve(null);
          return Promise.resolve(null);
        }),
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
          if (where.id === "u1") return Promise.resolve({ firstName: "Jane", lastName: "Nurse" });
          if (where.id === "u2") return Promise.resolve({ firstName: "Bob", lastName: "Witness" });
          return Promise.resolve(null);
        }),
      },
      userRole: {
        findMany: jest.fn().mockResolvedValue([{ role: { code: "RN", name: "Infirmier(ère)" } }]),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          encounterClinicalDocumentationEntry: { create },
        })
      ),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    return {
      svc: new ClinicalDocumentationService(prisma as never, audit as never),
      create,
      audit,
    };
  }

  it("createEntryWithWitness succeeds for blood verification (EDOC.8B)", async () => {
    const { svc, create } = buildService();
    const saved = await svc.createEntryWithWitness(
      "f1",
      "e1",
      {
        category: "BLOOD_PRODUCT_DOCUMENTATION",
        cardId: BLOOD_PRODUCT_VERIFICATION_CARD_ID,
        payloadJson: VERIFICATION_PAYLOAD,
        witnessUserId: "u2",
      },
      "u1"
    );
    expect(saved.witnessStatus).toBe("WITNESSED");
    expect(saved.witnessedAt).toBeTruthy();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          witnessedByUserId: "u2",
          requiresWitnessSignature: true,
          payloadJson: expect.objectContaining({ verificationStatus: "VERIFIED" }),
        }),
      })
    );
  });

  it("createEntryWithWitness rejects self-witness (EDOC.8B)", async () => {
    const { svc, create } = buildService();
    await expect(
      svc.createEntryWithWitness(
        "f1",
        "e1",
        {
          category: "BLOOD_PRODUCT_DOCUMENTATION",
          cardId: BLOOD_PRODUCT_VERIFICATION_CARD_ID,
          payloadJson: VERIFICATION_PAYLOAD,
          witnessUserId: "u1",
        },
        "u1"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it("createEntryWithWitness rolls back when witness inactive (EDOC.8B)", async () => {
    const { svc, create } = buildService();
    await expect(
      svc.createEntryWithWitness(
        "f1",
        "e1",
        {
          category: "BLOOD_PRODUCT_DOCUMENTATION",
          cardId: BLOOD_PRODUCT_VERIFICATION_CARD_ID,
          payloadJson: VERIFICATION_PAYLOAD,
          witnessUserId: "u-inactive",
        },
        "u1"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it("createEntryWithWitness rejects non-immediate card (EDOC.8B)", async () => {
    const { svc, create } = buildService();
    await expect(
      svc.createEntryWithWitness(
        "f1",
        "e1",
        {
          category: "BLOOD_PRODUCT_DOCUMENTATION",
          cardId: BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID,
          payloadJson: {
            assessmentTime: "2026-05-28T12:00:00.000Z",
            productType: "PRBC",
            unitIdentifier: "U1",
            unitVolumeMl: 250,
            baselineTemperature: "37.0",
            baselineHeartRate: 80,
            baselineRespRate: 16,
            baselineBloodPressure: "120/80",
            baselineSpo2: 98,
            patientIdentityVerified: true,
            consentVerified: true,
            symptomsPresent: false,
            symptomChecklist: [],
          },
          witnessUserId: "u2",
        },
        "u1"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it("createEntryWithWitness audits create + witness safely (EDOC.8B)", async () => {
    const { svc, audit } = buildService();
    await svc.createEntryWithWitness(
      "f1",
      "e1",
      {
        category: "BLOOD_PRODUCT_DOCUMENTATION",
        cardId: BLOOD_PRODUCT_VERIFICATION_CARD_ID,
        payloadJson: VERIFICATION_PAYLOAD,
        witnessUserId: "u2",
      },
      "u1"
    );
    expect(audit.log).toHaveBeenCalledTimes(2);
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ENCOUNTER_CLINICAL_DOCUMENTATION_CREATED,
      "ENCOUNTER_CLINICAL_DOCUMENTATION_ENTRY",
      expect.objectContaining({
        metadata: expect.objectContaining({
          entryId: "edoc-iw-new",
          authorUserId: "u1",
          payloadKeyCount: expect.any(Number),
        }),
      })
    );
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ENCOUNTER_CLINICAL_DOCUMENTATION_WITNESSED,
      "ENCOUNTER_CLINICAL_DOCUMENTATION_ENTRY",
      expect.objectContaining({
        metadata: expect.objectContaining({
          witnessUserId: "u2",
          entryId: "edoc-iw-new",
        }),
      })
    );
    const createMeta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    const witnessMeta = audit.log.mock.calls[1]?.[2]?.metadata as Record<string, unknown>;
    expect(createMeta).not.toHaveProperty("payloadJson");
    expect(witnessMeta).not.toHaveProperty("payloadJson");
  });

  it("blood initiation createEntryWithWitness finalizes initiation status (EDOC.8B)", async () => {
    const { svc, create } = buildService();
    await svc.createEntryWithWitness(
      "f1",
      "e1",
      {
        category: "BLOOD_PRODUCT_DOCUMENTATION",
        cardId: BLOOD_PRODUCT_INITIATION_CARD_ID,
        payloadJson: INITIATION_PAYLOAD,
        witnessUserId: "u2",
      },
      "u1"
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payloadJson: expect.objectContaining({ initiationStatus: "VERIFIED" }),
        }),
      })
    );
  });

  it("restraint initiation createEntryWithWitness works (EDOC.8B)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntryWithWitness(
      "f1",
      "e1",
      {
        category: "RESTRAINT_DOCUMENTATION",
        cardId: RESTRAINT_INITIATION_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T12:00:00.000Z",
          restraintType: "BEHAVIORAL",
          reasonForRestraint: "VIOLENT_BEHAVIOR",
          alternativesAttempted: ["VERBAL_DEESCALATION", "REORIENTATION"],
          continuedNeed: true,
          injuryPresent: false,
          circulationAssessment: "NORMAL",
          mentalStatusAssessment: "Agitated, redirectable.",
          physicianOrderVerified: true,
          orderingProviderId: "provider-1",
        },
        witnessUserId: "u2",
      },
      "u1"
    );
    expect(saved.witnessStatus).toBe("WITNESSED");
  });

  it("high-alert verification createEntryWithWitness works (EDOC.8B)", async () => {
    const { svc, create } = buildService();
    await svc.createEntryWithWitness(
      "f1",
      "e1",
      {
        category: "HIGH_ALERT_INFUSION_DOCUMENTATION",
        cardId: HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID,
        payloadJson: {
          verificationTime: "2026-05-28T12:00:00.000Z",
          medicationType: "HEPARIN",
          medicationName: "Heparin drip",
          concentration: "25k/500mL",
          orderedRate: "18 u/kg/hr",
          orderedDose: "1300 u/hr",
          weightBasedCalculationVerified: true,
          pumpProgrammingVerified: true,
          lineTracingVerified: true,
          patientVerified: true,
          providerOrderVerified: true,
          independentDoubleCheckPerformed: true,
        },
        witnessUserId: "u2",
      },
      "u1"
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payloadJson: expect.objectContaining({ verificationStatus: "VERIFIED" }),
        }),
      })
    );
  });

  const BELONGINGS_INVENTORY_PAYLOAD = {
    documentedAt: "2026-05-28T12:00:00.000Z",
    patientAbleToParticipate: true,
    clothingItems: ["Jacket"],
    personalItems: [],
    assistiveDevices: [],
    medicationsBroughtFromHome: false,
    belongingsKeptWithPatient: true,
    belongingsBagged: false,
    notes: "Patient wallet kept at bedside.",
  };

  const TRANSFER_SECURITY_PAYLOAD = {
    transferredAt: "2026-05-28T13:00:00.000Z",
    bagIdentifier: "BAG-SEC-9",
    transferredByUserAcknowledged: true,
    receivedBySecurityName: "Security Officer",
    storageLocation: "SECURITY",
  };

  it("createEntry without witness for basic belongings inventory (EDOC.9)", async () => {
    const { svc, create } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "BELONGINGS_VALUABLES_DOCUMENTATION",
        cardId: BELONGINGS_INVENTORY_CARD_ID,
        payloadJson: BELONGINGS_INVENTORY_PAYLOAD,
      },
      "u1"
    );
    expect(saved.witnessStatus).toBe("NOT_REQUIRED");
    expect(create).toHaveBeenCalled();
  });

  it("createEntryWithWitness succeeds for security transfer (EDOC.9)", async () => {
    const { svc, create } = buildService();
    const saved = await svc.createEntryWithWitness(
      "f1",
      "e1",
      {
        category: "BELONGINGS_VALUABLES_DOCUMENTATION",
        cardId: BELONGINGS_TRANSFER_SECURITY_CARD_ID,
        payloadJson: TRANSFER_SECURITY_PAYLOAD,
        witnessUserId: "u2",
      },
      "u1"
    );
    expect(saved.witnessStatus).toBe("WITNESSED");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          witnessedByUserId: "u2",
          cardId: BELONGINGS_TRANSFER_SECURITY_CARD_ID,
        }),
      })
    );
  });

  it("altered patient createEntryWithWitness succeeds (EDOC.9)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntryWithWitness(
      "f1",
      "e1",
      {
        category: "BELONGINGS_VALUABLES_DOCUMENTATION",
        cardId: BELONGINGS_ALTERED_PATIENT_CARD_ID,
        payloadJson: {
          documentedAt: "2026-05-28T12:00:00.000Z",
          patientCondition: "UNCONSCIOUS",
          belongingsInventoriedByTwoStaff: true,
          bagIdentifier: "BAG-ALT-9",
          valuablesPresent: true,
          securityNotified: true,
          familyNotified: false,
        },
        witnessUserId: "u2",
      },
      "u1"
    );
    expect(saved.witnessStatus).toBe("WITNESSED");
  });

  it("rejects sensitive identifiers in belongings payload (EDOC.9)", async () => {
    const { svc, create } = buildService();
    await expect(
      svc.createEntry(
        "f1",
        "e1",
        {
          category: "BELONGINGS_VALUABLES_DOCUMENTATION",
          cardId: VALUABLES_INVENTORY_CARD_ID,
          payloadJson: {
            documentedAt: "2026-05-28T12:00:00.000Z",
            cashPresent: false,
            jewelryPresent: false,
            electronicsPresent: false,
            walletOrPursePresent: false,
            keysPresent: false,
            identificationPresent: false,
            patientDeclinedValuablesInventory: false,
            valuablesSecured: false,
            notes: "SSN 123-45-6789 on paper",
          },
        },
        "u1"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it("belongings audit metadata excludes payload PHI fields (EDOC.9)", async () => {
    const { svc, audit } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "BELONGINGS_VALUABLES_DOCUMENTATION",
        cardId: VALUABLES_INVENTORY_CARD_ID,
        payloadJson: {
          documentedAt: "2026-05-28T12:00:00.000Z",
          cashPresent: true,
          cashAmount: "$75",
          jewelryPresent: true,
          jewelryDescription: "Gold ring",
          electronicsPresent: false,
          walletOrPursePresent: true,
          keysPresent: true,
          identificationPresent: true,
          patientDeclinedValuablesInventory: false,
          valuablesSecured: false,
          notes: "Stored in locker.",
        },
      },
      "u1"
    );
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    expect(meta).not.toHaveProperty("notes");
    expect(meta).not.toHaveProperty("cashAmount");
    expect(meta).not.toHaveProperty("jewelryDescription");
    expect(meta.payloadKeyCount).toBeGreaterThan(0);
  });

  it("normal create still works for non-immediate cards (EDOC.8B)", async () => {
    const { svc, create } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "BLOOD_PRODUCT_DOCUMENTATION",
        cardId: BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T12:00:00.000Z",
          productType: "PRBC",
          unitIdentifier: "U1",
          unitVolumeMl: 250,
          baselineTemperature: "37.0",
          baselineHeartRate: 80,
          baselineRespRate: 16,
          baselineBloodPressure: "120/80",
          baselineSpo2: 98,
          patientIdentityVerified: true,
          consentVerified: true,
          symptomsPresent: false,
          symptomChecklist: [],
        },
      },
      "u1"
    );
    expect(saved.witnessStatus).toBe("NOT_REQUIRED");
    expect(create).toHaveBeenCalled();
  });
});
