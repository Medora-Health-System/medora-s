/**
 * MEDUI.INP.2B.2A — Serialized Nursing Admission section-save coordinator.
 * At most one admission mutation in flight. Optimistic concurrency (expectedVersion) stays intact.
 */

export type NursingAdmissionSaveKind = "SECTION" | "VERIFY";

export type NursingAdmissionPersistMode = "DRAFT" | "CONTINUE" | "EXPLICIT";

export type NursingAdmissionSaveResult = {
  ok: boolean;
  conflict?: boolean;
  expectedVersion?: number;
};

type Waiter = (result: NursingAdmissionSaveResult) => void;

export function answersChangedDuringFlight(
  localAnswers: Record<string, unknown>,
  savedAnswers: Record<string, unknown> | null | undefined
): boolean {
  return JSON.stringify(localAnswers ?? {}) !== JSON.stringify(savedAnswers ?? {});
}

export function createNursingAdmissionSaveCoordinator(hooks: {
  isWriteBlocked: () => boolean;
  getExpectedVersion: () => number;
  setExpectedVersion: (next: number) => void;
  runSectionSave: () => Promise<{
    ok: boolean;
    conflict?: boolean;
    expectedVersion?: number;
    savedAnswers?: Record<string, unknown> | null;
  }>;
  localAnswers: () => Record<string, unknown>;
  runVerify: (itemId: string, status: string) => Promise<{
    ok: boolean;
    conflict?: boolean;
    expectedVersion?: number;
  }>;
}) {
  let inFlight = false;
  let queuedSection = false;
  const sectionWaiters: Waiter[] = [];
  const verifyQueue: Array<{ itemId: string; status: string; waiter: Waiter }> = [];

  function applyVersion(next?: number) {
    if (typeof next === "number" && Number.isFinite(next)) {
      hooks.setExpectedVersion(next);
    }
  }

  async function pump(): Promise<void> {
    if (inFlight) return;
    inFlight = true;
    try {
      while (queuedSection || verifyQueue.length) {
        if (queuedSection) {
          queuedSection = false;
          const waiters = sectionWaiters.splice(0, sectionWaiters.length);
          const result = await hooks.runSectionSave();
          applyVersion(result.expectedVersion);
          const coalesced =
            result.ok && answersChangedDuringFlight(hooks.localAnswers(), result.savedAnswers ?? null);
          if (coalesced) {
            queuedSection = true;
          }
          const payload: NursingAdmissionSaveResult = {
            ok: result.ok && !coalesced,
            conflict: result.conflict,
            expectedVersion: hooks.getExpectedVersion(),
          };
          if (coalesced) {
            sectionWaiters.push(...waiters);
          } else {
            waiters.forEach((w) => w(payload));
          }
          continue;
        }
        const next = verifyQueue.shift();
        if (!next) break;
        const result = await hooks.runVerify(next.itemId, next.status);
        applyVersion(result.expectedVersion);
        next.waiter({
          ok: result.ok,
          conflict: result.conflict,
          expectedVersion: hooks.getExpectedVersion(),
        });
      }
    } finally {
      inFlight = false;
      if (queuedSection || verifyQueue.length) {
        void pump();
      }
    }
  }

  function requestSectionSave(): Promise<NursingAdmissionSaveResult> {
    if (hooks.isWriteBlocked()) return Promise.resolve({ ok: false });
    return new Promise((resolve) => {
      sectionWaiters.push(resolve);
      queuedSection = true;
      void pump();
    });
  }

  function requestVerify(itemId: string, status: string): Promise<NursingAdmissionSaveResult> {
    if (hooks.isWriteBlocked()) return Promise.resolve({ ok: false });
    return new Promise((resolve) => {
      verifyQueue.push({ itemId, status, waiter: resolve });
      void pump();
    });
  }

  return {
    requestSectionSave,
    requestVerify,
    isInFlight: () => inFlight,
  };
}
