import { ForbiddenException } from "@nestjs/common";
import { PatientPortalFacilityGuard } from "./patient-portal-facility.guard";

describe("PatientPortalFacilityGuard", () => {
  const makeContext = (request: any) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as any;

  it("derives patientId from the verified server-side link", async () => {
    const repo = {
      findVerifiedFacilityLink: jest.fn().mockResolvedValue({
        portalAccountId: "account-a",
        patientId: "patient-a",
        facilityId: "facility-a",
      }),
    } as any;
    const guard = new PatientPortalFacilityGuard(repo);
    const request: any = {
      params: { facilityId: "facility-a" },
      patientPrincipal: { portalAccountId: "account-a", sessionId: "session-a" },
      body: { patientId: "patient-b" },
      query: { patientId: "patient-b" },
    };

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(repo.findVerifiedFacilityLink).toHaveBeenCalledWith("account-a", "facility-a");
    expect(request.patientAccess).toEqual({
      portalAccountId: "account-a",
      sessionId: "session-a",
      patientId: "patient-a",
      facilityId: "facility-a",
    });
  });

  it("denies an unlinked facility instead of trusting the URL", async () => {
    const repo = { findVerifiedFacilityLink: jest.fn().mockResolvedValue(null) } as any;
    const guard = new PatientPortalFacilityGuard(repo);
    const request: any = {
      params: { facilityId: "facility-b" },
      patientPrincipal: { portalAccountId: "account-a", sessionId: "session-a" },
    };

    await expect(guard.canActivate(makeContext(request))).rejects.toBeInstanceOf(ForbiddenException);
    expect(request.patientAccess).toBeUndefined();
  });

  it("fails closed when the patient principal is missing", async () => {
    const repo = { findVerifiedFacilityLink: jest.fn() } as any;
    const guard = new PatientPortalFacilityGuard(repo);
    const request: any = { params: { facilityId: "facility-a" } };

    await expect(guard.canActivate(makeContext(request))).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.findVerifiedFacilityLink).not.toHaveBeenCalled();
  });
});
