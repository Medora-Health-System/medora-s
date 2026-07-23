import {
  routeOperationalAdmissionAction,
  resolveReceivingAcceptanceAuthority,
  actorHasAdmissionOpsCapability,
  D3B_D3C_SCHEMA_REQUIREMENTS,
} from "@medora/shared";

describe("D4A.2.4 dual-mode API contract", () => {
  it("placement OFF denies receiving durable writes", () => {
    const r = routeOperationalAdmissionAction("RECEIVING_ACCEPT", "PLACEMENT_OFF");
    expect(r.route).toBe("DENIED");
  });

  it("placement ON routes receiving to placement service", () => {
    const r = routeOperationalAdmissionAction("RECEIVING_ACCEPT", "PLACEMENT_ON");
    expect(r.route).toBe("PLACEMENT_SERVICE");
  });

  it("does not treat ops.receiving as authority when placement ON", () => {
    const auth = resolveReceivingAcceptanceAuthority({
      placementWorkflowEnabled: true,
      placementStatus: "BED_ASSIGNED",
      ops: {
        schemaVersion: 1,
        status: "ACCEPTED",
        receiving: { status: "ACCEPTED", acceptedAt: "2026-07-22T12:00:00.000Z" },
      },
    });
    expect(auth.displayStatus).toBe("WAITING");
    expect(auth.authority).toBe("PLACEMENT");
  });

  it("capabilities: RN/PROVIDER/ADMIN ok; billing denied", () => {
    expect(actorHasAdmissionOpsCapability("ADMISSION_OPERATIONAL_ACCEPT", ["RN"])).toBe(true);
    expect(actorHasAdmissionOpsCapability("ADMISSION_RECEIVING_ACCEPT", ["ADMIN"])).toBe(true);
    expect(actorHasAdmissionOpsCapability("ADMISSION_HOLD", ["BILLING"])).toBe(false);
  });

  it("production schema remains unverified", () => {
    expect(D3B_D3C_SCHEMA_REQUIREMENTS.productionSchemaVerification).toBe(
      "PRODUCTION SCHEMA NOT VERIFIED"
    );
  });
});
