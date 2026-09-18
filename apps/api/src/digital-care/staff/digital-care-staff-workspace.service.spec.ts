import { ForbiddenException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { DigitalCareStaffWorkspaceService } from "./digital-care-staff-workspace.service";

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";
const FACILITY_A = "facility-a";
const FACILITY_B = "facility-b";

const patientRow = {
  id: PATIENT_ID,
  firstName: "David",
  lastName: "B",
  middleName: null,
  mrn: "MS-2026-705E1B86",
  dob: new Date("1985-04-08"),
  sex: "M",
  sexAtBirth: "M",
  phone: "5123456789",
  email: null,
  address: null,
  city: null,
  country: null,
  clinicalHistoryProfileJson: null,
};

function missingThreadError() {
  return { code: "P2010", message: 'relation "PatientPortalMessageThread" does not exist' };
}

function buildPrisma(options?: { threadError?: boolean; patient?: typeof patientRow | null; facilityId?: string }) {
  const $queryRaw = options?.threadError
    ? jest.fn().mockRejectedValue(missingThreadError())
    : jest.fn().mockResolvedValue([]);
  return {
    $queryRaw,
    order: { findMany: jest.fn().mockResolvedValue([]) },
    encounter: {
      findMany: jest.fn().mockResolvedValue(
        options?.patient
          ? [{ id: "enc-1", patientId: options.patient.id, type: "OUTPATIENT", status: "OPEN", createdAt: new Date(), dischargedAt: null, roomLabel: null, billingClassification: null, physicianAssignedUserId: null, physicianAssigned: null }]
          : [],
      ),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    patient: {
      findMany: jest.fn().mockResolvedValue(options?.patient ? [{ id: options.patient.id }, options.patient] : []),
      findFirst: jest.fn().mockImplementation(async ({ where }: { where: { id: string; facilityId: string } }) => {
        if (!options?.patient) return null;
        if (where.id !== options.patient.id) return null;
        if (where.facilityId !== (options.facilityId ?? FACILITY_A)) return null;
        return options.patient;
      }),
    },
    encounterCarePlan: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    followUp: { findMany: jest.fn().mockResolvedValue([]) },
    diagnosis: { findMany: jest.fn().mockResolvedValue([]) },
    patientInsuranceCoverage: { findMany: jest.fn().mockResolvedValue([]) },
    appointment: { findMany: jest.fn().mockResolvedValue([]) },
  } as any;
}

describe("DigitalCareStaffWorkspaceService", () => {
  const actorA = { userId: "staff-a", facilityId: FACILITY_A };
  const actorB = { userId: "staff-b", facilityId: FACILITY_B };

  it("scopes roster patients to the actor facility and does not query portal medications", async () => {
    const prisma = buildPrisma();
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const releases = { list: jest.fn() };
    const service = new DigitalCareStaffWorkspaceService(prisma, audit as any, releases as any);
    const result = await service.roster(actorA, { q: "marie" });
    expect(result.patients).toEqual([]);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ facilityId: FACILITY_A }) }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.VIEW,
      "DIGITAL_CARE_ROSTER",
      expect.objectContaining({ facilityId: FACILITY_A, userId: "staff-a" }),
    );
    expect(releases.list).not.toHaveBeenCalled();
  });

  it("rejects workspace reads for a patient outside the facility", async () => {
    const prisma = buildPrisma({ patient: patientRow, facilityId: FACILITY_A });
    const service = new DigitalCareStaffWorkspaceService(prisma, { log: jest.fn() } as any, { list: jest.fn() } as any);
    await expect(service.workspace(actorB, PATIENT_ID)).rejects.toThrow("Patient not found");
  });

  it("includes a facility patient with an encounter even when no message thread exists", async () => {
    const prisma = buildPrisma({ patient: patientRow });
    prisma.patient.findMany = jest
      .fn()
      .mockResolvedValueOnce([{ id: PATIENT_ID }])
      .mockResolvedValueOnce([patientRow]);
    const service = new DigitalCareStaffWorkspaceService(prisma, { log: jest.fn() } as any, { list: jest.fn() } as any);
    const result = await service.roster(actorA);
    expect(result.patients).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: PATIENT_ID, displayName: "David B", unreadCount: 0, portalActive: false })]),
    );
  });

  it("does not crash the roster when optional portal/message metadata storage is missing", async () => {
    const prisma = buildPrisma({ threadError: true, patient: patientRow });
    prisma.patient.findMany = jest
      .fn()
      .mockResolvedValueOnce([{ id: PATIENT_ID }])
      .mockResolvedValueOnce([patientRow]);
    const service = new DigitalCareStaffWorkspaceService(prisma, { log: jest.fn() } as any, { list: jest.fn() } as any);
    const result = await service.roster(actorA);
    expect(result.patients[0]?.id).toBe(PATIENT_ID);
    expect(result.messagingStorageAvailable).toBe(false);
  });

  it("opens the workspace with the enterprise patient search id in the active facility", async () => {
    const prisma = buildPrisma({ patient: patientRow });
    const releases = { list: jest.fn().mockResolvedValue([{ id: "item-a", patientId: PATIENT_ID, kind: "LAB_TEST", title: "CBC", resultText: null, resultData: null, criticalValue: false, collectedAt: null, clinicalAt: null, released: false }]) };
    const service = new DigitalCareStaffWorkspaceService(prisma, { log: jest.fn() } as any, releases as any);
    const bundle = await service.workspace(actorA, PATIENT_ID);
    expect(prisma.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: PATIENT_ID, facilityId: FACILITY_A } }),
    );
    expect(bundle.identity.id).toBe(PATIENT_ID);
    expect(bundle.results.every((row) => row.patientId === PATIENT_ID)).toBe(true);
    expect(releases.list).toHaveBeenCalledWith(actorA, PATIENT_ID);
  });

  it("does not report an existing inactive-portal patient as missing", async () => {
    const prisma = buildPrisma({ patient: patientRow, threadError: true });
    const service = new DigitalCareStaffWorkspaceService(prisma, { log: jest.fn() } as any, { list: jest.fn().mockResolvedValue([]) } as any);
    const bundle = await service.workspace(actorA, PATIENT_ID);
    expect(bundle.identity.id).toBe(PATIENT_ID);
    expect(bundle.identity.portalActive).toBe(false);
    expect(bundle.messagingStorageAvailable).toBe(false);
  });

  it("rejects a name or MRN substituted for Patient.id", async () => {
    const service = new DigitalCareStaffWorkspaceService(buildPrisma(), { log: jest.fn() } as any, { list: jest.fn() } as any);
    await expect(service.workspace(actorA, "David B")).rejects.toThrow("Patient identity is required");
    await expect(service.workspace(actorA, "MS-2026-705E1B86")).rejects.toThrow("Patient identity is required");
  });

  it("keeps Facility Configuration Digital Care disablement as a hard stop", async () => {
    const prisma = buildPrisma({ patient: patientRow });
    const facilityConfiguration = {
      assertStaffDigitalCare: jest.fn().mockRejectedValue(new ForbiddenException("Soins numériques désactivés pour cet établissement.")),
    };
    const service = new DigitalCareStaffWorkspaceService(
      prisma,
      { log: jest.fn() } as any,
      { list: jest.fn() } as any,
      facilityConfiguration as any,
    );
    await expect(service.roster(actorA)).rejects.toThrow("Soins numériques désactivés");
    await expect(service.workspace(actorA, PATIENT_ID)).rejects.toThrow("Soins numériques désactivés");
  });

  it("CASE D: authorized Facility B search id opens the Digital Care workspace for that same patient", async () => {
    const prisma = buildPrisma({ patient: patientRow, facilityId: FACILITY_B });
    const releases = { list: jest.fn().mockResolvedValue([{ id: "item-a", patientId: PATIENT_ID, kind: "LAB_TEST", title: "CBC", resultText: null, resultData: null, criticalValue: false, collectedAt: null, clinicalAt: null, released: false }]) };
    const service = new DigitalCareStaffWorkspaceService(prisma, { log: jest.fn() } as any, releases as any);
    const bundle = await service.workspace(actorB, PATIENT_ID);
    expect(prisma.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: PATIENT_ID, facilityId: FACILITY_B } }),
    );
    expect(bundle.identity.id).toBe(PATIENT_ID);
    expect(bundle.results.every((row) => row.patientId === PATIENT_ID)).toBe(true);
    expect(releases.list).toHaveBeenCalledWith(actorB, PATIENT_ID);
  });

  it("CASE E: the same Patient.id requested under unauthorized Facility A does not return the patient", async () => {
    const prisma = buildPrisma({ patient: patientRow, facilityId: FACILITY_B });
    const service = new DigitalCareStaffWorkspaceService(prisma, { log: jest.fn() } as any, { list: jest.fn() } as any);
    await expect(service.workspace(actorA, PATIENT_ID)).rejects.toThrow("Patient not found");
  });

  it("does not swallow unrelated SQL failures as optional portal storage", async () => {
    const prisma = buildPrisma({ patient: patientRow });
    prisma.$queryRaw = jest.fn().mockRejectedValue({
      code: "P2010",
      message: "Raw query failed. Code: `42601`. Message: `syntax error at or near SELECT`",
    });
    const service = new DigitalCareStaffWorkspaceService(prisma, { log: jest.fn() } as any, { list: jest.fn() } as any);
    await expect(service.workspace(actorA, PATIENT_ID)).rejects.toEqual(
      expect.objectContaining({ code: "P2010", message: expect.stringContaining("syntax error") }),
    );
  });

  it("does not return a facility B patient on a facility A roster", async () => {
    const prisma = buildPrisma({ patient: { ...patientRow, id: "22222222-2222-4222-8222-222222222222" } });
    prisma.patient.findMany = jest.fn().mockImplementation(async ({ where }: { where: { facilityId: string } }) => {
      expect(where.facilityId).toBe(FACILITY_A);
      return [];
    });
    const service = new DigitalCareStaffWorkspaceService(prisma, { log: jest.fn() } as any, { list: jest.fn() } as any);
    const result = await service.roster(actorA);
    expect(result.patients).toEqual([]);
  });
  it("resolves catalog-backed medication names instead of the generic Medication fallback", async () => {
    const prisma = buildPrisma({ patient: patientRow });
    prisma.order.findMany = jest.fn().mockResolvedValue([
      {
        id: "order-med-1",
        type: "MEDICATION",
        status: "PLACED",
        createdAt: new Date("2026-09-01T12:00:00.000Z"),
        cancelledAt: null,
        prescriberName: "Rajnil Shah",
        notes: null,
        encounter: { type: "INPATIENT" },
        items: [
          {
            id: "item-med-1",
            catalogItemId: "cat-ondansetron",
            medicationProductId: null,
            catalogItemType: "MEDICATION",
            manualLabel: null,
            manualSecondaryText: null,
            strength: "4 mg/mL",
            route: "IVP",
            frequencyCode: "NOW",
            notes: null,
            status: "COMPLETED",
            medicationLifecycleStatus: "ACTIVE",
            medicationFulfillmentIntent: "ADMINISTER_CHART",
          },
        ],
      },
    ]);
    prisma.catalogMedication = {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "cat-ondansetron",
          code: "ONDANSETRON_4MG_ML_INJECTABLE",
          name: "Ondansetron",
          displayNameEn: "Ondansetron",
          displayNameFr: "Ondansétron",
          genericName: "ondansetron",
          therapeuticClass: null,
          administrationType: null,
          billingClass: null,
          strength: "4 mg/mL",
          dosageForm: "Injection",
          route: "IVP",
          ndc11: null,
          ndcDisplay: null,
          billingUnitType: null,
          isControlled: false,
          controlledSchedule: null,
          requiresWitness: false,
          requiresDoubleSign: false,
        },
      ]),
    };
    prisma.medicationProduct = { findMany: jest.fn().mockResolvedValue([]) };

    const service = new DigitalCareStaffWorkspaceService(
      prisma,
      { log: jest.fn().mockResolvedValue(undefined) } as any,
      { list: jest.fn().mockResolvedValue([]) } as any,
    );
    const bundle = await service.workspace(actorA, PATIENT_ID);

    expect(bundle.medications.ordered).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "item-med-1",
          name: "Ondansetron",
          strength: "4 mg/mL",
          route: "IVP",
        }),
      ]),
    );
    expect(bundle.medications.ordered[0]?.name).not.toBe("Medication");
  });

});
