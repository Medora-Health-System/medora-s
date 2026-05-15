import { describe, expect, it } from "vitest";
import en from "./en";
import fr from "./fr";

/**
 * Regression (Phase 14E): encounter quick-context partial-load notice must follow locale,
 * not hardcoded French (English facility must show EN-only chrome strings).
 */
describe("encounterChrome quick context i18n", () => {
  const ecEn = en.encounterChrome;
  const ecFr = fr.encounterChrome;

  it("mirrors partial-load label strings EN ↔ FR", () => {
    expect(ecEn.quickContextFailedVitals).toBe("vital signs");
    expect(ecFr.quickContextFailedVitals).toBe("signes vitaux");
    expect(ecEn.quickContextFailedOrders).toBe("orders");
    expect(ecFr.quickContextFailedOrders).toBe("ordres");
    expect(ecEn.quickContextFailedDiagnoses).toBe("diagnosis list");
    expect(ecFr.quickContextFailedDiagnoses).toBe("liste de diagnostics");
  });

  it("includes {labels} placeholder for substitution", () => {
    expect(ecEn.quickContextPartialLoadNotice).toContain("{labels}");
    expect(ecFr.quickContextPartialLoadNotice).toContain("{labels}");
  });

  it("English partial-load notice has no French diacritics", () => {
    expect(ecEn.quickContextPartialLoadNotice).not.toMatch(/[àâäéèêëïîôùûçÀÂÄÉÈÊËÏÎÔÙÛÇœ]/);
  });
});
