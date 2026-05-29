/**
 * MEDPROC.3 — procedure order → documentation linkage (web guards).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webRoot = join(import.meta.dirname, "../..");
const erOrdersPanelSource = readFileSync(
  join(webRoot, "src/features/emergency/EmergencyErOrdersPanel.tsx"),
  "utf8"
);
const linkageComponentSource = readFileSync(
  join(webRoot, "src/components/clinical/ProcedureOrderDocumentationLinkage.tsx"),
  "utf8"
);
const launcherSource = readFileSync(
  join(webRoot, "src/features/emergency/EmergencyProcedureLauncherModal.tsx"),
  "utf8"
);
const sharedLinkageSource = readFileSync(
  join(webRoot, "../../packages/shared/src/procedures/enterpriseProcedureDocumentationLinkage.ts"),
  "utf8"
);

describe("MEDPROC.3 procedure documentation linkage UI guards", () => {
  it("uses shared resolveProcedureDocumentationLinkage in ER orders panel", () => {
    expect(erOrdersPanelSource).toContain("resolveProcedureDocumentationLinkage");
    expect(erOrdersPanelSource).toContain("ProcedureOrderDocumentationLinkage");
  });

  it("does not auto-create documentation from order linkage UI", () => {
    expect(linkageComponentSource).not.toContain("/procedures/document");
    expect(erOrdersPanelSource).not.toMatch(/complete[\s\S]{0,400}\/procedures\/document/);
    expect(launcherSource).toContain("/procedures/document");
  });

  it("does not block order completion when documentation is missing", () => {
    expect(erOrdersPanelSource).toContain('op === "complete"');
    expect(erOrdersPanelSource).toContain("await apiFetch(path, { method: \"POST\", facilityId })");
    expect(erOrdersPanelSource).not.toMatch(/complete[\s\S]{0,300}return;/);
    expect(erOrdersPanelSource).toContain("procedureDocumentationCompletionReminderKey");
  });

  it("legacy CARE orders without enterpriseProcedureId skip linkage helper", () => {
    expect(erOrdersPanelSource).toContain("careItemEnterpriseProcedureId");
    expect(sharedLinkageSource).toMatch(/if \(!enterpriseProcedureId\) return none/);
  });

  it("opens existing procedure launcher workflow instead of creating notes inline", () => {
    expect(erOrdersPanelSource).toContain("EmergencyProcedureLauncherModal");
    expect(erOrdersPanelSource).toContain("initialStep={procedureLauncherInitialStep}");
    expect(erOrdersPanelSource).not.toContain("auto-create");
  });

  it("shared linkage helper does not create billing events", () => {
    expect(sharedLinkageSource).not.toMatch(/billing|chargeCapture|claim/i);
    expect(linkageComponentSource).not.toMatch(/billing|chargeCapture|claim/i);
  });
});
