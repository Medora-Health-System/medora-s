import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("MEDUI.INP.2B.2C nursing admission PATCH authority recovery", () => {
  const service = readFileSync(
    join(__dirname, "inpatient-operations.service.ts"),
    "utf8"
  );
  const controller = readFileSync(
    join(__dirname, "inpatient-operations.controller.ts"),
    "utf8"
  );

  it("keeps AUTHORITATIVE_DOMAIN_RECORD_REQUIRED on COMPLETE after write-through", () => {
    expect(service).toContain("AUTHORITATIVE_DOMAIN_RECORD_REQUIRED");
    expect(service).toContain("upsertLatestActiveEntryForCard");
    expect(service).toContain("sectionNeedsAuthoritativeEdocWriteThrough");
    expect(service).toContain("completionState === \"COMPLETE\"");
    expect(service).toMatch(/if \(completionState === "COMPLETE" && sectionNeedsAuthoritativeEdocWriteThrough/);
    expect(service).toContain("clientExpectedVersion: draftExpectedVersion");
    expect(service).toContain("PRELOAD_ITEM_NOT_FOUND");
  });

  it("does not create EDOC on DRAFT autosave", () => {
    expect(service).not.toMatch(
      /if \(completionState === "DRAFT"[\s\S]{0,200}upsertLatestActiveEntryForCard/
    );
    expect(service).toMatch(
      /if \(completionState === "COMPLETE" && sectionNeedsAuthoritativeEdocWriteThrough\(sectionId\)\)/
    );
  });

  it("keeps RN/ADMIN writers and PROVIDER GET without PROVIDER PATCH", () => {
    expect(controller).toMatch(
      /@Patch\("encounters\/:encounterId\/nursing-admission\/sections"\)[\s\S]{0,80}@RequireRoles\(RoleCode\.RN, RoleCode\.ADMIN\)/
    );
    expect(controller).toMatch(
      /@Get\("encounters\/:encounterId\/nursing-admission"\)[\s\S]{0,80}@RequireRoles\(RoleCode\.PROVIDER, RoleCode\.RN, RoleCode\.ADMIN\)/
    );
  });
});
