import { describe, expect, it } from "vitest";
import fr from "@/i18n/messages/fr";
import en from "@/i18n/messages/en";
import {
  billingLedgerReasonLabelKey,
  billingLedgerSideAppliesLabelKey,
  billingLedgerStatusLabelKey,
} from "@/lib/billingLedgerReadinessDisplay";
import { FORBIDDEN_BILLING_LEDGER_READINESS_KEYS } from "@medora/shared";

function tFrom(messages: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

describe("billingLedgerReadiness display (19UCED.4)", () => {
  it("renders preview-only disclaimer in FR", () => {
    expect(tFrom(fr, "billingLedgerReadiness.previewOnlyDisclaimer")).toMatch(/Aperçu uniquement/i);
    expect(tFrom(fr, "billingLedgerReadiness.previewOnlyDisclaimer")).toMatch(/aucune réclamation/i);
  });

  it("covers status and reason i18n keys", () => {
    expect(tFrom(fr, billingLedgerStatusLabelKey("READY"))).toMatch(/prêt/i);
    expect(tFrom(fr, billingLedgerStatusLabelKey("NOT_APPLICABLE"))).toMatch(/non applicable/i);
    expect(tFrom(fr, billingLedgerReasonLabelKey("PROFESSIONAL_PROVIDER_REQUIRED"))).toMatch(/prestataire/i);
    expect(tFrom(fr, billingLedgerReasonLabelKey("FACILITY_BILLING_IDENTITY_REQUIRED"))).toMatch(/établissement/i);
  });

  it("renders applies labels for UC facility not applicable", () => {
    expect(tFrom(fr, billingLedgerSideAppliesLabelKey(false))).toMatch(/non/i);
    expect(tFrom(en, billingLedgerSideAppliesLabelKey(true))).toMatch(/yes/i);
  });

  it("card component has no submit claim action", async () => {
    const fs = await import("node:fs/promises");
    const cardPath = new URL("../components/billing/EncounterBillingLedgerReadinessCard.tsx", import.meta.url);
    const src = await fs.readFile(cardPath, "utf8");
    expect(src).not.toMatch(/submit.*claim|soumettre.*réclamation/i);
    expect(src).toContain("previewOnlyDisclaimer");
    expect(src).not.toMatch(/onSubmit|type=\"submit\"/i);
    expect(src).toContain("billingLedgerReadiness.professionalTitle");
    expect(src).toContain("billingLedgerReadiness.facilityTitle");
  });

  it("forbidden PHI keys remain documented in shared package", () => {
    expect(FORBIDDEN_BILLING_LEDGER_READINESS_KEYS).toContain("providerName");
    expect(FORBIDDEN_BILLING_LEDGER_READINESS_KEYS).toContain("diagnosisText");
  });
});
