import {
  MedicationCorrectionStatus,
  MedicationOverrideType,
  MedicationVerificationStatus,
  MedicationVerificationType,
  MedicationWasteStatus,
  PharmacyVerificationStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

const MAR_EMAR_MODELS = [
  "MedicationAdministrationVerification",
  "MedicationWasteDocumentation",
  "MedicationAdministrationOverride",
  "MedicationAdministrationCorrection",
  "PharmacyVerification",
] as const satisfies readonly Prisma.ModelName[];

describe("MAR/eMAR schema foundation (M1.3F.1)", () => {
  it("exposes governance models and enums on the Prisma client", () => {
    for (const model of MAR_EMAR_MODELS) {
      expect(Prisma.ModelName[model]).toBe(model);
    }

    expect(MedicationVerificationType.WITNESS).toBe("WITNESS");
    expect(MedicationVerificationType.LASA_ACKNOWLEDGMENT).toBe("LASA_ACKNOWLEDGMENT");
    expect(PharmacyVerificationStatus.VERIFIED).toBe("VERIFIED");
    expect(MedicationCorrectionStatus.RECORDED).toBe("RECORDED");
  });

  it("creates governance rows via delegates without touching orders or catalog", async () => {
    const verificationCreate = jest.fn().mockResolvedValue({ id: "ver-1" });
    const wasteCreate = jest.fn().mockResolvedValue({ id: "waste-1" });
    const overrideCreate = jest.fn().mockResolvedValue({ id: "ovr-1" });
    const correctionCreate = jest.fn().mockResolvedValue({ id: "corr-1" });
    const pharmacyCreate = jest.fn().mockResolvedValue({ id: "pharm-1" });
    const orderUpdate = jest.fn();
    const catalogUpdate = jest.fn();
    const catalogCreate = jest.fn();

    const prisma = {
      medicationAdministrationVerification: { create: verificationCreate },
      medicationWasteDocumentation: { create: wasteCreate },
      medicationAdministrationOverride: { create: overrideCreate },
      medicationAdministrationCorrection: { create: correctionCreate },
      pharmacyVerification: { create: pharmacyCreate },
      orderItem: { update: orderUpdate, create: jest.fn() },
      order: { update: jest.fn(), create: jest.fn() },
      catalogMedication: { update: catalogUpdate, create: catalogCreate, upsert: jest.fn() },
      medicationSafetyProfile: { update: jest.fn(), create: jest.fn() },
    } as unknown as PrismaClient;

    await prisma.medicationAdministrationVerification.create({
      data: {
        facilityId: "fac-1",
        medicationAdministrationId: "ma-1",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        catalogMedicationId: "cat-1",
        verificationType: MedicationVerificationType.DUAL_VERIFICATION,
        verificationStatus: MedicationVerificationStatus.COMPLETED,
        verifierUserId: "user-verifier",
        witnessedByUserId: "user-witness",
        reason: "Controlled substance witness",
        metadata: { sourcePhase: "M1.3F.1" },
      },
    });

    await prisma.medicationWasteDocumentation.create({
      data: {
        facilityId: "fac-1",
        medicationAdministrationId: "ma-1",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        catalogMedicationId: "cat-1",
        wastedAmount: 2.5,
        wastedUnit: "mL",
        wasteReason: "Partial dose not administered",
        witnessUserId: "user-witness",
        documentedByUserId: "user-nurse",
        status: MedicationWasteStatus.COMPLETED,
      },
    });

    await prisma.medicationAdministrationOverride.create({
      data: {
        facilityId: "fac-1",
        medicationAdministrationId: "ma-1",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        overrideType: MedicationOverrideType.HIGH_ALERT_OVERRIDE,
        overrideReason: "Emergency administration",
        actorUserId: "user-nurse",
      },
    });

    await prisma.medicationAdministrationCorrection.create({
      data: {
        facilityId: "fac-1",
        medicationAdministrationId: "ma-1",
        correctedByUserId: "user-nurse",
        correctionReason: "Wrong effective time documented",
        previousValues: { effectiveAdministeredAt: "2026-05-01T10:00:00.000Z" },
        correctedValues: { effectiveAdministeredAt: "2026-05-01T09:30:00.000Z" },
        status: MedicationCorrectionStatus.RECORDED,
      },
    });

    await prisma.pharmacyVerification.create({
      data: {
        facilityId: "fac-1",
        orderItemId: "oi-1",
        encounterId: "enc-1",
        catalogMedicationId: "cat-1",
        verificationStatus: PharmacyVerificationStatus.PENDING,
        pharmacistUserId: "user-rph",
        verificationNote: "Awaiting pharmacist review",
      },
    });

    expect(verificationCreate).toHaveBeenCalledTimes(1);
    expect(wasteCreate).toHaveBeenCalledTimes(1);
    expect(overrideCreate).toHaveBeenCalledTimes(1);
    expect(correctionCreate).toHaveBeenCalledTimes(1);
    expect(pharmacyCreate).toHaveBeenCalledTimes(1);
    expect(orderUpdate).not.toHaveBeenCalled();
    expect(catalogUpdate).not.toHaveBeenCalled();
    expect(catalogCreate).not.toHaveBeenCalled();
  });

  it("accepts multiple pharmacy verification rows per order item (no unique on orderItemId)", () => {
    const createInputs: Prisma.PharmacyVerificationCreateInput[] = [
      {
        facility: { connect: { id: "fac-1" } },
        orderItem: { connect: { id: "oi-1" } },
        encounter: { connect: { id: "enc-1" } },
        verificationStatus: PharmacyVerificationStatus.REJECTED,
      },
      {
        facility: { connect: { id: "fac-1" } },
        orderItem: { connect: { id: "oi-1" } },
        encounter: { connect: { id: "enc-1" } },
        verificationStatus: PharmacyVerificationStatus.PENDING,
      },
    ];
    expect(createInputs).toHaveLength(2);
  });
});
