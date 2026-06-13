/**
 * MEDPROC.4 — procedure execution linkage (web guards).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webRoot = join(import.meta.dirname, "../..");
const erOrdersPanelSource = readFileSync(
  join(webRoot, "src/features/emergency/EmergencyErOrdersPanel.tsx"),
  "utf8"
);
const nursingPageSource = readFileSync(join(webRoot, "app/app/nursing/page.tsx"), "utf8");
const providerPageSource = readFileSync(join(webRoot, "app/app/provider/page.tsx"), "utf8");
const sharedProfileSource = readFileSync(
  join(webRoot, "../../packages/shared/src/procedures/enterpriseProcedureExecutionProfile.ts"),
  "utf8"
);

describe("MEDPROC.4 web procedure execution guards", () => {
  it("uses resolveProcedureExecutionProfile for CARE lifecycle buttons", () => {
    expect(erOrdersPanelSource).toContain("resolveProcedureExecutionProfile");
    expect(erOrdersPanelSource).toContain("requestorMayPerformEnterpriseProcedureAction");
    expect(erOrdersPanelSource).toContain("deptAllowsOrderLineAction");
  });

  it("shows execution category badge on procedure order rows", () => {
    expect(erOrdersPanelSource).toContain("ProcedureExecutionCategoryBadge");
    expect(erOrdersPanelSource).toContain("renderCareExecutionCategoryBadge");
  });

  it("preserves MEDPROC.3 documentation linkage in ER orders panel", () => {
    expect(erOrdersPanelSource).toContain("ProcedureOrderDocumentationLinkage");
    expect(erOrdersPanelSource).toContain("resolveProcedureDocumentationLinkage");
  });

  it("surfaces nursing procedure queue on nursing dashboard", () => {
    expect(nursingPageSource).toContain("ProcedureWorkQueuePanel");
    expect(nursingPageSource).toContain('executionRoleCategory: "NURSING"');
  });

  it("surfaces provider procedure queue on provider dashboard", () => {
    expect(providerPageSource).toContain("ProcedureWorkQueuePanel");
    expect(providerPageSource).toContain('executionRoleCategory: "PROVIDER"');
  });

  it("shared execution profile does not create billing events", () => {
    expect(sharedProfileSource).not.toMatch(/billing|chargeCapture|claim/i);
  });
});
