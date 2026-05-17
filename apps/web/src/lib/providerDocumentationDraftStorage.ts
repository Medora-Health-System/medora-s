import {
  providerDocumentationStateHasContent,
  type ProviderDocumentationEncounterMode,
  type ProviderDocumentationWorkspaceState,
} from "./providerDocumentationModel";

export type ProviderDocumentationDraft = {
  schemaVersion: 1;
  encounterId: string;
  encounterMode: ProviderDocumentationEncounterMode;
  providerUserId: string;
  updatedAt: string;
  serverSavedAt: string | null;
  state: ProviderDocumentationWorkspaceState;
};

export type ProviderDocumentationDraftStorageKeyInput = {
  encounterId: string;
  encounterMode: ProviderDocumentationEncounterMode;
  providerUserId?: string | null;
};

export type ProviderDocumentationStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const DRAFT_KEY_PREFIX = "medora:provider-documentation-draft:v1";
const UNKNOWN_PROVIDER_ID = "unknown-provider";

export function normalizedProviderDocumentationDraftProviderId(providerUserId?: string | null): string {
  const trimmed = providerUserId?.trim();
  return trimmed || UNKNOWN_PROVIDER_ID;
}

export function buildProviderDocumentationDraftKey(input: ProviderDocumentationDraftStorageKeyInput): string {
  return [
    DRAFT_KEY_PREFIX,
    input.encounterMode,
    input.encounterId,
    normalizedProviderDocumentationDraftProviderId(input.providerUserId),
  ].join(":");
}

export function providerDocumentationStateSignature(state: ProviderDocumentationWorkspaceState): string {
  return JSON.stringify(state);
}

export function writeProviderDocumentationDraft(
  storage: ProviderDocumentationStorageLike,
  key: string,
  draft: ProviderDocumentationDraft
): void {
  storage.setItem(key, JSON.stringify(draft));
}

export function readProviderDocumentationDraft(
  storage: ProviderDocumentationStorageLike,
  key: string
): ProviderDocumentationDraft | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProviderDocumentationDraft>;
    if (parsed.schemaVersion !== 1) return null;
    if (!parsed.encounterId || !parsed.encounterMode || !parsed.providerUserId || !parsed.updatedAt || !parsed.state) {
      return null;
    }
    return parsed as ProviderDocumentationDraft;
  } catch {
    return null;
  }
}

export function removeProviderDocumentationDraft(storage: ProviderDocumentationStorageLike, key: string): void {
  storage.removeItem(key);
}

export function shouldRestoreProviderDocumentationDraft(input: {
  draft: ProviderDocumentationDraft | null;
  encounterId: string;
  encounterMode: ProviderDocumentationEncounterMode;
  providerUserId?: string | null;
  serverSavedAt?: string | null;
}): boolean {
  const draft = input.draft;
  if (!draft) return false;
  if (draft.encounterId !== input.encounterId) return false;
  if (draft.encounterMode !== input.encounterMode) return false;
  if (draft.providerUserId !== normalizedProviderDocumentationDraftProviderId(input.providerUserId)) return false;
  if (!providerDocumentationStateHasContent(draft.state)) return false;

  const draftMs = Date.parse(draft.updatedAt);
  if (!Number.isFinite(draftMs)) return false;
  const serverSavedAt = input.serverSavedAt ?? null;
  if (!serverSavedAt) return true;
  const serverMs = Date.parse(serverSavedAt);
  if (!Number.isFinite(serverMs)) return true;
  return draftMs > serverMs;
}
