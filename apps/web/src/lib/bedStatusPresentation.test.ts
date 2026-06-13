import { describe, expect, it } from "vitest";
import {
  BED_STATUS_PRESENTATION_COLORS,
  resolveBedStatusBorder,
  resolveBedStatusColor,
  resolveBedStatusLabel,
} from "@/lib/bedStatusPresentation";

describe("bedStatusPresentation (K.10B.10E)", () => {
  it("maps AVAILABLE to green palette", () => {
    expect(resolveBedStatusColor("AVAILABLE")).toBe("#047857");
    expect(resolveBedStatusBorder("AVAILABLE")).toBe("#a7f3d0");
  });

  it("maps OCCUPIED to blue palette", () => {
    expect(resolveBedStatusColor("OCCUPIED")).toBe("#1e3a8a");
  });

  it("maps DIRTY to orange palette", () => {
    expect(resolveBedStatusColor("DIRTY")).toBe("#c2410c");
  });

  it("maps CLEANING to yellow palette", () => {
    expect(resolveBedStatusColor("CLEANING")).toBe("#92400e");
  });

  it("maps RESERVED to purple palette", () => {
    expect(resolveBedStatusColor("RESERVED")).toBe("#7e22ce");
  });

  it("maps BLOCKED to red palette", () => {
    expect(resolveBedStatusColor("BLOCKED")).toBe("#991b1b");
  });

  it("maps DISCHARGE_PENDING to teal/slate and TRANSFER_PENDING to indigo/teal", () => {
    expect(resolveBedStatusColor("DISCHARGE_PENDING")).toBe("#64748b");
    expect(resolveBedStatusColor("TRANSFER_PENDING")).toBe("#0f766e");
  });

  it("covers every bed operational status deterministically", () => {
    const keys = Object.keys(BED_STATUS_PRESENTATION_COLORS);
    expect(keys).toHaveLength(8);
    for (const status of keys) {
      expect(resolveBedStatusColor(status as keyof typeof BED_STATUS_PRESENTATION_COLORS)).toMatch(
        /^#[0-9a-f]{6}$/i
      );
    }
  });

  it("resolveBedStatusLabel falls back to shared labels", () => {
    const label = resolveBedStatusLabel("AVAILABLE", "en", (key) => key);
    expect(label.length).toBeGreaterThan(0);
  });
});
