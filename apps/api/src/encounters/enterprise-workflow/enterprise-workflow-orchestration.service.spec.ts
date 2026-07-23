import {
  ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
  emptyEnterpriseWorkflowOrchestrationDoc,
  mergeEnterpriseWorkflowOrchestrationIntoSummary,
  readEnterpriseWorkflowOrchestrationDoc,
  workflowHasNoOrphans,
} from "@medora/shared";
import { EnterpriseWorkflowOrchestrationService } from "./enterprise-workflow-orchestration.service";
import { EnterpriseTaskEngine } from "./enterprise-task.engine";
import { EnterpriseWorkflowEngine } from "./enterprise-workflow.engine";
import { ClinicalEventEngine } from "./clinical-event.engine";
import { EscalationEngine } from "./escalation.engine";
import { HospitalTimelineEngine } from "./hospital-timeline.engine";

describe("EnterpriseWorkflowOrchestrationService D4A.2.8", () => {
  const facilityId = "fac-1";
  const encounterId = "enc-1";
  const patientId = "pat-1";
  let admissionSummaryJson: Record<string, unknown> = {};
  let auditCalls: unknown[] = [];

  const prisma = {
    encounter: {
      findFirst: jest.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id !== encounterId) return null;
        return {
          id: encounterId,
          patientId,
          facilityId,
          hospitalEpisodeId: "hep-1",
          admissionSummaryJson,
        };
      }),
      update: jest.fn(async ({ data }: { data: { admissionSummaryJson: unknown } }) => {
        admissionSummaryJson = data.admissionSummaryJson as Record<string, unknown>;
        return { id: encounterId };
      }),
    },
  };

  const audit = {
    log: jest.fn(async (...args: unknown[]) => {
      auditCalls.push(args);
    }),
  };

  const hospitalCensus = {
    getHospitalCensus: jest.fn(async () => ({
      allHospitalPatients: [{ encounterId, patientId }],
      summary: {},
      operationalSnapshot: null,
    })),
  };

  let service: EnterpriseWorkflowOrchestrationService;

  const clinicalRules = {
    evaluateAndApplyForOrchestrationEvent: jest.fn(
      async (input: {
        orchestrationDoc: ReturnType<typeof readEnterpriseWorkflowOrchestrationDoc>;
        admissionSummaryJson: unknown;
      }) => {
        const admissionSummaryJson = mergeEnterpriseWorkflowOrchestrationIntoSummary(
          input.admissionSummaryJson,
          input.orchestrationDoc
        );
        return {
          evaluation: {
            matchedRuleIds: [],
            actions: [],
            executions: [],
          },
          orchestrationDoc: input.orchestrationDoc,
          admissionSummaryJson,
          appliedActionTypes: [],
          skipped: [],
        };
      }
    ),
  };

  beforeEach(() => {
    admissionSummaryJson = {};
    auditCalls = [];
    jest.clearAllMocks();
    service = new EnterpriseWorkflowOrchestrationService(
      prisma as never,
      audit as never,
      hospitalCensus as never,
      new EnterpriseTaskEngine(),
      new EnterpriseWorkflowEngine(),
      new ClinicalEventEngine(),
      new EscalationEngine(),
      new HospitalTimelineEngine(),
      clinicalRules as never
    );
  });

  it("creates workflow, completes task with dependency rules, and audits", async () => {
    const created = await service.createWorkflow(facilityId, encounterId, "user-1", {
      definitionCode: "ADMISSION",
      expectedVersion: 0,
    });
    expect(created.certification).toBe(ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID);
    expect(created.tasks.length).toBeGreaterThan(0);
    expect(workflowHasNoOrphans(created.doc)).toBe(true);
    expect(auditCalls.length).toBeGreaterThan(0);

    const rn = created.tasks.find((t) => t.department === "RN")!;
    const completed = await service.completeTask(
      facilityId,
      encounterId,
      rn.taskId,
      "rn-1",
      { expectedVersion: created.doc.expectedVersion }
    );
    expect(completed.task.status).toBe("COMPLETED");
  });

  it("ingests events idempotently", async () => {
    const first = await service.ingestEvent(facilityId, encounterId, "user-1", {
      idempotencyKey: "admit-1",
      type: "ADMISSION_CREATED",
      expectedVersion: 0,
    });
    expect(first.idempotentReplay).toBe(false);
    expect(first.event.appliedDefinitionCodes).toContain("ADMISSION");

    const replay = await service.ingestEvent(facilityId, encounterId, "user-1", {
      idempotencyKey: "admit-1",
      type: "ADMISSION_CREATED",
      expectedVersion: first.doc.expectedVersion,
    });
    expect(replay.idempotentReplay).toBe(true);
    expect(replay.doc.workflows.length).toBe(first.doc.workflows.length);
  });

  it("opens escalations and exposes notifications + timeline", async () => {
    const esc = await service.openEscalation(facilityId, encounterId, "lab-1", {
      templateCode: "CRITICAL_RESULT",
      summary: "Critical troponin",
      expectedVersion: 0,
    });
    expect(esc.escalation.status).toBe("OPEN");

    const ntf = await service.getNotifications(facilityId, encounterId);
    expect(ntf.notifications.length).toBeGreaterThan(0);

    const tl = await service.getTimeline(facilityId, encounterId, {});
    expect(tl.entries.length).toBeGreaterThan(0);
  });

  it("builds department worklist and admin dashboard", async () => {
    await service.createWorkflow(facilityId, encounterId, "user-1", {
      definitionCode: "ADMISSION",
      expectedVersion: 0,
    });
    const wl = await service.getDepartmentWorklist(facilityId, "RN", {
      limit: 20,
      offset: 0,
    });
    expect(wl.department).toBe("RN");
    expect(wl.items.every((i) => i.department === "RN")).toBe(true);

    const dash = await service.getAdminDashboard(facilityId, "admin-1");
    expect(dash.volumeActiveWorkflows.availability).toBe("AVAILABLE");
    expect(dash.placementEnabled).toBe(false);
    expect(dash.rulesEngineEnabled).toBe(true);
  });

  it("persists via admissionSummaryJson bag helpers", () => {
    const empty = emptyEnterpriseWorkflowOrchestrationDoc();
    const merged = mergeEnterpriseWorkflowOrchestrationIntoSummary({}, empty);
    expect(readEnterpriseWorkflowOrchestrationDoc(merged).version).toBe(1);
  });
});
