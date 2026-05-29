/**
 * MEDPROC.6 — procedure billable event generation (web guards).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webRoot = join(import.meta.dirname, "../..");
const cardSource = readFileSync(
  join(webRoot, "src/components/billing/ProcedureBillableEventsCard.tsx"),
  "utf8"
);
const chargeReviewPageSource = readFileSync(
  join(webRoot, "app/app/billing/charge-review/page.tsx"),
  "utf8"
);
const encounterCardSource = readFileSync(
  join(webRoot, "src/components/billing/EncounterChargeReviewCard.tsx"),
  "utf8"
);
const billableUtilSource = readFileSync(
  join(webRoot, "../api/src/billing/enterprise-procedure-billable-review.util.ts"),
  "utf8"
);
const billableUiSource = readFileSync(
  join(webRoot, "src/lib/procedureBillableReviewUi.ts"),
  "utf8"
);

describe("MEDPROC.6 procedure billable events UI guards", () => {
  it("revenue review UI displays procedure events", () => {
    expect(cardSource).toContain("procedure-billable-events-card");
    expect(chargeReviewPageSource).toContain("ProcedureBillableEventsCard");
    expect(encounterCardSource).toContain("ProcedureBillableEventsCard");
  });

  it("review warnings display", () => {
    expect(cardSource).toContain("procedure-billable-event-warnings");
    expect(cardSource).toContain("procedureBillableReviewWarningLabelKey");
  });

  it("documentation warning displays", () => {
    expect(cardSource).toContain("procedureDocumentationMissing");
    expect(billableUiSource).toContain("procedureWarningDocumentation");
  });

  it("no claim or submit buttons", () => {
    expect(cardSource).not.toMatch(/submit.*claim|generate.*claim|claim.*submit/i);
    expect(chargeReviewPageSource).not.toMatch(/procedure-billable[\s\S]{0,300}submit/i);
  });

  it("generation util does not create claims or finalize CPT", () => {
    expect(billableUtilSource).toContain('procedureCode: "UNMAPPED"');
    expect(billableUtilSource).not.toMatch(/CMS.?1500|UB.?04|submitClaim|createClaim/i);
    expect(billableUtilSource).toContain("tryEnterpriseProcedureBillableReviewEvent");
  });
});
