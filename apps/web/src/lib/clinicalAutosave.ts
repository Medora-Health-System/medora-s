export type ClinicalAutosaveStatus =
  | "idle"
  | "unsaved"
  | "saving"
  | "saved_local"
  | "saved_server"
  | "restore_available"
  | "failed";

export type ClinicalAutosaveMode = "server" | "local_only";

export type ClinicalAutosaveSnapshot<TPayload> = {
  signature: string;
  payload: TPayload;
};

export function shouldRunClinicalAutosave(input: {
  currentSignature: string;
  lastSavedSignature: string;
  mode: ClinicalAutosaveMode;
  hasContent?: boolean;
  workflowEditable?: boolean;
  signedOrFinalized?: boolean;
  saving?: boolean;
}): boolean {
  return Boolean(
    input.hasContent &&
      input.workflowEditable !== false &&
      !input.signedOrFinalized &&
      !input.saving &&
      input.currentSignature !== input.lastSavedSignature
  );
}

export function createLatestWinsClinicalAutosaveScheduler<TPayload>(input: {
  debounceMs: number;
  getSnapshot: () => ClinicalAutosaveSnapshot<TPayload>;
  save: (snapshot: ClinicalAutosaveSnapshot<TPayload>) => void | Promise<void>;
  onError?: (error: unknown, snapshot: ClinicalAutosaveSnapshot<TPayload>) => void;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}) {
  const setTimeoutFn = input.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = input.clearTimeoutFn ?? clearTimeout;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;
  let pendingWhileInFlight = false;
  let latestSnapshot: ClinicalAutosaveSnapshot<TPayload> | null = null;

  const run = () => {
    if (inFlight) {
      pendingWhileInFlight = true;
      return;
    }
    const snapshot = latestSnapshot;
    if (!snapshot) return;

    inFlight = true;
    Promise.resolve(input.save(snapshot))
      .catch((error) => input.onError?.(error, snapshot))
      .finally(() => {
        inFlight = false;
        if (pendingWhileInFlight && latestSnapshot && latestSnapshot.signature !== snapshot.signature) {
          pendingWhileInFlight = false;
          run();
          return;
        }
        pendingWhileInFlight = false;
      });
  };

  return {
    schedule() {
      latestSnapshot = input.getSnapshot();
      if (timer) clearTimeoutFn(timer);
      timer = setTimeoutFn(() => {
        timer = null;
        run();
      }, input.debounceMs);
    },
    cancel() {
      if (timer) {
        clearTimeoutFn(timer);
        timer = null;
      }
      pendingWhileInFlight = false;
    },
    pending() {
      return timer !== null || pendingWhileInFlight;
    },
    saving() {
      return inFlight;
    },
  };
}
