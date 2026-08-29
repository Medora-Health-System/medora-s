import { describe, expect, it } from "vitest";
import {
  BED_OPERATIONAL_STATUS_PRECEDENCE,
  formatBedOperationalStatusLabel,
  formatEdSimplifiedBedStatusLabel,
  getBedOperationalStatusVisual,
  isActiveBedOccupancyStatus,
  isBedAssignableWithoutOverride,
  isManualBedOperationalStatusWritable,
  manualStatusBlockedByOccupancy,
  normalizeBedOperationalStatus,
  rejectDerivedBedOperationalStatusWrite,
  requiresBedAssignmentOverride,
  resolveBedOperationalStatus,
} from "./bedOperationalStatus.js";

describe("bedOperationalStatus (K.10B.10C)", () => {
  it("applies precedence order with BLOCKED over OCCUPIED", () => {
    const resolved = resolveBedOperationalStatus({
      operationalOverlay: { status: "BLOCKED", cleared: false },
      occupant: { encounterId: "enc-1", workflowState: "IN_TREATMENT" },
    });
    expect(resolved.status).toBe("BLOCKED");
    expect(resolved.statusSource).toBe("operational");
  });

  it("AVAILABLE is assignable without override", () => {
    expect(isBedAssignableWithoutOverride("AVAILABLE")).toBe(true);
    expect(requiresBedAssignmentOverride("AVAILABLE")).toBe(false);
  });

  it("DIRTY requires override", () => {
    expect(requiresBedAssignmentOverride("DIRTY")).toBe(true);
    expect(isBedAssignableWithoutOverride("DIRTY")).toBe(false);
  });

  it("CLEANING requires override", () => {
    expect(requiresBedAssignmentOverride("CLEANING")).toBe(true);
  });

  it("RESERVED requires override", () => {
    expect(requiresBedAssignmentOverride("RESERVED")).toBe(true);
  });

  it("BLOCKED requires override", () => {
    expect(requiresBedAssignmentOverride("BLOCKED")).toBe(true);
  });

  it("derives OCCUPIED from open encounter", () => {
    const resolved = resolveBedOperationalStatus({
      occupant: { encounterId: "enc-1", workflowState: "IN_TREATMENT" },
    });
    expect(resolved.status).toBe("OCCUPIED");
    expect(resolved.statusSource).toBe("derived");
  });

  it("INP.DIS.1H provider finalize → DISCHARGE_PENDING while still occupied", () => {
    const resolved = resolveBedOperationalStatus({
      occupant: {
        encounterId: "enc-1",
        workflowState: "IN_TREATMENT",
        providerDischargeFinalized: true,
      },
    });
    expect(resolved.status).toBe("DISCHARGE_PENDING");
    expect(isActiveBedOccupancyStatus(resolved.status)).toBe(true);
  });

  it("rejects manual OCCUPIED write helper", () => {
    expect(isManualBedOperationalStatusWritable("OCCUPIED")).toBe(false);
    expect(rejectDerivedBedOperationalStatusWrite("OCCUPIED")).toBe(true);
  });

  it("formats EN/FR labels", () => {
    expect(formatBedOperationalStatusLabel("DIRTY", "en")).toBe("Needs cleaning");
    expect(formatBedOperationalStatusLabel("DIRTY", "fr")).toBe("À nettoyer");
  });

  it("returns visual intents", () => {
    expect(getBedOperationalStatusVisual("BLOCKED").intent).toBe("danger");
    expect(getBedOperationalStatusVisual("AVAILABLE").intent).toBe("neutral");
  });

  it("normalizes status tokens", () => {
    expect(normalizeBedOperationalStatus("discharge_pending")).toBe("DISCHARGE_PENDING");
  });

  it("ED simplified chip maps housekeeping statuses to blocked label", () => {
    expect(formatEdSimplifiedBedStatusLabel("DIRTY", "fr")).toBe("Bloquée");
    expect(formatEdSimplifiedBedStatusLabel("OCCUPIED", "fr")).toBe("Occupée");
  });

  it("precedence list starts with BLOCKED", () => {
    expect(BED_OPERATIONAL_STATUS_PRECEDENCE[0]).toBe("BLOCKED");
    expect(BED_OPERATIONAL_STATUS_PRECEDENCE.at(-1)).toBe("AVAILABLE");
  });

  it("blocks reserve/block housekeeping when bed is occupied (K.10B.10E)", () => {
    expect(
      manualStatusBlockedByOccupancy({
        targetStatus: "RESERVED",
        bedStatus: "OCCUPIED",
        occupantEncounterId: "enc-1",
      })
    ).toBe(true);
    expect(
      manualStatusBlockedByOccupancy({
        targetStatus: "DIRTY",
        bedStatus: "OCCUPIED",
        occupantEncounterId: "enc-1",
      })
    ).toBe(false);
  });
});
