/**
 * MEDUI.D4C.7B — web source guards: Pharmacy nav, inventory alerts, Consultations routing.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";
import { filterSidebarNavItemsForSession } from "@/features/navigation/navigationVisibility";
import {
  buildClinicPharmacyEntryHref,
  canAccessClinicPharmacyNavigation,
  clinicCareAmbulatoryOpenWorkspacePathForRole,
  resolveConsultationsListHref,
  shouldExposeInventoryAlertsOnClinicClinicalBoard,
} from "@medora/shared";

const featureDir = __dirname;
const root = join(featureDir, "../../..");
const appRoot = join(root, "app/app");

function readApp(rel: string): string {
  return readFileSync(join(appRoot, rel), "utf8");
}

function readFeature(rel: string): string {
  return readFileSync(join(featureDir, rel), "utf8");
}

function readWeb(rel: string): string {
  return readFileSync(join(root, "src", rel), "utf8");
}

const enMessages = readFileSync(join(root, "src/i18n/messages/en.ts"), "utf8");
const frMessages = readFileSync(join(root, "src/i18n/messages/fr.ts"), "utf8");
const uiLabels = readFileSync(join(root, "src/lib/uiLabels.ts"), "utf8");

const clinicPharmacyProfile = {
  roleCodes: ["ADMIN"] as string[],
  facilityType: "CLINIC",
  facilityServiceLines: ["CLINIC", "LABORATORY", "PHARMACY"] as string[],
};

describe("MEDUI.D4C.7B clinic pharmacy + consultations navigation", () => {
  it("A — ADMIN/PHARMACY see Pharmacy; clinical roles do not; clinic entry preserves ambulatory source", () => {
    const admin = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["ADMIN"],
      profile: { ...clinicPharmacyProfile, roleCodes: ["ADMIN"] },
    });
    expect(admin.some((i) => i.href.includes("/app/pharmacy"))).toBe(true);
    expect(
      admin.some((i) => i.href === buildClinicPharmacyEntryHref() || i.href.startsWith("/app/pharmacy"))
    ).toBe(true);

    const pharmacy = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["PHARMACY"],
      profile: { ...clinicPharmacyProfile, roleCodes: ["PHARMACY"] },
    });
    expect(pharmacy.some((i) => i.href.includes("/app/pharmacy"))).toBe(true);

    for (const role of ["PROVIDER", "RN", "FRONT_DESK", "BILLING", "LAB"] as const) {
      const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
        roleCodes: [role],
        profile: {
          roleCodes: [role],
          facilityType: "CLINIC",
          facilityServiceLines: ["CLINIC", "PHARMACY"],
        },
      });
      expect(filtered.some((i) => i.href.includes("/app/pharmacy"))).toBe(false);
      expect(canAccessClinicPharmacyNavigation([role])).toBe(false);
    }

    const entry = buildClinicPharmacyEntryHref();
    expect(entry).toContain("source=clinic-care");
    expect(entry).toContain("ambulatory=1");
    expect(readApp("clinic-care/pharmacy/page.tsx")).toContain("buildClinicPharmacyEntryHref");
  });

  it("B — Pharmacy board preserved; no ClinicPharmacy duplicate engine", () => {
    expect(existsSync(join(featureDir, "ClinicPharmacy.tsx"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicPharmacyQueue.tsx"))).toBe(false);
    expect(existsSync(join(appRoot, "pharmacy/page.tsx"))).toBe(true);
    expect(existsSync(join(appRoot, "pharmacy/inventory/page.tsx"))).toBe(true);
    expect(existsSync(join(appRoot, "pharmacy/dispense/page.tsx"))).toBe(true);
    expect(existsSync(join(appRoot, "pharmacy/low-stock/page.tsx"))).toBe(true);
    expect(existsSync(join(appRoot, "pharmacy/expiring/page.tsx"))).toBe(true);
    const pharmacyHome = readApp("pharmacy/page.tsx");
    expect(pharmacyHome).toContain("PharmacyAlertsCard");
    expect(pharmacyHome).toContain("linkInventory");
    expect(pharmacyHome).toContain("linkDispense");
    expect(pharmacyHome).toContain("linkLowStock");
    expect(pharmacyHome).toContain("linkExpiring");
    expect(pharmacyHome).toContain("linkWorklist");
  });

  it("C — inventory-alert privacy: Clinical Board clean; alerts ADMIN/PHARMACY; API restricted", () => {
    expect(shouldExposeInventoryAlertsOnClinicClinicalBoard()).toBe(false);
    const clinicalBoard = readFeature("ClinicCareClinicalBoardAnalyticsView.tsx");
    expect(clinicalBoard).not.toContain("PharmacyAlertsCard");
    expect(clinicalBoard).not.toContain("inventory-expiring");
    expect(clinicalBoard).not.toContain("inventory-low-stock");
    const pharmacyHome = readApp("pharmacy/page.tsx");
    expect(pharmacyHome).toContain("canManagePharmacy");
    const inventoryCtrl = readFileSync(
      join(root, "../api/src/pharmacy-inventory/pharmacy-inventory.controller.ts"),
      "utf8"
    );
    expect(inventoryCtrl).toMatch(
      /inventory-low-stock[\s\S]{0,120}@RequireRoles\(RoleCode\.PHARMACY, RoleCode\.ADMIN\)/
    );
    expect(inventoryCtrl).toMatch(
      /inventory-expiring[\s\S]{0,120}@RequireRoles\(RoleCode\.PHARMACY, RoleCode\.ADMIN\)/
    );
    expect(inventoryCtrl).not.toMatch(
      /inventory-low-stock[\s\S]{0,160}RoleCode\.PROVIDER/
    );
  });

  it("D — Consultations nav opens ambulatory projection; role-aware workspace; no ED auto-open", () => {
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["PROVIDER"],
      profile: {
        roleCodes: ["PROVIDER"],
        facilityType: "CLINIC",
        facilityServiceLines: null,
      },
    });
    expect(filtered.some((i) => i.href === "/app/clinic-care/encounters")).toBe(true);
    expect(filtered.some((i) => i.href === "/app/encounters")).toBe(false);
    expect(
      resolveConsultationsListHref({ clinicCareEnabled: true, edEnabled: false })
    ).toBe("/app/clinic-care/encounters");

    const encountersView = readFeature("ClinicCareAmbulatoryEncountersView.tsx");
    expect(encountersView).toContain("clinicCareAmbulatoryOpenWorkspacePathForRole");
    expect(encountersView).toContain('from: "consultations"');
    expect(encountersView).toContain("/clinic-care/trackboard");
    expect(encountersView).not.toContain("fetchOpenEncounters");

    const providerOpen = clinicCareAmbulatoryOpenWorkspacePathForRole("e1", {
      roleCodes: ["PROVIDER"],
      from: "consultations",
    });
    expect(providerOpen).toContain("workspace=ambulatory");
    expect(providerOpen).toContain("section=medical-evaluation");
    expect(providerOpen).not.toContain("workspace=ed");

    const gate = readApp("encounters/page.tsx");
    expect(gate).toContain("resolveConsultationsListHrefFromCapabilities");
    expect(gate).toContain("EncountersLegacyOpenList");
  });

  it("E — consultation projection empty vs error keys + ambulatory list source", () => {
    expect(frMessages).toContain(
      "Aucune consultation ambulatoire ne correspond à cette vue."
    );
    expect(frMessages).toContain("Impossible de charger les consultations.");
    expect(enMessages).toContain("No ambulatory consultations match this view.");
    expect(readFeature("ClinicCareAmbulatoryEncountersView.tsx")).toContain(
      "encountersLoadError"
    );
    expect(readFeature("ClinicCareAmbulatoryEncountersView.tsx")).toContain(
      "encountersRetry"
    );
    expect(existsSync(join(featureDir, "ClinicConsultation.tsx"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicEncounterList.tsx"))).toBe(false);
  });

  it("F — legacy generic encounters retained for ED-only; clinic uses typed resolver", () => {
    expect(existsSync(join(appRoot, "encounters/EncountersLegacyOpenList.tsx"))).toBe(true);
    const edNav = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["PROVIDER"],
      profile: {
        roleCodes: ["PROVIDER"],
        facilityType: "FREESTANDING_ER",
        facilityServiceLines: ["EMERGENCY"],
      },
    });
    // Freestanding ER may strip some items; generic encounters href remains unresolved to clinic-care
    // when clinicCare is off:
    expect(
      resolveConsultationsListHref({
        clinicCareEnabled: false,
        urgentCareEnabled: false,
        edEnabled: true,
      })
    ).toBe("/app/encounters");
    void edNav;
    expect(readWeb("features/navigation/navigationVisibility.ts")).toContain(
      "applyClinicCareAwareSidebarHrefs"
    );
  });

  it("G — French Pharmacy Clinic navigation labels", () => {
    expect(uiLabels).toContain('pharmacyQueue: "Pharmacie"');
    expect(uiLabels).toContain('pharmacyLowStock: "Stock faible"');
    expect(uiLabels).toContain('pharmacyExpiring: "Expiration prochaine"');
    expect(uiLabels).toContain('pharmacyInventory: "Inventaire"');
    expect(uiLabels).toContain('pharmacyDispense: "Délivrer"');
    expect(frMessages).toContain('title: "Pharmacie"');
    expect(frMessages).toContain('title: "Alertes de pharmacie"');
    expect(frMessages).toContain("clinicCareD4c7b");
    expect(enMessages).toContain("clinicCareD4c7b");
    expect(enMessages).toContain('pharmacyQueue: "Pharmacy"');
  });

  it("H — regression anchors: D4C.7B module wired; Clinical Board still present", () => {
    expect(existsSync(join(featureDir, "ClinicCareClinicalBoardAnalyticsView.tsx"))).toBe(true);
    expect(readWeb("features/navigation/navigationVisibility.ts")).toContain(
      "resolveClinicCareAwareSidebarHref"
    );
    expect(readApp("clinic-care/pharmacy/page.tsx")).toContain("ClinicCareDirectCanonicalRedirect");
  });
});
