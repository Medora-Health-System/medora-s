import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BED_STATUS_DISPLAY_COLORS } from "@/lib/bedStatusDisplay";

const webSrcRoot = join(import.meta.dirname, "..", "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("BedBoardGrid (K.10B.10D / K.10B.10E)", () => {
  const grid = readSrc("components/encounters/BedBoardGrid.tsx");

  it("renders bed label, status chip, and patient name", () => {
    expect(grid).toContain('data-testid="bed-board-cell-label"');
    expect(grid).toContain('data-testid="bed-board-cell-status"');
    expect(grid).toContain('data-testid="bed-board-cell-patient"');
    expect(grid).toContain("patientDisplay");
  });

  it("uses centralized bed status presentation helpers", () => {
    expect(grid).toContain("resolveBedStatusBadge");
    expect(grid).toContain("resolveBedStatusBorder");
    expect(grid).not.toMatch(/#[0-9a-fA-F]{6}.*AVAILABLE/s);
  });

  it("opens status detail modal for any bed click", () => {
    expect(grid).toContain("setStatusDetailBed");
    expect(grid).toContain("BedBoardStatusDetailModal");
    expect(grid).not.toContain("router.push");
  });

  it("supports client-side status filter", () => {
    expect(grid).toContain("filterBedBoardByStatus");
    expect(grid).toContain("statusFilter");
  });

  it("shows transfer and discharge icons for derived statuses", () => {
    expect(grid).toContain("isBedBoardTransferPending");
    expect(grid).toContain("isBedBoardDischargePending");
    expect(grid).toContain("TransferIcon");
    expect(grid).toContain("DischargeIcon");
  });

  it("grid cells are keyboard accessible buttons with 44px touch minimum", () => {
    expect(grid).toContain('role="grid"');
    expect(grid).toContain('role="gridcell"');
    expect(grid).toContain('event.key === "Enter"');
    expect(grid).toContain("minWidth: 44");
    expect(grid).toContain("aria-label");
  });

  it("central palette includes spec colors", () => {
    expect(BED_STATUS_DISPLAY_COLORS.AVAILABLE.text).toBe("#047857");
    expect(BED_STATUS_DISPLAY_COLORS.BLOCKED.text).toBe("#991b1b");
    expect(BED_STATUS_DISPLAY_COLORS.TRANSFER_PENDING.text).toBe("#0f766e");
    expect(BED_STATUS_DISPLAY_COLORS.DISCHARGE_PENDING.text).toBe("#64748b");
  });
});
