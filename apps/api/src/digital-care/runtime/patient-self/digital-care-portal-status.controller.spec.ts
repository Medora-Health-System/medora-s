import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { PatientPortalPrincipal } from "../../../patient-portal/public";
import { DigitalCarePortalStatusController } from "./digital-care-portal-status.controller";

type PatientPortalRequest = Request & {
  patientPrincipal?: PatientPortalPrincipal;
};

describe("DigitalCarePortalStatusController", () => {
  const controller = new DigitalCarePortalStatusController();

  it("returns only non-PHI authenticated portal state", () => {
    const request = {
      patientPrincipal: {
        portalAccountId: "portal-account-1",
        sessionId: "session-1",
      },
    } as PatientPortalRequest;

    expect(controller.getPortalStatus(request)).toEqual({
      active: true,
      authenticated: true,
      principal: "patient",
    });

    expect(JSON.stringify(controller.getPortalStatus(request))).not.toContain(
      "portal-account-1",
    );
    expect(JSON.stringify(controller.getPortalStatus(request))).not.toContain(
      "session-1",
    );
  });

  it("fails closed when the patient principal is absent", () => {
    expect(() => controller.getPortalStatus({} as PatientPortalRequest)).toThrow(
      UnauthorizedException,
    );
  });
});
