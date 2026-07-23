import { describe, expect, it } from "vitest";
import {
  INPATIENT_PROVIDER_WORKSPACE_CERTIFICATION_ID,
  INPATIENT_PROVIDER_WORKSPACE_KEY,
  acknowledgeProviderEvent,
  deriveProviderTasksFromOps,
  emptyInpatientProviderWorkspaceV1,
  mergeInpatientProviderWorkspaceIntoSummary,
  providerAndNursingShareSameInpatientEncounter,
  providerWorkspaceMustNotAutoAcknowledgeResults,
  providerWorkspaceMustNotAutoDocumentNegativeRos,
  providerWorkspaceMustNotAutoDocumentNormalExam,
  providerWorkspaceMustNotCreateSecondOrderEngine,
  providerWorkspaceMustNotOverwriteNursingDocuments,
  readInpatientProviderWorkspace,
  saveProviderHpDraft,
  signProviderHpDraft,
  upsertProviderProblemPlan,
} from "./inpatientProviderWorkspaceD4a26.js";

describe("D4A.2.6 inpatient provider workspace contracts", () => {
  it("certifies architecture boundaries", () => {
    expect(INPATIENT_PROVIDER_WORKSPACE_CERTIFICATION_ID).toBe(
      "MEDUI.INPATIENT_PROVIDER_WORKSPACE.D4A2_6"
    );
    expect(providerAndNursingShareSameInpatientEncounter()).toBe(true);
    expect(providerWorkspaceMustNotCreateSecondOrderEngine()).toBe(true);
    expect(providerWorkspaceMustNotOverwriteNursingDocuments()).toBe(true);
    expect(providerWorkspaceMustNotAutoAcknowledgeResults()).toBe(true);
    expect(providerWorkspaceMustNotAutoDocumentNegativeRos()).toBe(true);
    expect(providerWorkspaceMustNotAutoDocumentNormalExam()).toBe(true);
  });

  it("persists under dedicated summary key without wiping sibling domains", () => {
    const summary = {
      medSurgNursingAdmissionV1: { version: 1 },
      inpatientClinicalOpsV1: { version: 1 },
    };
    const doc = emptyInpatientProviderWorkspaceV1("2026-07-22T00:00:00.000Z");
    const merged = mergeInpatientProviderWorkspaceIntoSummary(summary, doc);
    expect(merged.medSurgNursingAdmissionV1).toEqual({ version: 1 });
    expect(merged.inpatientClinicalOpsV1).toEqual({ version: 1 });
    expect(merged[INPATIENT_PROVIDER_WORKSPACE_KEY]).toEqual(doc);
    expect(readInpatientProviderWorkspace(merged)).toEqual(doc);
  });

  it("does not acknowledge events on open — only explicit status change", () => {
    const doc = emptyInpatientProviderWorkspaceV1();
    doc.events = [
      {
        eventId: "e1",
        type: "CRITICAL_LAB",
        severity: "CRITICAL",
        summary: "K+ critical",
        source: "LAB",
        occurredAt: "2026-07-22T01:00:00.000Z",
        status: "NEW",
      },
    ];
    const blocked = acknowledgeProviderEvent({
      doc,
      eventId: "e1",
      actorUserId: "u1",
      status: "NEW",
      clientExpectedVersion: 0,
    });
    expect(blocked.ok).toBe(false);
    const acked = acknowledgeProviderEvent({
      doc,
      eventId: "e1",
      actorUserId: "u1",
      status: "ACKNOWLEDGED",
      clientExpectedVersion: 0,
      atIso: "2026-07-22T02:00:00.000Z",
    });
    expect(acked.ok).toBe(true);
    if (acked.ok) {
      expect(acked.doc.events[0]?.status).toBe("ACKNOWLEDGED");
      expect(acked.doc.events[0]?.acknowledgedByUserId).toBe("u1");
    }
  });

  it("keeps RULED_OUT problem history and rejects stale CAS", () => {
    const doc = emptyInpatientProviderWorkspaceV1();
    const first = upsertProviderProblemPlan({
      doc,
      actorUserId: "u1",
      clientExpectedVersion: 0,
      item: {
        problemId: "p1",
        displayLabel: "Pneumonia",
        status: "ACTIVE",
        priority: "PRIMARY",
      },
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const ruled = upsertProviderProblemPlan({
      doc: first.doc,
      actorUserId: "u1",
      clientExpectedVersion: first.doc.expectedVersion,
      item: {
        problemId: "p1",
        displayLabel: "Pneumonia",
        status: "RULED_OUT",
        priority: "PRIMARY",
      },
    });
    expect(ruled.ok).toBe(true);
    if (ruled.ok) {
      expect(ruled.doc.problemPlans).toHaveLength(1);
      expect(ruled.doc.problemPlans[0]?.status).toBe("RULED_OUT");
    }
    const stale = upsertProviderProblemPlan({
      doc: first.doc,
      actorUserId: "u2",
      clientExpectedVersion: 0,
      item: {
        problemId: "p2",
        displayLabel: "Other",
        status: "ACTIVE",
        priority: "OTHER",
      },
    });
    expect(stale.ok).toBe(false);
  });

  it("locks signed H&P and preserves draft sections", () => {
    let doc = emptyInpatientProviderWorkspaceV1();
    const saved = saveProviderHpDraft({
      doc,
      sectionKey: "CHIEF_CONCERN",
      text: "Dyspnea",
      clientExpectedVersion: 0,
      actorUserId: "u1",
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    doc = saved.doc;
    const signed = signProviderHpDraft({
      doc,
      actorUserId: "u1",
      clientExpectedVersion: doc.expectedVersion,
    });
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;
    expect(signed.doc.hpDraft?.status).toBe("SIGNED");
    expect(signed.doc.hpDraft?.sections.CHIEF_CONCERN?.text).toBe("Dyspnea");
    const blocked = saveProviderHpDraft({
      doc: signed.doc,
      sectionKey: "HPI",
      text: "overwrite",
      clientExpectedVersion: signed.doc.expectedVersion,
      actorUserId: "u1",
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("PROVIDER_DOCUMENT_ALREADY_SIGNED");
  });

  it("derives provider tasks from ops gaps", () => {
    const tasks = deriveProviderTasksFromOps({
      codeStatusPresent: false,
      medReconComplete: false,
      hpSigned: false,
      dischargeWorkflowState: "READY",
    });
    expect(tasks.map((t) => t.type)).toEqual(
      expect.arrayContaining([
        "HP_DUE",
        "CODE_STATUS_CONFIRMATION",
        "MED_RECON_INCOMPLETE",
        "DISCHARGE_SUMMARY",
      ])
    );
  });
});
