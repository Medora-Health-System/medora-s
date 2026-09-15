import { describe, expect, it } from "vitest";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";

describe("Digital Care provider messaging workspace", () => {
  it("exposes one dedicated provider/RN sidebar destination", () => {
    const item = SIDEBAR_NAV_ITEMS.find((candidate) => candidate.href === "/app/digital-care");
    expect(item).toBeDefined();
    expect(item?.label).toBe("nav.digitalCare");
    expect(item?.roles).toEqual(["RN", "PROVIDER"]);
    expect(item?.navAreas).toEqual(["EMERGENCY", "HOSPITAL", "CLINIC_CARE"]);
  });

  it("localizes the Digital Care label in all supported UI languages", () => {
    expect(resolveClinicalUiMessage("en", "nav.digitalCare")).toBe("Digital Care");
    expect(resolveClinicalUiMessage("fr", "nav.digitalCare")).toBe("Soins numériques");
    expect(resolveClinicalUiMessage("es", "nav.digitalCare")).toBe("Atención Digital");
  });
});
