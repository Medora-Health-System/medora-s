import { describe, expect, it } from "vitest";
import {
  D4C7J_ACKNOWLEDGEMENT_REASON,
  D4C7J_ACKNOWLEDGEMENT_VERSION,
  D4C7J_ADVISORY_CATEGORIES,
  D4C7J_CERTIFICATION_ID,
  D4C7J_CLIENT_STATES,
  D4C7J_CLOSE_CODES,
  D4C7J_PRIORITY_CATEGORIES,
  EMPTY_D4C7J_PENDING_SUMMARY,
  assertNoForbiddenD4c7jCloseAuthority,
  buildD4c7jCloseAuditMetadata,
  canAcknowledgeD4c7jClosure,
  classifyD4c7jClosureAdvisory,
  isD4c7jSupportOverrideOnly,
  projectD4c7jClosePreflight,
  projectD4c7jCloseResult,
  resolveD4c7jAcknowledgement,
  totalD4c7jPending,
} from "./enterpriseEncounterClosureAdvisoryOverrideD4c7j.js";

describe("enterpriseEncounterClosureAdvisoryOverrideD4c7j (MEDUI.D4C.7J)", () => {
  it("contract identity — certification id, ack version, typed codes", () => {
    expect(D4C7J_CERTIFICATION_ID).toBe("MEDUI.D4C.7J");
    expect(D4C7J_ACKNOWLEDGEMENT_VERSION).toBe("d4c7j.v1");
    expect(D4C7J_ACKNOWLEDGEMENT_REASON).toBe("PROVIDER_ELECTED_TO_CLOSE");
    expect(D4C7J_CLOSE_CODES.PENDING_CLINICAL_ITEMS).toBe("ENCOUNTER_PENDING_CLINICAL_ITEMS");
    expect(D4C7J_CLOSE_CODES.UNAUTHORIZED).toBe("ENCOUNTER_CLOSE_UNAUTHORIZED");
    expect(D4C7J_CLOSE_CODES.FACILITY_MISMATCH).toBe("ENCOUNTER_CLOSE_FACILITY_MISMATCH");
    expect(D4C7J_CLOSE_CODES.STALE_VERSION).toBe("ENCOUNTER_CLOSE_STALE_VERSION");
    expect(D4C7J_CLOSE_CODES.TRANSACTION_FAILED).toBe("ENCOUNTER_CLOSE_TRANSACTION_FAILED");
    expect(D4C7J_CLOSE_CODES.INVALID_STATE).toBe("ENCOUNTER_CLOSE_INVALID_STATE");
  });

  it("no pending work — acknowledgement is not required", () => {
    const c = classifyD4c7jClosureAdvisory({});
    expect(c.pendingTotal).toBe(0);
    expect(c.requiresAcknowledgement).toBe(false);
    expect(c.advisoryCategories).toEqual([]);
    expect(c.priorityCategories).toEqual([]);
    expect(c.clinicalBlockers).toEqual([]);
  });

  it("pending laboratory / imaging / medication / procedure / result / follow-up are advisory", () => {
    const c = classifyD4c7jClosureAdvisory({
      pendingSummary: {
        laboratory: 1,
        imaging: 2,
        medications: 2,
        procedures: 1,
        results: 1,
        unacknowledgedResults: 1,
        followUps: 1,
        referrals: 1,
      },
    });
    expect(c.pendingTotal).toBe(10);
    expect(c.requiresAcknowledgement).toBe(true);
    expect(c.advisoryCategories).toEqual([
      "laboratory",
      "imaging",
      "medications",
      "procedures",
      "results",
      "unacknowledgedResults",
      "followUps",
      "referrals",
    ]);
    expect(c.clinicalBlockers).toEqual([]);
  });

  it("active infusion becomes a priority advisory, never a hard blocker", () => {
    const c = classifyD4c7jClosureAdvisory({ blockerCodes: ["ACTIVE_INFUSION_RUNNING"] });
    expect(c.priorityCategories).toEqual(["activeInfusion"]);
    expect(c.requiresAcknowledgement).toBe(true);
    expect(c.clinicalBlockers).toEqual([]);
  });

  it("critical result becomes a priority advisory", () => {
    const c = classifyD4c7jClosureAdvisory({ blockerCodes: ["CRITICAL_RESULT_UNACKNOWLEDGED"] });
    expect(c.priorityCategories).toEqual(["criticalResult"]);
    expect(c.requiresAcknowledgement).toBe(true);
  });

  it("unsigned provider documentation is an advisory documentation item (not a blocker)", () => {
    const c = classifyD4c7jClosureAdvisory({ blockerCodes: ["PROVIDER_DOCUMENTATION_UNSIGNED"] });
    expect(c.pendingSummary.documentation).toBe(1);
    expect(c.advisoryCategories).toEqual(["documentation"]);
    expect(c.priorityCategories).toEqual([]);
  });

  it("documentation deficiency count folds into the documentation category", () => {
    const c = classifyD4c7jClosureAdvisory({ documentationDeficiencyCount: 3 });
    expect(c.pendingSummary.documentation).toBe(3);
    expect(c.requiresAcknowledgement).toBe(true);
  });

  it("combined pending items and priority categories classify together", () => {
    const c = classifyD4c7jClosureAdvisory({
      pendingSummary: { medications: 2, results: 1, followUps: 1 },
      blockerCodes: ["ACTIVE_INFUSION_RUNNING", "PROVIDER_DOCUMENTATION_UNSIGNED"],
      documentationDeficiencyCount: 2,
    });
    expect(c.pendingSummary.medications).toBe(2);
    expect(c.pendingSummary.documentation).toBe(2);
    expect(c.priorityCategories).toEqual(["activeInfusion"]);
    expect(c.requiresAcknowledgement).toBe(true);
    expect(totalD4c7jPending(c.pendingSummary)).toBe(6);
  });

  it("negative / non-finite counts are normalized to zero", () => {
    const c = classifyD4c7jClosureAdvisory({
      pendingSummary: { medications: -4, results: Number.NaN, laboratory: 2.7 },
    });
    expect(c.pendingSummary.medications).toBe(0);
    expect(c.pendingSummary.results).toBe(0);
    expect(c.pendingSummary.laboratory).toBe(2);
  });

  it("role matrix — treating provider aliases and RN may acknowledge", () => {
    expect(canAcknowledgeD4c7jClosure(["PROVIDER"])).toBe(true);
    expect(canAcknowledgeD4c7jClosure(["physician"])).toBe(true);
    expect(canAcknowledgeD4c7jClosure(["MD"])).toBe(true);
    expect(canAcknowledgeD4c7jClosure(["RN"])).toBe(true);
    expect(canAcknowledgeD4c7jClosure(["MEDORA_SUPER_ADMIN"])).toBe(true);
  });

  it("role matrix — non-treating roles may not acknowledge", () => {
    /** MEDUI.D4C.7K — Facility ADMIN may acknowledge advisory close. */
    expect(canAcknowledgeD4c7jClosure(["ADMIN"])).toBe(true);
    expect(canAcknowledgeD4c7jClosure(["PHARMACY"])).toBe(false);
    expect(canAcknowledgeD4c7jClosure(["BILLING"])).toBe(false);
    expect(canAcknowledgeD4c7jClosure(["FRONT_DESK"])).toBe(false);
    expect(canAcknowledgeD4c7jClosure(["LAB"])).toBe(false);
    expect(canAcknowledgeD4c7jClosure(["RADIOLOGY"])).toBe(false);
    expect(canAcknowledgeD4c7jClosure(["PATIENT_CARE_TECH"])).toBe(false);
    expect(canAcknowledgeD4c7jClosure(["MA"])).toBe(false);
    expect(canAcknowledgeD4c7jClosure([])).toBe(false);
    expect(canAcknowledgeD4c7jClosure(null)).toBe(false);
  });

  it("super-admin-only acknowledgement is flagged as support policy", () => {
    expect(isD4c7jSupportOverrideOnly(["MEDORA_SUPER_ADMIN"])).toBe(true);
    expect(isD4c7jSupportOverrideOnly(["MEDORA_SUPER_ADMIN", "PROVIDER"])).toBe(false);
    expect(isD4c7jSupportOverrideOnly(["PROVIDER"])).toBe(false);
  });

  it("acknowledgement resolution — D4C.7J field, legacy aliases, and absence", () => {
    const a = resolveD4c7jAcknowledgement({ acknowledgePendingClinicalItems: true });
    expect(a.acknowledged).toBe(true);
    expect(a.source).toBe("d4c7j");
    expect(a.acknowledgementVersion).toBe(D4C7J_ACKNOWLEDGEMENT_VERSION);
    expect(a.acknowledgementReason).toBe(D4C7J_ACKNOWLEDGEMENT_REASON);

    expect(resolveD4c7jAcknowledgement({ acknowledgePendingItems: true }).source).toBe("d4c7f");
    expect(resolveD4c7jAcknowledgement({ acknowledgeDispositionSafety: true }).source).toBe(
      "dispositionSafety"
    );

    const none = resolveD4c7jAcknowledgement({});
    expect(none.acknowledged).toBe(false);
    expect(none.source).toBe("none");
    expect(resolveD4c7jAcknowledgement(undefined).acknowledged).toBe(false);
  });

  it("acknowledgement carries client request id and custom reason", () => {
    const a = resolveD4c7jAcknowledgement({
      acknowledgePendingClinicalItems: true,
      acknowledgementReason: "Patient parti — suivi organisé",
      clientRequestId: "req-42",
      acknowledgementVersion: "d4c7j.v1",
    });
    expect(a.clientRequestId).toBe("req-42");
    expect(a.acknowledgementReason).toBe("Patient parti — suivi organisé");
  });

  it("preflight projection exposes no clinical blockers and states post-ack capability", () => {
    const classification = classifyD4c7jClosureAdvisory({
      pendingSummary: { medications: 2 },
      blockerCodes: ["ACTIVE_INFUSION_RUNNING"],
    });
    const provider = projectD4c7jClosePreflight({
      encounterId: "enc-1",
      currentStatus: "OPEN",
      classification,
      roleCodes: ["PROVIDER"],
    });
    expect(provider.requiresAcknowledgement).toBe(true);
    expect(provider.canCloseAfterAcknowledgement).toBe(true);
    expect(provider.acknowledgementVersion).toBe(D4C7J_ACKNOWLEDGEMENT_VERSION);
    expect(provider.clinicalBlockers).toEqual([]);
    expect(provider.pending.medications).toBe(2);
    expect(provider.priorityCategories).toEqual(["activeInfusion"]);

    const billing = projectD4c7jClosePreflight({
      encounterId: "enc-1",
      currentStatus: "OPEN",
      classification,
      roleCodes: ["BILLING"],
    });
    expect(billing.canCloseAfterAcknowledgement).toBe(false);
  });

  it("close result projection preserves pending items and marks idempotency", () => {
    const closed = projectD4c7jCloseResult({
      encounterId: "enc-1",
      previousStatus: "OPEN",
      closedAt: new Date("2026-07-29T12:00:00.000Z"),
      closedByUserId: "user-1",
      pendingSummary: { medications: 2, results: 1, followUps: 1 },
      priorityCategories: ["activeInfusion"],
      acknowledged: true,
      acknowledgementVersion: D4C7J_ACKNOWLEDGEMENT_VERSION,
      updatedAt: new Date("2026-07-29T12:00:00.000Z"),
      version: 5,
    });
    expect(closed.status).toBe("CLOSED");
    expect(closed.pendingClinicalItemsPreserved).toBe(true);
    expect(closed.pendingSummary.medications).toBe(2);
    expect(closed.idempotent).toBe(false);
    expect(closed.closedAt).toBe("2026-07-29T12:00:00.000Z");
    expect(closed.version).toBe(5);

    const already = projectD4c7jCloseResult({
      encounterId: "enc-1",
      previousStatus: "CLOSED",
      idempotent: true,
    });
    expect(already.idempotent).toBe(true);
    expect(already.status).toBe("CLOSED");
    expect(already.pendingSummary).toEqual(EMPTY_D4C7J_PENDING_SUMMARY);
  });

  it("audit metadata is PHI-safe and records the acknowledgement once", () => {
    const classification = classifyD4c7jClosureAdvisory({
      pendingSummary: { medications: 2 },
      blockerCodes: ["ACTIVE_INFUSION_RUNNING"],
    });
    const meta = buildD4c7jCloseAuditMetadata({
      previousStatus: "OPEN",
      classification,
      acknowledgement: resolveD4c7jAcknowledgement({
        acknowledgePendingClinicalItems: true,
        clientRequestId: "req-7",
      }),
      actorRoleCodes: ["PROVIDER"],
      pendingItemIds: ["item-1", "item-2"],
      workflowStateBeforeClose: "IN_TREATMENT",
    });
    expect(meta.previousStatus).toBe("OPEN");
    expect(meta.newStatus).toBe("CLOSED");
    expect(meta.advisoryAcknowledged).toBe(true);
    expect(meta.pendingItemsOverride).toBe(true);
    expect(meta.acknowledgementVersion).toBe(D4C7J_ACKNOWLEDGEMENT_VERSION);
    expect(meta.priorityWarningCategories).toEqual(["activeInfusion"]);
    expect(meta.clientRequestId).toBe("req-7");
    expect(meta.pendingItemIds).toEqual(["item-1", "item-2"]);
    expect(JSON.stringify(meta)).not.toMatch(/perfusion|patient/i);
  });

  it("audit metadata omits acknowledgement fields when closing without pending work", () => {
    const meta = buildD4c7jCloseAuditMetadata({
      previousStatus: "OPEN",
      classification: classifyD4c7jClosureAdvisory({}),
      acknowledgement: resolveD4c7jAcknowledgement({}),
      actorRoleCodes: ["PROVIDER"],
    });
    expect(meta.advisoryAcknowledged).toBeUndefined();
    expect(meta.pendingItemsOverride).toBeUndefined();
  });

  it("client state machine states are explicit", () => {
    expect(D4C7J_CLIENT_STATES).toEqual([
      "IDLE",
      "PREFLIGHT_LOADING",
      "AWAITING_ACKNOWLEDGEMENT",
      "CLOSING",
      "CLOSED",
      "ERROR",
    ]);
  });

  it("architecture guard — no duplicate Clinic-only close authority", () => {
    expect(assertNoForbiddenD4c7jCloseAuthority("EncountersService.close")).toBe(true);
    expect(assertNoForbiddenD4c7jCloseAuthority("closeClinicEncounter")).toBe(false);
    expect(assertNoForbiddenD4c7jCloseAuthority("ClinicEncounterCloseController")).toBe(false);
    expect(assertNoForbiddenD4c7jCloseAuthority("DentalEncounterCloseService")).toBe(false);
  });

  it("category registries stay aligned with the empty summary shape", () => {
    expect(Object.keys(EMPTY_D4C7J_PENDING_SUMMARY).sort()).toEqual(
      [...D4C7J_ADVISORY_CATEGORIES].sort()
    );
    expect(D4C7J_PRIORITY_CATEGORIES).toContain("activeInfusion");
    expect(D4C7J_PRIORITY_CATEGORIES).toContain("criticalResult");
  });
});
