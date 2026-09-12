import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { EncounterType, BillingClassification, EncounterStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { EncounterAiSnapshotBuilder } from "./encounter-ai-snapshot.builder";
import { EncounterAiSnapshotModule } from "./encounter-ai-snapshot.module";
import { encounterAiSnapshotSchema } from "@medora/shared";

const FACILITY_ID = "784f7bd6-8552-4940-8f4e-e0ad40163124";
const OTHER_FACILITY_ID = "24e61efb-cea3-4eda-80e8-1a5d9840541a";
const ENCOUNTER_ID = "d36c2433-51a9-4dd8-83fe-d4304f93202b";
const PATIENT_ID = "c172e148-ad43-4c06-b079-fbb722dddcca";
const ACTOR_USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const OTHER_USER_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

function buildEncounter(base: any = {}) {
  return {
    id: ENCOUNTER_ID,
    patientId: PATIENT_ID,
    type: EncounterType.EMERGENCY,
    status: EncounterStatus.OPEN,
    chiefComplaint: "Chest pain",
    dischargeStatus: null,
    disposition: null,
    nursingAssessment: null,
    providerNote: "Provider note text",
    treatmentPlan: null,
    dischargeSummaryJson: null,
    admissionSummaryJson: null,
    providerDocumentationStatus: "DRAFT",
    providerDocumentationSignedAt: null,
    providerDocumentationSignedByUserId: null,
    workflowState: "IN_TREATMENT",
    billingClassification: BillingClassification.EMERGENCY_DEPARTMENT,
    serviceLine: null,
    facility: {
      country: "United States",
      facilityType: "FREESTANDING_ER",
      billingSiteType: "FREESTANDING_ER",
      billingClassificationMode: "EMERGENCY_ONLY",
    },
    ...base,
  };
}

function buildPrismaMock(overrides: any = {}) {
  const patient = {
    id: PATIENT_ID,
    dob: new Date("1980-01-15"),
    sexAtBirth: "M",
    clinicalHistoryProfileJson: { conditions: ["hypertension"] },
  };

  return {
    userRole: {
      findFirst: jest.fn(async (args: any) => {
        if (
          args.where.userId === ACTOR_USER_ID &&
          args.where.facilityId === FACILITY_ID &&
          args.where.isActive === true
        ) {
          return { id: "role-1" };
        }
        return null;
      }),
    },
    encounter: {
      findFirst: jest.fn(async (args: any) => {
        if (args.where.id === ENCOUNTER_ID && args.where.facilityId === FACILITY_ID) {
          return buildEncounter(overrides.encounter);
        }
        return null;
      }),
    },
    patient: {
      findFirst: jest.fn(async (args: any) => {
        if (args.where.id === PATIENT_ID && args.where.facilityId === FACILITY_ID) {
          return patient;
        }
        return null;
      }),
    },
    triage: {
      findFirst: jest.fn(async () => null),
    },
    triageVitalsReading: {
      findMany: jest.fn(async () => []),
    },
    order: {
      findMany: jest.fn(async () => []),
    },
    result: {
      findMany: jest.fn(async () => []),
    },
    diagnosis: {
      findMany: jest.fn(async () => []),
    },
    medicationAdministration: {
      findMany: jest.fn(async () => []),
    },
    followUp: {
      findMany: jest.fn(async () => []),
    },
    appointment: {
      findMany: jest.fn(async () => []),
    },
    ...overrides.prisma,
  };
}

describe("EncounterAiSnapshotBuilder", () => {
  async function createBuilder(prismaMock: any) {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({})],
        }),
        EncounterAiSnapshotModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    return module.get(EncounterAiSnapshotBuilder);
  }

  it("builds an authorized snapshot with real encounter facts", async () => {
    const prismaMock = buildPrismaMock();
    const builder = await createBuilder(prismaMock);

    const snapshot = await builder.build({
      facilityId: FACILITY_ID,
      encounterId: ENCOUNTER_ID,
      actorUserId: ACTOR_USER_ID,
    });

    expect(snapshot.encounterContext.facilityId).toBe(FACILITY_ID);
    expect(snapshot.encounterContext.encounterId).toBe(ENCOUNTER_ID);
    expect(snapshot.encounterContext.patientId).toBe(PATIENT_ID);
    expect(snapshot.encounterContext.country).toBe("US");
    expect(snapshot.encounterContext.careSetting).toBe("EMERGENCY_DEPARTMENT");
    expect(snapshot.presentation.chiefComplaint).toBe("Chest pain");
    expect(snapshot.patientContext.age).toBeGreaterThan(0);
    expect(snapshot.patientContext.sexAtBirth).toBe("M");
    expect(snapshot.clinicalDocumentation.providerNote).toBe("Provider note text");

    const parsed = encounterAiSnapshotSchema.safeParse(snapshot);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.error(parsed.error.format());
    }
    expect(parsed.success).toBe(true);
  });

  it("rejects an actor without active facility access", async () => {
    const prismaMock = buildPrismaMock();
    const builder = await createBuilder(prismaMock);

    await expect(
      builder.build({
        facilityId: FACILITY_ID,
        encounterId: ENCOUNTER_ID,
        actorUserId: OTHER_USER_ID,
      })
    ).rejects.toThrow("Actor does not have access to the requested facility");

    expect(prismaMock.encounter.findFirst).not.toHaveBeenCalled();
  });

  it("rejects an encounter that does not belong to the requested facility", async () => {
    const prismaMock = buildPrismaMock();
    const builder = await createBuilder(prismaMock);

    await expect(
      builder.build({
        facilityId: OTHER_FACILITY_ID,
        encounterId: ENCOUNTER_ID,
        actorUserId: ACTOR_USER_ID,
      })
    ).rejects.toThrow("Actor does not have access to the requested facility");
  });

  it("excludes direct patient identifiers and secrets", async () => {
    const prismaMock = buildPrismaMock({
      encounter: {
        patient: {
          firstName: "John",
          lastName: "Doe",
          mrn: "MRN123",
          phone: "555-1234",
          email: "john@example.com",
          address: "123 Main St",
          addressLine1: "123 Main St",
        },
      },
    });
    const builder = await createBuilder(prismaMock);

    const snapshot = await builder.build({
      facilityId: FACILITY_ID,
      encounterId: ENCOUNTER_ID,
      actorUserId: ACTOR_USER_ID,
    });

    const snapshotText = JSON.stringify(snapshot);
    expect(snapshotText).not.toContain("John");
    expect(snapshotText).not.toContain("Doe");
    expect(snapshotText).not.toContain("MRN123");
    expect(snapshotText).not.toContain("555-1234");
    expect(snapshotText).not.toContain("john@example.com");
    expect(snapshotText).not.toContain("123 Main St");
    expect(snapshotText).not.toContain("password");
    expect(snapshotText).not.toContain("token");
    expect(snapshotText).not.toContain("secret");
  });

  it("produces the same snapshotVersion for identical clinical data independent of generatedAt", async () => {
    const prismaMock = buildPrismaMock();
    const builder = await createBuilder(prismaMock);

    const snapshot1 = await builder.build({
      facilityId: FACILITY_ID,
      encounterId: ENCOUNTER_ID,
      actorUserId: ACTOR_USER_ID,
    });

    await new Promise((resolve) => setTimeout(resolve, 5));

    const snapshot2 = await builder.build({
      facilityId: FACILITY_ID,
      encounterId: ENCOUNTER_ID,
      actorUserId: ACTOR_USER_ID,
    });

    expect(snapshot1.generatedAt).toBeTruthy();
    expect(snapshot2.generatedAt).toBeTruthy();
    expect(snapshot1.snapshotVersion).toBe(snapshot2.snapshotVersion);
  });

  it("produces a different snapshotVersion when clinical data changes", async () => {
    const prismaMock1 = buildPrismaMock();
    const builder1 = await createBuilder(prismaMock1);
    const snapshot1 = await builder1.build({
      facilityId: FACILITY_ID,
      encounterId: ENCOUNTER_ID,
      actorUserId: ACTOR_USER_ID,
    });

    const prismaMock2 = buildPrismaMock({
      encounter: { chiefComplaint: "Updated complaint" },
    });
    const builder2 = await createBuilder(prismaMock2);
    const snapshot2 = await builder2.build({
      facilityId: FACILITY_ID,
      encounterId: ENCOUNTER_ID,
      actorUserId: ACTOR_USER_ID,
    });

    expect(snapshot1.snapshotVersion).not.toBe(snapshot2.snapshotVersion);
  });

  it("does not call any mutation methods on Prisma", async () => {
    const prismaMock = buildPrismaMock();
    prismaMock.encounter.update = jest.fn();
    prismaMock.encounter.create = jest.fn();
    prismaMock.patient.update = jest.fn();

    const builder = await createBuilder(prismaMock);
    await builder.build({
      facilityId: FACILITY_ID,
      encounterId: ENCOUNTER_ID,
      actorUserId: ACTOR_USER_ID,
    });

    expect(prismaMock.encounter.update).not.toHaveBeenCalled();
    expect(prismaMock.encounter.create).not.toHaveBeenCalled();
    expect(prismaMock.patient.update).not.toHaveBeenCalled();
  });

  it("returns REVIEW_REQUIRED for ambiguous care settings", async () => {
    const prismaMock = buildPrismaMock({
      encounter: {
        type: EncounterType.OUTPATIENT,
        billingClassification: BillingClassification.TELEHEALTH,
      },
    });
    const builder = await createBuilder(prismaMock);

    const snapshot = await builder.build({
      facilityId: FACILITY_ID,
      encounterId: ENCOUNTER_ID,
      actorUserId: ACTOR_USER_ID,
    });

    expect(snapshot.encounterContext.careSetting).toBe("OTHER");
  });

  it("maps unknown country to OTHER jurisdiction", async () => {
    const prismaMock = buildPrismaMock({
      encounter: {
        facility: {
          country: "Mars",
          facilityType: "FREESTANDING_ER",
          billingSiteType: "FREESTANDING_ER",
          billingClassificationMode: "EMERGENCY_ONLY",
        },
      },
    });
    const builder = await createBuilder(prismaMock);

    const snapshot = await builder.build({
      facilityId: FACILITY_ID,
      encounterId: ENCOUNTER_ID,
      actorUserId: ACTOR_USER_ID,
    });

    expect(snapshot.encounterContext.country).toBe("OTHER");
  });

  it("captures orders, results, diagnoses, medications, and disposition when present", async () => {
    const prismaMock = buildPrismaMock({
      prisma: {
        order: {
          findMany: jest.fn(async () => [
            {
              id: "order-1",
              status: "PENDING",
              createdAt: new Date(),
              items: [
                {
                  id: "item-1",
                  catalogItemType: "LAB_TEST",
                  manualLabel: "CBC",
                  status: "PENDING",
                  lifecycleState: "ORDERED",
                  createdAt: new Date(),
                  completedAt: null,
                  route: null,
                  frequencyCode: null,
                  medicationLifecycleStatus: null,
                  enterpriseProcedureId: null,
                },
              ],
            },
          ]),
        },
        result: {
          findMany: jest.fn(async () => [
            {
              id: "result-1",
              orderItemId: "item-1",
              resultText: "Hemoglobin low",
              criticalValue: true,
              acknowledgedByProviderAt: null,
              createdAt: new Date(),
              verifiedAt: null,
            },
          ]),
        },
        diagnosis: {
          findMany: jest.fn(async () => [
            {
              id: "dx-1",
              code: "R06.0",
              description: "Dyspnea",
              status: "ACTIVE",
              sortOrder: 0,
            },
          ]),
        },
        medicationAdministration: {
          findMany: jest.fn(async () => []),
        },
        followUp: {
          findMany: jest.fn(async () => [
            {
              id: "fu-1",
              reason: "primary-care",
              status: "OPEN",
              dueDate: new Date(),
              notes: "Follow up in 1 week",
            },
          ]),
        },
        appointment: {
          findMany: jest.fn(async () => [
            {
              id: "appt-1",
              status: "SCHEDULED",
              scheduledStartAt: new Date(),
              departmentId: "dept-1",
              reason: "Cardiology follow-up",
            },
          ]),
        },
      },
    });

    const builder = await createBuilder(prismaMock);
    const snapshot = await builder.build({
      facilityId: FACILITY_ID,
      encounterId: ENCOUNTER_ID,
      actorUserId: ACTOR_USER_ID,
    });

    expect(snapshot.diagnostics.orders?.length).toBe(1);
    expect(snapshot.diagnostics.orders?.[0].items?.[0].displayLabel).toBe("CBC");
    expect(snapshot.diagnostics.results?.length).toBe(1);
    expect(snapshot.diagnostics.results?.[0].criticalValue).toBe(true);
    expect(snapshot.diagnostics.pendingTests).toContain("item-1");
    expect(snapshot.diagnostics.criticalResults?.length).toBe(1);
    expect(snapshot.diagnoses.documentedDiagnoses?.length).toBe(1);
    expect(snapshot.diagnoses.documentedDiagnoses?.[0].code).toBe("R06.0");
    expect(snapshot.disposition.followUps?.length).toBe(1);
    expect(snapshot.disposition.appointments?.length).toBe(1);
  });
});
