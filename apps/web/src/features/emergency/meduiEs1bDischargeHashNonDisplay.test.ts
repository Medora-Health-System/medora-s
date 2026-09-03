import { describe, expect, it } from "vitest";
import { computeProviderDischargeTemplateAppliedHash } from "./providerDischargeTemplateAppliedHash";
import { providerDischargeCardNeedsLocaleReapply } from "./providerDischargeCardTemplateSync";
import {
  applyProviderDischargeTemplateToCard,
  buildProviderDischargeCardFromDiagnosis,
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";

/**
 * SAFE NON-DISPLAY MULTILINGUAL LOGIC:
 * The other-locale hash is identity/comparison only. A match means “this card was
 * applied in the other stored locale” and triggers reapply in the *active* locale.
 * It must not copy the other language into rendered output.
 */
describe("MEDUI.ES.1B-CERT discharge template hash is non-display", () => {
  const resolved = resolveProviderDischargeTemplateForDiagnosis({
    code: "R07.9",
    displayName: "Chest pain",
  });

  it("EN and FR applied hashes differ (locale-bound identity)", () => {
    const template = resolved.template;
    const enHash = computeProviderDischargeTemplateAppliedHash(template, "en");
    const frHash = computeProviderDischargeTemplateAppliedHash(template, "fr");
    expect(enHash).toBeTruthy();
    expect(frHash).toBeTruthy();
    expect(enHash).not.toBe(frHash);
  });

  it("other-locale hash match only flags reapply; render uses active locale body", () => {
    const cardEn = buildProviderDischargeCardFromDiagnosis({
      sourceEncounterDiagnosisId: "dx-chest",
      code: "R07.9",
      displayName: "Chest pain",
      displayOrder: 0,
      isPrimaryDiagnosis: true,
      applyTemplateSuggestion: true,
      locale: "en",
    });
    const enBody = getProviderDischargeSuggestedTextBody(resolved.template, "en");
    const frBody = getProviderDischargeSuggestedTextBody(resolved.template, "fr");
    expect(cardEn.description).toBe(enBody.description);
    expect(providerDischargeCardNeedsLocaleReapply(cardEn, "fr")).toBe(true);

    const cardFr = applyProviderDischargeTemplateToCard(cardEn, resolved, {
      locale: "fr",
      overwriteExisting: true,
    });
    expect(cardFr.description).toBe(frBody.description);
    expect(cardFr.description).not.toBe(enBody.description);
    expect(cardFr.templateMeta?.appliedLocale).toBe("fr");
  });

  it("suggested-text lookup has no cross-language fallback", () => {
    const en = getProviderDischargeSuggestedTextBody(resolved.template, "en");
    const fr = getProviderDischargeSuggestedTextBody(resolved.template, "fr");
    expect(en.description).not.toBe(fr.description);
  });
});
