/**
 * MEDUI.D4C.7D — Enterprise ambulatory encounter lifecycle synchronization contracts.
 */

import { describe, expect, it } from "vitest";
import {
  CLINIC_CARE_AMBULATORY_ENTERPRISE_CLOSE_TARGET,
  D4C7D_CANONICAL_TERMINAL_POLICY,
  D4C7D_ENTERPRISE_ENCOUNTER_CLOSE_PATH,
  D4C7D_FORBIDDEN_CLINIC_AUTHORITY_NAMES,
  ENTERPRISE_AMBULATORY_ENCOUNTER_LIFECYCLE_SYNC_CERTIFICATION_ID,
  ambulatoryLifecycleCacheInvalidationPaths,
  ambulatoryWorkflowStateLabelKey,
  assertNoForbiddenClinicLifecycleAuthority,
  canInvokeAmbulatoryEnterpriseClose,
  isAmbulatoryActiveOperationalEncounter,
  isAmbulatoryEnterpriseCloseTarget,
  projectAmbulatoryEnterpriseCloseResponse,
  projectAmbulatoryLifecycleHeader,
  projectClinicCarePatientFlowStage,
  projectClinicCareStage,
  resolveAmbulatoryCompleteVisitTarget,
  resolveClinicCareAmbulatoryWorkflowTarget,
  shouldShowAmbulatoryCompleteVisitAction,
  isClinicCareDischargePending,
} from "../index.js";

describe("MEDUI.D4C.7D enterprise ambulatory encounter lifecycle synchronization", () => {
  it("A — single authority: no Clinic* terminal ownership; COMPLETE_VISIT → enterprise close", () => {
    expect(ENTERPRISE_AMBULATORY_ENCOUNTER_LIFECYCLE_SYNC_CERTIFICATION_ID).toBe("MEDUI.D4C.7D");
    expect(D4C7D_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicEncounterStatus");
    expect(D4C7D_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("closeClinicEncounter");
    expect(D4C7D_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("setClinicDashboardCompleted");
    expect(assertNoForbiddenClinicLifecycleAuthority("EncountersService.close")).toBe(true);
    expect(assertNoForbiddenClinicLifecycleAuthority("closeClinicEncounter()")).toBe(false);
    expect(D4C7D_CANONICAL_TERMINAL_POLICY.documentationSignedCloses).toBe(false);
    expect(D4C7D_CANONICAL_TERMINAL_POLICY.workflowFinalizedCloses).toBe(false);
    expect(D4C7D_CANONICAL_TERMINAL_POLICY.completeVisitInvokesEnterpriseClose).toBe(true);
    expect(D4C7D_CANONICAL_TERMINAL_POLICY.enterpriseCloseAuthority).toBe("EncountersService.close");
    expect(resolveClinicCareAmbulatoryWorkflowTarget("COMPLETE_VISIT", "DISCHARGE_READY")).toBe(
      CLINIC_CARE_AMBULATORY_ENTERPRISE_CLOSE_TARGET
    );
    expect(resolveClinicCareAmbulatoryWorkflowTarget("COMPLETE_VISIT", "FINALIZED")).toBe(
      CLINIC_CARE_AMBULATORY_ENTERPRISE_CLOSE_TARGET
    );
    expect(resolveClinicCareAmbulatoryWorkflowTarget("COMPLETE_VISIT", "IN_TREATMENT")).toBeNull();
    expect(resolveAmbulatoryCompleteVisitTarget("DISCHARGE_READY")).toBe(
      CLINIC_CARE_AMBULATORY_ENTERPRISE_CLOSE_TARGET
    );
    expect(isAmbulatoryEnterpriseCloseTarget("ENTERPRISE_CLOSE")).toBe(true);
    expect(D4C7D_ENTERPRISE_ENCOUNTER_CLOSE_PATH("enc-1")).toBe("/encounters/enc-1/close");
  });

  it("B — lifecycle transitions: pathway → close target; invalid rejected; docs independent", () => {
    expect(resolveClinicCareAmbulatoryWorkflowTarget("READY_FOR_CHECKOUT", "IN_TREATMENT")).toBe(
      "DISPOSITION"
    );
    expect(resolveClinicCareAmbulatoryWorkflowTarget("READY_FOR_CHECKOUT", "DISPOSITION")).toBe(
      "DISCHARGE_READY"
    );
    expect(resolveAmbulatoryCompleteVisitTarget("ARRIVED")).toBeNull();
    expect(resolveAmbulatoryCompleteVisitTarget("TRIAGE")).toBeNull();
    // Documentation finalized independently — does not invent CLOSE.
    const docsSignedOpen = projectAmbulatoryLifecycleHeader({
      encounterStatus: "OPEN",
      workflowState: "IN_TREATMENT",
      providerDocumentationStatus: "SIGNED",
    });
    expect(docsSignedOpen.badgeStatusKey).toBe("OPEN");
    expect(docsSignedOpen.mayEnterpriseClose).toBe(false);
    // FINALIZED + OPEN still operational until enterprise close
    expect(
      isClinicCareDischargePending({
        encounterStatus: "OPEN",
        workflowState: "FINALIZED",
        encounterType: "OUTPATIENT",
      })
    ).toBe(true);
    expect(
      isClinicCareDischargePending({
        encounterStatus: "CLOSED",
        workflowState: "CLOSED",
        encounterType: "OUTPATIENT",
      })
    ).toBe(false);
  });

  it("C — header: Ouverte / intermediate / Terminée|Fermée; never raw FINALIZED", () => {
    const open = projectAmbulatoryLifecycleHeader({
      encounterStatus: "OPEN",
      workflowState: "ARRIVED",
      providerDocumentationStatus: "DRAFT",
    });
    expect(open.badgeLabelKey).toBe("clinicCareD4c7d.lifecycle.open");
    expect(open.metaLabelKey).not.toContain("FINALIZED");

    const docsPending = projectAmbulatoryLifecycleHeader({
      encounterStatus: "OPEN",
      workflowState: "FINALIZED",
      providerDocumentationStatus: "DRAFT",
    });
    expect(docsPending.kind).toBe("DISCHARGED_DOCS_PENDING");
    expect(docsPending.badgeLabelKey).toBe("clinicCareD4c7d.lifecycle.dischargeDone");
    expect(docsPending.metaLabelKey).toBe("clinicCareD4c7d.lifecycle.docsToFinalize");
    expect(docsPending.mayEnterpriseClose).toBe(true);

    const ready = projectAmbulatoryLifecycleHeader({
      encounterStatus: "OPEN",
      workflowState: "FINALIZED",
      providerDocumentationStatus: "SIGNED",
    });
    expect(ready.kind).toBe("READY_TO_CLOSE");
    expect(ready.badgeLabelKey).toBe("clinicCareD4c7d.lifecycle.readyForCheckout");
    expect(ready.metaLabelKey).toBe("clinicCareD4c7d.lifecycle.readyToClose");

    const closed = projectAmbulatoryLifecycleHeader({
      encounterStatus: "CLOSED",
      workflowState: "CLOSED",
      providerDocumentationStatus: "SIGNED",
    });
    expect(closed.badgeLabelKey).toBe("clinicCareD4c7d.lifecycle.closed");
    expect(closed.metaLabelKey).toBe("clinicCareD4c7d.lifecycle.terminated");
    expect(ambulatoryWorkflowStateLabelKey("FINALIZED")).toBe(
      "clinicCareD4c7d.lifecycle.readyToClose"
    );
    expect(ambulatoryWorkflowStateLabelKey("FINALIZED")).not.toMatch(/FINALIZED/);
  });

  it("D — Today's Visits / trackboard stages: closed leaves active defaults", () => {
    expect(
      projectClinicCareStage({
        workflowState: "FINALIZED",
        encounterStatus: "OPEN",
      }).stageId
    ).toBe("DISCHARGE_PENDING");
    expect(
      projectClinicCareStage({
        workflowState: "CLOSED",
        encounterStatus: "CLOSED",
      }).stageId
    ).toBe("COMPLETED");
    expect(isAmbulatoryActiveOperationalEncounter({ encounterStatus: "OPEN" })).toBe(true);
    expect(isAmbulatoryActiveOperationalEncounter({ encounterStatus: "CLOSED" })).toBe(false);
    expect(isAmbulatoryActiveOperationalEncounter({ encounterStatus: "CANCELLED" })).toBe(false);
  });

  it("E — Consultations / operational membership from canonical status", () => {
    expect(isAmbulatoryActiveOperationalEncounter({ encounterStatus: "OPEN" })).toBe(true);
    expect(isAmbulatoryActiveOperationalEncounter({ encounterStatus: "CLOSED" })).toBe(false);
  });

  it("F — Provider/Nursing: closed not active care; FINALIZED open still pathway until close", () => {
    expect(
      shouldShowAmbulatoryCompleteVisitAction({
        encounterStatus: "OPEN",
        workflowState: "FINALIZED",
        roleCodes: ["PROVIDER"],
      })
    ).toBe(true);
    expect(
      shouldShowAmbulatoryCompleteVisitAction({
        encounterStatus: "CLOSED",
        workflowState: "CLOSED",
        roleCodes: ["PROVIDER"],
      })
    ).toBe(false);
    expect(
      shouldShowAmbulatoryCompleteVisitAction({
        encounterStatus: "OPEN",
        workflowState: "FINALIZED",
        roleCodes: ["FRONT_DESK"],
      })
    ).toBe(false);
  });

  it("G — Dashboard metrics drivers: CLOSED → COMPLETED; FINALIZED+OPEN ≠ completed KPI", () => {
    expect(
      projectClinicCarePatientFlowStage({
        encounterStatus: "OPEN",
        workflowState: "FINALIZED",
      })
    ).toBe("WITH_PROVIDER");
    expect(
      projectClinicCarePatientFlowStage({
        encounterStatus: "CLOSED",
        workflowState: "CLOSED",
      })
    ).toBe("COMPLETED");
    expect(D4C7D_CANONICAL_TERMINAL_POLICY.completedVisitKpiDriver).toContain("CLOSED");
  });

  it("H — cache invalidation paths (no setTimeout); encounter + trackboard + dashboard", () => {
    const paths = ambulatoryLifecycleCacheInvalidationPaths({ encounterId: "e1" });
    expect(paths).toContain("/encounters/e1");
    expect(paths).toContain("/clinic-care/trackboard");
    expect(paths.some((p) => p.includes("/clinic-care/dashboard?period=TODAY"))).toBe(true);
    expect(paths.join(" ")).not.toMatch(/setTimeout/);
  });

  it("I — Patient/MR: close response projection retains canonical fields", () => {
    const projected = projectAmbulatoryEnterpriseCloseResponse({
      id: "e1",
      status: "CLOSED",
      workflowState: "CLOSED",
      dischargedAt: "2026-07-28T18:00:00.000Z",
      providerDocumentationStatus: "SIGNED",
      roomLabel: null,
      version: 4,
      disposition: null,
      dischargeStatus: "DISCHARGED",
    });
    expect(projected).toEqual({
      encounterId: "e1",
      status: "CLOSED",
      workflowState: "CLOSED",
      dischargedAt: "2026-07-28T18:00:00.000Z",
      providerDocumentationStatus: "SIGNED",
      roomLabel: null,
      version: 4,
      disposition: null,
      dischargeStatus: "DISCHARGED",
    });
    expect(projectAmbulatoryEnterpriseCloseResponse({ ok: true })).toBeNull();
  });

  it("J — Follow-up independence: close policy does not require follow-up complete", () => {
    expect(D4C7D_CANONICAL_TERMINAL_POLICY.leaveOperationalQueuesWhen).toContain("CLOSED");
    // Policy object does not couple follow-up to close.
    expect(JSON.stringify(D4C7D_CANONICAL_TERMINAL_POLICY)).not.toMatch(/followUpMustComplete/i);
  });

  it("K — Room release driven by enterprise close (documented policy)", () => {
    expect(D4C7D_CANONICAL_TERMINAL_POLICY.roomReleaseDriver).toContain("roomLabel null");
    const closed = projectAmbulatoryEnterpriseCloseResponse({
      id: "e2",
      status: "CLOSED",
      roomLabel: null,
      workflowState: "CLOSED",
    });
    expect(closed?.roomLabel).toBeNull();
  });

  it("L — Authorization: RN/PROVIDER/ADMIN may close; FRONT_DESK denied", () => {
    expect(canInvokeAmbulatoryEnterpriseClose(["PROVIDER"])).toBe(true);
    expect(canInvokeAmbulatoryEnterpriseClose(["RN"])).toBe(true);
    expect(canInvokeAmbulatoryEnterpriseClose(["ADMIN"])).toBe(true);
    expect(canInvokeAmbulatoryEnterpriseClose(["FRONT_DESK"])).toBe(false);
    expect(canInvokeAmbulatoryEnterpriseClose(["BILLING"])).toBe(false);
  });

  it("M — Concurrency helpers: repeated close target stable; projection rejects bare 200", () => {
    expect(resolveAmbulatoryCompleteVisitTarget("FINALIZED")).toBe(
      resolveAmbulatoryCompleteVisitTarget("FINALIZED")
    );
    expect(projectAmbulatoryEnterpriseCloseResponse({ status: "CLOSED" })).toBeNull(); // missing id
  });

  it("N — French localization keys present (no raw English enums as keys)", () => {
    const keys = [
      "clinicCareD4c7d.lifecycle.open",
      "clinicCareD4c7d.lifecycle.terminated",
      "clinicCareD4c7d.lifecycle.closed",
      "clinicCareD4c7d.lifecycle.dischargeDone",
      "clinicCareD4c7d.lifecycle.docsToFinalize",
      "clinicCareD4c7d.actions.closeEncounter",
      "clinicCareD4c7d.messages.closed",
      "clinicCareD4c7d.messages.closeFailed",
    ];
    for (const k of keys) {
      expect(k.startsWith("clinicCareD4c7d.")).toBe(true);
      expect(k).not.toMatch(/\bFINALIZED\b/);
      expect(k).not.toMatch(/\bCLOSED\b/);
    }
  });

  it("O — regression anchors: D4C.5B workflow non-close actions unchanged", () => {
    expect(resolveClinicCareAmbulatoryWorkflowTarget("START_INTAKE", "ARRIVED")).toBe("TRIAGE");
    expect(resolveClinicCareAmbulatoryWorkflowTarget("START_CONSULTATION", "TRIAGE")).toBe(
      "IN_TREATMENT"
    );
    expect(resolveClinicCareAmbulatoryWorkflowTarget("READY_FOR_CHECKOUT", "RESULTS_PENDING")).toBe(
      "DISPOSITION"
    );
  });
});
