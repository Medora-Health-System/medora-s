export type ClinicalDraftWorkflowType =
  | "ED_TRIAGE"
  | "PROVIDER_DOCUMENTATION"
  | "NURSING_ASSESSMENT"
  | "NURSING_REASSESSMENT"
  | "OBSERVATION_PROVIDER_DOCUMENTATION"
  | "OBSERVATION_REASSESSMENT"
  | "OBSERVATION_CONTINUE_NOTE"
  | "ORDERS_DRAFTING"
  | "MEDICATION_MAR_DOCUMENTATION"
  | "MAR_EFFECTIVE_TIME_CORRECTION"
  | "INFUSION_START_DOCUMENTATION"
  | "INFUSION_STOP_DOCUMENTATION"
  | "LAB_RADIOLOGY_DOCUMENTATION"
  | "LAB_EFFECTIVE_TIME_CORRECTION"
  | "RADIOLOGY_EFFECTIVE_TIME_CORRECTION"
  | "DISCHARGE_DOCUMENTATION"
  | "PROVIDER_HANDOFF"
  | "PROVIDER_ADDENDUM";

export type ClinicalDraftScope = {
  workflowType: ClinicalDraftWorkflowType;
  encounterId: string;
  patientId?: string | null;
  facilityId: string;
  userId: string;
  version: string;
  /** Optional row-level scope, e.g. orderItemId or medicationAdministrationId. */
  subjectId?: string | null;
};

export type ClinicalDraftMetadata = ClinicalDraftScope & {
  schemaVersion: 1;
  savedLocallyAt: string;
  lastServerSavedAt: string | null;
  dirty: boolean;
};

export type ClinicalDraft<TPayload> = {
  metadata: ClinicalDraftMetadata;
  payload: TPayload;
};

export type ClinicalDraftStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const CLINICAL_DRAFT_KEY_PREFIX = "medora:clinical-draft:v1";
const NO_PATIENT_ID = "no-patient";

function keyPart(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return encodeURIComponent(trimmed || "unknown");
}

export function buildClinicalDraftKey(scope: ClinicalDraftScope): string {
  const parts = [
    CLINICAL_DRAFT_KEY_PREFIX,
    keyPart(scope.workflowType),
    keyPart(scope.facilityId),
    keyPart(scope.userId),
    keyPart(scope.encounterId),
    keyPart(scope.patientId ?? NO_PATIENT_ID),
    keyPart(scope.version),
  ];
  if (scope.subjectId != null && scope.subjectId.trim()) {
    parts.push(keyPart(scope.subjectId));
  }
  return parts.join(":");
}

export function clinicalDraftPayloadSignature(payload: unknown): string {
  return JSON.stringify(payload);
}

export function createClinicalDraft<TPayload>(input: {
  scope: ClinicalDraftScope;
  payload: TPayload;
  savedLocallyAt: string;
  lastServerSavedAt?: string | null;
  dirty?: boolean;
}): ClinicalDraft<TPayload> {
  return {
    metadata: {
      ...input.scope,
      schemaVersion: 1,
      savedLocallyAt: input.savedLocallyAt,
      lastServerSavedAt: input.lastServerSavedAt ?? null,
      dirty: input.dirty ?? true,
    },
    payload: input.payload,
  };
}

export function writeClinicalDraft<TPayload>(
  storage: ClinicalDraftStorageLike,
  key: string,
  draft: ClinicalDraft<TPayload>
): void {
  storage.setItem(key, JSON.stringify(draft));
}

export function readClinicalDraft<TPayload>(
  storage: ClinicalDraftStorageLike,
  key: string
): ClinicalDraft<TPayload> | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ClinicalDraft<TPayload>>;
    const metadata = parsed.metadata as Partial<ClinicalDraftMetadata> | undefined;
    if (
      !metadata ||
      metadata.schemaVersion !== 1 ||
      !metadata.workflowType ||
      !metadata.encounterId ||
      !metadata.facilityId ||
      !metadata.userId ||
      !metadata.version ||
      !metadata.savedLocallyAt ||
      parsed.payload == null
    ) {
      return null;
    }
    return parsed as ClinicalDraft<TPayload>;
  } catch {
    return null;
  }
}

export function removeClinicalDraft(storage: ClinicalDraftStorageLike, key: string): void {
  storage.removeItem(key);
}

function sameDraftScope(draft: ClinicalDraft<unknown>, scope: ClinicalDraftScope): boolean {
  const metadata = draft.metadata;
  return (
    metadata.workflowType === scope.workflowType &&
    metadata.encounterId === scope.encounterId &&
    (metadata.patientId ?? null) === (scope.patientId ?? null) &&
    metadata.facilityId === scope.facilityId &&
    metadata.userId === scope.userId &&
    metadata.version === scope.version &&
    (metadata.subjectId ?? null) === (scope.subjectId ?? null)
  );
}

export function shouldRestoreClinicalDraft(input: {
  draft: ClinicalDraft<unknown> | null;
  scope: ClinicalDraftScope;
  serverSavedAt?: string | null;
  workflowEditable: boolean;
  signedOrFinalized?: boolean;
  encounterStatus?: string | null;
  allowRestoreWhenEncounterClosed?: boolean;
  hasPayloadContent?: (payload: unknown) => boolean;
}): boolean {
  const draft = input.draft;
  if (!draft) return false;
  if (!input.workflowEditable) return false;
  if (input.signedOrFinalized) return false;
  if (!sameDraftScope(draft, input.scope)) return false;
  if (!draft.metadata.dirty) return false;

  const status = input.encounterStatus?.trim().toUpperCase();
  if (status && status !== "OPEN" && !input.allowRestoreWhenEncounterClosed) return false;

  if (input.hasPayloadContent && !input.hasPayloadContent(draft.payload)) return false;

  const draftMs = Date.parse(draft.metadata.savedLocallyAt);
  if (!Number.isFinite(draftMs)) return false;
  const serverSavedAt = input.serverSavedAt ?? draft.metadata.lastServerSavedAt ?? null;
  if (!serverSavedAt) return true;
  const serverMs = Date.parse(serverSavedAt);
  if (!Number.isFinite(serverMs)) return true;
  return draftMs > serverMs;
}
