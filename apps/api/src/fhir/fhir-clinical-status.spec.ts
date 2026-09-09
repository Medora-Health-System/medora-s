import { CarePlanComponentStatus, CarePlanStatus, DiagnosisStatus, OrderStatus, TriageVitalsReadingStatus } from "@prisma/client";
import { CARE_PLAN_ACTIVITY_STATUS, CARE_PLAN_STATUS, DIAGNOSIS_STATUS, SERVICE_REQUEST_STATUS, carePlanActivityStatus, diagnosticReportStatus } from "./fhir-clinical.service";
import { FhirResourceService } from "./fhir-resource.service";

describe("P0.3C exhaustive canonical status evidence", () => {
  it("C-SEC-05 queries only ACTIVE TriageVitalsReading rows, so VOIDED rows cannot be projected", async () => {
    expect(Object.values(TriageVitalsReadingStatus).sort()).toEqual(["ACTIVE", "VOIDED"]);
    const prisma = { triageVitalsReading: { findMany: jest.fn().mockResolvedValue([]) } } as any;
    const service = new FhirResourceService(prisma, {} as any, {} as any, { vitalsToObservations: jest.fn() } as any, { baseUrl: () => "https://fhir.test/fhir" } as any);
    await service.searchObservations("facility-a", { patientId: "patient-a", count: 20 }, undefined, undefined, undefined, { patient: "Patient/patient-a" });
    expect(prisma.triageVitalsReading.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ facilityId: "facility-a", status: "ACTIVE" }) }));
  });

  it("C-SEC-09 exhaustively maps every DiagnosisStatus without inventing clinical status for REMOVED", () => {
    expect(Object.keys(DIAGNOSIS_STATUS).sort()).toEqual(Object.values(DiagnosisStatus).sort());
    expect(DIAGNOSIS_STATUS).toEqual({ ACTIVE: { clinical: "active", verification: "confirmed" }, RESOLVED: { clinical: "resolved", verification: "confirmed" }, REMOVED: { clinical: undefined, verification: "entered-in-error" } });
  });

  it("C-SEC-14 exhaustively maps every OrderStatus used by diagnostic OrderItem", () => {
    expect(Object.keys(SERVICE_REQUEST_STATUS).sort()).toEqual(Object.values(OrderStatus).sort());
    expect(SERVICE_REQUEST_STATUS).toEqual({ DRAFT:"draft", PENDING:"active", PLACED:"active", SIGNED:"active", ACKNOWLEDGED:"active", IN_PROGRESS:"active", RESULTED:"completed", VERIFIED:"completed", COMPLETED:"completed", CANCELLED:"revoked" });
    expect((SERVICE_REQUEST_STATUS as Record<string,string>).UNKNOWN).toBeUndefined();
  });

  it("C-SEC-21 maps all status evidence actually stored by Result and fails closed on unknown Order status", () => {
    for (const status of Object.values(OrderStatus)) {
      const cancelled = status === OrderStatus.CANCELLED;
      expect(diagnosticReportStatus({ verifiedAt: null, orderItem: { status } })).toBe(cancelled ? "cancelled" : "preliminary");
      expect(diagnosticReportStatus({ verifiedAt: new Date(), orderItem: { status } })).toBe(cancelled ? "cancelled" : "final");
    }
    expect(() => diagnosticReportStatus({ verifiedAt: null, orderItem: { status: "UNKNOWN" as OrderStatus } })).toThrow("Unmapped Result status evidence");
  });

  it("C-SEC-24 exhaustively maps every CarePlan and component status and rejects unknown components", () => {
    expect(Object.keys(CARE_PLAN_STATUS).sort()).toEqual(Object.values(CarePlanStatus).sort());
    expect(Object.keys(CARE_PLAN_ACTIVITY_STATUS).sort()).toEqual(Object.values(CarePlanComponentStatus).sort());
    for (const status of Object.values(CarePlanComponentStatus)) expect(carePlanActivityStatus(status)).toBe(CARE_PLAN_ACTIVITY_STATUS[status]);
    expect(() => carePlanActivityStatus("UNKNOWN")).toThrow("Unmapped CarePlan component status");
  });
});
