import { describe, expect, it } from "vitest";
import { BILLING_AUTO_MAPPING_QUEUE } from "./billingAutoMappingWorkspace.js";
import {
  canBulkApplyAutoMapping,
  bulkApplyBlockedReason,
  validateBulkAutoMappingSelection,
  bulkApplyRequiresHighConfidence,
} from "./billingAutoMappingBulkGovernance.js";

describe("billingAutoMappingBulkGovernance", () => {
  const applyReadyRow = {
    ledgerRowId: "be-1",
    queue: BILLING_AUTO_MAPPING_QUEUE.APPLY_READY,
    confidence: "HIGH" as const,
    manuallyEdited: false,
    doNotBill: false,
    ambiguousCatalogMatch: false,
  };

  it("canBulkApplyAutoMapping allows HIGH apply-ready rows", () => {
    expect(canBulkApplyAutoMapping(applyReadyRow)).toBe(true);
  });

  it("canBulkApplyAutoMapping rejects REVIEW_REQUIRED", () => {
    expect(
      canBulkApplyAutoMapping({
        ...applyReadyRow,
        queue: BILLING_AUTO_MAPPING_QUEUE.REVIEW_REQUIRED,
      })
    ).toBe(false);
  });

  it("canBulkApplyAutoMapping rejects SKIPPED", () => {
    expect(
      canBulkApplyAutoMapping({
        ...applyReadyRow,
        queue: BILLING_AUTO_MAPPING_QUEUE.SKIPPED,
      })
    ).toBe(false);
  });

  it("canBulkApplyAutoMapping rejects manually edited", () => {
    expect(canBulkApplyAutoMapping({ ...applyReadyRow, manuallyEdited: true })).toBe(false);
  });

  it("canBulkApplyAutoMapping rejects DO_NOT_BILL", () => {
    expect(canBulkApplyAutoMapping({ ...applyReadyRow, doNotBill: true })).toBe(false);
  });

  it("canBulkApplyAutoMapping rejects ambiguous catalog match", () => {
    expect(canBulkApplyAutoMapping({ ...applyReadyRow, ambiguousCatalogMatch: true })).toBe(false);
  });

  it("canBulkApplyAutoMapping rejects medium confidence", () => {
    expect(canBulkApplyAutoMapping({ ...applyReadyRow, confidence: "MEDIUM" })).toBe(false);
  });

  it("validateBulkAutoMappingSelection splits valid and invalid ids", () => {
    const rows = [
      applyReadyRow,
      {
        ledgerRowId: "be-2",
        queue: BILLING_AUTO_MAPPING_QUEUE.REVIEW_REQUIRED,
        confidence: "MEDIUM" as const,
        manuallyEdited: false,
        doNotBill: false,
      },
    ];
    const result = validateBulkAutoMappingSelection(rows, ["be-1", "be-2", "be-missing"]);
    expect(result.validIds).toEqual(["be-1"]);
    expect(result.invalidIds).toEqual(["be-2", "be-missing"]);
    expect(result.reasonsById["be-2"]).toContain("review");
  });

  it("bulkApplyBlockedReason explains DO NOT BILL", () => {
    expect(
      bulkApplyBlockedReason({
        ...applyReadyRow,
        doNotBill: true,
        queue: BILLING_AUTO_MAPPING_QUEUE.APPLY_READY,
      })
    ).toContain("DO NOT BILL");
  });

  it("bulkApplyRequiresHighConfidence is type guard", () => {
    expect(bulkApplyRequiresHighConfidence("HIGH")).toBe(true);
    expect(bulkApplyRequiresHighConfidence("MEDIUM")).toBe(false);
  });
});
