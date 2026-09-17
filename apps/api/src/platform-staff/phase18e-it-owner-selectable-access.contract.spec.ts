import fs from "fs";
import path from "path";
import { PLATFORM_CAPABILITY_CODES } from "./platform-capabilities";

const api = (p:string) => fs.readFileSync(path.join(__dirname,"..",p),"utf8");

describe("Phase 18E owner-selectable Technology / IT access",()=>{
  it("publishes explicit care/module capabilities instead of hard-coded department authority",()=>{
    expect(PLATFORM_CAPABILITY_CODES).toEqual(expect.arrayContaining([
      "IT_CARE_PATIENT_RECORDS","IT_CARE_ORDERS","IT_CARE_EMERGENCY","IT_CARE_URGENT_CARE",
      "IT_CARE_CLINIC","IT_CARE_OBSERVATION","IT_CARE_INPATIENT_HOSPITAL","IT_CARE_LABORATORY",
      "IT_CARE_RADIOLOGY","IT_CARE_PHARMACY","IT_CARE_DIGITAL_CARE","IT_CARE_PATIENT_PORTAL",
      "IT_CARE_SCHEDULING","IT_CARE_TELEMEDICINE","IT_CARE_AI","IT_CARE_BILLING",
    ]));
  });

  it("requires a live PlatformCapabilityGrant before IT care routes are projected",()=>{
    const guard=api("common/guards/technology-it-care-support.ts");
    expect(guard).toContain("platformCapabilityGrant.findMany");
    expect(guard).toContain("capabilities.has(careCapability)");
    expect(guard).not.toContain("DENIED_SEGMENTS");
  });

  it("forces active corporate Medora staff into MFA enrollment even without facility roles",()=>{
    const auth=api("auth/technology-it-aware-auth.service.ts");
    expect(auth).toContain("isActiveMedoraStaff");
    expect(auth).toContain('kind:"mfa_enrollment_required"');
    expect(auth).toContain('revokedReason:"mfa_enrollment_required"');
  });

  it("keeps department identity non-authoritative",()=>{
    const guard=api("common/guards/technology-it-care-support.ts");
    expect(guard).toContain("isActiveTechnologyItStaff");
    expect(guard).toContain("PlatformCapabilityGrant");
  });
});
