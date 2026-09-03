import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  looksLikeFrenchCertificationUiText,
  resolveCertificationDeficiencyDisplay,
} from "./certificationDeficiencyDisplay";

function tFor(lang: "en" | "fr") {
  const root = lang === "en" ? en : fr;
  return (key: string) => {
    const parts = key.split(".");
    let cur: unknown = root;
    for (const p of parts) {
      if (cur == null || typeof cur !== "object") return key;
      cur = (cur as Record<string, unknown>)[p];
    }
    return typeof cur === "string" ? cur : key;
  };
}

const FRENCH_API_MESSAGE =
  "Documentez le suivi structuré (destination/prestataire, délai et contact le cas échéant) dans la planification de sortie.";

describe("certificationDeficiencyDisplay locale isolation", () => {
  it("English locale + discharge follow-up blocker is fully English (screenshot regression)", () => {
    const display = resolveCertificationDeficiencyDisplay(tFor("en"), "en", {
      title: "Discharge Follow-Up Missing",
      description: FRENCH_API_MESSAGE, // poisoned server field — must be ignored when keys exist
      titleKey: "edLifecycle.certification.b1.codes.DISCHARGE_FOLLOW_UP_MISSING.title",
      descriptionKey: "edLifecycle.certification.b1.codes.DISCHARGE_FOLLOW_UP_MISSING.description",
      stableCode: "DISCHARGE_FOLLOW_UP_MISSING",
    });
    expect(display.title.toLowerCase()).toContain("follow-up");
    expect(display.description.toLowerCase()).toContain("follow-up");
    expect(looksLikeFrenchCertificationUiText(display.title)).toBe(false);
    expect(looksLikeFrenchCertificationUiText(display.description)).toBe(false);
    expect(display.description).not.toContain("Documentez");
  });

  it("French locale + discharge follow-up blocker is fully French", () => {
    const display = resolveCertificationDeficiencyDisplay(tFor("fr"), "fr", {
      title: "Discharge Follow-Up Missing",
      description: "English fallback must not win when FR keys exist",
      titleKey: "edLifecycle.certification.b1.codes.DISCHARGE_FOLLOW_UP_MISSING.title",
      descriptionKey: "edLifecycle.certification.b1.codes.DISCHARGE_FOLLOW_UP_MISSING.description",
      stableCode: "DISCHARGE_FOLLOW_UP_MISSING",
    });
    expect(display.title).toContain("Suivi");
    expect(display.description).toMatch(/Documentez|suivi/i);
  });

  it("English locale never falls back to French description when keys resolve", () => {
    const display = resolveCertificationDeficiencyDisplay(tFor("en"), "en", {
      title: "Provider Note Unsigned",
      description: "La documentation médicale doit être signée avant la clôture définitive.",
      titleKey: "edLifecycle.certification.stageA.codes.PROVIDER_NOTE_UNSIGNED.title",
      descriptionKey: "edLifecycle.certification.stageA.codes.PROVIDER_NOTE_UNSIGNED.description",
      stableCode: "PROVIDER_DOCUMENTATION_UNSIGNED",
    });
    expect(display.description).toMatch(/signed/i);
    expect(display.description).not.toContain("documentation médicale");
  });

  it("English locale + B3 MAR finding is English", () => {
    const display = resolveCertificationDeficiencyDisplay(tFor("en"), "en", {
      title: "unused",
      description: "unused",
      titleKey: "edLifecycle.certification.b3.codes.MAR_DOSE_UNRESOLVED.title",
      descriptionKey: "edLifecycle.certification.b3.codes.MAR_DOSE_UNRESOLVED.description",
      stableCode: "MAR_DOSE_UNRESOLVED",
    });
    expect(display.title).toMatch(/MAR dose/i);
    expect(looksLikeFrenchCertificationUiText(display.description)).toBe(false);
  });

  it("French locale + B3 MAR finding is French", () => {
    const display = resolveCertificationDeficiencyDisplay(tFor("fr"), "fr", {
      title: "unused",
      description: "unused",
      titleKey: "edLifecycle.certification.b3.codes.MAR_DOSE_UNRESOLVED.title",
      descriptionKey: "edLifecycle.certification.b3.codes.MAR_DOSE_UNRESOLVED.description",
      stableCode: "MAR_DOSE_UNRESOLVED",
    });
    expect(display.title).toMatch(/Dose MAR/i);
  });

  it("patient preferred language does not change certification UI locale", () => {
    // App locale English; patient language French is irrelevant to this helper.
    const display = resolveCertificationDeficiencyDisplay(tFor("en"), "en", {
      title: "x",
      description: FRENCH_API_MESSAGE,
      titleKey: "edLifecycle.certification.b1.codes.DISCHARGE_INSTRUCTIONS_NOT_COMMUNICATED.title",
      descriptionKey:
        "edLifecycle.certification.b1.codes.DISCHARGE_INSTRUCTIONS_NOT_COMMUNICATED.description",
      stableCode: "DISCHARGE_INSTRUCTIONS_NOT_GIVEN",
    });
    expect(display.title.toLowerCase()).toContain("communication");
    expect(display.description).not.toContain("Documentez");
  });

  it("locale switch from en→fr changes finding text consistently", () => {
    const deficiency = {
      title: "Discharge Follow-Up Missing",
      description: FRENCH_API_MESSAGE,
      titleKey: "edLifecycle.certification.b1.codes.DISCHARGE_FOLLOW_UP_MISSING.title",
      descriptionKey: "edLifecycle.certification.b1.codes.DISCHARGE_FOLLOW_UP_MISSING.description",
      stableCode: "DISCHARGE_FOLLOW_UP_MISSING",
    };
    const enDisplay = resolveCertificationDeficiencyDisplay(tFor("en"), "en", deficiency);
    const frDisplay = resolveCertificationDeficiencyDisplay(tFor("fr"), "fr", deficiency);
    expect(enDisplay.title).not.toBe(frDisplay.title);
    expect(enDisplay.description).not.toBe(frDisplay.description);
    expect(looksLikeFrenchCertificationUiText(enDisplay.description)).toBe(false);
    expect(frDisplay.description).toMatch(/Documentez|suivi/i);
  });

  it("FR missing keys do not consume English fallbackTitleEn or API title", () => {
    const tMissing = (key: string) => key;
    const display = resolveCertificationDeficiencyDisplay(tMissing, "fr", {
      title: "Discharge Follow-Up Missing",
      description: "Document structured follow-up in English.",
      titleKey: "edLifecycle.certification.missing.doesNotExist.title",
      descriptionKey: "edLifecycle.certification.missing.doesNotExist.description",
      stableCode: "DISCHARGE_FOLLOW_UP_MISSING",
    });
    expect(display.title).not.toMatch(/follow-up/i);
    expect(display.description).not.toMatch(/Document structured follow-up/i);
    expect(display.title).not.toBe("Discharge Follow-Up Missing");
    expect(display.title).toBe("edLifecycle.certification.missing.doesNotExist.title");
  });

  it("EN missing keys do not consume French catalog copy", () => {
    const tMissing = (key: string) => key;
    const display = resolveCertificationDeficiencyDisplay(tMissing, "en", {
      title: "Suivi de sortie manquant",
      description: "Documentez le suivi structuré.",
      titleKey: "edLifecycle.certification.missing.doesNotExist.title",
      descriptionKey: "edLifecycle.certification.missing.doesNotExist.description",
      stableCode: "DISCHARGE_FOLLOW_UP_MISSING",
    });
    expect(display.title).toBe("Discharge follow-up missing");
    expect(looksLikeFrenchCertificationUiText(display.title)).toBe(false);
    expect(looksLikeFrenchCertificationUiText(display.description)).toBe(false);
  });

  it("unsupported es does not present EN or FR certification copy", () => {
    const display = resolveCertificationDeficiencyDisplay(tFor("en"), "es", {
      title: "Discharge Follow-Up Missing",
      description: "Documentez le suivi structuré.",
      titleKey: "edLifecycle.certification.b1.codes.DISCHARGE_FOLLOW_UP_MISSING.title",
      stableCode: "DISCHARGE_FOLLOW_UP_MISSING",
    });
    expect(display.title).not.toMatch(/follow-up/i);
    expect(display.title).not.toMatch(/Suivi/i);
    expect(display.title).toBe("edLifecycle.certification.b1.codes.DISCHARGE_FOLLOW_UP_MISSING.title");
  });
});
