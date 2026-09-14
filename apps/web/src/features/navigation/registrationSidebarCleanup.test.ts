import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";

const webRoot = join(import.meta.dirname, "../../..");
const registrationSource = readFileSync(
  join(webRoot, "app/app/registration/page.tsx"),
  "utf8"
);

describe("Registration and primary sidebar cleanup", () => {
  it("keeps the Registration workflow but removes duplicate presentation copy", () => {
    expect(registrationSource).not.toContain('t("registrationWorkspace.title")');
    expect(registrationSource).not.toContain('t("registrationWorkspace.subtitle")');
    expect(registrationSource).not.toContain('t("registrationHome.patientChartToolsSelectHint")');
    expect(registrationSource).not.toContain('t("registrationHome.upcomingFollowUpsIntro")');
    expect(registrationSource).not.toContain('t("followUpsPage.noUpcoming14Days")');
    expect(registrationSource).toContain('t("registrationWorkspace.searchHeading")');
    expect(registrationSource).toContain("<PatientSearchAndSelect");
    expect(registrationSource).toContain("<PatientPrimaryInsurancePanel");
    expect(registrationSource).toContain("<RegistrationDocumentCenter");
  });

  it("orders the primary menu around the five requested entry points", () => {
    const accueil = SIDEBAR_NAV_ITEMS
      .filter((item) => item.group === "accueil")
      .map((item) => item.href);

    expect(accueil.slice(0, 6)).toEqual([
      "/app/clinic-care",
      "/app/registration",
      "/app/emergency/trackboard",
      "/app/dental",
      "/app/hospitalisation",
      "/app/trackboard",
    ]);
  });

  it("removes unused Nursing and ED-triage menu entries without deleting shared routes", () => {
    expect(SIDEBAR_NAV_ITEMS.some((item) => item.href === "/app/nursing")).toBe(false);
    expect(SIDEBAR_NAV_ITEMS.some((item) => item.href === "/app/emergency/triage")).toBe(false);
  });

  it("preserves Pharmacy navigation", () => {
    expect(SIDEBAR_NAV_ITEMS.some((item) => item.href === "/app/pharmacy")).toBe(true);
    expect(SIDEBAR_NAV_ITEMS.some((item) => item.href === "/app/pharmacy-worklist")).toBe(true);
  });

  it("localizes the compact Clinic medication empty state in all product languages", () => {
    const key = "clinicCareD4c7e.mar.emptyFacility";
    expect(resolveClinicalUiMessage("en", key)).toBe("No medication scheduled.");
    expect(resolveClinicalUiMessage("fr", key)).toBe("Aucun médicament programmé.");
    expect(resolveClinicalUiMessage("es", key)).toBe("No hay medicamentos programados.");
  });
});
