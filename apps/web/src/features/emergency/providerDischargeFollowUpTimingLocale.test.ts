import { describe, expect, it } from "vitest";
import {
  localizeProviderDischargeFollowUpTiming,
  PROVIDER_DISCHARGE_FOLLOW_UP_TIMING_LOCALE,
  resolveProviderDischargeFollowUpTimingCanonicalKey,
} from "./providerDischargeFollowUpTimingLocale";
import { PROVIDER_DISCHARGE_TEMPLATE_REGISTRY } from "./providerDischargeTemplateRegistry";
import { extractSharedFieldsFromTemplate } from "./providerDischargeSharedPlanningMerge";

describe("MEDUI.ED.DISCHARGE.I18N_REMEDIATION.1 — follow-up timing locale", () => {
  it("localizes canonical EN timing to FR", () => {
    expect(localizeProviderDischargeFollowUpTiming("within 1–2 days", "fr")).toBe("dans 1 à 2 jours");
    expect(localizeProviderDischargeFollowUpTiming("within 24 hours", "fr")).toBe("dans les 24 heures");
  });

  it("preserves EN timing for EN locale", () => {
    expect(localizeProviderDischargeFollowUpTiming("within 1–2 days", "en")).toBe("within 1–2 days");
  });

  it("every registry defaultFollowUps timing has a locale mapping", () => {
    const unmapped: string[] = [];
    for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
      for (const row of template.defaultFollowUps ?? []) {
        const timing = row.timing.trim();
        if (!timing) continue;
        if (!PROVIDER_DISCHARGE_FOLLOW_UP_TIMING_LOCALE[timing]) {
          unmapped.push(`${template.id}:${timing}`);
        }
      }
    }
    expect(unmapped).toEqual([]);
  });

  it("extractSharedFieldsFromTemplate localizes follow-ups for FR", () => {
    const chest = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "chest_pain_v1")!;
    const shared = extractSharedFieldsFromTemplate(chest, "fr");
    expect(shared.defaultFollowUps?.[0]?.timing).toBe("dans 1 à 2 jours");
    expect(shared.defaultFollowUps?.[0]?.timing.toLowerCase()).not.toContain("within");
  });

  it("round-trips localized FR timing back to canonical key", () => {
    const fr = localizeProviderDischargeFollowUpTiming("within 1–2 days", "fr");
    expect(resolveProviderDischargeFollowUpTimingCanonicalKey(fr)).toBe("within 1–2 days");
  });
});
