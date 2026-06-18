import { describe, expect, it, vi, beforeEach } from "vitest";
import { REVENUE_CYCLE_QUEUE } from "@medora/shared";
import {
  fetchRevenueCycleQueue,
  mapRevenueCycleApiRowsToWorkspaceRows,
  shouldReplaceRevenueCycleRows,
} from "@/features/revenue/revenueCycleQueueApi";

vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/apiClient";

describe("revenueCycleQueueApi (MEDUI.ADMIN.REVENUE.2)", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("fetches live revenue cycle queue read-only endpoint", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      rows: [
        {
          encounterId: "enc-1",
          patientName: "Marie Joseph",
          mrn: "MRN-100",
          dateOfService: "2026-06-01T10:00:00.000Z",
          provider: "Dr. Laurent",
          billingReady: true,
          codingReady: true,
          claimStatus: "NOT_SUBMITTED",
          paymentStatus: "NOT_POSTED",
          manualReviewStatus: "RESOLVED",
          queue: REVENUE_CYCLE_QUEUE.READY_FOR_BILLING,
          ledgerHref: "/app/billing/encounters/enc-1",
        },
      ],
      total: 1,
      limit: 100,
      offset: 0,
      counts: {
        READY_FOR_BILLING: 1,
        BILLING_DEFICIENCY: 0,
        CODING_REVIEW: 0,
        CLAIM_SUBMITTED: 0,
        CLAIM_PAID: 0,
      },
    });

    const result = await fetchRevenueCycleQueue({
      facilityId: "fac-1",
      search: "marie",
      queue: REVENUE_CYCLE_QUEUE.READY_FOR_BILLING,
    });

    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining("/billing/revenue-cycle/queue?"),
      { facilityId: "fac-1" }
    );
    expect(result.rows).toHaveLength(1);
    expect(mapRevenueCycleApiRowsToWorkspaceRows(result.rows)[0]?.ledgerHref).toContain(
      "/app/billing/encounters/enc-1"
    );
  });

  it("does not call finalize or claim submit routes", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ rows: [], total: 0, limit: 100, offset: 0, counts: {} });
    await fetchRevenueCycleQueue({ facilityId: "fac-1" });
    const path = String(vi.mocked(apiFetch).mock.calls[0]?.[0]);
    expect(path).toContain("/billing/revenue-cycle/queue");
    expect(path).not.toContain("finalize");
    expect(path).not.toContain("submit");
  });

  it("preserves rows during silent refresh when unchanged", () => {
    const prev = [{ encounterId: "enc-1", queue: REVENUE_CYCLE_QUEUE.READY_FOR_BILLING }];
    const next = [{ encounterId: "enc-1", queue: REVENUE_CYCLE_QUEUE.READY_FOR_BILLING }];
    expect(shouldReplaceRevenueCycleRows(prev, next)).toBe(false);
  });
});
