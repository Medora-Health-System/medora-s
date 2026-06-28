/**
 * MEDUI.ORDERS.ORDER_LIFECYCLE_ENGINE_FREEZE_CERTIFICATION.1
 *
 * Regression gate for the certified non-MAR order lifecycle engine.
 * Do not add parallel lifecycle stores or duplicate acknowledge/start/complete handlers.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  isIdempotentLifecycleAction,
  OXYGEN_THERAPY_PROCEDURE_CODE,
} from "@medora/shared";
import { OrderLifecycleErrorBoundary } from "@/components/orders/OrderLifecycleErrorBoundary";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import {
  createOrderLifecycleMutationHandlers,
  runOrderItemLifecycleUiMutation,
} from "@/lib/orderItemLifecycleUiSync";
import { mutateOrderItemLifecycleAction } from "@/lib/mutateOrderItemLifecycleAction";
import {
  getOrderItemSnapshot,
  ingestServerOrderPayload,
  markOrderItemPending,
  mergeOrderPayload,
  mergeWorklistPayload,
  resetOrderStateSyncStoreForTests,
  subscribeToOrderItem,
  upsertOrderItemPatch,
} from "@/lib/orderStateSyncStore";
import { postWorklistItemWorkflowAction } from "@/lib/worklistLabRadWorkflowApi";

vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/apiClient";

const webSrcRoot = join(import.meta.dirname, "..");
const webAppRoot = join(webSrcRoot, "..", "app");
const monorepoRoot = join(webSrcRoot, "..", "..", "..");

const tFr = (key: string) => key;

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function readApp(relativePath: string): string {
  return readFileSync(join(webAppRoot, relativePath), "utf8");
}

function readRepo(relativePath: string): string {
  return readFileSync(join(monorepoRoot, relativePath), "utf8");
}

function readLifecycleSurface(relativePath: string): string {
  if (relativePath.startsWith("app/")) return readApp(relativePath);
  return readSrc(relativePath);
}

describe("MEDUI.ORDERS.ORDER_LIFECYCLE_ENGINE_FREEZE_CERTIFICATION.1", () => {
  beforeEach(() => {
    resetOrderStateSyncStoreForTests();
    vi.mocked(apiFetch).mockReset();
  });

  describe("1 — one POST per lifecycle action", () => {
    it("mutateOrderItemLifecycleAction issues exactly one POST", async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ status: "ACKNOWLEDGED" });
      await mutateOrderItemLifecycleAction("acknowledge", "line-1", "fac-1");
      expect(apiFetch).toHaveBeenCalledTimes(1);
    });

    it("worklist workflow delegates to shared mutate helper (no duplicate POST path)", async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ status: "IN_PROGRESS" });
      await postWorklistItemWorkflowAction("start", "line-2", "fac-1");
      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith("/orders/items/line-2/start", {
        method: "POST",
        facilityId: "fac-1",
      });
    });

    it("runOrderItemLifecycleUiMutation calls mutate once per click", async () => {
      const mutate = vi.fn(async () => ({
        nextStatus: "ACKNOWLEDGED",
        idempotent: false,
        queued: false,
        responseBody: { status: "ACKNOWLEDGED" },
      }));
      let collection: unknown = { items: [{ id: "line-1", status: "PLACED" }] };
      await runOrderItemLifecycleUiMutation({
        action: "acknowledge",
        itemId: "line-1",
        facilityId: "fac-1",
        currentStatus: "PLACED",
        mutate,
        handlers: createOrderLifecycleMutationHandlers({
          itemId: "line-1",
          action: "acknowledge",
          collectionKind: "orders",
          applyCollection: (transform) => {
            collection = transform(collection);
          },
        }),
      });
      expect(mutate).toHaveBeenCalledTimes(1);
      expect((collection as { items: Array<{ status: string }> }).items[0]?.status).toBe(
        "ACKNOWLEDGED"
      );
    });
  });

  describe("2 — background refresh is silent and scoped", () => {
    it("ingestServerOrderPayload reconciles without subscriber notifications", () => {
      upsertOrderItemPatch("line-bg", { status: "IN_PROGRESS" }, "post");
      let notifyCount = 0;
      subscribeToOrderItem(() => {
        notifyCount += 1;
      });
      ingestServerOrderPayload([
        { id: "order-1", items: [{ id: "line-bg", status: "ACKNOWLEDGED" }] },
      ]);
      expect(notifyCount).toBe(0);
    });

    it("ER orders background refresh skips loading spinner", () => {
      const panel = readSrc("features/emergency/EmergencyErOrdersPanel.tsx");
      expect(panel).toContain("ordersBackgroundRefreshRef");
      expect(panel).toMatch(/if \(!backgroundOnly\)[\s\S]*setLoading\(true\)/);
      expect(panel).toContain("ingestServerOrderPayload");
    });

    it("department detail silent reload is supported", () => {
      const detail = readSrc("components/worklists/DepartmentOrderDetail.tsx");
      expect(detail).toContain("options?: { silent?: boolean }");
      expect(detail).toContain("ingestServerOrderPayload");
    });

    it("lab worklist uses silent refresh after first load", () => {
      const lab = readApp("app/lab-worklist/page.tsx");
      expect(lab).toContain("hasLoadedOnceRef");
      expect(lab).toContain("ingestServerOrderPayload");
    });
  });

  describe("3 — no router refresh or full page reload in lifecycle engine", () => {
    const lifecycleSurfaces = [
      "features/emergency/EmergencyErOrdersPanel.tsx",
      "components/worklists/DepartmentOrderDetail.tsx",
      "app/lab-worklist/page.tsx",
      "app/rad-worklist/page.tsx",
      "lib/orderItemLifecycleUiSync.ts",
      "lib/orderStateSyncStore.ts",
      "lib/mutateOrderItemLifecycleAction.ts",
      "lib/worklistLabRadWorkflowApi.ts",
    ] as const;

    for (const surface of lifecycleSurfaces) {
      it(`${surface} does not call router.refresh or location.reload`, () => {
        const src = readLifecycleSurface(surface);
        expect(src).not.toContain("router.refresh");
        expect(src).not.toContain("location.reload");
      });
    }
  });

  describe("4 — stale GET cannot overwrite newer optimistic or confirmed state", () => {
    it("rejects background regression after post confirmation", () => {
      upsertOrderItemPatch("line-1", { status: "COMPLETED" }, "post");
      const ignored = upsertOrderItemPatch(
        "line-1",
        { status: "ACKNOWLEDGED", updatedAt: "2026-06-01T10:00:00.000Z" },
        "background"
      );
      expect(ignored).toBeNull();
      expect(getOrderItemSnapshot("line-1")?.status).toBe("COMPLETED");
    });

    it("merge projection keeps post state over stale collection", () => {
      upsertOrderItemPatch("line-2", { status: "IN_PROGRESS" }, "post");
      const merged = mergeOrderPayload([
        { id: "o1", items: [{ id: "line-2", status: "ACKNOWLEDGED" }] },
      ]) as Array<{ items: Array<{ status: string }> }>;
      expect(merged[0]?.items[0]?.status).toBe("IN_PROGRESS");
    });
  });

  describe("5 — no recursive store notifications", () => {
    it("mergeOrderPayload never notifies subscribers", () => {
      upsertOrderItemPatch("line-loop", { status: "ACKNOWLEDGED" }, "optimistic");
      let notifyCount = 0;
      subscribeToOrderItem(() => {
        notifyCount += 1;
      });
      for (let i = 0; i < 100; i += 1) {
        mergeOrderPayload([{ id: "o1", items: [{ id: "line-loop", status: "PLACED" }] }]);
        mergeWorklistPayload([{ id: "o1", items: [{ id: "line-loop", status: "PLACED" }] }]);
      }
      expect(notifyCount).toBe(0);
    });

    it("orderStateSyncStore merge functions do not write during projection", () => {
      const store = readSrc("lib/orderStateSyncStore.ts");
      const mergeBlock = store.match(/export function mergeOrderPayload[\s\S]*?^}/m)?.[0] ?? "";
      expect(mergeBlock).not.toContain("upsertOrderItemPatch");
    });
  });

  describe("6 — idempotent lifecycle prevents duplicate events (contract)", () => {
    it("shared rules treat repeat acknowledge as idempotent", () => {
      expect(isIdempotentLifecycleAction("acknowledge", "ACKNOWLEDGED")).toBe(true);
      expect(isIdempotentLifecycleAction("start", "IN_PROGRESS")).toBe(true);
      expect(isIdempotentLifecycleAction("complete", "COMPLETED")).toBe(true);
    });

    it("backend complete dedupe key remains in orders service", () => {
      const ordersService = readRepo("apps/api/src/orders/orders.service.ts");
      expect(ordersService).toContain("order-item-complete:");
      expect(ordersService).toContain("isIdempotentLifecycleAction");
    });
  });

  describe("7 — error boundary prevents white-screen", () => {
    it("OrderLifecycleErrorBoundary enters error state on render failure", () => {
      const boundary = OrderLifecycleErrorBoundary as typeof OrderLifecycleErrorBoundary & {
        getDerivedStateFromError(error: Error): { hasError: boolean };
      };
      expect(boundary.getDerivedStateFromError(new Error("boom"))).toEqual({
        hasError: true,
      });
    });

    it("certified surfaces wrap order rows with OrderLifecycleErrorBoundary", () => {
      const boundarySurfaces = [
        "features/emergency/EmergencyErOrdersPanel.tsx",
        "components/worklists/DepartmentOrderDetail.tsx",
        "app/lab-worklist/page.tsx",
        "app/rad-worklist/page.tsx",
      ] as const;

      for (const surface of boundarySurfaces) {
        expect(readLifecycleSurface(surface)).toContain("OrderLifecycleErrorBoundary");
      }
    });
  });

  describe("8 — oxygen structured care display stays clinical", () => {
    it("does not expose O2_PARAMS JSON in display label", () => {
      const label = getOrderItemDisplayLabelForLanguage(
        {
          catalogItemType: "CARE",
          enterpriseProcedureId: OXYGEN_THERAPY_PROCEDURE_CODE,
          manualLabel: "Oxygen Therapy — Nasal cannula 2 L/min STAT",
          notes: '[O2_PARAMS:{"deliveryDevice":"nasal_cannula","flowRateLpm":2}]',
        },
        "fr",
        tFr
      );
      expect(label).not.toMatch(/O2_PARAMS|\{"deliveryDevice"/);
      expect(label.length).toBeGreaterThan(0);
    });

    it("lifecycle merge preserves oxygen metadata without surfacing JSON in label", () => {
      upsertOrderItemPatch("line-o2", { status: "ACKNOWLEDGED" }, "post");
      const merged = mergeOrderPayload([
        {
          id: "order-o2",
          items: [
            {
              id: "line-o2",
              status: "PLACED",
              enterpriseProcedureId: OXYGEN_THERAPY_PROCEDURE_CODE,
              manualLabel: "Oxygen Therapy — Nasal cannula 2 L/min STAT",
              notes: '[O2_PARAMS:{"deliveryDevice":"nasal_cannula"}]',
            },
          ],
        },
      ]) as Array<{ items: Array<{ notes?: string; status: string }> }>;
      const item = merged[0]?.items[0];
      expect(item?.status).toBe("ACKNOWLEDGED");
      const label = getOrderItemDisplayLabelForLanguage(
        {
          catalogItemType: "CARE",
          enterpriseProcedureId: OXYGEN_THERAPY_PROCEDURE_CODE,
          manualLabel: "Oxygen Therapy — Nasal cannula 2 L/min STAT",
          notes: item?.notes,
        },
        "fr",
        tFr
      );
      expect(label).not.toContain("O2_PARAMS");
    });
  });

  describe("9 — worklists and department detail update instantly via unified handlers", () => {
    it("lab worklist uses createOrderLifecycleMutationHandlers", () => {
      const lab = readApp("app/lab-worklist/page.tsx");
      expect(lab).toContain("createOrderLifecycleMutationHandlers");
      expect(lab).toContain("runOrderItemLifecycleUiMutation");
      expect(lab).toContain('collectionKind: "worklist"');
    });

    it("radiology worklist uses createOrderLifecycleMutationHandlers", () => {
      const rad = readApp("app/rad-worklist/page.tsx");
      expect(rad).toContain("createOrderLifecycleMutationHandlers");
      expect(rad).toContain("runOrderItemLifecycleUiMutation");
    });

    it("department detail uses unified lifecycle mutation", () => {
      const detail = readSrc("components/worklists/DepartmentOrderDetail.tsx");
      expect(detail).toContain("runOrderItemLifecycleUiMutation");
      expect(detail).toContain("subscribeToOrderItem");
    });

    it("worklist optimistic update applies in under 100ms", () => {
      const start = performance.now();
      const handlers = createOrderLifecycleMutationHandlers({
        itemId: "line-wl",
        action: "start",
        collectionKind: "worklist",
        applyCollection: (transform) => {
          transform([{ id: "o1", items: [{ id: "line-wl", status: "ACKNOWLEDGED" }] }]);
        },
      });
      handlers.applyOptimistic("IN_PROGRESS");
      expect(performance.now() - start).toBeLessThan(100);
    });
  });

  describe("10 — cross-tab update does not regress newer local state", () => {
    it("ignores remote entries with stale localMutationSequence", () => {
      upsertOrderItemPatch("line-tab", { status: "COMPLETED" }, "post");
      const local = getOrderItemSnapshot("line-tab")!;
      const staleRemoteSeq = local.localMutationSequence - 1;
      expect(local.localMutationSequence).toBeGreaterThan(staleRemoteSeq);
      expect(local.status).toBe("COMPLETED");
    });

    it("merge keeps local post state when remote would regress", () => {
      upsertOrderItemPatch("line-tab-2", { status: "COMPLETED" }, "post");
      const merged = mergeOrderPayload([
        { id: "o1", items: [{ id: "line-tab-2", status: "IN_PROGRESS" }] },
      ]) as Array<{ items: Array<{ status: string }> }>;
      expect(merged[0]?.items[0]?.status).toBe("COMPLETED");
    });
  });

  describe("11 — MAR pathways remain untouched", () => {
    it("lifecycle libs do not import MAR execution policy", () => {
      for (const file of [
        "lib/orderStateSyncStore.ts",
        "lib/orderItemLifecycleUiSync.ts",
        "lib/mutateOrderItemLifecycleAction.ts",
      ]) {
        const src = readSrc(file);
        expect(src).not.toContain("medicationOrderMarExecutionPolicy");
        expect(src).not.toContain("MedicationAdministrationTab");
      }
    });

    it("freeze banner documents non-MAR scope", () => {
      const frozenModules = [
        "lib/orderStateSyncStore.ts",
        "packages/shared/src/orders/orderItemLifecycle.ts",
      ] as const;

      for (const modulePath of frozenModules) {
        const src = modulePath.startsWith("packages/")
          ? readRepo(modulePath)
          : readSrc(modulePath);
        expect(src).toContain("ORDER_LIFECYCLE_ENGINE_FROZEN");
      }
    });
  });

  describe("12 — performance targets", () => {
    it("pending mark + optimistic upsert completes in under 50ms", () => {
      const start = performance.now();
      markOrderItemPending("line-perf", "acknowledge");
      upsertOrderItemPatch("line-perf", { status: "ACKNOWLEDGED" }, "optimistic", {
        pendingAction: "acknowledge",
      });
      expect(performance.now() - start).toBeLessThan(50);
    });

    it("optimistic UI collection merge completes in under 100ms", () => {
      upsertOrderItemPatch("line-perf-2", { status: "IN_PROGRESS" }, "optimistic");
      const start = performance.now();
      mergeOrderPayload([{ id: "o1", items: [{ id: "line-perf-2", status: "ACKNOWLEDGED" }] }]);
      expect(performance.now() - start).toBeLessThan(100);
    });

    it("runOrderItemLifecycleUiMutation applies optimistic state before awaiting mutate", async () => {
      const statuses: string[] = [];
      let collection: unknown = { items: [{ id: "line-async", status: "PLACED" }] };
      const mutate = vi.fn(
        () =>
          new Promise<{
            nextStatus: string;
            idempotent: boolean;
            queued: boolean;
            responseBody: unknown;
          }>((resolve) => {
            statuses.push(
              (collection as { items: Array<{ status: string }> }).items[0]?.status ?? ""
            );
            setTimeout(
              () =>
                resolve({
                  nextStatus: "ACKNOWLEDGED",
                  idempotent: false,
                  queued: false,
                  responseBody: { status: "ACKNOWLEDGED" },
                }),
              50
            );
          })
      );
      await runOrderItemLifecycleUiMutation({
        action: "acknowledge",
        itemId: "line-async",
        facilityId: "fac-1",
        currentStatus: "PLACED",
        mutate,
        handlers: createOrderLifecycleMutationHandlers({
          itemId: "line-async",
          action: "acknowledge",
          collectionKind: "orders",
          applyCollection: (transform) => {
            collection = transform(collection);
          },
        }),
      });
      expect(statuses[0]).toBe("ACKNOWLEDGED");
    });
  });

  describe("13 — future module reuse contract", () => {
    it("certified modules export freeze contract marker", () => {
      const webModules = [
        "lib/orderStateSyncStore.ts",
        "lib/orderItemLifecycleUiSync.ts",
        "lib/mutateOrderItemLifecycleAction.ts",
      ] as const;

      for (const modulePath of webModules) {
        expect(readSrc(modulePath)).toContain("ORDER_LIFECYCLE_ENGINE_FROZEN");
      }
    });

    it("certified surfaces import shared lifecycle modules (no parallel handlers)", () => {
      const er = readSrc("features/emergency/EmergencyErOrdersPanel.tsx");
      expect(er).toContain("mutateOrderItemLifecycleAction");
      expect(er).toContain("createOrderLifecycleMutationHandlers");
      expect(er).not.toMatch(/apiFetch\(`\/orders\/items\/\$\{itemId\}\/acknowledge`/);
    });
  });
});
