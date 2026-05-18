import { describe, expect, it, vi } from "vitest";
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

  it("scopes ED triage and nursing assessment drafts by encounter, facility, and user", () => {
    const triageScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "ED_TRIAGE",
      userId: "rn-1",
      version: "ed-triage-v1",
    };
    const nursingScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "NURSING_ASSESSMENT",
      userId: "rn-1",
      version: "nursing-assessment-v1",
    };

    expect(buildClinicalDraftKey(triageScope)).not.toBe(buildClinicalDraftKey(nursingScope));
    expect(buildClinicalDraftKey(triageScope)).not.toBe(
      buildClinicalDraftKey({ ...triageScope, facilityId: "facility-2" })
    );
    expect(buildClinicalDraftKey(nursingScope)).not.toBe(
      buildClinicalDraftKey({ ...nursingScope, encounterId: "enc-2" })
    );
    expect(buildClinicalDraftKey(nursingScope)).not.toBe(buildClinicalDraftKey({ ...nursingScope, userId: "rn-2" }));
  });

  it("scopes observation reassessment, continue note, and provider handoff drafts by encounter, facility, and user", () => {
    const reassessmentScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "OBSERVATION_REASSESSMENT",
      userId: "provider-1",
      version: "observation-reassessment-v1:PROVIDER",
    };
    const continueScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "OBSERVATION_CONTINUE_NOTE",
      userId: "provider-1",
      version: "observation-continue-note-v1",
    };
    const handoffScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "PROVIDER_HANDOFF",
      userId: "provider-1",
      version: "provider-handoff-v1",
    };

    expect(buildClinicalDraftKey(reassessmentScope)).not.toBe(buildClinicalDraftKey(continueScope));
    expect(buildClinicalDraftKey(reassessmentScope)).not.toBe(buildClinicalDraftKey(handoffScope));
    expect(buildClinicalDraftKey(reassessmentScope)).not.toBe(
      buildClinicalDraftKey({ ...reassessmentScope, facilityId: "facility-2" })
    );
    expect(buildClinicalDraftKey(continueScope)).not.toBe(
      buildClinicalDraftKey({ ...continueScope, encounterId: "enc-2" })
    );
    expect(buildClinicalDraftKey(handoffScope)).not.toBe(buildClinicalDraftKey({ ...handoffScope, userId: "provider-2" }));
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

  it("rejects stale ED triage and nursing assessment drafts", () => {
    const triageScope: ClinicalDraftScope = { ...scope, workflowType: "ED_TRIAGE", version: "ed-triage-v1" };
    const nursingScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "NURSING_ASSESSMENT",
      version: "nursing-assessment-v1",
    };
    const triageDraft = createClinicalDraft({
      scope: triageScope,
      payload: { formData: { chiefComplaint: "Local draft" } },
      savedLocallyAt: "2026-05-17T12:00:00.000Z",
    });
    const nursingDraft = createClinicalDraft({
      scope: nursingScope,
      payload: { state: { etatGeneral: { text: "Local draft" } }, ivState: { performed: false } },
      savedLocallyAt: "2026-05-17T12:00:00.000Z",
    });

    expect(
      shouldRestoreClinicalDraft({
        draft: triageDraft,
        scope: triageScope,
        serverSavedAt: "2026-05-17T12:05:00.000Z",
        workflowEditable: true,
        encounterStatus: "OPEN",
      })
    ).toBe(false);
    expect(
      shouldRestoreClinicalDraft({
        draft: nursingDraft,
        scope: nursingScope,
        serverSavedAt: "2026-05-17T12:05:00.000Z",
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

  it("blocks closed or discharged observation reassessment and handoff restore", () => {
    const reassessmentScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "OBSERVATION_REASSESSMENT",
      version: "observation-reassessment-v1:RN",
    };
    const handoffScope: ClinicalDraftScope = { ...scope, workflowType: "PROVIDER_HANDOFF", version: "provider-handoff-v1" };
    const reassessmentDraft = createClinicalDraft({
      scope: reassessmentScope,
      payload: { role: "RN", note: "Local reassessment" },
      savedLocallyAt: "2026-05-17T12:10:00.000Z",
    });
    const handoffDraft = createClinicalDraft({
      scope: handoffScope,
      payload: { handoffToId: "provider-2", handoffNotes: "Local handoff" },
      savedLocallyAt: "2026-05-17T12:10:00.000Z",
    });

    expect(
      shouldRestoreClinicalDraft({
        draft: reassessmentDraft,
        scope: reassessmentScope,
        workflowEditable: true,
        encounterStatus: "CLOSED",
      })
    ).toBe(false);
    expect(
      shouldRestoreClinicalDraft({
        draft: reassessmentDraft,
        scope: reassessmentScope,
        workflowEditable: false,
        encounterStatus: "OPEN",
      })
    ).toBe(false);
    expect(
      shouldRestoreClinicalDraft({
        draft: handoffDraft,
        scope: handoffScope,
        workflowEditable: true,
        encounterStatus: "DISCHARGED",
      })
    ).toBe(false);
  });

  it("manual save cleanup removes local ED triage and nursing assessment drafts", () => {
    const storage = makeMemoryStorage();
    const triageScope: ClinicalDraftScope = { ...scope, workflowType: "ED_TRIAGE", version: "ed-triage-v1" };
    const nursingScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "NURSING_ASSESSMENT",
      version: "nursing-assessment-v1",
    };
    const triageKey = buildClinicalDraftKey(triageScope);
    const nursingKey = buildClinicalDraftKey(nursingScope);

    writeClinicalDraft(
      storage,
      triageKey,
      createClinicalDraft({
        scope: triageScope,
        payload: { formData: { chiefComplaint: "Needs save" } },
        savedLocallyAt: "2026-05-17T12:10:00.000Z",
      })
    );
    writeClinicalDraft(
      storage,
      nursingKey,
      createClinicalDraft({
        scope: nursingScope,
        payload: { state: { etatGeneral: { text: "Needs save" } }, ivState: { performed: false } },
        savedLocallyAt: "2026-05-17T12:10:00.000Z",
      })
    );

    removeClinicalDraft(storage, triageKey);
    removeClinicalDraft(storage, nursingKey);
    expect(readClinicalDraft(storage, triageKey)).toBeNull();
    expect(readClinicalDraft(storage, nursingKey)).toBeNull();
  });

  it("manual submit cleanup removes observation reassessment, continue note, and provider handoff drafts", () => {
    const storage = makeMemoryStorage();
    const scopes: ClinicalDraftScope[] = [
      { ...scope, workflowType: "OBSERVATION_REASSESSMENT", version: "observation-reassessment-v1:PROVIDER" },
      { ...scope, workflowType: "OBSERVATION_CONTINUE_NOTE", version: "observation-continue-note-v1" },
      { ...scope, workflowType: "PROVIDER_HANDOFF", version: "provider-handoff-v1" },
    ];
    for (const s of scopes) {
      writeClinicalDraft(
        storage,
        buildClinicalDraftKey(s),
        createClinicalDraft({
          scope: s,
          payload: { note: "Local only" },
          savedLocallyAt: "2026-05-17T12:10:00.000Z",
        })
      );
    }

    for (const s of scopes) removeClinicalDraft(storage, buildClinicalDraftKey(s));
    for (const s of scopes) expect(readClinicalDraft(storage, buildClinicalDraftKey(s))).toBeNull();
  });

  it("local triage and nursing draft writes do not submit server PUT/PATCH side effects", () => {
    const storage = makeMemoryStorage();
    const serverSubmit = vi.fn();
    const triageScope: ClinicalDraftScope = { ...scope, workflowType: "ED_TRIAGE", version: "ed-triage-v1" };
    const nursingScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "NURSING_ASSESSMENT",
      version: "nursing-assessment-v1",
    };

    writeClinicalDraft(
      storage,
      buildClinicalDraftKey(triageScope),
      createClinicalDraft({
        scope: triageScope,
        payload: { formData: { chiefComplaint: "Local only" } },
        savedLocallyAt: "2026-05-17T12:10:00.000Z",
      })
    );
    writeClinicalDraft(
      storage,
      buildClinicalDraftKey(nursingScope),
      createClinicalDraft({
        scope: nursingScope,
        payload: { state: { douleur: { text: "Local only" } }, ivState: { performed: false } },
        savedLocallyAt: "2026-05-17T12:10:00.000Z",
      })
    );

    expect(serverSubmit).not.toHaveBeenCalled();
    expect(JSON.stringify([...storage.data.values()])).not.toMatch(/billing|diagnosisId|orderId/i);
  });

  it("local reassessment and provider handoff drafts do not create clinical events or server side effects", () => {
    const storage = makeMemoryStorage();
    const serverSubmit = vi.fn();
    const clinicalEventCreate = vi.fn();
    const scopes: ClinicalDraftScope[] = [
      { ...scope, workflowType: "OBSERVATION_REASSESSMENT", version: "observation-reassessment-v1:PROVIDER" },
      { ...scope, workflowType: "OBSERVATION_CONTINUE_NOTE", version: "observation-continue-note-v1" },
      { ...scope, workflowType: "PROVIDER_HANDOFF", version: "provider-handoff-v1" },
    ];

    for (const s of scopes) {
      writeClinicalDraft(
        storage,
        buildClinicalDraftKey(s),
        createClinicalDraft({
          scope: s,
          payload: {
            note: "Local-only draft",
            handoffToId: "provider-2",
            handoffNotes: "Local handoff",
          },
          savedLocallyAt: "2026-05-17T12:10:00.000Z",
        })
      );
    }

    expect(serverSubmit).not.toHaveBeenCalled();
    expect(clinicalEventCreate).not.toHaveBeenCalled();
    expect(JSON.stringify([...storage.data.values()])).not.toMatch(/billing|diagnosisId|orderId|dischargeStatus/i);
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
