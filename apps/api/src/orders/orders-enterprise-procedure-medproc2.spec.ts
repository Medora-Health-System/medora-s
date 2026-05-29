import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildOrderItemCreateInput } from "./orders.types";
import { orderCreateDtoSchema } from "@medora/shared";

const ordersServiceSource = readFileSync(join(__dirname, "orders.service.ts"), "utf8");

describe("MEDPROC.2 enterprise procedure order persistence", () => {
  it("buildOrderItemCreateInput persists enterpriseProcedureId for CARE", () => {
    const input = buildOrderItemCreateInput(
      {
        catalogItemType: "CARE",
        manualLabel: "EKG / ECG",
        enterpriseProcedureId: "ekg_ecg",
      },
      "CARE"
    );
    expect(input.enterpriseProcedureId).toBe("ekg_ecg");
    expect(input.manualLabel).toBe("EKG / ECG");
  });

  it("buildOrderItemCreateInput omits enterpriseProcedureId for custom care tasks", () => {
    const input = buildOrderItemCreateInput(
      {
        catalogItemType: "CARE",
        manualLabel: "Custom bedside task",
      },
      "CARE"
    );
    expect(input.enterpriseProcedureId).toBeUndefined();
  });

  it("buildOrderItemCreateInput ignores enterpriseProcedureId for non-CARE order types", () => {
    const input = buildOrderItemCreateInput(
      {
        catalogItemType: "LAB_TEST",
        manualLabel: "CBC",
        enterpriseProcedureId: "ekg_ecg",
      },
      "LAB"
    );
    expect(input.enterpriseProcedureId).toBeUndefined();
  });

  it("orderCreateDtoSchema rejects invalid enterpriseProcedureId", () => {
    const parsed = orderCreateDtoSchema.safeParse({
      type: "CARE",
      items: [{ catalogItemType: "CARE", manualLabel: "X", enterpriseProcedureId: "bad_id" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("does not reference BillingEvent creation", () => {
    expect(ordersServiceSource).not.toMatch(/createBillingEvent|new BillingEvent/i);
  });
});

describe("MEDPROC.2 lifecycle field preservation (unit guard)", () => {
  it("acknowledge/complete/cancel paths do not null enterpriseProcedureId in update payloads", () => {
    expect(ordersServiceSource).not.toMatch(/enterpriseProcedureId:\s*null/);
    expect(ordersServiceSource).not.toMatch(/enterpriseProcedureId:\s*undefined/);
  });
});
