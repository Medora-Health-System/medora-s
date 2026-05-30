import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = process.cwd().endsWith("/apps/web") ? process.cwd() : join(process.cwd(), "apps/web");
const panelSource = readFileSync(join(webRoot, "src/features/emergency/EmergencyErOrdersPanel.tsx"), "utf8");

describe("EmergencyErOrdersPanel cancel UX (ORDERS.ED.1)", () => {
  it("surfaces cancel API errors instead of silent success", () => {
    expect(panelSource).toContain("formatOrderCancelErrorMessage");
    expect(panelSource).toContain("setCancelErrorFlash");
    expect(panelSource).toMatch(/catch \(e\)[\s\S]*setCancelErrorFlash/);
  });

  it("uses permission-aware cancel visibility", () => {
    expect(panelSource).toContain("canShowOrderLineCancelControl");
    expect(panelSource).toContain("isOrderItemCancellableLineForEr");
  });

  it("requires coded reason via CancelOrderModal before scheduling cancel", () => {
    expect(panelSource).toContain("CancelOrderModal");
    expect(panelSource).toContain("cancellationReason: p.payload.cancellationReason");
  });

  it("refreshes orders after successful cancel", () => {
    expect(panelSource).toContain("setOrdersRefresh");
    expect(panelSource).toMatch(/await apiFetch\(`\/orders\/items\/\$\{p\.orderItemId\}\/cancel`/);
  });
});
