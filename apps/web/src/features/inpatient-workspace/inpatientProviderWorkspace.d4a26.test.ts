import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  INPATIENT_WORKSPACE_SECTIONS,
  parseInpatientWorkspaceSection,
} from "./inpatientWorkspaceSections";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

const root = join(__dirname);

function deepKeys(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) return deepKeys(v, path);
    return [path];
  });
}

describe("D4A.2.6 inpatient provider workspace UI", () => {
  it("includes provider-first tabs including problemsPlan", () => {
    const ids = INPATIENT_WORKSPACE_SECTIONS.map((s) => s.id);
    expect(ids[0]).toBe("overview");
    expect(ids).toContain("problemsPlan");
    expect(ids).toContain("historyPhysical");
    expect(ids).toContain("admission");
    expect(parseInpatientWorkspaceSection("problems")).toBe("problemsPlan");
    expect(parseInpatientWorkspaceSection("rounding")).toBe("overview");
  });

  it("mirrors inpatientProviderD4a26 EN/FR keys", () => {
    const enKeys = deepKeys(en.inpatientProviderD4a26).sort();
    const frKeys = deepKeys(fr.inpatientProviderD4a26).sort();
    expect(enKeys).toEqual(frKeys);
    expect(en.inpatientProviderD4a26.certification).toBe(
      "MEDUI.INPATIENT_PROVIDER_WORKSPACE.D4A2_6"
    );
    expect(fr.inpatientProviderD4a26.certification).toBe(
      "MEDUI.INPATIENT_PROVIDER_WORKSPACE.D4A2_6"
    );
  });

  it("reuses enterprise engines and does not redesign nursing admission shell", () => {
    const panel = readFileSync(join(root, "InpatientWorkspacePanel.tsx"), "utf8");
    expect(panel).toContain("EmergencyErOrdersPanel");
    expect(panel).toContain("EmergencyResultsPanel");
    expect(panel).toContain("MedicationAdministrationTab");
    expect(panel).toContain("InpatientAdmissionClinicalShell");
    expect(panel).toContain("InpatientProviderWorkspacePanel");
    expect(panel).toContain('mode="problemsPlan"');
    expect(panel).toContain('mode="timeline"');

    const provider = readFileSync(join(root, "InpatientProviderWorkspacePanel.tsx"), "utf8");
    expect(provider).toContain("EncounterDiagnosticsPanel");
    expect(provider).toContain("EnterpriseEncounterCommandTimeline");
    expect(provider).toContain("InpatientOverviewView");
    expect(provider).toContain("projectInpatientOverview");
    expect(provider).toContain("hp.noAutoRos");
    expect(provider).toContain("hp.noAutoExam");
    const synthesis = readFileSync(join(root, "ProviderClinicalSynthesisOverview.tsx"), "utf8");
    expect(synthesis).toContain("neverAutoAck");

    const admission = readFileSync(join(root, "InpatientAdmissionClinicalShell.tsx"), "utf8");
    expect(admission).toContain("NursingAdmissionStructuredSectionForm");
  });

  it("exposes provider-workspace API client routes", () => {
    const api = readFileSync(
      join(root, "../hospital-care/inpatientOperationsApi.ts"),
      "utf8"
    );
    expect(api).toContain("/provider-workspace");
    expect(api).toContain("events/acknowledge");
    expect(api).toContain("problem-plans");
    expect(api).toContain("/provider-workspace/hp");
  });
});
