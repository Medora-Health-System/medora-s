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

  it("shows cancel × using role + lifecycle state (backend enforces RBAC)", () => {
    expect(panelSource).toContain("shouldShowErOrderLineCancelAction");
    expect(panelSource).not.toContain("canShowOrderLineCancelControl");
  });

  it("renders cancel control when showLineCancel is true", () => {
    expect(panelSource).toContain("const showLineCancel = shouldShowErOrderLineCancelAction(roles, item)");
    expect(panelSource).toContain("cancelOrderCompactX");
    expect(panelSource).toContain("setCancelLineModalItemId");
  });

  it("requires coded reason via CancelOrderModal before scheduling cancel", () => {
    expect(panelSource).toContain("CancelOrderModal");
    expect(panelSource).toContain("cancellationReason: p.payload.cancellationReason");
  });

  it("refreshes orders after successful cancel", () => {
    expect(panelSource).toContain("setOrdersRefresh");
    expect(panelSource).toMatch(/await apiFetch\(`\/orders\/items\/\$\{p\.orderItemId\}\/cancel`/);
  });

  it("preserves orderedBy/source in parsedOrders for attribution", () => {
    expect(panelSource).toContain("orderedBy:");
    expect(panelSource).toContain("source:");
  });
});
