import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildClinicalDraftKey,
  createClinicalDraft,
  readClinicalDraft,
  removeClinicalDraft,
  shouldRestoreClinicalDraft,
  writeClinicalDraft,
  type ClinicalDraft,
  type ClinicalDraftScope,
  type ClinicalDraftStorageLike,
} from "./clinicalDraftStorage";

function defaultStorage(): ClinicalDraftStorageLike | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function useClinicalDraftRecovery<TPayload>(input: {
  scope: ClinicalDraftScope;
  payload: TPayload;
  dirty: boolean;
  serverSavedAt?: string | null;
  workflowEditable: boolean;
  signedOrFinalized?: boolean;
  encounterStatus?: string | null;
  allowRestoreWhenEncounterClosed?: boolean;
  hasPayloadContent: (payload: TPayload) => boolean;
  onRestore: (payload: TPayload, draft: ClinicalDraft<TPayload>) => void;
  storage?: ClinicalDraftStorageLike | null;
  now?: () => string;
}): {
  draftKey: string;
  restoredAt: string | null;
  restoreAvailable: boolean;
  clearDraft: () => void;
} {
  const storage = input.storage === undefined ? defaultStorage() : input.storage;
  const now = input.now ?? (() => new Date().toISOString());
  const draftKey = useMemo(() => buildClinicalDraftKey(input.scope), [input.scope]);
  const restoredKeyRef = useRef<string | null>(null);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [restoreAvailable, setRestoreAvailable] = useState(false);

  useEffect(() => {
    if (!storage) return;
    if (restoredKeyRef.current === draftKey) return;
    const draft = readClinicalDraft<TPayload>(storage, draftKey);
    const canRestore = shouldRestoreClinicalDraft({
      draft,
      scope: input.scope,
      serverSavedAt: input.serverSavedAt,
      workflowEditable: input.workflowEditable,
      signedOrFinalized: input.signedOrFinalized,
      encounterStatus: input.encounterStatus,
      allowRestoreWhenEncounterClosed: input.allowRestoreWhenEncounterClosed,
      hasPayloadContent: (payload) => input.hasPayloadContent(payload as TPayload),
    });
    setRestoreAvailable(canRestore);
    restoredKeyRef.current = draftKey;
    if (canRestore && draft) {
      input.onRestore(draft.payload, draft);
      setRestoredAt(draft.metadata.savedLocallyAt);
    }
  }, [
    draftKey,
    input,
    input.allowRestoreWhenEncounterClosed,
    input.encounterStatus,
    input.scope,
    input.serverSavedAt,
    input.signedOrFinalized,
    input.workflowEditable,
    storage,
  ]);

  useEffect(() => {
    if (!storage) return;
    if (!input.workflowEditable || input.signedOrFinalized) return;
    if (!input.dirty || !input.hasPayloadContent(input.payload)) {
      removeClinicalDraft(storage, draftKey);
      return;
    }
    writeClinicalDraft(
      storage,
      draftKey,
      createClinicalDraft({
        scope: input.scope,
        payload: input.payload,
        savedLocallyAt: now(),
        lastServerSavedAt: input.serverSavedAt ?? null,
        dirty: true,
      })
    );
  }, [
    draftKey,
    input,
    input.dirty,
    input.payload,
    input.scope,
    input.serverSavedAt,
    input.signedOrFinalized,
    input.workflowEditable,
    now,
    storage,
  ]);

  return {
    draftKey,
    restoredAt,
    restoreAvailable,
    clearDraft: () => {
      if (storage) removeClinicalDraft(storage, draftKey);
      setRestoreAvailable(false);
      setRestoredAt(null);
    },
  };
}
