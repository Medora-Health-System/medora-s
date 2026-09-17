import { BadRequestException } from "@nestjs/common";
import { WorkforceAccessPackageService } from "./workforce-access-package.service";

const actor={userId:"actor-user",sessionId:"session-1"};
const targetUserId="target-user";

function preview(overrides:any={}){
  return {
    targetUserId,
    workforce:{department:"TECHNOLOGY_IT",jobTitle:"IT Administrator",employmentStatus:"ACTIVE"},
    package:{code:"TECHNOLOGY_IT_ADMIN",label:"Technology / IT Administration",department:"TECHNOLOGY_IT"},
    runtimeAuthority:"EXPLICIT_PLATFORM_CAPABILITY_GRANTS_ONLY",
    automaticallyApplied:false,
    activePackageCapabilities:[],
    missingDirectGrantEligible:["SYSTEM_HEALTH_VIEW"],
    missingDualControlRequired:["FACILITY_ACTIVATE","SECURITY_MFA_RECOVERY"],
    catalogMismatch:[],
    ...overrides,
  };
}

function harness(){
  const prisma:any={privilegedActionRequest:{findMany:jest.fn().mockResolvedValue([])}};
  const staff:any={grant:jest.fn().mockResolvedValue({id:"grant-1",idempotent:false})};
  const privileged:any={create:jest.fn()
    .mockResolvedValueOnce({id:"request-1",status:"PENDING",expiresAt:new Date("2030-01-01T00:00:00Z")})
    .mockResolvedValueOnce({id:"request-2",status:"PENDING",expiresAt:new Date("2030-01-01T00:00:00Z")})};
  const service=new WorkforceAccessPackageService(prisma,staff,privileged);
  return {service,prisma,staff,privileged};
}

describe("Phase 13 governed workforce access package application",()=>{
  it("rejects application for a non-active workforce profile before any grant",async()=>{
    const {service,staff,privileged}=harness();
    jest.spyOn(service,"preview").mockResolvedValue(preview({workforce:{department:"SUPPORT",jobTitle:"Support",employmentStatus:"SUSPENDED"}}) as any);
    await expect(service.apply(actor,targetUserId,"approved change")).rejects.toBeInstanceOf(BadRequestException);
    expect(staff.grant).not.toHaveBeenCalled();
    expect(privileged.create).not.toHaveBeenCalled();
  });

  it("fails closed when a package references a missing capability catalog entry",async()=>{
    const {service,staff,privileged}=harness();
    jest.spyOn(service,"preview").mockResolvedValue(preview({catalogMismatch:["SYSTEM_HEALTH_VIEW"]}) as any);
    await expect(service.apply(actor,targetUserId,"approved change")).rejects.toThrow("WORKFORCE_PACKAGE_CATALOG_MISMATCH");
    expect(staff.grant).not.toHaveBeenCalled();
    expect(privileged.create).not.toHaveBeenCalled();
  });

  it("direct-grants non-critical capabilities and routes critical capabilities to dual control",async()=>{
    const {service,prisma,staff,privileged}=harness();
    jest.spyOn(service,"preview")
      .mockResolvedValueOnce(preview() as any)
      .mockResolvedValueOnce(preview({activePackageCapabilities:["SYSTEM_HEALTH_VIEW"],missingDirectGrantEligible:[]}) as any);
    prisma.privilegedActionRequest.findMany.mockResolvedValue([{id:"existing-request",status:"PENDING",expiresAt:new Date("2030-01-01T00:00:00Z"),scope:{operationType:"STAFF_GRANT_CAPABILITY",targetUserId,capabilityCode:"FACILITY_ACTIVATE"}}]);

    const result=await service.apply(actor,targetUserId,"approved change","TICKET-13");

    expect(staff.grant).toHaveBeenCalledWith(actor.userId,targetUserId,"SYSTEM_HEALTH_VIEW","approved change","TICKET-13");
    expect(privileged.create).toHaveBeenCalledTimes(1);
    expect(privileged.create).toHaveBeenCalledWith(actor,{operationType:"STAFF_GRANT_CAPABILITY",targetUserId,capabilityCode:"SECURITY_MFA_RECOVERY",reason:"approved change",ticketReference:"TICKET-13"});
    expect(result.privilegedRequests.reused).toEqual([expect.objectContaining({code:"FACILITY_ACTIVATE",requestId:"existing-request"})]);
    expect(result.privilegedRequests.created).toEqual([expect.objectContaining({code:"SECURITY_MFA_RECOVERY",requestId:"request-1"})]);
    expect(result.additiveOnly).toBe(true);
    expect(result.runtimeAuthority).toBe("EXPLICIT_PLATFORM_CAPABILITY_GRANTS_ONLY");
  });

  it("does not create duplicate live critical requests on a retry",async()=>{
    const {service,prisma,privileged}=harness();
    jest.spyOn(service,"preview")
      .mockResolvedValueOnce(preview({missingDirectGrantEligible:[],missingDualControlRequired:["FACILITY_ACTIVATE"]}) as any)
      .mockResolvedValueOnce(preview({missingDirectGrantEligible:[],missingDualControlRequired:["FACILITY_ACTIVATE"]}) as any);
    prisma.privilegedActionRequest.findMany.mockResolvedValue([{id:"request-live",status:"APPROVED",expiresAt:new Date("2030-01-01T00:00:00Z"),scope:{operationType:"STAFF_GRANT_CAPABILITY",targetUserId,capabilityCode:"FACILITY_ACTIVATE"}}]);

    const result=await service.apply(actor,targetUserId,"retry safe");

    expect(privileged.create).not.toHaveBeenCalled();
    expect(result.privilegedRequests.reused[0]).toEqual(expect.objectContaining({requestId:"request-live",code:"FACILITY_ACTIVATE"}));
  });
});
