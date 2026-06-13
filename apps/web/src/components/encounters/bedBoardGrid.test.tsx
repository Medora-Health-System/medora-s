import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BED_STATUS_DISPLAY_COLORS } from "@/lib/bedStatusDisplay";

const webSrcRoot = join(import.meta.dirname, "..", "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("BedBoardGrid (K.10B.10D)", () => {
  const grid = readSrc("components/encounters/BedBoardGrid.tsx");

  it("renders bed label, status chip, and patient name", () => {
    expect(grid).toContain('data-testid="bed-board-cell-label"');
    expect(grid).toContain('data-testid="bed-board-cell-status"');
    expect(grid).toContain('data-testid="bed-board-cell-patient"');
    expect(grid).toContain("patientDisplay");
  });

  it("uses centralized bed status colors", () => {
    expect(grid).toContain("bedStatusBadgeSoft");
    expect(grid).toContain("bedStatusCellBorderColor");
    expect(grid).not.toMatch(/#[0-9a-fA-F]{6}.*AVAILABLE/s);
  });

  it("available bed opens assignment callback", () => {
    expect(grid).toContain('case "AVAILABLE"');
    expect(grid).toContain("onAvailableBedClick");
  });

  it("occupied bed navigates to chart", () => {
    expect(grid).toContain('case "OCCUPIED"');
    expect(grid).toContain("occupantEncounterId");
    expect(grid).toContain("router.push");
  });

  it("blocked bed shows status detail dialog", () => {
    expect(grid).toContain('case "BLOCKED"');
    expect(grid).toContain('data-testid="bed-board-status-detail"');
    expect(grid).toContain("reasonText");
  });

  it("shows transfer and discharge icons for derived statuses", () => {
    expect(grid).toContain("isBedBoardTransferPending");
    expect(grid).toContain("isBedBoardDischargePending");
    expect(grid).toContain("TransferIcon");
    expect(grid).toContain("DischargeIcon");
  });

  it("grid cells are keyboard accessible buttons", () => {
    expect(grid).toContain('role="grid"');
    expect(grid).toContain('role="gridcell"');
    expect(grid).toContain('event.key === "Enter"');
    expect(grid).toContain("aria-label");
  });

  it("central palette includes spec colors", () => {
    expect(BED_STATUS_DISPLAY_COLORS.AVAILABLE.text).toBe("#047857");
    expect(BED_STATUS_DISPLAY_COLORS.BLOCKED.text).toBe("#991b1b");
    expect(BED_STATUS_DISPLAY_COLORS.TRANSFER_PENDING.text).toBe("#0f766e");
    expect(BED_STATUS_DISPLAY_COLORS.DISCHARGE_PENDING.text).toBe("#64748b");
  });
});
