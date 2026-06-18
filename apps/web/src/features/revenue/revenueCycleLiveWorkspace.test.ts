import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
describe("revenueCycleLiveWorkspace (MEDUI.ADMIN.REVENUE.2)", () => {
  const webRoot = join(import.meta.dirname, "../../..");

  function readWebFile(relativePath: string): string {
    return readFileSync(join(webRoot, relativePath), "utf8");
  }

  it("workspace fetches live queue data instead of placeholders", () => {
    const workspace = readWebFile("src/features/revenue/RevenueCycleWorkspace.tsx");
    expect(workspace).toContain("fetchRevenueCycleQueue");
    expect(workspace).not.toContain("buildRevenueCyclePlaceholderRows");
    expect(workspace).toContain("revenue-cycle-loading");
    expect(workspace).toContain("revenue-cycle-error");
    expect(workspace).toContain("revenue-cycle-empty");
    expect(workspace).toContain("revenue-cycle-silent-refresh");
  });

  it("shows queue counts on view navigation", () => {
    const workspace = readWebFile("src/features/revenue/RevenueCycleWorkspace.tsx");
    expect(workspace).toContain("formatRevenueCycleQueueCountLabel");
    expect(workspace).toContain("counts[view]");
  });

  it("preserves admin route and ledger links", () => {
    const workspace = readWebFile("src/features/revenue/RevenueCycleWorkspace.tsx");
    expect(workspace).toContain("/app/admin");
    expect(workspace).toContain("RevenueCycleQueueTable");
  });
});
