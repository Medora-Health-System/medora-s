import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
  enterpriseWorkflowMustNotStartPlacement,
  enterpriseWorkflowMustNotStartRulesEngine,
} from "@medora/shared";
import {
  HOSPITAL_CARE_ENTERPRISE_WORKFLOW,
  HOSPITAL_CARE_ENTERPRISE_WORKFLOW_ADMIN,
  EMERGENCY_DEPARTMENT_OPERATIONAL_DASHBOARD,
} from "./hospitalCarePaths";

const root = __dirname;

function readWeb(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("MEDUI.ENTERPRISE_WORKFLOW_ENGINE.D4A2_8 web", () => {
  it("keeps certification and phase boundaries", () => {
    expect(ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID).toBe(
      "MEDUI.ENTERPRISE_WORKFLOW_ENGINE.D4A2_8"
    );
    // D4A.2.8A starts Rules Engine; Placement remains blocked.
    expect(enterpriseWorkflowMustNotStartRulesEngine()).toBe(false);
    expect(enterpriseWorkflowMustNotStartPlacement()).toBe(true);
  });

  it("routes workflow under hospitalisation without merging ED dashboard", () => {
    expect(HOSPITAL_CARE_ENTERPRISE_WORKFLOW).toBe(
      "/app/hospitalisation/enterprise-workflow"
    );
    expect(HOSPITAL_CARE_ENTERPRISE_WORKFLOW_ADMIN).toBe(
      "/app/hospitalisation/enterprise-workflow/admin"
    );
    expect(EMERGENCY_DEPARTMENT_OPERATIONAL_DASHBOARD).toBe("/app/trackboard");
    expect(HOSPITAL_CARE_ENTERPRISE_WORKFLOW).not.toContain("trackboard");
  });

  it("UI consumes enterprise-workflow APIs only", () => {
    const api = readWeb("./enterpriseWorkflowApi.ts");
    expect(api).toContain("/hospital-care/enterprise-workflow");
    expect(api).not.toContain("prisma");
    const worklist = readWeb("./EnterpriseWorkflowWorklistView.tsx");
    expect(worklist).toContain("fetchDepartmentWorklist");
    expect(worklist).not.toContain("createWorkflowFromDefinition");
    const dash = readWeb("./EnterpriseWorkflowAdminDashboardView.tsx");
    expect(dash).toContain("fetchWorkflowAdminDashboard");
    const timeline = readWeb("./EnterpriseHospitalTimelinePanel.tsx");
    expect(timeline).toContain("fetchEncounterWorkflowTimeline");
  });

  it("exposes pages and i18n keys", () => {
    const page = readFileSync(
      join(root, "../../../app/app/hospitalisation/enterprise-workflow/page.tsx"),
      "utf8"
    );
    expect(page).toContain("EnterpriseWorkflowWorklistView");
    const admin = readFileSync(
      join(root, "../../../app/app/admin/enterprise-workflow/page.tsx"),
      "utf8"
    );
    expect(admin).toContain("EnterpriseWorkflowAdminDashboardView");
    const en = readFileSync(
      join(root, "../../i18n/messages/enterpriseWorkflowD4a28.en.ts"),
      "utf8"
    );
    const fr = readFileSync(
      join(root, "../../i18n/messages/enterpriseWorkflowD4a28.fr.ts"),
      "utf8"
    );
    expect(en).toContain("worklist");
    expect(fr).toContain("Liste de travail");
  });

  it("embeds timeline panel in inpatient workspace", () => {
    const panel = readFileSync(
      join(root, "../inpatient-workspace/InpatientProviderWorkspacePanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("EnterpriseHospitalTimelinePanel");
  });
});
