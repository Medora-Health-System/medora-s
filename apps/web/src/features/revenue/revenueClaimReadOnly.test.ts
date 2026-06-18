import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../../..");
const apiRoot = join(import.meta.dirname, "../../../../api/src");

function readFile(relativePath: string, root = webRoot): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("revenueClaimReadOnly (MEDUI.ADMIN.REVENUE.3)", () => {
  it("API controller exposes only GET revenue-cycle claims", () => {
    const controller = readFile("billing/revenue-cycle-claims.controller.ts", apiRoot);
    expect(controller).toContain('@Get("billing/revenue-cycle/claims")');
    expect(controller).not.toContain("@Post");
    expect(controller).not.toContain("@Patch");
    expect(controller).not.toContain("submit");
    expect(controller).not.toContain("retry");
  });

  it("API service has no mutation paths", () => {
    const service = readFile("billing/revenue-cycle-claims.service.ts", apiRoot);
    expect(service).not.toContain(".create(");
    expect(service).not.toContain(".update(");
    expect(service).not.toContain(".delete(");
    expect(service).toContain("facilityId: query.facilityId");
    expect(service).not.toContain("ClaimTransmissionService");
    expect(service).not.toContain("sendSubmission");
  });

  it("web fetch helper is read-only", () => {
    const api = readFile("src/features/revenue/revenueClaimSubmissionApi.ts");
    expect(api).toContain("/billing/revenue-cycle/claims");
    expect(api).not.toContain('method: "POST"');
    expect(api).not.toContain("retry");
    expect(api).not.toContain("resend");
  });

  it("workspace has no claim submission controls", () => {
    const workspace = readFile("src/features/revenue/RevenueClaimSubmissionWorkspace.tsx");
    expect(workspace).not.toContain("submitClaim");
    expect(workspace).not.toContain("retry");
    expect(workspace).not.toContain("resend");
    expect(workspace).not.toContain("POST");
    expect(workspace).toContain("revenue-claim-read-only-notice");
  });

  it("table keeps View Ledger and View Claim as only actions", () => {
    const table = readFile("src/features/revenue/RevenueClaimQueueTable.tsx");
    expect(table).toContain("revenueClaimSubmission.actions.viewLedger");
    expect(table).toContain("revenueClaimSubmission.actions.viewClaim");
    expect(table).not.toContain("submit");
    expect(table).not.toContain("clearinghouse");
  });

  it("does not touch ED lifecycle modules", () => {
    const workspace = readFile("src/features/revenue/RevenueClaimSubmissionWorkspace.tsx");
    expect(workspace).not.toContain("edLifecycle");
    expect(workspace).not.toContain("allEncounters");
    expect(workspace).not.toContain("trackboard");
  });

  it("EN and FR i18n keys exist for claim submission workspace", () => {
    const en = readFile("src/i18n/messages/en.ts");
    const fr = readFile("src/i18n/messages/fr.ts");
    for (const key of [
      "readyToSend",
      "sent",
      "ackPending",
      "accepted",
      "rejected",
      "needsCorrection",
    ]) {
      expect(en).toContain(`${key}:`);
      expect(fr).toContain(`${key}:`);
    }
    expect(en).toContain("revenueClaimSubmission:");
    expect(fr).toContain("revenueClaimSubmission:");
  });

  it("shared classifier is pure with no side effects", () => {
    const sharedRoot = join(import.meta.dirname, "../../../../../packages/shared/src");
    const classifier = readFile("billing/revenueClaimSubmission.ts", sharedRoot);
    expect(classifier).toContain("resolveClaimSubmissionWorkspaceQueue");
    expect(classifier).not.toContain("fetch(");
    expect(classifier).not.toContain("prisma");
  });
});
