/**
 * TRACKBOARD.ED.1 — open orders badge replaces provider/disposition lower chips.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { countTrackboardOpenOrderItems, isTrackboardOpenOrderItem } from "@medora/shared";
import { emergencyActiveWorkspacePath } from "./emergencyRoutes";
import { parseErWorkspaceSection } from "./erWorkspaceSections";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativeFromSrc: string): string {
  return readFileSync(join(webRoot, relativeFromSrc), "utf8");
}

describe("EmergencyTrackboardView — TRACKBOARD.ED.1", () => {
  const trackboardSource = readWebSource("features/emergency/EmergencyTrackboardView.tsx");

  it("does not render provider-assigned lower ops chip", () => {
    expect(trackboardSource).not.toContain('key: "prov"');
    expect(trackboardSource).not.toContain("emergencyTrackboard.ops.providerAssignedAgo");
    expect(trackboardSource).not.toContain("emergencyTrackboard.ops.providerWait");
  });

  it("does not render disposition-pending lower ops chip", () => {
    expect(trackboardSource).not.toContain('key: "disp"');
    expect(trackboardSource).not.toContain("emergencyTrackboard.ops.dispositionPending");
  });

  it("keeps provider name in assigned personnel block on the right", () => {
    expect(trackboardSource).toContain("emergencyTrackboard.physicianShort");
    expect(trackboardSource).toContain("erTrackboardPersonnelBlockStyle");
  });

  it("renders actionable open orders badge when count > 0", () => {
    expect(trackboardSource).toContain("ops.openOrderCount > 0");
    expect(trackboardSource).toContain('key: "orders"');
    expect(trackboardSource).toContain("emergencyTrackboard.ops.ordersPending");
    expect(trackboardSource).toContain('section: "orders"');
  });

  it("links orders badge to active workspace Orders section", () => {
    expect(trackboardSource).toContain("emergencyActiveWorkspacePath(encounter.id, { section: \"orders\" })");
  });
});

describe("trackboard open order count rules — TRACKBOARD.ED.1", () => {
  it("excludes completed, resulted, verified, reviewed, and cancelled lines", () => {
    expect(isTrackboardOpenOrderItem({ itemStatus: "COMPLETED" })).toBe(false);
    expect(isTrackboardOpenOrderItem({ itemStatus: "RESULTED" })).toBe(false);
    expect(isTrackboardOpenOrderItem({ itemStatus: "VERIFIED", lifecycleState: "REVIEWED" })).toBe(false);
    expect(isTrackboardOpenOrderItem({ itemStatus: "CANCELLED", lifecycleState: "CANCELLED" })).toBe(false);
  });

  it("counts actionable open lines only", () => {
    expect(
      countTrackboardOpenOrderItems([
        {
          status: "PLACED",
          items: [
            { status: "PLACED", lifecycleState: "ORDERED" },
            { status: "COMPLETED", lifecycleState: "COMPLETED" },
          ],
        },
      ])
    ).toBe(1);
  });

  it("does not count when all lines are terminal", () => {
    expect(
      countTrackboardOpenOrderItems([
        {
          status: "COMPLETED",
          items: [{ status: "COMPLETED", lifecycleState: "COMPLETED" }],
        },
      ])
    ).toBe(0);
  });
});

describe("emergencyActiveWorkspacePath — Orders deep link", () => {
  it("builds /app/emergency/active/:id?section=orders", () => {
    expect(emergencyActiveWorkspacePath("enc-abc", { section: "orders" })).toBe(
      "/app/emergency/active/enc-abc?section=orders"
    );
  });
});

describe("EmergencyActiveWorkspaceView — section query param", () => {
  const activeSource = readWebSource("features/emergency/EmergencyActiveWorkspaceView.tsx");

  it("reads section=orders on initial load", () => {
    expect(activeSource).toContain("useSearchParams");
    expect(activeSource).toContain("parseErWorkspaceSection(searchParams.get(\"section\"))");
  });
});

describe("parseErWorkspaceSection", () => {
  it("accepts orders section", () => {
    expect(parseErWorkspaceSection("orders")).toBe("orders");
    expect(parseErWorkspaceSection("ORDERS")).toBe("orders");
  });

  it("accepts camelCase sections and lowercase aliases", () => {
    expect(parseErWorkspaceSection("visitSummary")).toBe("visitSummary");
    expect(parseErWorkspaceSection("visitsummary")).toBe("visitSummary");
    expect(parseErWorkspaceSection("providerMse")).toBe("providerMse");
    expect(parseErWorkspaceSection("providermse")).toBe("providerMse");
  });

  it("rejects unknown sections", () => {
    expect(parseErWorkspaceSection("billing")).toBeNull();
  });
});
