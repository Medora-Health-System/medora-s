import { CarePlanComponentStatus, CarePlanStatus, DiagnosisStatus, OrderStatus } from "@prisma/client";
import { FHIR_CAPABILITIES, FhirCapabilityRegistry } from "./fhir-capability.registry";
import {
  CARE_PLAN_ACTIVITY_STATUS,
  CARE_PLAN_STATUS,
  DIAGNOSIS_STATUS,
  SERVICE_REQUEST_STATUS,
  carePlanActivityStatus,
  conditionDiagnosisStatuses,
  diagnosticReportStatus,
  serviceRequestOrderStatuses,
} from "./fhir-clinical.service";

describe("FHIR P0.3C reconciliation", () => {
  it("advertises exact read/search scopes for the reconciled clinical resources", () => {
    const scopes = FHIR_CAPABILITIES.map((capability) => capability.futureM2mScope);
    expect(scopes).toEqual(expect.arrayContaining([
      "condition.read", "condition.search",
      "serviceRequest.read", "serviceRequest.search",
      "diagnosticReport.read", "diagnosticReport.search",
      "carePlan.read", "carePlan.search",
    ]));
    expect(new Set(scopes).size).toBe(scopes.length);
    expect(scopes).not.toContain("fhir.*");
  });

  it("keeps admin grantability independent from the runtime FHIR deployment gate", () => {
    const previous = process.env.MEDORA_INTEROP_ENABLED;
    process.env.MEDORA_INTEROP_ENABLED = "false";
    const registry = new FhirCapabilityRegistry();
    expect(registry.enabled()).toEqual([]);
    expect(registry.permissionOptions().map((item) => item.code)).toEqual(expect.arrayContaining([
      "condition.read", "serviceRequest.search", "diagnosticReport.read", "carePlan.search",
    ]));
    process.env.MEDORA_INTEROP_ENABLED = previous;
  });

  it("maps every canonical status without broadening verification semantics", () => {
    expect(Object.keys(DIAGNOSIS_STATUS).sort()).toEqual(Object.values(DiagnosisStatus).sort());
    expect(conditionDiagnosisStatuses(undefined, "confirmed")).toEqual([DiagnosisStatus.ACTIVE, DiagnosisStatus.RESOLVED]);
    expect(conditionDiagnosisStatuses("active", "entered-in-error")).toEqual([]);

    expect(Object.keys(SERVICE_REQUEST_STATUS).sort()).toEqual(Object.values(OrderStatus).sort());
    expect(serviceRequestOrderStatuses("active")).toEqual(expect.arrayContaining([
      OrderStatus.PENDING, OrderStatus.PLACED, OrderStatus.SIGNED, OrderStatus.ACKNOWLEDGED, OrderStatus.IN_PROGRESS,
    ]));

    for (const status of Object.values(OrderStatus)) {
      const cancelled = status === OrderStatus.CANCELLED;
      expect(diagnosticReportStatus({ verifiedAt: null, orderItem: { status } })).toBe(cancelled ? "cancelled" : "preliminary");
    }

    expect(Object.keys(CARE_PLAN_STATUS).sort()).toEqual(Object.values(CarePlanStatus).sort());
    expect(Object.keys(CARE_PLAN_ACTIVITY_STATUS).sort()).toEqual(Object.values(CarePlanComponentStatus).sort());
    for (const status of Object.values(CarePlanComponentStatus)) {
      expect(carePlanActivityStatus(status)).toBe(CARE_PLAN_ACTIVITY_STATUS[status]);
    }
  });
});
