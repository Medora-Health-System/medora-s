import { describe, expect, it } from "vitest";
import { extractMarSaveErrorMessage } from "./marSaveErrorMessage";
import {
  marEffectiveTimeErrorMessageForCode,
  resolveMarEffectiveTimeErrorMessage,
} from "./marEffectiveTimeErrorMessage";

describe("marI18nLanguageLeak (MEDUI.ED.MAR.HOTFIX.TIME.2)", () => {
  const frenchApiMessage = "Un motif est requis pour cet ajustement d'heure.";

  it("English UI never renders French timing blocker from legacy API message", () => {
    const err = Object.assign(new Error(frenchApiMessage), {
      body: { statusCode: 400, message: frenchApiMessage },
    });
    const msg = extractMarSaveErrorMessage(err, "en", "Save failed", (k) => k);
    expect(msg).toBe("Save failed");
    expect(msg).not.toContain("Un motif");
  });

  it("French UI renders French when language is fr via code resolver", () => {
    const msg = marEffectiveTimeErrorMessageForCode(
      "MAR_EFFECTIVE_TIME_REASON_REQUIRED",
      "fr"
    );
    expect(msg).toContain("motif");
  });

  it("English UI renders English via code resolver", () => {
    const msg = marEffectiveTimeErrorMessageForCode(
      "MAR_EFFECTIVE_TIME_REASON_REQUIRED",
      "en"
    );
    expect(msg).toMatch(/reason is required/i);
    expect(msg).not.toContain("motif");
  });

  it("structured API errors translate via i18n code path", () => {
    const err = Object.assign(new Error("Administration time cannot be in the future."), {
      body: {
        statusCode: 400,
        message: "Administration time cannot be in the future.",
        code: "MAR_EFFECTIVE_TIME_FUTURE",
      },
    });
    const msg = resolveMarEffectiveTimeErrorMessage(err, "en");
    expect(msg).toMatch(/future/i);
  });

  it("no hardcoded French string in English path for effective time codes", () => {
    for (const code of [
      "MAR_EFFECTIVE_TIME_FUTURE",
      "MAR_EFFECTIVE_TIME_INVALID",
      "MAR_EFFECTIVE_TIME_NOT_ADMINISTERED",
    ] as const) {
      const msg = marEffectiveTimeErrorMessageForCode(code, "en");
      expect(msg).not.toMatch(/^(un |une |le |la |l')/i);
    }
  });
});
