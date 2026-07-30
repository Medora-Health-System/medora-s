/**
 * MEDUI.D4C.7J — web guards for the encounter closure advisory override:
 * state machine, acknowledgement modal, single-request behavior, French localization.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  D4C7J_ACKNOWLEDGEMENT_VERSION,
  D4C7J_CLOSE_CODES,
  EMPTY_D4C7J_PENDING_SUMMARY,
} from "@medora/shared";
import {
  INITIAL_D4C7J_CLOSURE_STATE,
  canConfirmD4c7jClose,
  canDispatchD4c7jClose,
  classifyD4c7jCloseError,
  d4c7jCloseErrorMessageKey,
  d4c7jClosureReducer,
  d4c7jVisiblePendingRows,
  type D4c7jClosureEvent,
  type D4c7jClosureState,
} from "./clinicCareClosureAdvisoryStateMachineD4c7j";
import frMessages from "../../i18n/messages/fr";
import enMessages from "../../i18n/messages/en";

const clinicCareDir = join(__dirname);

function readClinic(name: string): string {
  return readFileSync(join(clinicCareDir, name), "utf8");
}

function run(events: D4c7jClosureEvent[], from: D4c7jClosureState = INITIAL_D4C7J_CLOSURE_STATE) {
  return events.reduce(d4c7jClosureReducer, from);
}

const advisoryError = {
  status: 409,
  errorCode: D4C7J_CLOSE_CODES.PENDING_CLINICAL_ITEMS,
  body: {
    code: D4C7J_CLOSE_CODES.PENDING_CLINICAL_ITEMS,
    preflight: {
      pending: { ...EMPTY_D4C7J_PENDING_SUMMARY, medications: 2, followUps: 1 },
      priorityCategories: ["activeInfusion"],
      canCloseAfterAcknowledgement: true,
    },
  },
};

describe("MEDUI.D4C.7J closure state machine", () => {
  it("A — advisory response moves to AWAITING_ACKNOWLEDGEMENT with counts", () => {
    const classified = classifyD4c7jCloseError(advisoryError);
    expect(classified.kind).toBe("advisory");
    expect(classified.pending.medications).toBe(2);
    expect(classified.priorityCategories).toEqual(["activeInfusion"]);

    const state = run([
      { type: "CLOSE_REQUESTED", clientRequestId: "req-1" },
      {
        type: "ADVISORY_RECEIVED",
        pending: classified.pending,
        priorityCategories: classified.priorityCategories,
        canCloseAfterAcknowledgement: true,
      },
    ]);
    expect(state.phase).toBe("AWAITING_ACKNOWLEDGEMENT");
    expect(state.pending.medications).toBe(2);
    expect(state.pending.followUps).toBe(1);
    expect(state.closeRequestCount).toBe(1);
  });

  it("A — acknowledgement starts unchecked and gates the confirm action", () => {
    const opened = run([
      { type: "CLOSE_REQUESTED" },
      { type: "ADVISORY_RECEIVED", pending: { medications: 2 }, canCloseAfterAcknowledgement: true },
    ]);
    expect(opened.acknowledged).toBe(false);
    expect(canConfirmD4c7jClose(opened)).toBe(false);

    const acked = d4c7jClosureReducer(opened, { type: "ACKNOWLEDGEMENT_CHANGED", acknowledged: true });
    expect(canConfirmD4c7jClose(acked)).toBe(true);
  });

  it("A — unauthorized role cannot confirm even after checking the box", () => {
    const opened = run([
      { type: "CLOSE_REQUESTED" },
      { type: "ADVISORY_RECEIVED", pending: { medications: 1 }, canCloseAfterAcknowledgement: false },
      { type: "ACKNOWLEDGEMENT_CHANGED", acknowledged: true },
    ]);
    expect(canConfirmD4c7jClose(opened)).toBe(false);
    expect(d4c7jClosureReducer(opened, { type: "CONFIRM_CLOSE" }).phase).toBe(
      "AWAITING_ACKNOWLEDGEMENT"
    );
  });

  it("B — one confirmation produces exactly one close mutation", () => {
    const state = run([
      { type: "CLOSE_REQUESTED" },
      { type: "ADVISORY_RECEIVED", pending: { medications: 2 }, canCloseAfterAcknowledgement: true },
      { type: "ACKNOWLEDGEMENT_CHANGED", acknowledged: true },
      { type: "CONFIRM_CLOSE" },
      { type: "CONFIRM_CLOSE" },
      { type: "CONFIRM_CLOSE" },
    ]);
    expect(state.phase).toBe("CLOSING");
    expect(state.closeRequestCount).toBe(2); // initial close + one acknowledged close
  });

  it("B — double-click on the close button dispatches a single request", () => {
    const state = run([{ type: "CLOSE_REQUESTED" }, { type: "CLOSE_REQUESTED" }]);
    expect(state.closeRequestCount).toBe(1);
    expect(canDispatchD4c7jClose(state)).toBe(false);
  });

  it("B — an advisory response never auto-retries the close", () => {
    const state = run([
      { type: "CLOSE_REQUESTED" },
      { type: "ADVISORY_RECEIVED", pending: { medications: 2 }, canCloseAfterAcknowledgement: true },
    ]);
    expect(state.closeRequestCount).toBe(1);
    expect(canDispatchD4c7jClose(state)).toBe(false);
  });

  it("C — success is terminal and ignores further events", () => {
    const closed = run([
      { type: "CLOSE_REQUESTED" },
      { type: "CLOSE_SUCCEEDED" },
      { type: "CLOSE_REQUESTED" },
      { type: "CONFIRM_CLOSE" },
    ]);
    expect(closed.phase).toBe("CLOSED");
    expect(closed.closeRequestCount).toBe(1);
  });

  it("D — technical failure allows exactly one deliberate retry", () => {
    const failed = run([
      { type: "CLOSE_REQUESTED" },
      { type: "CLOSE_FAILED", kind: "technical", message: null },
    ]);
    expect(failed.phase).toBe("ERROR");
    expect(canDispatchD4c7jClose(failed)).toBe(true);

    const retried = d4c7jClosureReducer(failed, { type: "RETRY" });
    expect(retried.phase).toBe("IDLE");
  });

  it("D — cancel and return-to-chart reset without submitting", () => {
    const opened = run([
      { type: "CLOSE_REQUESTED" },
      { type: "ADVISORY_RECEIVED", pending: { medications: 2 }, canCloseAfterAcknowledgement: true },
      { type: "ACKNOWLEDGEMENT_CHANGED", acknowledged: true },
    ]);
    const dismissed = d4c7jClosureReducer(opened, { type: "DISMISSED" });
    expect(dismissed.phase).toBe("IDLE");
    expect(dismissed.acknowledged).toBe(false);
    expect(dismissed.closeRequestCount).toBe(1);
  });

  it("D — dismiss is ignored while a close mutation is in flight", () => {
    const closing = run([{ type: "CLOSE_REQUESTED" }]);
    expect(d4c7jClosureReducer(closing, { type: "DISMISSED" }).phase).toBe("CLOSING");
  });

  it("D — error classification maps technical, unauthorized, and stale states", () => {
    expect(classifyD4c7jCloseError({ status: 403 }).kind).toBe("unauthorized");
    expect(
      classifyD4c7jCloseError({ errorCode: D4C7J_CLOSE_CODES.UNAUTHORIZED }).kind
    ).toBe("unauthorized");
    expect(classifyD4c7jCloseError({ status: 409 }).kind).toBe("stale");
    expect(
      classifyD4c7jCloseError({ errorCode: D4C7J_CLOSE_CODES.STALE_VERSION }).kind
    ).toBe("stale");
    expect(classifyD4c7jCloseError({ status: 500 }).kind).toBe("technical");
    expect(classifyD4c7jCloseError(null).kind).toBe("technical");
  });

  it("D — legacy D4C.7F advisory body still opens the modal", () => {
    const classified = classifyD4c7jCloseError({
      errorCode: D4C7J_CLOSE_CODES.PENDING_CLINICAL_ITEMS,
      body: {
        code: D4C7J_CLOSE_CODES.PENDING_CLINICAL_ITEMS,
        pending: { medications: 3 },
        overrideAllowed: true,
      },
    });
    expect(classified.kind).toBe("advisory");
    expect(classified.pending.medications).toBe(3);
    expect(classified.canCloseAfterAcknowledgement).toBe(true);
  });

  it("A — only non-zero categories are rendered", () => {
    const rows = d4c7jVisiblePendingRows({
      ...EMPTY_D4C7J_PENDING_SUMMARY,
      medications: 2,
      followUps: 1,
    });
    expect(rows).toEqual([
      { category: "medications", count: 2 },
      { category: "followUps", count: 1 },
    ]);
  });
});

describe("MEDUI.D4C.7J web source guards", () => {
  it("close path sends the acknowledgement contract and no blind retry", () => {
    const view = readClinic("ClinicCareActiveAmbulatoryWorkspaceView.tsx");
    expect(view).toContain("acknowledgePendingClinicalItems: true");
    expect(view).toContain("D4C7J_ACKNOWLEDGEMENT_VERSION");
    expect(view).toContain("clientRequestId");
    expect(view).toContain("canDispatchD4c7jClose");
    // The production defect: a second close POST with a different ack body.
    expect(view).not.toContain("acknowledgeDeficiencies: needsDocAck");
    expect(view).not.toContain("needsSafetyAck");
    expect(D4C7J_ACKNOWLEDGEMENT_VERSION).toBe("d4c7j.v1");
  });

  it("modal renders priority attention, required checkbox, and three actions", () => {
    const modal = readClinic("ClinicCareAmbulatoryClosurePendingModal.tsx");
    expect(modal).toContain("clinicCareD4c7j.closure.priorityTitle");
    expect(modal).toContain("clinicCareD4c7j.closure.acknowledgement");
    expect(modal).toContain("clinicCareD4c7j.closure.returnToChart");
    expect(modal).toContain("clinicCareD4c7j.closure.cancel");
    expect(modal).toContain("clinicCareD4c7j.closure.confirmClose");
    expect(modal).toContain("disabled={closing || !canCloseAfterAcknowledgement || !acknowledged}");
    // Acknowledgement is sufficient — no "close despite" framing.
    expect(modal).not.toContain("confirmDespite");
  });

  it("no duplicate close authority is introduced on the web side", () => {
    const view = readClinic("ClinicCareActiveAmbulatoryWorkspaceView.tsx");
    expect(view).toContain("closeAmbulatoryEncounterViaEnterprise");
    expect(view).not.toContain("closeClinicEncounter");
  });
});

describe("MEDUI.D4C.7J localization", () => {
  const fr = (frMessages as Record<string, any>).clinicCareD4c7j;
  const en = (enMessages as Record<string, any>).clinicCareD4c7j;

  it("French advisory strings are present and complete", () => {
    expect(fr.closure.pendingTitle).toBe("Des éléments cliniques sont encore en attente");
    expect(fr.closure.canCloseAfterConfirmation).toBe(
      "Cette rencontre peut être clôturée après confirmation."
    );
    expect(fr.closure.preserveWarning).toBe("La clôture ne supprimera ni n’annulera ces éléments.");
    expect(fr.closure.acknowledgement).toBe(
      "J’ai pris connaissance des éléments en attente et je souhaite clôturer cette rencontre."
    );
    expect(fr.closure.priorityTitle).toBe("Attention prioritaire");
    expect(fr.closure.counts.medications).toBe("Médicaments non administrés");
    expect(fr.closure.counts.unacknowledgedResults).toBe("Résultats non reconnus");
    expect(fr.closure.counts.documentation).toBe("Documentation en attente");
    expect(fr.closure.priority.activeInfusion).toBe("Perfusion encore active");
    expect(fr.closure.priority.criticalResult).toBe("Résultat critique non reconnu");
    expect(fr.closure.closing).toBe("Clôture de la rencontre en cours…");
    expect(fr.success.closed).toBe("Rencontre clôturée");
    expect(fr.errors.staleState).toBe("L’état de la rencontre a changé. Les données ont été actualisées.");
    expect(fr.errors.unauthorized).toBe("Vous n’êtes pas autorisé à clôturer cette rencontre.");
    expect(fr.errors.technical).toBe(
      "Impossible de clôturer la rencontre en raison d’un problème technique."
    );
    expect(fr.errors.retry).toBe("Réessayer");
    expect(fr.closure.priorityReasonLabel).toBe("Motif de la clôture avec éléments prioritaires");
  });

  it("no raw enum values or error codes leak into French copy", () => {
    const serialized = JSON.stringify(fr);
    expect(serialized).not.toContain("ENCOUNTER_");
    expect(serialized).not.toContain("Bad Request");
    expect(serialized).not.toContain("[object Object]");
    expect(serialized).not.toMatch(/[A-Z]{3,}_[A-Z]{3,}/);
  });

  it("English mirrors every French key", () => {
    const keys = (obj: unknown, prefix = ""): string[] => {
      if (!obj || typeof obj !== "object") return [prefix];
      return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
        keys(v, prefix ? `${prefix}.${k}` : k)
      );
    };
    expect(keys(en).sort()).toEqual(keys(fr).sort());
  });

  it("error message keys resolve to existing French copy", () => {
    for (const kind of ["unauthorized", "stale", "technical", "advisory"] as const) {
      const key = d4c7jCloseErrorMessageKey(kind);
      const value = key
        .split(".")
        .reduce<any>((acc, part) => (acc == null ? acc : acc[part]), frMessages as any);
      expect(typeof value).toBe("string");
      expect(String(value).length).toBeGreaterThan(0);
    }
  });
});
