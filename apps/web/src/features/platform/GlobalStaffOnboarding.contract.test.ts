import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Phase 15 corporate staff onboarding governance",()=>{
  const source=fs.readFileSync(path.join(process.cwd(),"src/features/platform/GlobalStaffOnboarding.tsx"),"utf8");
  it("persists workforce identity before applying governed access",()=>{
    expect(source).toContain("platformStaffApi.setWorkforce");
    expect(source).toContain("platformStaffApi.applyWorkforceAccessPackage");
    expect(source.indexOf("platformStaffApi.setWorkforce")).toBeLessThan(source.indexOf("platformStaffApi.applyWorkforceAccessPackage"));
  });
  it("does not recreate client-side critical grant or privileged-action routing",()=>{
    expect(source).not.toContain("platformPrivilegedActionsApi");
    expect(source).not.toContain("TECHNOLOGY_IT_ADMIN_PACKAGE");
    expect(source).not.toContain('risk.get(code)==="CRITICAL"');
  });
  it("offers every governed corporate workforce department",()=>{
    for(const code of ["TECHNOLOGY_IT","ENGINEERING","IMPLEMENTATION","SUPPORT","COMPLIANCE_SECURITY","BILLING_RCM","PRODUCT_QA","PLATFORM_OPERATIONS","EXECUTIVE_ADMINISTRATION"])expect(source).toContain(`code:"${code}"`);
  });
  it("keeps facility and patient-chart authority out of onboarding",()=>{
    expect(source).toContain("no facility role, patient chart authority, or clinical assignment");
  });
});
