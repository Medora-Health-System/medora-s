/**
 * MEDUI.D5A.2 — web guards for Dental Care navigation and shells.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  D5A2_DENTAL_DASHBOARD_SECTIONS,
  D5A2_DENTAL_SPECIALTIES,
  D5A2_DENTAL_WORKSPACE_TABS,
  ENTERPRISE_DENTAL_SERVICE_LINE_NAVIGATION_CERTIFICATION_ID,
} from "@medora/shared";

const root = join(__dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("MEDUI.D5A.2 dental care web guards", () => {
  it("registers sidebar Dental Care item with DENTAL_CARE nav area", () => {
    const cfg = read("src/components/app-shell/sidebarNavConfig.ts");
    expect(cfg).toContain('href: "/app/dental"');
    expect(cfg).toContain('labelKey: "nav.dentalCare"');
    expect(cfg).toContain('navAreas: ["DENTAL_CARE"]');
    expect(ENTERPRISE_DENTAL_SERVICE_LINE_NAVIGATION_CERTIFICATION_ID).toBe("MEDUI.D5A.2");
  });

  it("mounts dental dashboard and workspace shells without odontogram engines", () => {
    const dash = read("src/features/dental-care/DentalCareDashboardView.tsx");
    const workspace = read("src/features/dental-care/DentalCareActiveWorkspaceView.tsx");
    const shell = read("src/features/dental-care/DentalCareShell.tsx");
    expect(dash).toContain("DentalCareDashboardView");
    expect(dash).toContain("/dental-care/worklist");
    expect(workspace).toContain("dental-active-workspace");
    expect(shell).toContain("resolveDentalWorkspaceAccess");
    expect(shell).not.toMatch(/DentalPatient|OrthodonticCase\s*=/);
    expect(dash).not.toMatch(/\bclass\s+DentalPatient\b|\bDentalPrescription\b/);
  });

  it("defines app routes under /app/dental", () => {
    expect(read("app/app/dental/page.tsx")).toContain("DentalCareDashboardView");
    expect(read("app/app/dental/provider/page.tsx")).toContain("dental-provider-page");
    expect(read("app/app/dental/appointments/page.tsx")).toContain("dental-appointments-page");
    expect(read("app/app/dental/follow-up/page.tsx")).toContain("dental-follow-up-page");
    expect(read("app/app/dental/imaging/page.tsx")).toContain("dental-imaging-page");
    expect(read("app/app/dental/admin/page.tsx")).toContain("dental-admin-page");
    expect(read("app/app/dental/workspace/page.tsx")).toContain("DentalCareActiveWorkspaceView");
  });

  it("onboarding exposes Dental service line and specialties", () => {
    const fields = read("src/components/admin/FacilityTypeServiceLineFields.tsx");
    expect(fields).toContain('DENTAL_LINE');
    expect(fields).toContain("D5A2_DENTAL_SPECIALTIES");
    expect(fields).toContain("facility-dental-specialties");
  });

  it("localizes French and English with key parity", () => {
    const frBlock = (fr as { dentalCareD5a2: Record<string, unknown> }).dentalCareD5a2;
    const enBlock = (en as { dentalCareD5a2: Record<string, unknown> }).dentalCareD5a2;
    expect(frBlock.title).toBe("Soins dentaires");
    expect(enBlock.title).toBe("Dental Care");
    expect((frBlock.specialties as Record<string, string>).ORTHODONTICS).toBe("Orthodontie");
    expect((frBlock.specialties as Record<string, string>).PERIODONTICS).toBe("Parodontie");
    expect((frBlock.specialties as Record<string, string>).ENDODONTICS).toBe("Endodontie");
    expect((frBlock.specialties as Record<string, string>).PEDIATRIC_DENTISTRY).toBe("Pédodontie");
    expect((frBlock.workspace as { tabs: Record<string, string> }).tabs.odontogram).toBe(
      "Odontogramme"
    );
    expect((frBlock.workspace as { tabs: Record<string, string> }).tabs.treatmentPlan).toBe(
      "Plan de traitement"
    );
    for (const specialty of D5A2_DENTAL_SPECIALTIES) {
      expect((frBlock.specialties as Record<string, string>)[specialty]).toBeTruthy();
      expect((enBlock.specialties as Record<string, string>)[specialty]).toBeTruthy();
    }
    for (const section of D5A2_DENTAL_DASHBOARD_SECTIONS) {
      expect(
        (frBlock.dashboard as { sections: Record<string, string> }).sections[section]
      ).toBeTruthy();
    }
    for (const tab of D5A2_DENTAL_WORKSPACE_TABS) {
      expect((frBlock.workspace as { tabs: Record<string, string> }).tabs[tab]).toBeTruthy();
    }
    expect((fr as { nav?: { dentalCare?: string } }).nav?.dentalCare ?? "Soins dentaires").toBeTruthy();
  });

  it("does not implement clinical dental engines in D5A.2 web surfaces", () => {
    const dash = read("src/features/dental-care/DentalCareDashboardView.tsx");
    const workspace = read("src/features/dental-care/DentalCareActiveWorkspaceView.tsx");
    expect(dash).not.toMatch(/ToothFinding|DentitionState|PeriodontalAssessment/);
    expect(workspace).not.toMatch(/createOrthodonticCase|saveOdontogram/);
  });
});
