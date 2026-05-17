export type ProviderDocumentationAutosaveStatus =
  | "idle"
  | "unsaved"
  | "saving"
  | "saved"
  | "restore_available"
  | "failed";

export function shouldAutosaveProviderDocumentation(input: {
  currentSignature: string;
  lastSavedSignature: string;
  readOnly?: boolean;
  signedOrFinalized?: boolean;
  saving?: boolean;
  hasContent?: boolean;
}): boolean {
  return Boolean(
    input.hasContent &&
      !input.readOnly &&
      !input.signedOrFinalized &&
      !input.saving &&
      input.currentSignature !== input.lastSavedSignature
  );
}

export function createProviderDocumentationAutosaveScheduler(input: {
  debounceMs: number;
  save: () => void | Promise<void>;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}) {
  const setTimeoutFn = input.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = input.clearTimeoutFn ?? clearTimeout;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule() {
      if (timer) clearTimeoutFn(timer);
      timer = setTimeoutFn(() => {
        timer = null;
        void input.save();
      }, input.debounceMs);
    },
    cancel() {
      if (timer) {
        clearTimeoutFn(timer);
        timer = null;
      }
    },
    pending() {
      return timer !== null;
    },
  };
}
