/**
 * D4A.2.7 — Enterprise Command Layer boundary tests (web + API wiring).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOSPITAL_CARE_ENTERPRISE_COMMAND } from "./hospitalCarePaths";

const root = join(__dirname);

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("MEDUI.ENTERPRISE_COMMAND_LAYER.D4A2_7 boundary", () => {
  it("routes under hospitalisation/enterprise-command", () => {
    expect(HOSPITAL_CARE_ENTERPRISE_COMMAND).toBe("/app/hospitalisation/enterprise-command");
  });

  it("service consumes ClinicalSynthesisService and HospitalCensusService only", () => {
    const svc = readFileSync(
      join(root, "../../../../api/src/encounters/enterprise-command.service.ts"),
      "utf8"
    );
    expect(svc).toContain("ClinicalSynthesisService");
    expect(svc).toContain("buildCommandCenterProjection");
    expect(svc).toContain("HospitalCensusService");
    expect(svc).toContain("placementLogicEnabled: false");
    expect(svc).toContain("neverLegalRecord");
    expect(svc).not.toContain("OrdersService");
    expect(svc).not.toContain("ResultsService");
    expect(svc).not.toContain("enablePlacement");
  });

  it("controller exposes track board, lists, capacity, tasks, mobile, executive", () => {
    const ctl = readFileSync(
      join(root, "../../../../api/src/encounters/enterprise-command.controller.ts"),
      "utf8"
    );
    for (const path of [
      "track-board",
      "dashboard",
      "patient-lists",
      "capacity",
      "alerts",
      "escalations",
      "notifications",
      "tasks",
      "patient-flow",
      "executive",
      "mobile",
      "ai-boundary",
    ]) {
      expect(ctl).toContain(path);
    }
    expect(ctl).toContain('facilityIdFromReq');
    expect(ctl).toContain("RequireRoles");
  });

  it("module registers EnterpriseCommandService + Controller", () => {
    const mod = readFileSync(
      join(root, "../../../../api/src/encounters/encounters.module.ts"),
      "utf8"
    );
    expect(mod).toContain("EnterpriseCommandService");
    expect(mod).toContain("EnterpriseCommandController");
    expect(mod).toContain("ClinicalSynthesisService");
  });

  it("UI consumes enterprise-command APIs and never edits documentation", () => {
    const view = read("EnterpriseCommandLayerView.tsx");
    const api = read("enterpriseCommandApi.ts");
    expect(view).toContain("fetchEnterpriseTrackBoard");
    expect(view).toContain("fetchEnterpriseCommandDashboard");
    expect(view).toContain("neverLegalRecord");
    expect(view).toContain("POLL_MS");
    expect(view).toContain("visibilitychange");
    expect(view).not.toContain("provider-workspace");
    expect(view).not.toContain("admissionSummaryJson");
    expect(api).toContain("/hospital-care/enterprise-command");
    expect(api).not.toContain("prisma");
  });

  it("page route mounts enterprise command view", () => {
    const page = readFileSync(
      join(root, "../../../app/app/hospitalisation/enterprise-command/page.tsx"),
      "utf8"
    );
    expect(page).toContain("EnterpriseCommandLayerView");
  });

  it("EN/FR keys mirrored", () => {
    const en = read("../../i18n/messages/enterpriseCommandD4a27.en.ts");
    const fr = read("../../i18n/messages/enterpriseCommandD4a27.fr.ts");
    for (const key of [
      "title",
      "trackBoard",
      "neverLegalRecord",
      "placementOff",
      "executive",
      "neverAutoAck",
      "neverDocumentation",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
  });
});
