import { describe, expect, it } from "vitest";
import {
  buildBillingAutoMappingCandidateSignature,
  groupBillingAutoMappingCandidates,
  ledgerLineLooksUnmapped,
  normalizeBillingMappingKey,
  resolveBillingAutoMappingDecision,
  shouldAutoApplyBillingMapping,
  type BillingAutoMappingCandidate,
} from "./billingAutoMappingGovernance.js";

describe("billingAutoMappingGovernance (MEDUI.BILLING.AUTO_MAPPING.1)", () => {
  const baseInput = {
    confidence: "HIGH" as const,
    candidateType: "LAB" as const,
    isUnmapped: true,
    isManuallyEdited: false,
    isDoNotBill: false,
    isVoidedOrSkipped: false,
    isFinalizedEncounter: false,
    hasCatalogMatch: true,
  };

  it("exact lab match → APPLY", () => {
    expect(resolveBillingAutoMappingDecision({ ...baseInput, candidateType: "LAB" })).toBe("APPLY");
    expect(shouldAutoApplyBillingMapping("APPLY")).toBe(true);
  });

  it("exact imaging match → APPLY", () => {
    expect(resolveBillingAutoMappingDecision({ ...baseInput, candidateType: "IMAGING" })).toBe("APPLY");
  });

  it("exact procedure match → APPLY", () => {
    expect(resolveBillingAutoMappingDecision({ ...baseInput, candidateType: "PROCEDURE" })).toBe("APPLY");
  });

  it("exact medication drug match → APPLY when route present", () => {
    expect(
      resolveBillingAutoMappingDecision({
        ...baseInput,
        candidateType: "MEDICATION_DRUG",
        medicationAdministrationRouteMissing: false,
      })
    ).toBe("APPLY");
  });

  it("medication administration without route → REVIEW", () => {
    expect(
      resolveBillingAutoMappingDecision({
        ...baseInput,
        candidateType: "MEDICATION_ADMINISTRATION",
        medicationAdministrationRouteMissing: true,
      })
    ).toBe("REVIEW");
  });

  it("ambiguous catalog match → REVIEW", () => {
    expect(resolveBillingAutoMappingDecision({ ...baseInput, ambiguousCatalogMatch: true })).toBe("REVIEW");
  });

  it("no catalog match → SKIP", () => {
    expect(resolveBillingAutoMappingDecision({ ...baseInput, hasCatalogMatch: false })).toBe("SKIP");
  });

  it("manually edited line → SKIP", () => {
    expect(resolveBillingAutoMappingDecision({ ...baseInput, isManuallyEdited: true })).toBe("SKIP");
  });

  it("DO_NOT_BILL line → SKIP", () => {
    expect(resolveBillingAutoMappingDecision({ ...baseInput, isDoNotBill: true })).toBe("SKIP");
  });

  it("low confidence → SKIP", () => {
    expect(resolveBillingAutoMappingDecision({ ...baseInput, confidence: "LOW" })).toBe("SKIP");
  });

  it("medium confidence → REVIEW", () => {
    expect(resolveBillingAutoMappingDecision({ ...baseInput, confidence: "MEDIUM" })).toBe("REVIEW");
  });

  it("high confidence → APPLY", () => {
    expect(resolveBillingAutoMappingDecision({ ...baseInput, confidence: "HIGH" })).toBe("APPLY");
  });

  it("groups candidates by decision", () => {
    const candidates: BillingAutoMappingCandidate[] = [
      {
        ledgerLineId: "a",
        candidateType: "LAB",
        sourceLabel: "CBC",
        normalizedKey: "cbc",
        currentCode: "UNMAPPED",
        proposedCode: "85025",
        proposedCodeType: "CPT",
        proposedBillingSide: "FACILITY",
        confidence: "HIGH",
        decision: "APPLY",
        reason: "Exact catalog match",
        warnings: [],
        candidateSignature: "sig-a",
      },
      {
        ledgerLineId: "b",
        candidateType: "MEDICATION_ADMINISTRATION",
        sourceLabel: "Drug",
        normalizedKey: "drug",
        currentCode: "UNMAPPED",
        proposedCode: "J1234",
        proposedCodeType: "HCPCS",
        proposedBillingSide: "BOTH",
        confidence: "HIGH",
        decision: "REVIEW",
        reason: "Missing route",
        warnings: ["Missing administration route"],
        candidateSignature: "sig-b",
      },
    ];
    const grouped = groupBillingAutoMappingCandidates(candidates);
    expect(grouped.apply).toHaveLength(1);
    expect(grouped.review).toHaveLength(1);
    expect(grouped.skip).toHaveLength(0);
  });

  it("normalizes mapping keys", () => {
    expect(normalizeBillingMappingKey("  CBC Panel ")).toBe("cbc_panel");
  });

  it("detects unmapped ledger lines", () => {
    expect(ledgerLineLooksUnmapped({ code: "UNMAPPED", procedureCode: null, hcpcsCode: null })).toBe(true);
    expect(ledgerLineLooksUnmapped({ code: "85025", procedureCode: "85025", hcpcsCode: null })).toBe(false);
  });

  it("builds stable candidate signatures", () => {
    const sig = buildBillingAutoMappingCandidateSignature({
      ledgerLineId: "line-1",
      currentCode: "UNMAPPED",
      proposedCode: "85025",
      normalizedKey: "cbc",
      proposedCodeType: "CPT",
    });
    expect(sig).toContain("line-1");
    expect(sig).toContain("85025");
  });
});
