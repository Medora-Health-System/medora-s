import fs from "fs";
import path from "path";
import { CORPORATE_DEPARTMENTS, EMPLOYEE_TYPES, EMPLOYMENT_STATUSES } from "./corporate-workforce.service";

describe("Phase 10 corporate workforce model",()=>{
  it("defines the Medora corporate departments independently of facility departments",()=>{
    expect(CORPORATE_DEPARTMENTS).toEqual(expect.arrayContaining(["TECHNOLOGY_IT","ENGINEERING","IMPLEMENTATION","SUPPORT","COMPLIANCE_SECURITY","BILLING_RCM","PRODUCT_QA","PLATFORM_OPERATIONS","EXECUTIVE_ADMINISTRATION"]));
    expect(EMPLOYEE_TYPES).toContain("CONTRACTOR");
    expect(EMPLOYMENT_STATUSES).toEqual(expect.arrayContaining(["ACTIVE","LEAVE","SUSPENDED","TERMINATED"]));
  });
  it("persists workforce identity without a facility foreign key",()=>{
    const sql=fs.readFileSync(path.join(process.cwd(),"prisma/migrations/20260917133000_phase10_corporate_workforce_model/migration.sql"),"utf8");
    expect(sql).toContain('CREATE TABLE "MedoraWorkforceProfile"');
    expect(sql).toContain('"staffProfileId" UUID NOT NULL');
    expect(sql).toContain('"managerUserId" UUID');
    expect(sql).not.toContain('"facilityId"');
    expect(sql).toContain('ON DELETE RESTRICT');
    expect(sql).toContain('MedoraWorkforceProfile_dates_check');
  });
});
