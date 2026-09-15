import { OrderStatus, RoleCode } from "@prisma/client";
import { FHIR_CAPABILITIES } from "./fhir-capability.registry";
import {
  MEDICATION_REQUEST_STATUS,
  FhirMedicationService,
  mapMedicationAdministration,
  mapMedicationRequest,
  medicationAdministrationStatus,
  medicationRequestOrderStatuses,
  medicationRequestStatus,
} from "./fhir-medication.service";

const catalog = {
  id: "cat-1",
  code: "MED-ONDANSETRON",
  name: "Ondansetron",
  displayNameEn: "Ondansetron",
  displayNameFr: "Ondansétron",
  genericName: "ondansetron",
  therapeuticClass: null,
  administrationType: null,
  billingClass: null,
  strength: "4 mg",
  dosageForm: "tablet",
  route: "PO",
  ndc11: null,
  ndcDisplay: null,
  billingUnitType: null,
  isControlled: false,
  controlledSchedule: null,
  requiresWitness: false,
  requiresDoubleSign: false,
};

function requestRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "medreq-1",
    status: OrderStatus.PLACED,
    catalogItemType: "MEDICATION",
    catalogItemId: "cat-1",
    medicationProductId: null,
    manualLabel: null,
    strength: "4 mg",
    route: "PO",
    frequencyCode: "BID",
    refillCount: 1,
    quantity: 10,
    notes: "Take as directed",
    order: {
      patientId: "patient-1",
      encounterId: "encounter-1",
      orderedByUserId: "user-1",
      createdAt: new Date("2026-09-14T12:00:00Z"),
    },
    ...overrides,
  };
}

describe("FHIR Phase 2B medication interoperability", () => {
  it("advertises exactly read/search scopes and excludes front desk", () => {
    const medication = FHIR_CAPABILITIES.filter((c) =>
      ["MedicationRequest", "MedicationAdministration"].includes(c.resourceType),
    );
    expect(medication.map((c) => c.futureM2mScope)).toEqual([
      "medicationRequest.read",
      "medicationRequest.search",
      "medicationAdministration.read",
      "medicationAdministration.search",
    ]);
    expect(medication.every((c) => ["read", "search-type"].includes(c.interaction))).toBe(true);
    expect(medication.every((c) => !c.humanRoles.includes(RoleCode.FRONT_DESK))).toBe(true);
  });

  it("maps every canonical medication order status without broadening semantics", () => {
    expect(Object.keys(MEDICATION_REQUEST_STATUS).sort()).toEqual(Object.values(OrderStatus).sort());
    for (const status of Object.values(OrderStatus)) {
      expect(medicationRequestStatus(status)).toBe(MEDICATION_REQUEST_STATUS[status]);
    }
    expect(medicationRequestOrderStatuses("active")).toEqual(expect.arrayContaining([
      OrderStatus.PENDING,
      OrderStatus.PLACED,
      OrderStatus.SIGNED,
      OrderStatus.ACKNOWLEDGED,
      OrderStatus.IN_PROGRESS,
    ]));
  });

  it("projects MedicationRequest from canonical OrderItem without invented external terminology", () => {
    const resource = mapMedicationRequest(requestRow(), catalog as never) as any;
    expect(resource).toMatchObject({
      resourceType: "MedicationRequest",
      id: "medreq-1",
      status: "active",
      intent: "order",
      subject: { reference: "Patient/patient-1" },
      encounter: { reference: "Encounter/encounter-1" },
      requester: { reference: "Practitioner/user-1" },
    });
    expect(resource.medicationCodeableConcept.coding[0].system).toBe("https://medora.app/fhir/CodeSystem/medication-catalog");
    expect(JSON.stringify(resource)).not.toMatch(/rxnorm|snomed/i);
  });

  it("uses immutable MAR NDC evidence when present and never exposes arbitrary MAR notes", () => {
    const row = {
      id: "mar-1",
      patientId: "patient-1",
      encounterId: "encounter-1",
      orderItemId: "medreq-1",
      administeredAt: new Date("2026-09-14T12:30:00Z"),
      effectiveAdministeredAt: new Date("2026-09-14T12:29:00Z"),
      administeredByUserId: "user-2",
      medicationLabelSnapshot: "Ondansetron 4 mg",
      ndc11Snapshot: "12345678901",
      route: "IV",
      doseValue: 4,
      doseUnit: "mg",
      marAction: "administered",
      infusionPhase: null,
      notes: "private bedside narrative must not be projected",
      orderItem: requestRow(),
    };
    const resource = mapMedicationAdministration(row, catalog as never) as any;
    expect(resource).toMatchObject({
      resourceType: "MedicationAdministration",
      id: "mar-1",
      status: "completed",
      subject: { reference: "Patient/patient-1" },
      context: { reference: "Encounter/encounter-1" },
      request: { reference: "MedicationRequest/medreq-1" },
      performer: [{ actor: { reference: "Practitioner/user-2" } }],
    });
    expect(resource.medicationCodeableConcept.coding[0]).toEqual(expect.objectContaining({
      system: "http://hl7.org/fhir/sid/ndc",
      code: "12345678901",
    }));
    expect(JSON.stringify(resource)).not.toContain("private bedside narrative");
  });

  it("maps administration lifecycle conservatively", () => {
    expect(medicationAdministrationStatus({ marAction: "administered" })).toBe("completed");
    expect(medicationAdministrationStatus({ infusionPhase: "INFUSION_START", marAction: "administered" })).toBe("in-progress");
    expect(medicationAdministrationStatus({ marAction: "refused" })).toBe("not-done");
    expect(medicationAdministrationStatus({ marAction: "unexpected" })).toBe("unknown");
  });

  it("scopes direct request and MAR reads by facility", async () => {
    const orderItemFindFirst = jest.fn().mockResolvedValue(null);
    const marFindFirst = jest.fn().mockResolvedValue(null);
    const prisma: any = {
      orderItem: { findFirst: orderItemFindFirst },
      medicationAdministration: { findFirst: marFindFirst },
    };
    const search: any = {};
    const service = new FhirMedicationService(prisma, search);
    await expect(service.readRequest("facility-A", "medreq-1")).rejects.toThrow("MedicationRequest not found");
    expect(orderItemFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "medreq-1", catalogItemType: "MEDICATION", order: { facilityId: "facility-A" } }),
    }));
    await expect(service.readAdministration("facility-A", "mar-1")).rejects.toThrow("MedicationAdministration not found");
    expect(marFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "mar-1", facilityId: "facility-A" },
    }));
  });
});
