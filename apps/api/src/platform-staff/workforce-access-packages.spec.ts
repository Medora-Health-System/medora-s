import { WORKFORCE_ACCESS_PACKAGES } from "./workforce-access-packages";

describe("Phase 11 workforce access package governance",()=>{
  it("keeps billing authority billing-only by default",()=>{
    for(const [department,pkg] of Object.entries(WORKFORCE_ACCESS_PACKAGES)){
      if(department==="BILLING_RCM") continue;
      expect(pkg.capabilities).not.toContain("BILLING_RCM_VIEW");
      expect(pkg.capabilities).not.toContain("BILLING_RCM_MANAGE");
    }
  });
  it("does not model patient/chart authority as a platform workforce package",()=>{
    for(const pkg of Object.values(WORKFORCE_ACCESS_PACKAGES)){
      expect(pkg.capabilities.some(code=>String(code).includes("PATIENT")||String(code).includes("CHART"))).toBe(false);
    }
  });
  it("keeps support free of billing, compliance mutation, and catalog mutation",()=>{
    const support=WORKFORCE_ACCESS_PACKAGES.SUPPORT.capabilities;
    expect(support).not.toContain("BILLING_RCM_VIEW");
    expect(support).not.toContain("COMPLIANCE_CONTROLS_MANAGE");
    expect(support).not.toContain("CATALOG_CONFIG_MANAGE");
  });
  it("keeps technology IT free of billing and compliance-control mutation",()=>{
    const tech=WORKFORCE_ACCESS_PACKAGES.TECHNOLOGY_IT.capabilities;
    expect(tech).not.toContain("BILLING_RCM_VIEW");
    expect(tech).not.toContain("BILLING_RCM_MANAGE");
    expect(tech).not.toContain("COMPLIANCE_CONTROLS_MANAGE");
  });
});
