import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS,
  getDefaultClinicCareAmbulatoryWorkspaceSection,
  getVisibleClinicCareAmbulatoryWorkspaceSections,
  resolveClinicCareAmbulatoryWorkflowTarget,
} from "@medora/shared";

const featureDir = __dirname;
const webRoot = join(featureDir, "../../..");

function readWeb(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("Clinic Care end-to-end certification", () => {
  it("keeps the complete ambulatory encounter workspace available", () => {
    for (const section of [
      "intake",
      "medical-evaluation",
      "orders",
      "medications",
      "results",
      "diagnoses",
      "nursing",
      "notes",
      "prescriptions",
      "follow-up",
      "summary",
    ] as const) {
      expect(CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS).toContain(section);
    }
  });

  it("preserves role separation across the encounter lifecycle", () => {
    expect(getDefaultClinicCareAmbulatoryWorkspaceSection(["PROVIDER"])).toBe("medical-evaluation");
    expect(getDefaultClinicCareAmbulatoryWorkspaceSection(["RN"])).toBe("clinical-data");
    expect(getDefaultClinicCareAmbulatoryWorkspaceSection(["PHARMACIST"])).toBe("prescriptions");
    expect(getDefaultClinicCareAmbulatoryWorkspaceSection(["FRONT_DESK"])).toBe("follow-up");

    expect(getVisibleClinicCareAmbulatoryWorkspaceSections(["FRONT_DESK"])).not.toContain("medical-evaluation");
    expect(getVisibleClinicCareAmbulatoryWorkspaceSections(["RN"])).not.toContain("intake");
    expect(getVisibleClinicCareAmbulatoryWorkspaceSections(["RN"])).not.toContain("nursing");
    expect(getVisibleClinicCareAmbulatoryWorkspaceSections(["PROVIDER"])).toContain("diagnoses");
  });

  it("certifies the enterprise encounter lifecycle through authoritative close", () => {
    expect(resolveClinicCareAmbulatoryWorkflowTarget("READY_FOR_PROVIDER", "TRIAGE")).toBe("IN_TREATMENT");
    expect(resolveClinicCareAmbulatoryWorkflowTarget("START_CONSULTATION", "TRIAGE")).toBe("IN_TREATMENT");
    expect(resolveClinicCareAmbulatoryWorkflowTarget("READY_FOR_CHECKOUT", "IN_TREATMENT")).toBe("DISPOSITION");
    expect(resolveClinicCareAmbulatoryWorkflowTarget("READY_FOR_CHECKOUT", "RESULTS_PENDING")).toBe("DISPOSITION");
    expect(resolveClinicCareAmbulatoryWorkflowTarget("COMPLETE_VISIT", "DISCHARGE_READY")).toBe("ENTERPRISE_CLOSE");
  });

  it("keeps the shared clinical engines wired into the Clinic workspace", () => {
    const panels = readWeb("src/features/clinic-care/ClinicCareAmbulatoryWorkspacePanels.tsx");
    const discharge = readWeb("src/features/clinic-care/ClinicCareAmbulatoryDischargeWorkflow.tsx");

    expect(panels).toContain("<EmergencyTriagePanel");
    expect(panels).toContain("<ClinicCareAmbulatoryMedicalEvaluationPanel");
    expect(panels).toContain("<MedicationAdministrationTab");
    expect(discharge).toContain("DISCHARGE_READY");
  });

  it("keeps documentation safety and locale-aware correction in the certified path", () => {
    const provider = readWeb("src/i18n/provider.tsx");
    const guard = readWeb("src/components/clinical-writing/ClinicalWritingGuard.tsx");

    expect(provider).toContain("<ClinicalWritingGuard");
    expect(guard).toContain('setAttribute("spellcheck", "true")');
    expect(guard).toContain('setAttribute("autocorrect", "off")');
    expect(guard).not.toContain("apiFetch(");
  });
});
