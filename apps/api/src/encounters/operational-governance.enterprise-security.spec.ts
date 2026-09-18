import { BadRequestException } from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import "reflect-metadata";
import { OperationalGovernanceController } from "./operational-governance.controller";
import { OperationalGovernanceService } from "./operational-governance.service";

describe("Hospital operations enterprise security boundary", () => {
  it.each(["staffAnalytics", "listChartAccess", "auditCenter", "roleTimeline"] as const)(
    "%s is restricted to facility administrators",
    (method) => {
      const roles = Reflect.getMetadata("roles", OperationalGovernanceController.prototype[method]);
      expect(roles).toEqual([RoleCode.ADMIN]);
    },
  );

  it("never permits a client supplied patientId to rewrite chart-access attribution", async () => {
    const prisma = { encounter: { findFirst: jest.fn().mockResolvedValue({ id: "enc-1", patientId: "patient-canonical", status: "INPATIENT" }) } };
    const audit = { log: jest.fn() };
    const service = new OperationalGovernanceService(prisma as never, audit as never, {} as never, {} as never);
    await expect(service.recordChartAccess("facility-1", "user-1", { encounterId: "enc-1", patientId: "patient-forged", accessKind: "OPEN" })).rejects.toBeInstanceOf(BadRequestException);
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("attributes chart access to the canonical encounter patient", async () => {
    const prisma = { encounter: { findFirst: jest.fn().mockResolvedValue({ id: "enc-1", patientId: "patient-canonical", status: "INPATIENT" }) } };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new OperationalGovernanceService(prisma as never, audit as never, {} as never, {} as never);
    await service.recordChartAccess("facility-1", "user-1", { encounterId: "enc-1", accessKind: "OPEN" });
    expect(audit.log).toHaveBeenCalledWith(expect.anything(), "CHART_ACCESS", expect.objectContaining({ facilityId: "facility-1", patientId: "patient-canonical", encounterId: "enc-1" }));
  });
});
