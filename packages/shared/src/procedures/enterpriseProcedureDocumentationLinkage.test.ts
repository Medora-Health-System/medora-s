import { describe, expect, it } from "vitest";
import {
  collectProcedureOrderDocumentationHints,
  documentationTemplateIdToDocumentedProcedureType,
  documentationTemplateIdToLauncherStep,
  resolveProcedureDocumentationLinkage,
} from "./enterpriseProcedureDocumentationLinkage.js";

describe("resolveProcedureDocumentationLinkage (MEDPROC.3)", () => {
  it("maps intubation to intubation documentation", () => {
    const result = resolveProcedureDocumentationLinkage({
      enterpriseProcedureId: "endotracheal_intubation",
      orderStatus: "IN_PROGRESS",
    });
    expect(result.hasDocumentationTemplate).toBe(true);
    expect(result.documentationTemplateId).toBe("INTUBATION");
    expect(result.requiresProcedureNote).toBe(true);
    expect(result.recommendedAction).toBe("DOCUMENTATION_AVAILABLE");
    expect(documentationTemplateIdToLauncherStep("INTUBATION")).toBe("INTUBATION");
  });

  it("maps central line to central line documentation", () => {
    const result = resolveProcedureDocumentationLinkage({
      enterpriseProcedureId: "central_line_placement",
      orderStatus: "ACKNOWLEDGED",
    });
    expect(result.documentationTemplateId).toBe("CENTRAL_LINE");
    expect(result.recommendedAction).toBe("DOCUMENTATION_AVAILABLE");
  });

  it("maps chest tube to chest tube documentation", () => {
    const result = resolveProcedureDocumentationLinkage({
      enterpriseProcedureId: "chest_tube",
      orderStatus: "IN_PROGRESS",
    });
    expect(result.documentationTemplateId).toBe("CHEST_TUBE");
    expect(result.recommendedAction).toBe("DOCUMENTATION_AVAILABLE");
  });

  it("maps laceration to laceration documentation template and launcher step", () => {
    const result = resolveProcedureDocumentationLinkage({
      enterpriseProcedureId: "laceration_repair",
      orderStatus: "IN_PROGRESS",
    });
    expect(result.documentationTemplateId).toBe("LACERATION");
    expect(documentationTemplateIdToLauncherStep("LACERATION")).toBe("laceration");
    expect(documentationTemplateIdToDocumentedProcedureType("LACERATION")).toBe("LACERATION_REPAIR");
  });

  it("returns no documentation link for non-template procedures", () => {
    const result = resolveProcedureDocumentationLinkage({
      enterpriseProcedureId: "peripheral_iv",
      orderStatus: "IN_PROGRESS",
    });
    expect(result).toEqual({
      hasDocumentationTemplate: false,
      requiresProcedureNote: false,
      recommendedAction: "NONE",
    });
  });

  it("shows documentation recommended for completed procedure orders", () => {
    const result = resolveProcedureDocumentationLinkage({
      enterpriseProcedureId: "ekg_ecg",
      orderStatus: "COMPLETED",
    });
    expect(result.recommendedAction).toBe("DOCUMENTATION_REQUIRED_REVIEW");
    expect(result.requiresProcedureNote).toBe(true);
  });

  it("returns NONE when matching procedure note already documented", () => {
    const result = resolveProcedureDocumentationLinkage({
      enterpriseProcedureId: "chest_tube",
      orderStatus: "COMPLETED",
      documentedProcedureTypes: ["CHEST_TUBE", "EKG"],
    });
    expect(result.hasDocumentationTemplate).toBe(true);
    expect(result.recommendedAction).toBe("NONE");
  });

  it("legacy CARE order without enterpriseProcedureId still resolves to NONE", () => {
    expect(
      resolveProcedureDocumentationLinkage({
        enterpriseProcedureId: null,
        orderStatus: "COMPLETED",
      })
    ).toMatchObject({ recommendedAction: "NONE" });
    expect(
      resolveProcedureDocumentationLinkage({
        orderStatus: "COMPLETED",
      })
    ).toMatchObject({ recommendedAction: "NONE" });
  });

  it("collectProcedureOrderDocumentationHints skips lines without enterpriseProcedureId", () => {
    const hints = collectProcedureOrderDocumentationHints([
      { id: "a", enterpriseProcedureId: "ekg_ecg", status: "IN_PROGRESS" },
      { id: "b", manualLabel: "Custom task", status: "IN_PROGRESS" } as {
        id: string;
        enterpriseProcedureId?: string | null;
        status?: string | null;
      },
    ]);
    expect(hints).toHaveLength(1);
    expect(hints[0]?.orderItemId).toBe("a");
  });
});
