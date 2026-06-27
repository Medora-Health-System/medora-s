import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isMedicationDoseMarActionableForLifecycle,
  medicationOrderLifecycleBlocksMutation,
  resolveMedicationOrderLifecycleStatus,
} from "@medora/shared";

const repoRoot = join(import.meta.dirname, "../../../..");

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("medication order lifecycle enterprise model", () => {
  it("defines lifecycle statuses and DTO schemas", () => {
    const shared = readSource("packages/shared/src/medication/medicationOrderLifecycle.ts");
    expect(shared).toContain("DISCONTINUED");
    expect(shared).toContain("SUPERSEDED");
    expect(shared).toContain("ON_HOLD");
    expect(shared).toContain("medicationOrderDiscontinueDtoSchema");
  });

  it("exposes provider lifecycle endpoints", () => {
    const controller = readSource("apps/api/src/orders/orders.controller.ts");
    expect(controller).toContain("/discontinue");
    expect(controller).toContain("/hold");
    expect(controller).toContain("/resume");
    expect(controller).toContain("/edit");
    expect(controller).toContain("/discontinue-and-reorder");
  });

  it("MAR pass queue filters by lifecycle status", () => {
    const passQueue = readSource("apps/api/src/medication-dose/medication-pass-queue.service.ts");
    expect(passQueue).toContain("isMedicationDoseMarActionableForLifecycle");
  });

  it("MAR timeline filters by lifecycle status", () => {
    const timeline = readSource("apps/api/src/medication-dose/mar-shift-timeline.service.ts");
    expect(timeline).toContain("isMedicationDoseMarActionableForLifecycle");
  });

  it("discontinued future doses are suppressed while active infusion remains stoppable", () => {
    const effective = new Date("2026-06-23T12:00:00.000Z");
    expect(
      isMedicationDoseMarActionableForLifecycle({
        lifecycleStatus: "DISCONTINUED",
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-23T14:00:00.000Z"),
        effectiveAt: effective,
        hasActiveInfusion: false,
      })
    ).toBe(false);
    expect(
      isMedicationDoseMarActionableForLifecycle({
        lifecycleStatus: "DISCONTINUED",
        doseStatus: "IN_PROGRESS",
        scheduledAt: new Date("2026-06-23T14:00:00.000Z"),
        effectiveAt: effective,
        hasActiveInfusion: true,
      })
    ).toBe(true);
  });

  it("provider UI exposes lifecycle actions with French i18n", () => {
    const modal = readSource("apps/web/src/components/orders/MedicationGovernanceManageModal.tsx");
    expect(modal).toContain("medicationOrderLifecycle.actions.discontinue");
    const fr = readSource("apps/web/src/i18n/messages/fr.ts");
    expect(fr).toContain("Arrêter l'ordre");
    expect(fr).toContain("Modifier l'ordre");
  });

  it("blocks mutation on terminal lifecycle statuses", () => {
    expect(medicationOrderLifecycleBlocksMutation("DISCONTINUED")).toBe(true);
    expect(resolveMedicationOrderLifecycleStatus(null)).toBe("ACTIVE");
  });

  it("service clears future doses without deleting administration history", () => {
    const service = readSource("apps/api/src/orders/medication-order-lifecycle.service.ts");
    expect(service).toContain("cascadeMedicationOrderLifecycleInTransaction");
    expect(service).toContain("countPerformedAdministrations");
    expect(service).not.toContain("medicationAdministration.delete");
  });
});
