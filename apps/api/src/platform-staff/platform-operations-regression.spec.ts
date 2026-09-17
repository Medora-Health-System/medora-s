import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("platform operations cross-phase regression guard", () => {
  const controller = readFileSync(join(__dirname, "platform-operations.controller.ts"), "utf8");

  it("keeps production readiness hardening wired into system health", () => {
    expect(controller).toContain('import{hardenPlatformGoLive,hardenPlatformSystemHealth}from"./platform-production-readiness"');
    expect(controller).toContain("return hardenPlatformSystemHealth(system,backup)");
  });

  it("keeps production readiness hardening wired into go-live", () => {
    expect(controller).toContain("return hardenPlatformGoLive(goLive,system,backup)");
  });

  it("keeps Phase 5 billing-mode reporting while readiness hardening is enabled", () => {
    expect(controller).toContain('@Get("billing-mode")');
    expect(controller).toContain('return{mode:billingMode(),summary}');
  });
});
