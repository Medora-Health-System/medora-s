import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fetchRevenueClaimAudit } from "@/features/revenue/revenueClaimAuditApi";
import { revenueClaimAuditHref } from "@/features/revenue/revenueClaimSubmissionNavigation";

const webRoot = join(import.meta.dirname, "../../..");

function readWebFile(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("revenueClaimAuditApi (MEDUI.ADMIN.REVENUE.4)", () => {
  it("builds audit route href", () => {
    expect(revenueClaimAuditHref("claim-abc")).toBe("/app/admin/revenue-cycle/claims/claim-abc");
  });

  it("fetch helper targets read-only audit endpoint", () => {
    const api = readWebFile("src/features/revenue/revenueClaimAuditApi.ts");
    expect(api).toContain("/billing/revenue-cycle/claims/");
    expect(api).toContain("/audit");
    expect(api).not.toContain('method: "POST"');
    expect(api).not.toContain("retry");
  });

  it("exports fetchRevenueClaimAudit using apiFetch", () => {
    expect(typeof fetchRevenueClaimAudit).toBe("function");
    const api = readWebFile("src/features/revenue/revenueClaimAuditApi.ts");
    expect(api).toContain("apiFetch");
  });

  it("audit page route exists under admin revenue cycle claims", () => {
    const route = readWebFile("app/app/admin/revenue-cycle/claims/[claimId]/page.tsx");
    expect(route).toContain("RevenueClaimAuditPage");
    expect(route).toContain("revenue-claim-audit-access-denied");
  });

  it("audit page loads claim id from route params", () => {
    const route = readWebFile("app/app/admin/revenue-cycle/claims/[claimId]/page.tsx");
    expect(route).toContain("useParams");
    expect(route).toContain("claimId");
  });
});
