import { describe, expect, it, vi } from "vitest";
import {
  infusionErrorMessageForCode,
  resolveMedicationInfusionErrorMessage,
} from "@/features/mar/marInfusionErrorMessage";
import { extractMarSaveErrorMessage } from "@/features/mar/marSaveErrorMessage";

describe("marInfusionErrorMessage (K.10B)", () => {
  const tEn = (key: string) =>
    ({
      "marShiftTimeline.infusionErrors.NO_ACTIVE_INFUSION":
        "No active infusion was found for this medication.",
      "marShiftTimeline.infusionErrors.STOP_BEFORE_START":
        "Stop time cannot be before start time.",
    })[key] ?? key;

  const tFr = (key: string) =>
    ({
      "marShiftTimeline.infusionErrors.NO_ACTIVE_INFUSION":
        "Aucune perfusion en cours pour ce médicament.",
    })[key] ?? key;

  it("maps NO_ACTIVE_INFUSION to English via i18n", () => {
    const err = Object.assign(new Error("Aucune perfusion en cours pour ce médicament."), {
      errorCode: "NO_ACTIVE_INFUSION",
      body: { message: "Aucune perfusion en cours pour ce médicament.", code: "NO_ACTIVE_INFUSION" },
    });
    expect(resolveMedicationInfusionErrorMessage(err, "en", tEn)).toBe(
      "No active infusion was found for this medication."
    );
  });

  it("maps NO_ACTIVE_INFUSION to French via i18n", () => {
    const err = Object.assign(new Error("Aucune perfusion en cours pour ce médicament."), {
      errorCode: "NO_ACTIVE_INFUSION",
    });
    expect(resolveMedicationInfusionErrorMessage(err, "fr", tFr)).toBe(
      "Aucune perfusion en cours pour ce médicament."
    );
  });

  it("English UI never shows generic French fallback for structured infusion errors", () => {
    const err = Object.assign(new Error("Aucune perfusion en cours pour ce médicament."), {
      errorCode: "NO_ACTIVE_INFUSION",
      body: { message: "Aucune perfusion en cours pour ce médicament.", code: "NO_ACTIVE_INFUSION" },
    });
    const msg = extractMarSaveErrorMessage(err, "en", "Unable to complete MAR action.", tEn);
    expect(msg).not.toBe("Une erreur est survenue.");
    expect(msg).toBe("No active infusion was found for this medication.");
  });

  it("falls back to English copy without t()", () => {
    expect(infusionErrorMessageForCode("STOP_BEFORE_START", "en")).toBe(
      "Stop time cannot be before start time."
    );
  });
});

describe("marSaveErrorMessage infusion regression", () => {
  it("does not pass French API message through on English locale without errorCode", () => {
    const err = Object.assign(new Error("Aucune perfusion en cours pour cette ligne."), {
      body: { message: "Aucune perfusion en cours pour cette ligne." },
    });
    const msg = extractMarSaveErrorMessage(err, "en", "Unable to stop infusion.");
    expect(msg).not.toBe("Une erreur est survenue.");
    expect(msg).toBe("Unable to stop infusion.");
  });
});
