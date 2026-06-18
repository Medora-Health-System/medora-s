import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../../..");
const apiRoot = join(import.meta.dirname, "../../../../api/src");
const sharedRoot = join(import.meta.dirname, "../../../../../packages/shared/src");

function readFile(relativePath: string, root = webRoot): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("revenueClaimAuditReadOnly (MEDUI.ADMIN.REVENUE.4)", () => {
  it("API controller exposes GET audit only on claims controller", () => {
    const controller = readFile("billing/revenue-cycle-claims.controller.ts", apiRoot);
    expect(controller).toContain('@Get("billing/revenue-cycle/claims/:claimId/audit")');
    expect(controller).not.toContain("@Post");
    expect(controller).not.toContain("sendSubmission");
    expect(controller).not.toContain("retry");
  });

  it("audit service has no mutation paths", () => {
    const service = readFile("billing/revenue-cycle-claim-audit.service.ts", apiRoot);
    expect(service).not.toContain(".create(");
    expect(service).not.toContain(".update(");
    expect(service).not.toContain(".delete(");
    expect(service).not.toContain("ClaimTransmissionService");
    expect(service).toContain("facilityId");
  });

  it("web audit fetch helper is read-only", () => {
    const api = readFile("src/features/revenue/revenueClaimAuditApi.ts");
    expect(api).not.toContain('method: "POST"');
    expect(api).not.toContain("resend");
    expect(api).not.toContain("submitClaim");
  });

  it("audit page has no mutation controls", () => {
    const page = readFile("src/features/revenue/RevenueClaimAuditPage.tsx");
    expect(page).not.toContain("submitClaim");
    expect(page).not.toContain("retry");
    expect(page).not.toContain("PATCH");
    expect(page).toContain("revenue-claim-audit-read-only-notice");
  });

  it("queue table adds View Audit without removing ledger action", () => {
    const table = readFile("src/features/revenue/RevenueClaimQueueTable.tsx");
    expect(table).toContain("viewAudit");
    expect(table).toContain("revenue-claim-audit-");
    expect(table).toContain("revenue-claim-ledger-");
    expect(table).not.toContain("resend");
  });

  it("does not touch ED lifecycle modules", () => {
    const page = readFile("src/features/revenue/RevenueClaimAuditPage.tsx");
    expect(page).not.toContain("trackboard");
    expect(page).not.toContain("allEncounters");
    expect(page).not.toContain("edLifecycle");
  });

  it("shared audit model is pure", () => {
    const shared = readFile("billing/revenueClaimAudit.ts", sharedRoot);
    expect(shared).toContain("buildRevenueClaimAudit");
    expect(shared).not.toContain("fetch(");
    expect(shared).not.toContain("prisma");
  });

  it("EN and FR audit i18n keys exist", () => {
    const en = readFile("src/i18n/messages/en.ts");
    const fr = readFile("src/i18n/messages/fr.ts");
    expect(en).toContain("revenueClaimAudit:");
    expect(fr).toContain("revenueClaimAudit:");
    for (const key of ["accepted", "rejected", "needsCorrection", "pendingAck"]) {
      expect(en).toContain(`${key}:`);
      expect(fr).toContain(`${key}:`);
    }
  });
});
