import { describe, expect, it } from "vitest";
import {
  buildClinicalDraftKey,
  createClinicalDraft,
  readClinicalDraft,
  removeClinicalDraft,
  shouldRestoreClinicalDraft,
  writeClinicalDraft,
  type ClinicalDraftScope,
  type ClinicalDraftStorageLike,
} from "./clinicalDraftStorage";

function makeMemoryStorage(): ClinicalDraftStorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

const scope: ClinicalDraftScope = {
  workflowType: "PROVIDER_DOCUMENTATION",
  encounterId: "enc-1",
  patientId: "patient-1",
  facilityId: "facility-1",
  userId: "provider-1",
  version: "provider-doc-v1",
};

describe("clinicalDraftStorage", () => {
  it("scopes draft keys by workflow, encounter, facility, user, and schema version", () => {
    const key = buildClinicalDraftKey(scope);
    expect(key).toContain("PROVIDER_DOCUMENTATION");
    expect(key).toContain("enc-1");
    expect(key).toContain("facility-1");
    expect(key).toContain("provider-1");
    expect(key).toContain("provider-doc-v1");
    expect(buildClinicalDraftKey({ ...scope, workflowType: "ORDERS_DRAFTING", version: "orders-v1" })).not.toBe(key);
    expect(buildClinicalDraftKey({ ...scope, userId: "provider-2" })).not.toBe(key);
  });

  it("round-trips and removes a typed local clinical draft", () => {
    const storage = makeMemoryStorage();
    const key = buildClinicalDraftKey(scope);
    writeClinicalDraft(
      storage,
      key,
      createClinicalDraft({
        scope,
        payload: { hpi: "Draft text" },
        savedLocallyAt: "2026-05-17T12:05:00.000Z",
        lastServerSavedAt: "2026-05-17T12:00:00.000Z",
      })
    );

    expect(readClinicalDraft<{ hpi: string }>(storage, key)?.payload.hpi).toBe("Draft text");
    removeClinicalDraft(storage, key);
    expect(readClinicalDraft(storage, key)).toBeNull();
  });

  it("rejects stale drafts when server data is newer", () => {
    const draft = createClinicalDraft({
      scope,
      payload: { hpi: "Older local draft" },
      savedLocallyAt: "2026-05-17T12:00:00.000Z",
      lastServerSavedAt: "2026-05-17T12:10:00.000Z",
    });

    expect(
      shouldRestoreClinicalDraft({
        draft,
        scope,
        serverSavedAt: "2026-05-17T12:10:00.000Z",
        workflowEditable: true,
        encounterStatus: "OPEN",
      })
    ).toBe(false);
  });

  it("blocks restore over signed, finalized, closed, or non-editable workflows", () => {
    const draft = createClinicalDraft({
      scope,
      payload: { hpi: "Unsigned draft" },
      savedLocallyAt: "2026-05-17T12:10:00.000Z",
      lastServerSavedAt: "2026-05-17T12:00:00.000Z",
    });

    expect(shouldRestoreClinicalDraft({ draft, scope, workflowEditable: true, signedOrFinalized: true })).toBe(false);
    expect(shouldRestoreClinicalDraft({ draft, scope, workflowEditable: false })).toBe(false);
    expect(shouldRestoreClinicalDraft({ draft, scope, workflowEditable: true, encounterStatus: "CLOSED" })).toBe(false);
  });

  it("allows local-only medication/MAR and lab/radiology draft scopes without executing clinical actions", () => {
    const marKey = buildClinicalDraftKey({
      ...scope,
      workflowType: "MEDICATION_MAR_DOCUMENTATION",
      version: "mar-documentation-v1",
    });
    const labRadKey = buildClinicalDraftKey({
      ...scope,
      workflowType: "LAB_RADIOLOGY_DOCUMENTATION",
      version: "lab-rad-documentation-v1",
    });

    expect(marKey).toContain("MEDICATION_MAR_DOCUMENTATION");
    expect(labRadKey).toContain("LAB_RADIOLOGY_DOCUMENTATION");
    expect(marKey).not.toBe(labRadKey);
  });
});
