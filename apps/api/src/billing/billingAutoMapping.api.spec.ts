import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("billingAutoMapping API routes (MEDUI.BILLING.AUTO_MAPPING.1)", () => {
  const controller = readFileSync(join(__dirname, "billing.controller.ts"), "utf8");

  it("exposes preview and apply endpoints", () => {
    expect(controller).toContain('@Get("billing/auto-mapping/encounters/:encounterId/preview")');
    expect(controller).toContain('@Post("billing/auto-mapping/encounters/:encounterId/apply")');
    expect(controller).not.toContain("submitClaim");
  });

  it("restricts apply to billing roles", () => {
    expect(controller).toContain("@RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)");
  });
});
