/**
 * INP.PROV.1A — access + completeness tests.
 */

import { describe, expect, it } from "vitest";
import {
  canAuthorInpatientProviderDocumentation,
  canViewInpatientProviderDocumentationBoard,
  isInpatientProviderDocumentationAuthoringSection,
  parseInpatientProviderDocumentationSubtab,
} from "./inpatientProviderDocumentationAccessInpProv1a.js";
import {
  buildInpatientDocumentationCompletenessAlerts,
  inpatientDocumentationCompletenessMessageIsNonLeading,
} from "./inpatientDocumentationCompletenessInpProv1a.js";
import { providerPrimaryNav } from "./inpatientWorkspaceRecoveryD4a27b.js";

describe("INP.PROV.1A provider documentation access", () => {
  it("PROVIDER and ADMIN can view; RN/TECH/PCT cannot", () => {
    expect(canViewInpatientProviderDocumentationBoard(["PROVIDER"])).toBe(true);
    expect(canViewInpatientProviderDocumentationBoard(["ADMIN"])).toBe(true);
    expect(canViewInpatientProviderDocumentationBoard(["PROVIDER", "ADMIN"])).toBe(true);
    expect(canViewInpatientProviderDocumentationBoard(["RN"])).toBe(false);
    expect(canViewInpatientProviderDocumentationBoard(["TECH"])).toBe(false);
    expect(canViewInpatientProviderDocumentationBoard(["PCT"])).toBe(false);
    expect(canViewInpatientProviderDocumentationBoard(["RN", "TECH"])).toBe(false);
  });

  it("ADMIN-only cannot author; PROVIDER can", () => {
    expect(canAuthorInpatientProviderDocumentation(["ADMIN"])).toBe(false);
    expect(canAuthorInpatientProviderDocumentation(["PROVIDER"])).toBe(true);
    expect(canAuthorInpatientProviderDocumentation(["ADMIN", "PROVIDER"])).toBe(true);
    expect(canAuthorInpatientProviderDocumentation(["RN"])).toBe(false);
  });

  it("authoring section gate includes hub + doc types", () => {
    expect(isInpatientProviderDocumentationAuthoringSection("providerDocumentation")).toBe(true);
    expect(isInpatientProviderDocumentationAuthoringSection("historyPhysical")).toBe(true);
    expect(isInpatientProviderDocumentationAuthoringSection("overview")).toBe(false);
  });

  it("providerPrimaryNav includes providerDocumentation hub", () => {
    expect(providerPrimaryNav()).toContain("providerDocumentation");
  });

  it("parses subtabs", () => {
    expect(parseInpatientProviderDocumentationSubtab("hp")).toBe("historyPhysical");
    expect(parseInpatientProviderDocumentationSubtab("progressNotes")).toBe("progressNotes");
  });
});

describe("INP.PROV.1A documentation completeness", () => {
  it("flags missing medical necessity when rationale is known empty", () => {
    const alerts = buildInpatientDocumentationCompletenessAlerts({
      careSetting: "INPATIENT",
      admissionRationaleText: "",
    });
    expect(alerts.some((a) => a.code === "MEDICAL_NECESSITY_MISSING")).toBe(true);
    for (const a of alerts) {
      expect(inpatientDocumentationCompletenessMessageIsNonLeading(a.messageEn)).toBe(true);
    }
  });

  it("does not flag MEDICAL_NECESSITY_MISSING when rationale is unknown/not evaluated", () => {
    const alerts = buildInpatientDocumentationCompletenessAlerts({
      careSetting: "INPATIENT",
      hasUnsignedProviderDraft: false,
    });
    expect(alerts.some((a) => a.code === "MEDICAL_NECESSITY_MISSING")).toBe(false);
  });

  it("explicit null rationale is known empty and triggers medical necessity", () => {
    const alerts = buildInpatientDocumentationCompletenessAlerts({
      careSetting: "INPATIENT",
      admissionRationaleText: null,
    });
    expect(alerts.some((a) => a.code === "MEDICAL_NECESSITY_MISSING")).toBe(true);
  });

  it("flags time-selected without minutes", () => {
    const alerts = buildInpatientDocumentationCompletenessAlerts({
      timeBasedEmSelected: true,
      totalProviderTimeMinutes: null,
    });
    expect(alerts.some((a) => a.code === "TIME_SELECTED_TIME_MISSING")).toBe(true);
  });

  it("does not flag time gap when time-based path is unknown", () => {
    const alerts = buildInpatientDocumentationCompletenessAlerts({
      careSetting: "INPATIENT",
    });
    expect(alerts.some((a) => a.code === "TIME_SELECTED_TIME_MISSING")).toBe(false);
  });

  it("flags critical-care time missing when path active", () => {
    const alerts = buildInpatientDocumentationCompletenessAlerts({
      criticalCareDocumented: true,
      criticalCareMinutes: 0,
    });
    expect(alerts.some((a) => a.code === "CRITICAL_CARE_TIME_MISSING")).toBe(true);
  });

  it("rejects revenue-leading messaging", () => {
    expect(
      inpatientDocumentationCompletenessMessageIsNonLeading(
        "Document acute respiratory failure to capture an MCC."
      )
    ).toBe(false);
  });

  it("carry-forward requires review alert", () => {
    const alerts = buildInpatientDocumentationCompletenessAlerts({
      carryForwardPendingReview: true,
    });
    expect(alerts.some((a) => a.code === "CARRY_FORWARD_UNREVIEWED")).toBe(true);
  });
});
