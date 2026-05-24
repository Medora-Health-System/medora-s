import { describe, expect, it } from "vitest";
import {
  IM_INJECTION_SITE_NOTE_PREFIX,
  IM_INJECTION_SITE_REQUIRED_MESSAGE,
  extractMarUserFreeTextNotes,
  isIntramuscularMarRoute,
  mergeInjectionSiteIntoMarNotes,
  parseInjectionSiteFromMarNotes,
  validateImInjectionSiteForMarCreate,
} from "./medicationAdministrationInjectionSite.js";

describe("isIntramuscularMarRoute", () => {
  it("detects IM route variants", () => {
    expect(isIntramuscularMarRoute("IM")).toBe(true);
    expect(isIntramuscularMarRoute("i.m.")).toBe(true);
    expect(isIntramuscularMarRoute("intramuscular")).toBe(true);
    expect(isIntramuscularMarRoute("Intramusculaire")).toBe(true);
  });

  it("does not treat non-IM routes as IM", () => {
    expect(isIntramuscularMarRoute("PO")).toBe(false);
    expect(isIntramuscularMarRoute("IV")).toBe(false);
    expect(isIntramuscularMarRoute("")).toBe(false);
    expect(isIntramuscularMarRoute(null)).toBe(false);
  });
});

describe("validateImInjectionSiteForMarCreate", () => {
  it("requires site for IM administered", () => {
    expect(
      validateImInjectionSiteForMarCreate({
        marAction: "administered",
        route: "IM",
        injectionSite: undefined,
      })
    ).toEqual({
      code: "injection_site_required",
      message: IM_INJECTION_SITE_REQUIRED_MESSAGE,
    });
  });

  it("accepts IM administered with site", () => {
    expect(
      validateImInjectionSiteForMarCreate({
        marAction: "administered",
        route: "IM",
        injectionSite: "right_deltoid",
      })
    ).toBeNull();
  });

  it("does not require site for refused IM", () => {
    expect(
      validateImInjectionSiteForMarCreate({
        marAction: "refused",
        route: "IM",
        injectionSite: undefined,
      })
    ).toBeNull();
  });

  it("does not require site for PO administered", () => {
    expect(
      validateImInjectionSiteForMarCreate({
        marAction: "administered",
        route: "PO",
        injectionSite: undefined,
      })
    ).toBeNull();
  });

  it("requires user notes when site is other", () => {
    expect(
      validateImInjectionSiteForMarCreate({
        marAction: "administered",
        route: "IM",
        injectionSite: "other",
        notes: "",
        userNotesOnly: true,
      })
    ).toMatchObject({ code: "injection_site_other_notes_required" });
  });
});

describe("mergeInjectionSiteIntoMarNotes", () => {
  it("persists machine-readable site line", () => {
    const merged = mergeInjectionSiteIntoMarNotes(
      "Action : Administré\nVoie : IM",
      "left_deltoid",
      "fr"
    );
    expect(merged).toContain(`${IM_INJECTION_SITE_NOTE_PREFIX}left_deltoid`);
    expect(merged).toContain("Site d'injection : Deltoïde gauche");
  });
});

describe("parseInjectionSiteFromMarNotes", () => {
  it("parses machine line", () => {
    const notes = `Action : Administré\n${IM_INJECTION_SITE_NOTE_PREFIX}right_vastus_lateralis`;
    expect(parseInjectionSiteFromMarNotes(notes)).toBe("right_vastus_lateralis");
  });

  it("parses human French site line", () => {
    const notes = "Action : Administré\nSite d'injection : Deltoïde droit";
    expect(parseInjectionSiteFromMarNotes(notes)).toBe("right_deltoid");
  });
});

describe("extractMarUserFreeTextNotes", () => {
  it("strips action route and site lines", () => {
    const notes = [
      "Action : Administré",
      "Voie : IM",
      "Site d'injection : Deltoïde droit",
      `${IM_INJECTION_SITE_NOTE_PREFIX}right_deltoid`,
      "Patient tolerated well",
    ].join("\n");
    expect(extractMarUserFreeTextNotes(notes)).toBe("Patient tolerated well");
  });
});
