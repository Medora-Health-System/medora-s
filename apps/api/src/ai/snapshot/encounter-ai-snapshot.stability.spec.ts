import { EncounterAiSnapshotBuilder } from "./encounter-ai-snapshot.builder.js";

const FACILITY_ID = "784f7bd6-8552-4940-8f4e-e0ad40163124";
const ENCOUNTER_ID = "d36c2433-51a9-4dd8-83fe-d4304f93202b";
const PATIENT_ID = "c172e148-ad43-4c06-b079-fbb722dddcca";
const ACTOR_USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

function prismaMock(nursingAssessment: Record<string, unknown>) {
  return {
    userRole: { findFirst: jest.fn(async () => ({ id: "role-1" })) },
    encounter: {
      findFirst: jest.fn(async () => ({
        id: ENCOUNTER_ID,
        patientId: PATIENT_ID,
        type: "EMERGENCY",
        status: "OPEN",
        chiefComplaint: "Chest pain",
        dischargeStatus: null,
        disposition: null,
        nursingAssessment,
        providerNote: null,
        treatmentPlan: null,
        dischargeSummaryJson: null,
        admissionSummaryJson: null,
        providerDocumentationStatus: "DRAFT",
        providerDocumentationSignedAt: null,
        providerDocumentationSignedByUserId: null,
        workflowState: "IN_TREATMENT",
        billingClassification: "EMERGENCY_DEPARTMENT",
        serviceLine: null,
        facility: {
          country: "United States",
          facilityType: "FREESTANDING_ER",
          billingSiteType: "FREESTANDING_ER",
          billingClassificationMode: "EMERGENCY_ONLY",
        },
      })),
    },
    patient: {
      findFirst: jest.fn(async () => ({
        id: PATIENT_ID,
        dob: new Date("1980-01-15T00:00:00.000Z"),
        sexAtBirth: "M",
        clinicalHistoryProfileJson: null,
      })),
    },
    triage: { findFirst: jest.fn(async () => null) },
    triageVitalsReading: { findMany: jest.fn(async () => []) },
    order: { findMany: jest.fn(async () => []) },
    result: { findMany: jest.fn(async () => []) },
    diagnosis: { findMany: jest.fn(async () => []) },
    medicationAdministration: { findMany: jest.fn(async () => []) },
    followUp: { findMany: jest.fn(async () => []) },
    appointment: { findMany: jest.fn(async () => []) },
  } as any;
}

async function build(builder: EncounterAiSnapshotBuilder) {
  return builder.build({
    facilityId: FACILITY_ID,
    encounterId: ENCOUNTER_ID,
    actorUserId: ACTOR_USER_ID,
  });
}

describe("EncounterAiSnapshotBuilder structured documentation stability", () => {
  it("keeps snapshot version and entry ids stable across refreshes", async () => {
    const prisma = prismaMock({
      erNursingReassessmentV1: {
        reassessmentAt: "2026-09-13T12:00:00.000Z",
        painScore: 4,
      },
      inpatientNursingAssessmentV1: {
        clinicalDocumentedAt: "2026-09-13T11:30:00.000Z",
        mentalStatus: "alert",
      },
    });
    const builder = new EncounterAiSnapshotBuilder(prisma);

    const first = await build(builder);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await build(builder);

    expect(first.snapshotVersion).toBe(second.snapshotVersion);
    expect(first.clinicalDocumentation.reassessments).toHaveLength(1);
    expect(first.clinicalDocumentation.reassessments?.[0].namespace).toBe(
      "erNursingReassessmentV1"
    );
    expect(first.clinicalDocumentation.reassessments?.[0].documentedAt).toBe(
      "2026-09-13T12:00:00.000Z"
    );
    expect(first.clinicalDocumentation.reassessments?.[0].id).toBe(
      second.clinicalDocumentation.reassessments?.[0].id
    );
    expect(first.clinicalDocumentation.structuredEntries?.[0].documentedAt).toBe(
      "2026-09-13T11:30:00.000Z"
    );
  });

  it("uses a stable non-clinical fallback when source timing is unavailable", async () => {
    const prisma = prismaMock({
      inpatientNursingReassessmentV1: { mentalStatus: "alert" },
    });
    const builder = new EncounterAiSnapshotBuilder(prisma);

    const first = await build(builder);
    const second = await build(builder);
    const entry1 = first.clinicalDocumentation.reassessments?.[0];
    const entry2 = second.clinicalDocumentation.reassessments?.[0];

    expect(entry1?.documentedAt).toBe("1970-01-01T00:00:00.000Z");
    expect(entry1?.id).toBe(entry2?.id);
    expect(first.snapshotVersion).toBe(second.snapshotVersion);
  });

  it("changes stable identity and snapshot version when structured clinical data changes", async () => {
    const builder1 = new EncounterAiSnapshotBuilder(
      prismaMock({ erNursingReassessmentV1: { reassessmentAt: "2026-09-13T12:00:00.000Z", painScore: 4 } })
    );
    const builder2 = new EncounterAiSnapshotBuilder(
      prismaMock({ erNursingReassessmentV1: { reassessmentAt: "2026-09-13T12:00:00.000Z", painScore: 7 } })
    );

    const first = await build(builder1);
    const second = await build(builder2);

    expect(first.snapshotVersion).not.toBe(second.snapshotVersion);
    expect(first.clinicalDocumentation.reassessments?.[0].id).not.toBe(
      second.clinicalDocumentation.reassessments?.[0].id
    );
  });
});
