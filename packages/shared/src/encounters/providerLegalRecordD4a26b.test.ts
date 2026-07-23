import { describe, expect, it } from "vitest";
import {
  PROVIDER_LEGAL_RECORD_SYNTHESIS_CERTIFICATION_ID,
  clinicalSynthesisMustNotAutoAcknowledge,
  clinicalSynthesisMustNotInventFacts,
  envelopeDomain,
  providerCensusFacetSupport,
  resolveClinicianIdentity,
  printMustDistinguishLegalRecordFromSynthesis,
} from "./clinicalSynthesisServiceD4a26b.js";
import {
  appendProviderDocumentAmendment,
  classifyPrintPackage,
  providerAmendmentMustPreserveOriginal,
  providerDocumentMatrix,
  providerLegalRecordMustNotOverwriteSignedBody,
  signProviderHandoff,
  saveProviderHandoffDraft,
  acknowledgeProviderHandoff,
} from "./providerLegalRecordD4a26b.js";
import { emptyInpatientProviderWorkspaceV1 } from "./inpatientProviderWorkspaceD4a26.js";

describe("D4A.2.6B clinical synthesis + legal record", () => {
  it("certifies reusable synthesis invariants", () => {
    expect(PROVIDER_LEGAL_RECORD_SYNTHESIS_CERTIFICATION_ID).toBe(
      "MEDUI.PROVIDER_LEGAL_RECORD_SYNTHESIS.D4A2_6B"
    );
    expect(clinicalSynthesisMustNotInventFacts()).toBe(true);
    expect(clinicalSynthesisMustNotAutoAcknowledge()).toBe(true);
    expect(printMustDistinguishLegalRecordFromSynthesis()).toBe(true);
    expect(providerLegalRecordMustNotOverwriteSignedBody()).toBe(true);
    expect(providerAmendmentMustPreserveOriginal()).toBe(true);
  });

  it("resolves clinician identity without exposing raw UUID as display", () => {
    const ok = resolveClinicianIdentity({
      userId: "u-1",
      firstName: "Ada",
      lastName: "Lovelace",
      credentials: "MD",
      relationship: "ATTENDING",
    });
    expect(ok.displayName).toBe("Ada Lovelace, MD");
    expect(ok.unresolved).toBe(false);
    const unknown = resolveClinicianIdentity({ userId: "u-missing" });
    expect(unknown.displayName).toBe("Unknown clinician");
    expect(unknown.unresolved).toBe(true);
    expect(unknown.displayName).not.toContain("u-missing");
  });

  it("discloses unsupported census facets instead of fabricating filters", () => {
    expect(providerCensusFacetSupport("attending")).toBe("SUPPORTED");
    expect(providerCensusFacetSupport("telemetry")).toBe("UNSUPPORTED");
    expect(providerCensusFacetSupport("pendingPlacement")).toBe("UNSUPPORTED");
  });

  it("classifies print packages into legal vs synthesis", () => {
    expect(classifyPrintPackage("HISTORY_PHYSICAL")).toBe("LEGAL_RECORD");
    expect(classifyPrintPackage("DAILY_PROGRESS_NOTE")).toBe("LEGAL_RECORD");
    expect(classifyPrintPackage("PROVIDER_ROUNDING_SUMMARY")).toBe("CLINICAL_SYNTHESIS");
    expect(classifyPrintPackage("PROBLEM_LIST")).toBe("CLINICAL_SYNTHESIS");
  });

  it("appends addendum/correction/EIE without mutating signed body", () => {
    let doc = emptyInpatientProviderWorkspaceV1();
    doc = {
      ...doc,
      expectedVersion: 1,
      hpDraft: {
        expectedVersion: 1,
        status: "SIGNED",
        sections: { HPI: { text: "Original HPI", updatedAt: "2026-07-22T00:00:00.000Z" } },
        signedAt: "2026-07-22T01:00:00.000Z",
        signedByUserId: "u1",
      },
    };
    const originalHpi = doc.hpDraft!.sections!.HPI!.text;
    const addendum = appendProviderDocumentAmendment({
      doc,
      type: "ADDENDUM",
      target: "HP",
      clientRequestId: "req-1",
      reason: "Additional findings",
      note: "Addendum text",
      actorUserId: "u1",
      clientExpectedVersion: 1,
    });
    expect(addendum.ok).toBe(true);
    if (!addendum.ok) return;
    expect(addendum.doc.hpDraft!.sections!.HPI!.text).toBe(originalHpi);
    expect(addendum.amendment.type).toBe("ADDENDUM");

    const correction = appendProviderDocumentAmendment({
      doc: addendum.doc,
      type: "CORRECTION",
      target: "HP",
      clientRequestId: "req-2",
      reason: "Typo",
      originalValue: "Original HPI",
      correctedValue: "Corrected HPI",
      actorUserId: "u1",
      clientExpectedVersion: 2,
    });
    expect(correction.ok).toBe(true);
    if (!correction.ok) return;
    expect(correction.doc.hpDraft!.sections!.HPI!.text).toBe(originalHpi);
    expect(correction.amendment.originalValue).toBe("Original HPI");
    expect(correction.amendment.correctedValue).toBe("Corrected HPI");
  });

  it("blocks ordinary narrative on voided encounters except correction/EIE", () => {
    const doc = {
      ...emptyInpatientProviderWorkspaceV1(),
      expectedVersion: 1,
      hpDraft: {
        expectedVersion: 1,
        status: "SIGNED" as const,
        sections: {},
        signedAt: "2026-07-22T01:00:00.000Z",
        signedByUserId: "u1",
      },
    };
    const blocked = appendProviderDocumentAmendment({
      doc,
      type: "ADDENDUM",
      target: "HP",
      clientRequestId: "req-void",
      reason: "late note",
      actorUserId: "u1",
      clientExpectedVersion: 1,
      encounterStatus: "VOIDED",
    });
    expect(blocked.ok).toBe(false);
  });

  it("supports handoff draft/sign/ack without auto-narrative", () => {
    let doc = emptyInpatientProviderWorkspaceV1();
    const draft = saveProviderHandoffDraft({
      doc,
      handoff: {
        handoffId: "ho-1",
        expectedVersion: 0,
        status: "DRAFT",
        contingencyPlanText: "Call for fever",
        providerAssessmentText: "Stable overnight expected",
      },
      clientExpectedVersion: 0,
      actorUserId: "u1",
    });
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;
    const signed = signProviderHandoff({
      doc: draft.doc,
      actorUserId: "u1",
      clientExpectedVersion: 1,
    });
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;
    const overwrite = saveProviderHandoffDraft({
      doc: signed.doc,
      handoff: {
        handoffId: "ho-1",
        expectedVersion: 1,
        status: "DRAFT",
        contingencyPlanText: "hack",
      },
      clientExpectedVersion: 2,
      actorUserId: "u2",
    });
    expect(overwrite.ok).toBe(false);
    const ack = acknowledgeProviderHandoff({
      doc: signed.doc,
      actorUserId: "u2",
      clientExpectedVersion: 2,
    });
    expect(ack.ok).toBe(true);
  });

  it("exposes provider document matrix and provenance envelope", () => {
    expect(providerDocumentMatrix().length).toBeGreaterThanOrEqual(4);
    const env = envelopeDomain({
      state: "RESOLVED",
      data: { hr: 80 },
      sourceDomain: "TriageVitalsReading",
      facilityId: "f1",
      encounterId: "e1",
      classification: "CURRENT_STATE",
      timestamp: "2026-07-22T08:00:00.000Z",
    });
    expect(env.provenance.sourceDomain).toBe("TriageVitalsReading");
    expect(env.provenance.classification).toBe("CURRENT_STATE");
  });
});
