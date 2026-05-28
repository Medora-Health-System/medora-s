import { describe, expect, it } from "vitest";
import fr from "@/i18n/messages/fr";
import en from "@/i18n/messages/en";
import {
  billingGovernanceClassificationFilterOptions,
  billingGovernanceReasonLabelKey,
  billingGovernanceSeverityLabelKey,
} from "@/lib/billingGovernanceDisplay";
import { FORBIDDEN_BILLING_GOVERNANCE_ANALYTICS_KEYS } from "@medora/shared";

function tFrom(messages: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

describe("billingGovernance display (19UCED.9)", () => {
  it("renders analytics-only disclaimer in FR", () => {
    expect(tFrom(fr, "billingGovernance.analyticsOnlyDisclaimer")).toMatch(/Analytique uniquement/i);
    expect(tFrom(fr, "billingGovernance.analyticsOnlyDisclaimer")).toMatch(/aucune réclamation/i);
  });

  it("covers classification filter options", () => {
    expect(billingGovernanceClassificationFilterOptions().length).toBe(7);
  });

  it("covers severity and reason labels", () => {
    expect(tFrom(fr, billingGovernanceSeverityLabelKey("WATCH"))).not.toBe(
      billingGovernanceSeverityLabelKey("WATCH"),
    );
    expect(tFrom(en, billingGovernanceReasonLabelKey("UC_ED_CONVERSION_VOLUME"))).toMatch(/conversion/i);
  });

  it("dashboard page has no patient table or submit/generate/export buttons", async () => {
    const fs = await import("node:fs/promises");
    const pagePath = new URL("../../app/app/admin/billing-governance/page.tsx", import.meta.url);
    const pageSrc = await fs.readFile(pagePath, "utf8");
    expect(pageSrc).not.toMatch(/patientName|patient.*table|<table/i);
    expect(pageSrc).not.toMatch(/submit.*claim|generate.*claim|clearinghouse|type=\"submit\"/i);
    expect(pageSrc).not.toMatch(/reimbursement/i);
    expect(pageSrc).toContain("billing-governance-disclaimer");
    expect(pageSrc).toContain("billing-governance-overview-tiles");
    expect(pageSrc).toContain("billing-governance-conversion");
    expect(pageSrc).toContain("billing-governance-facility-config");
  });

  it("forbidden PHI keys remain documented in shared package", () => {
    expect(FORBIDDEN_BILLING_GOVERNANCE_ANALYTICS_KEYS).toContain("x12Payload");
    expect(FORBIDDEN_BILLING_GOVERNANCE_ANALYTICS_KEYS).toContain("providerName");
  });
});
