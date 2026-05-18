import {
  createLatestWinsClinicalAutosaveScheduler,
  shouldRunClinicalAutosave,
} from "./clinicalAutosave";

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
  return shouldRunClinicalAutosave({
    currentSignature: input.currentSignature,
    lastSavedSignature: input.lastSavedSignature,
    mode: "server",
    hasContent: input.hasContent,
    workflowEditable: !input.readOnly,
    signedOrFinalized: input.signedOrFinalized,
    saving: input.saving,
  });
}

export function createProviderDocumentationAutosaveScheduler(input: {
  debounceMs: number;
  save: () => void | Promise<void>;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}) {
  const scheduler = createLatestWinsClinicalAutosaveScheduler({
    debounceMs: input.debounceMs,
    getSnapshot: () => ({ signature: String(Date.now()), payload: null }),
    save: input.save,
    setTimeoutFn: input.setTimeoutFn,
    clearTimeoutFn: input.clearTimeoutFn,
  });
  return scheduler;
}
