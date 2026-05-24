import { describe, expect, it } from "vitest";
import {
  imInjectionSiteValues,
  isIntramuscularMarRoute,
  marModalRequiresInjectionSite,
  validateImInjectionSiteForMarCreate,
} from "@medora/shared";

describe("MAR IM injection site client validation", () => {
  it("IM + administered with no site shows validation error", () => {
    expect(
      validateImInjectionSiteForMarCreate({
        marAction: "administered",
        route: "IM",
        injectionSite: undefined,
        notes: "",
        userNotesOnly: true,
      })
    ).toMatchObject({ code: "injection_site_required" });
  });

  it("IM + administered with site succeeds", () => {
    expect(
      validateImInjectionSiteForMarCreate({
        marAction: "administered",
        route: "intramuscular",
        injectionSite: "left_ventrogluteal",
        notes: "",
        userNotesOnly: true,
      })
    ).toBeNull();
  });

  it("IM + patient refused does not require site", () => {
    expect(
      validateImInjectionSiteForMarCreate({
        marAction: "refused",
        route: "IM",
        injectionSite: undefined,
        notes: "",
        userNotesOnly: true,
      })
    ).toBeNull();
    expect(
      marModalRequiresInjectionSite({
        marAction: "refused",
        route: "IM",
      })
    ).toBe(false);
  });

  it("PO + administered does not require site", () => {
    expect(
      validateImInjectionSiteForMarCreate({
        marAction: "administered",
        route: "PO",
        injectionSite: undefined,
        notes: "",
        userNotesOnly: true,
      })
    ).toBeNull();
    expect(
      marModalRequiresInjectionSite({
        marAction: "administered",
        route: "IV",
      })
    ).toBe(false);
  });

  it("changing route from IM to non-IM should not require site", () => {
    expect(isIntramuscularMarRoute("IM")).toBe(true);
    expect(isIntramuscularMarRoute("PO")).toBe(false);
    expect(
      marModalRequiresInjectionSite({
        marAction: "administered",
        route: "PO",
      })
    ).toBe(false);
  });

  it("exposes all injection site options for the select", () => {
    expect(imInjectionSiteValues).toHaveLength(9);
    expect(imInjectionSiteValues).toContain("other");
  });
});
