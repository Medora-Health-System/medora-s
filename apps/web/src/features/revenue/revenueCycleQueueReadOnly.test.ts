import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../../..");
const apiRoot = join(import.meta.dirname, "../../../../api/src");

function readFile(relativePath: string, root = webRoot): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("revenueCycleQueueReadOnly (MEDUI.ADMIN.REVENUE.2)", () => {
  it("API controller exposes only GET revenue-cycle queue", () => {
    const controller = readFile("billing/revenue-cycle-queue.controller.ts", apiRoot);
    expect(controller).toContain('@Get("billing/revenue-cycle/queue")');
    expect(controller).not.toContain("@Post");
    expect(controller).not.toContain("@Patch");
    expect(controller).not.toContain("finalize");
    expect(controller).not.toContain("submit");
  });

  it("API service has no mutation paths", () => {
    const service = readFile("billing/revenue-cycle-queue.service.ts", apiRoot);
    expect(service).not.toContain(".create(");
    expect(service).not.toContain(".update(");
    expect(service).not.toContain(".delete(");
    expect(service).toContain("facilityId: query.facilityId");
  });

  it("web fetch helper is read-only", () => {
    const api = readFile("src/features/revenue/revenueCycleQueueApi.ts");
    expect(api).toContain("/billing/revenue-cycle/queue");
    expect(api).not.toContain('method: "POST"');
    expect(api).not.toContain("finalize");
  });

  it("workspace has no billing mutation controls", () => {
    const workspace = readFile("src/features/revenue/RevenueCycleWorkspace.tsx");
    expect(workspace).not.toContain("finalize");
    expect(workspace).not.toContain("submitClaim");
    expect(workspace).not.toContain("POST");
  });

  it("table keeps View Ledger as only action", () => {
    const table = readFile("src/features/revenue/RevenueCycleQueueTable.tsx");
    expect(table).toContain("revenueCycle.actions.viewLedger");
    expect(table).not.toContain("submit");
  });

  it("does not touch ED lifecycle modules", () => {
    const workspace = readFile("src/features/revenue/RevenueCycleWorkspace.tsx");
    expect(workspace).not.toContain("edLifecycle");
    expect(workspace).not.toContain("allEncounters");
    expect(workspace).not.toContain("trackboard");
  });

  it("EN and FR empty-state keys exist", () => {
    const en = readFile("src/i18n/messages/en.ts");
    const fr = readFile("src/i18n/messages/fr.ts");
    for (const key of [
      "readyForBilling",
      "billingDeficiency",
      "codingReview",
      "claimSubmitted",
      "claimPaid",
    ]) {
      expect(en).toContain(`${key}:`);
      expect(fr).toContain(`${key}:`);
    }
  });
});
