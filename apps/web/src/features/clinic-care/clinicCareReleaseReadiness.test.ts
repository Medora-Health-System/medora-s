import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS,
  CLINIC_CARE_AMBULATORY_WORKSPACE_TILE_LABEL_KEY,
  getDefaultClinicCareAmbulatoryWorkspaceSection,
  getVisibleClinicCareAmbulatoryWorkspaceSections,
} from "@medora/shared";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";

const featureDir = __dirname;
const webRoot = join(featureDir, "../../..");

function readWeb(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("Clinic Care release readiness", () => {
  it("keeps every active workspace tile localized in EN/FR/ES", () => {
    for (const section of CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS) {
      const key = CLINIC_CARE_AMBULATORY_WORKSPACE_TILE_LABEL_KEY[section];
      for (const locale of ["en", "fr", "es"] as const) {
        const value = resolveClinicalUiMessage(locale, key);
        expect(value, `${locale}:${key}`).toBeTruthy();
        expect(value, `${locale}:${key}`).not.toBe(key);
      }
    }
  });

  it("does not fall back to English for the high-visibility Spanish Clinic sections", () => {
    for (const section of ["intake", "medical-evaluation", "medications", "nursing", "notes", "follow-up", "summary"] as const) {
      const key = CLINIC_CARE_AMBULATORY_WORKSPACE_TILE_LABEL_KEY[section];
      expect(resolveClinicalUiMessage("es", key), key).not.toBe(resolveClinicalUiMessage("en", key));
    }
  });

  it("preserves role-authorized Clinic workspace defaults", () => {
    expect(getDefaultClinicCareAmbulatoryWorkspaceSection(["PROVIDER"])).toBe("medical-evaluation");
    expect(getDefaultClinicCareAmbulatoryWorkspaceSection(["RN"])).toBe("intake");
    expect(getDefaultClinicCareAmbulatoryWorkspaceSection(["PHARMACIST"])).toBe("prescriptions");
    expect(getDefaultClinicCareAmbulatoryWorkspaceSection(["FRONT_DESK"])).toBe("follow-up");
    expect(getVisibleClinicCareAmbulatoryWorkspaceSections(["FRONT_DESK"])).not.toContain("medical-evaluation");
    expect(getVisibleClinicCareAmbulatoryWorkspaceSections(["PROVIDER"])).toContain("prescriptions");
  });

  it("keeps Clinic presentation cleanup scoped and locale-driven", () => {
    const layout = readWeb("app/app/encounters/[id]/layout.tsx");
    const medication = readWeb("src/components/encounters/MedicationAdministrationTab.tsx");
    const panels = readWeb("src/features/clinic-care/ClinicCareAmbulatoryWorkspacePanels.tsx");

    expect(layout).toContain('data-testid="clinic-care-active-ambulatory-workspace"');
    expect(layout).toContain('[data-testid="provider-documentation-summary-aside"]');
    expect(layout).not.toContain('content: "No medication scheduled."');
    expect(medication).toContain('t("clinicCareD4c7e.mar.emptyFacility")');
    expect(panels).toContain("<EmergencyTriagePanel");
    expect(panels).toContain("<ClinicCareAmbulatoryMedicalEvaluationPanel");
    expect(panels).toContain("<MedicationAdministrationTab");
  });

  it("keeps the system-wide language-aware writing guard mounted for Clinic documentation", () => {
    const provider = readWeb("src/i18n/provider.tsx");
    const guard = readWeb("src/components/clinical-writing/ClinicalWritingGuard.tsx");

    expect(provider).toContain("<ClinicalWritingGuard");
    expect(guard).toContain("productUiBcp47Tag");
    expect(guard).toContain('setAttribute("spellcheck", "true")');
    expect(guard).toContain('setAttribute("autocorrect", "off")');
  });
});
