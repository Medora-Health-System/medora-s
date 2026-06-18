import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../../..");

describe("billingAutoMappingPanel (MEDUI.BILLING.AUTO_MAPPING.1)", () => {
  const panel = readFileSync(join(webRoot, "src/features/billing/BillingAutoMappingPanel.tsx"), "utf8");

  it("renders apply/review/skip sections", () => {
    expect(panel).toContain("autoMappingSectionApply");
    expect(panel).toContain("autoMappingSectionReview");
    expect(panel).toContain("autoMappingSectionSkip");
  });

  it("requires explicit selected apply", () => {
    expect(panel).toContain("applyBillingAutoMappings");
    expect(panel).toContain("selectedIds.size === 0");
    expect(panel).not.toContain("applyAll");
  });
});

describe("billingAutoMappingLedgerIntegration (MEDUI.BILLING.AUTO_MAPPING.1)", () => {
  const page = readFileSync(join(webRoot, "app/app/billing/encounters/[encounterId]/page.tsx"), "utf8");

  it("billing ledger page exposes find auto-mappings button", () => {
    expect(page).toContain("billing-auto-mapping-open");
    expect(page).toContain("BillingAutoMappingPanel");
    expect(page).toContain("autoMappingFindButton");
  });

  it("charge capture review links to auto-mapping preview", () => {
    const chargeReview = readFileSync(join(webRoot, "app/app/billing/charge-review/page.tsx"), "utf8");
    expect(chargeReview).toContain("autoMapping=1");
    expect(chargeReview).toContain("autoMappingFindMappingLink");
  });
});

describe("billingAutoMappingExternalExportRegression (MEDUI.BILLING.AUTO_MAPPING.1)", () => {
  it("external export service unchanged by auto-mapping apply metadata", () => {
    const exportService = readFileSync(
      join(import.meta.dirname, "../../../../api/src/billing/external-billing-export.service.ts"),
      "utf8"
    );
    expect(exportService).toContain("billing_status");
    expect(exportService).not.toContain("submitClaim");
  });

  it("auto-mapping service does not mutate encounters", () => {
    const service = readFileSync(
      join(import.meta.dirname, "../../../../api/src/billing/billing-auto-mapping.service.ts"),
      "utf8"
    );
    expect(service).not.toContain("encounter.update");
    expect(service).not.toContain("submitClaim");
    expect(service).not.toContain("diagnosis");
  });
});
