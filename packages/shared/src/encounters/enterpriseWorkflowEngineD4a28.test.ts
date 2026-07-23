import { describe, expect, it } from "vitest";
import {
  ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
  WORKFLOW_DEFINITION_ADMISSION,
  WORKFLOW_DEFINITION_CHEST_PAIN,
  aggregateAdminDashboard,
  appendTimelineEntry,
  buildDepartmentWorklist,
  canCompleteTask,
  createWorkflowFromDefinition,
  emptyEnterpriseWorkflowOrchestrationDoc,
  enterpriseWorkflowAutoGenerationIsDefinitionDriven,
  enterpriseWorkflowMustNotStartPlacement,
  enterpriseWorkflowMustNotStartRulesEngine,
  filterTimeline,
  ingestClinicalOrchestrationEvent,
  mergeEnterpriseWorkflowOrchestrationIntoSummary,
  openEscalationFromTemplate,
  readEnterpriseWorkflowOrchestrationDoc,
  reassignEnterpriseWorkflowTask,
  timelineHasNoDuplicateDedupeKeys,
  upsertEnterpriseWorkflowTask,
  workflowHasNoOrphans,
  advanceEscalation,
} from "./enterpriseWorkflowEngineD4a28.js";

const NOW = "2026-07-23T12:00:00.000Z";

function baseCtx() {
  return {
    facilityId: "fac-1",
    patientId: "pat-1",
    hospitalEpisodeId: "hep-1",
    encounterId: "enc-1",
  };
}

describe("MEDUI.ENTERPRISE_WORKFLOW_ENGINE.D4A2_8 shared", () => {
  it("certifies phase boundaries and definition-driven auto-generation", () => {
    expect(ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID).toBe(
      "MEDUI.ENTERPRISE_WORKFLOW_ENGINE.D4A2_8"
    );
    // D4A.2.8A consumes policy hooks — rules engine started; placement still blocked.
    expect(enterpriseWorkflowMustNotStartRulesEngine()).toBe(false);
    expect(enterpriseWorkflowMustNotStartPlacement()).toBe(true);
    expect(enterpriseWorkflowAutoGenerationIsDefinitionDriven()).toBe(true);
  });

  it("persists orchestration doc in admission summary JSON bag", () => {
    const empty = emptyEnterpriseWorkflowOrchestrationDoc(NOW);
    const merged = mergeEnterpriseWorkflowOrchestrationIntoSummary({}, empty);
    const read = readEnterpriseWorkflowOrchestrationDoc(merged);
    expect(read.expectedVersion).toBe(0);
    expect(read.workflows).toEqual([]);
  });

  it("creates workflow + tasks from Admission template without orphans", () => {
    const doc = emptyEnterpriseWorkflowOrchestrationDoc(NOW);
    const ctx = baseCtx();
    const created = createWorkflowFromDefinition({
      doc,
      definition: WORKFLOW_DEFINITION_ADMISSION,
      ...ctx,
      workflowInstanceId: "wf-1",
      taskIdFactory: (k) => `task-${k}`,
      nowIso: NOW,
      actorUserId: "user-1",
      clientExpectedVersion: 0,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.workflow.definitionCode).toBe("ADMISSION");
    expect(created.tasks.length).toBe(4);
    expect(workflowHasNoOrphans(created.doc)).toBe(true);
    expect(timelineHasNoDuplicateDedupeKeys(created.doc)).toBe(true);
  });

  it("rejects orphan workflow creation", () => {
    const created = createWorkflowFromDefinition({
      doc: emptyEnterpriseWorkflowOrchestrationDoc(NOW),
      definition: WORKFLOW_DEFINITION_CHEST_PAIN,
      facilityId: "fac-1",
      patientId: "",
      hospitalEpisodeId: null,
      encounterId: "enc-1",
      workflowInstanceId: "wf-orphan",
      taskIdFactory: (k) => `t-${k}`,
      nowIso: NOW,
      clientExpectedVersion: 0,
    });
    expect(created.ok).toBe(false);
    if (created.ok) return;
    expect(created.code).toBe("ORPHAN_WORKFLOW_FORBIDDEN");
  });

  it("blocks completion when dependencies are unmet", () => {
    const doc0 = emptyEnterpriseWorkflowOrchestrationDoc(NOW);
    const ctx = baseCtx();
    const created = createWorkflowFromDefinition({
      doc: doc0,
      definition: WORKFLOW_DEFINITION_ADMISSION,
      ...ctx,
      workflowInstanceId: "wf-dep",
      taskIdFactory: (k) => `dep-${k}`,
      nowIso: NOW,
      clientExpectedVersion: 0,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const providerTask = created.tasks.find((t) => t.department === "PROVIDER")!;
    const gate = canCompleteTask(providerTask, created.doc.tasks);
    expect(gate.ok).toBe(false);
    if (gate.ok) return;
    expect(gate.code).toBe("TASK_DEPENDENCIES_BLOCKING");

    const attempt = upsertEnterpriseWorkflowTask({
      doc: created.doc,
      task: { ...providerTask, status: "COMPLETED" },
      clientExpectedVersion: created.doc.expectedVersion,
      actorUserId: "user-1",
      nowIso: NOW,
    });
    expect(attempt.ok).toBe(false);
  });

  it("allows completion after dependency satisfied and audits reassignment", () => {
    const created = createWorkflowFromDefinition({
      doc: emptyEnterpriseWorkflowOrchestrationDoc(NOW),
      definition: WORKFLOW_DEFINITION_ADMISSION,
      ...baseCtx(),
      workflowInstanceId: "wf-ok",
      taskIdFactory: (k) => `ok-${k}`,
      nowIso: NOW,
      clientExpectedVersion: 0,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const nursing = created.tasks.find((t) => t.department === "RN")!;
    const doneNursing = upsertEnterpriseWorkflowTask({
      doc: created.doc,
      task: { ...nursing, status: "COMPLETED", startedAt: NOW },
      clientExpectedVersion: created.doc.expectedVersion,
      actorUserId: "rn-1",
      nowIso: NOW,
    });
    expect(doneNursing.ok).toBe(true);
    if (!doneNursing.ok) return;

    const provider = doneNursing.doc.tasks.find((t) => t.department === "PROVIDER")!;
    const doneProvider = upsertEnterpriseWorkflowTask({
      doc: doneNursing.doc,
      task: { ...provider, status: "COMPLETED", startedAt: NOW },
      clientExpectedVersion: doneNursing.doc.expectedVersion,
      actorUserId: "md-1",
      nowIso: "2026-07-23T13:00:00.000Z",
    });
    expect(doneProvider.ok).toBe(true);

    const reassigned = reassignEnterpriseWorkflowTask({
      doc: doneNursing.doc,
      taskId: doneNursing.task.taskId,
      assignedToUserId: "rn-2",
      clientExpectedVersion: doneNursing.doc.expectedVersion,
      actorUserId: "charge-1",
      nowIso: "2026-07-23T12:30:00.000Z",
    });
    expect(reassigned.ok).toBe(true);
    if (!reassigned.ok) return;
    expect(reassigned.task.assignedToUserId).toBe("rn-2");
    expect(
      reassigned.doc.timeline.some((e) => e.dedupeKey.includes("reassign"))
    ).toBe(true);
  });

  it("ingests events idempotently and generates definition-driven workflows", () => {
    const ctx = baseCtx();
    const first = ingestClinicalOrchestrationEvent({
      doc: emptyEnterpriseWorkflowOrchestrationDoc(NOW),
      event: {
        eventId: "ev-1",
        idempotencyKey: "admit-enc-1",
        type: "ADMISSION_CREATED",
        ...ctx,
        occurredAt: NOW,
        payload: null,
        createdByUserId: "user-1",
      },
      clientExpectedVersion: 0,
      actorUserId: "user-1",
      nowIso: NOW,
      idFactory: {
        workflowInstanceId: (code) => `wf-${code}-1`,
        taskId: (code, key) => `t-${code}-${key}`,
      },
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.idempotentReplay).toBe(false);
    expect(first.event.appliedDefinitionCodes).toContain("ADMISSION");
    expect(first.doc.workflows.length).toBe(1);
    expect(first.doc.tasks.length).toBeGreaterThan(0);

    const replay = ingestClinicalOrchestrationEvent({
      doc: first.doc,
      event: {
        eventId: "ev-1-dup",
        idempotencyKey: "admit-enc-1",
        type: "ADMISSION_CREATED",
        ...ctx,
        occurredAt: NOW,
        payload: null,
      },
      clientExpectedVersion: first.doc.expectedVersion,
      nowIso: NOW,
      idFactory: {
        workflowInstanceId: () => "should-not-create",
        taskId: () => "should-not-create",
      },
    });
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.idempotentReplay).toBe(true);
    expect(replay.doc.workflows.length).toBe(1);
    expect(replay.doc.tasks.length).toBe(first.doc.tasks.length);
  });

  it("opens escalation from template and records history", () => {
    const ctx = baseCtx();
    const opened = openEscalationFromTemplate({
      doc: emptyEnterpriseWorkflowOrchestrationDoc(NOW),
      templateCode: "CRITICAL_RESULT",
      ...ctx,
      escalationId: "esc-1",
      summary: "Critical K+",
      clientExpectedVersion: 0,
      actorUserId: "lab-1",
      nowIso: NOW,
    });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.escalation.status).toBe("OPEN");
    expect(opened.doc.notifications.length).toBe(1);
    expect(opened.doc.notifications[0]?.channel).toBe("WORKFLOW");

    const advanced = advanceEscalation(
      opened.doc,
      "esc-1",
      "ACKNOWLEDGED",
      opened.doc.expectedVersion,
      "md-1",
      "2026-07-23T12:10:00.000Z",
      "Called provider"
    );
    expect(advanced.ok).toBe(true);
    if (!advanced.ok) return;
    expect(advanced.escalation.history.length).toBe(2);
  });

  it("filters timeline and prevents duplicate dedupe keys", () => {
    let doc = emptyEnterpriseWorkflowOrchestrationDoc(NOW);
    doc = appendTimelineEntry(doc, {
      entryId: "e1",
      dedupeKey: "k1",
      kind: "TASK",
      at: NOW,
      facilityId: "fac-1",
      patientId: "pat-1",
      hospitalEpisodeId: null,
      encounterId: "enc-1",
      department: "RN",
      taskType: "ASSESSMENT",
      title: "A",
    });
    const again = appendTimelineEntry(doc, {
      entryId: "e2",
      dedupeKey: "k1",
      kind: "TASK",
      at: NOW,
      facilityId: "fac-1",
      patientId: "pat-1",
      hospitalEpisodeId: null,
      encounterId: "enc-1",
      department: "RN",
      title: "dup",
    });
    expect(again.timeline.length).toBe(1);
    const filtered = filterTimeline(doc.timeline, { department: "RN" });
    expect(filtered).toHaveLength(1);
  });

  it("builds department worklists with write isolation and paginates", () => {
    const created = createWorkflowFromDefinition({
      doc: emptyEnterpriseWorkflowOrchestrationDoc(NOW),
      definition: WORKFLOW_DEFINITION_ADMISSION,
      ...baseCtx(),
      workflowInstanceId: "wf-wl",
      taskIdFactory: (k) => `wl-${k}`,
      nowIso: NOW,
      clientExpectedVersion: 0,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const page = buildDepartmentWorklist(
      [{ encounterId: "enc-1", doc: created.doc }],
      "RN",
      "fac-1",
      { limit: 10, offset: 0, nowIso: NOW }
    );
    expect(page.writeIsolationByDepartment).toBe(true);
    expect(page.items.every((i) => i.department === "RN")).toBe(true);
    expect(page.total).toBeGreaterThan(0);
  });

  it("aggregates admin dashboard and treats unavailable as non-zero", () => {
    const created = createWorkflowFromDefinition({
      doc: emptyEnterpriseWorkflowOrchestrationDoc(NOW),
      definition: WORKFLOW_DEFINITION_ADMISSION,
      ...baseCtx(),
      workflowInstanceId: "wf-dash",
      taskIdFactory: (k) => `dash-${k}`,
      nowIso: NOW,
      clientExpectedVersion: 0,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const dash = aggregateAdminDashboard([created.doc], "fac-1", NOW);
    expect(dash.volumeActiveWorkflows.availability).toBe("AVAILABLE");
    expect(dash.volumeActiveWorkflows.value).toBeGreaterThan(0);
    expect(dash.rulesEngineEnabled).toBe(true);
    expect(dash.placementEnabled).toBe(false);

    const unavailable = aggregateAdminDashboard([], "fac-1", NOW, {
      sourceUnavailable: true,
    });
    expect(unavailable.volumeOpenTasks.availability).toBe("UNAVAILABLE");
    expect(unavailable.volumeOpenTasks.value).toBeNull();
  });
});
