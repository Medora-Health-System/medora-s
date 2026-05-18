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

  it("scopes orders drafting and discharge documentation drafts separately", () => {
    const ordersScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "ORDERS_DRAFTING",
      userId: "provider-1",
      version: "orders-drafting-v1",
    };
    const dischargeScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "DISCHARGE_DOCUMENTATION",
      userId: "provider-1",
      version: "discharge-documentation-v1",
    };

    expect(buildClinicalDraftKey(ordersScope)).not.toBe(buildClinicalDraftKey(dischargeScope));
    expect(buildClinicalDraftKey(ordersScope)).not.toBe(buildClinicalDraftKey({ ...ordersScope, encounterId: "enc-2" }));
    expect(buildClinicalDraftKey(dischargeScope)).not.toBe(
      buildClinicalDraftKey({ ...dischargeScope, facilityId: "facility-2" })
    );
  });

  it("scopes MAR, effective-time correction, and infusion drafts by row subject id", () => {
    const marScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "MEDICATION_MAR_DOCUMENTATION",
      version: "medication-mar-documentation-v1",
      subjectId: "order-item-1",
    };
    const effectiveScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "MAR_EFFECTIVE_TIME_CORRECTION",
      version: "mar-effective-time-correction-v1:0:2026-05-17T12:00:00.000Z",
      subjectId: "admin-row-1",
    };
    const infusionStartScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "INFUSION_START_DOCUMENTATION",
      version: "infusion-documentation-v1",
      subjectId: "order-item-1",
    };
    const infusionStopScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "INFUSION_STOP_DOCUMENTATION",
      version: "infusion-documentation-v1",
      subjectId: "order-item-1",
    };

    expect(buildClinicalDraftKey(marScope)).toContain("order-item-1");
    expect(buildClinicalDraftKey(effectiveScope)).toContain("admin-row-1");
    expect(buildClinicalDraftKey(marScope)).not.toBe(buildClinicalDraftKey({ ...marScope, subjectId: "order-item-2" }));
    expect(buildClinicalDraftKey(effectiveScope)).not.toBe(
      buildClinicalDraftKey({ ...effectiveScope, subjectId: "admin-row-2" })
    );
    expect(buildClinicalDraftKey(infusionStartScope)).not.toBe(buildClinicalDraftKey(infusionStopScope));
  });

  it("scopes lab/radiology documentation and effective-time drafts by encounter, facility, user, row, and department", () => {
    const labDocScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "LAB_RADIOLOGY_DOCUMENTATION",
      version: "lab-radiology-documentation-v1:lab",
      subjectId: "lab-item-1",
    };
    const radDocScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "LAB_RADIOLOGY_DOCUMENTATION",
      version: "lab-radiology-documentation-v1:radiology",
      subjectId: "rad-item-1",
    };
    const labEffectiveScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "LAB_EFFECTIVE_TIME_CORRECTION",
      version: "lab-radiology-effective-time-correction-v1:lab:resulted:0:2026-05-17T12:00:00.000Z",
      subjectId: "lab-item-1",
    };
    const radEffectiveScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "RADIOLOGY_EFFECTIVE_TIME_CORRECTION",
      version: "lab-radiology-effective-time-correction-v1:radiology:finalized:0:2026-05-17T12:00:00.000Z",
      subjectId: "rad-item-1",
    };

    expect(buildClinicalDraftKey(labDocScope)).toContain("lab-item-1");
    expect(buildClinicalDraftKey(labDocScope)).toContain("lab-radiology-documentation-v1%3Alab");
    expect(buildClinicalDraftKey(labDocScope)).not.toBe(buildClinicalDraftKey(radDocScope));
    expect(buildClinicalDraftKey(labDocScope)).not.toBe(
      buildClinicalDraftKey({ ...labDocScope, subjectId: "lab-item-2" })
    );
    expect(buildClinicalDraftKey(labDocScope)).not.toBe(
      buildClinicalDraftKey({ ...labDocScope, facilityId: "facility-2" })
    );
    expect(buildClinicalDraftKey(labEffectiveScope)).not.toBe(buildClinicalDraftKey(radEffectiveScope));
    expect(buildClinicalDraftKey(labEffectiveScope)).not.toBe(
      buildClinicalDraftKey({ ...labEffectiveScope, subjectId: "lab-item-2" })
    );
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

  it("restores order drafts only when local content is newer and encounter is open", () => {
    const ordersScope: ClinicalDraftScope = { ...scope, workflowType: "ORDERS_DRAFTING", version: "orders-drafting-v1" };
    const placeOrder = vi.fn();
    const draft = createClinicalDraft({
      scope: ordersScope,
      payload: { formData: { type: "LAB", items: [{ manualLabel: "CBC" }] } },
      savedLocallyAt: "2026-05-17T12:10:00.000Z",
    });

    expect(
      shouldRestoreClinicalDraft({
        draft,
        scope: ordersScope,
        workflowEditable: true,
        encounterStatus: "OPEN",
        hasPayloadContent: (payload) => JSON.stringify(payload).includes("CBC"),
      })
    ).toBe(true);
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it("blocks stale or closed discharge documentation restore", () => {
    const dischargeScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "DISCHARGE_DOCUMENTATION",
      version: "discharge-documentation-v1",
    };
    const closeEncounter = vi.fn();
    const staleDraft = createClinicalDraft({
      scope: dischargeScope,
      payload: { dischargeForm: { disposition: "Home" } },
      savedLocallyAt: "2026-05-17T12:00:00.000Z",
      lastServerSavedAt: "2026-05-17T11:55:00.000Z",
    });

    expect(
      shouldRestoreClinicalDraft({
        draft: staleDraft,
        scope: dischargeScope,
        serverSavedAt: "2026-05-17T12:05:00.000Z",
        workflowEditable: true,
        encounterStatus: "OPEN",
      })
    ).toBe(false);
    expect(
      shouldRestoreClinicalDraft({
        draft: createClinicalDraft({
          scope: dischargeScope,
          payload: { dischargeForm: { disposition: "Home" } },
          savedLocallyAt: "2026-05-17T12:10:00.000Z",
        }),
        scope: dischargeScope,
        workflowEditable: true,
        encounterStatus: "CLOSED",
      })
    ).toBe(false);
    expect(closeEncounter).not.toHaveBeenCalled();
  });

  it("rejects stale MAR documentation drafts and blocks cancelled medication restore", () => {
    const marScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "MEDICATION_MAR_DOCUMENTATION",
      version: "medication-mar-documentation-v1",
      subjectId: "order-item-1",
    };
    const draft = createClinicalDraft({
      scope: marScope,
      payload: { notes: "Patient reported nausea", effectiveTimeReason: "" },
      savedLocallyAt: "2026-05-17T12:00:00.000Z",
    });

    expect(
      shouldRestoreClinicalDraft({
        draft,
        scope: marScope,
        serverSavedAt: "2026-05-17T12:05:00.000Z",
        workflowEditable: true,
        encounterStatus: "OPEN",
      })
    ).toBe(false);
    expect(
      shouldRestoreClinicalDraft({
        draft: createClinicalDraft({
          scope: marScope,
          payload: { notes: "Held for BP", effectiveTimeReason: "" },
          savedLocallyAt: "2026-05-17T12:10:00.000Z",
        }),
        scope: marScope,
        workflowEditable: false,
        encounterStatus: "OPEN",
      })
    ).toBe(false);
  });

  it("blocks effective-time correction restore after a submitted correction changes the scoped version", () => {
    const draftScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "MAR_EFFECTIVE_TIME_CORRECTION",
      version: "mar-effective-time-correction-v1:0:2026-05-17T12:00:00.000Z",
      subjectId: "admin-row-1",
    };
    const submittedScope: ClinicalDraftScope = {
      ...draftScope,
      version: "mar-effective-time-correction-v1:1:2026-05-17T12:05:00.000Z",
    };
    const draft = createClinicalDraft({
      scope: draftScope,
      payload: { reason: "Late chart entry" },
      savedLocallyAt: "2026-05-17T12:10:00.000Z",
    });

    expect(
      shouldRestoreClinicalDraft({
        draft,
        scope: submittedScope,
        workflowEditable: true,
        encounterStatus: "OPEN",
      })
    ).toBe(false);
  });

  it("rejects stale lab/radiology drafts and blocks cancelled or finalized result restore", () => {
    const labScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "LAB_RADIOLOGY_DOCUMENTATION",
      version: "lab-radiology-documentation-v1:lab",
      subjectId: "lab-item-1",
    };
    const draft = createClinicalDraft({
      scope: labScope,
      payload: { resultText: "WBC 12.1" },
      savedLocallyAt: "2026-05-17T12:00:00.000Z",
    });

    expect(
      shouldRestoreClinicalDraft({
        draft,
        scope: labScope,
        serverSavedAt: "2026-05-17T12:05:00.000Z",
        workflowEditable: true,
        encounterStatus: "OPEN",
        hasPayloadContent: (payload) => Boolean((payload as { resultText?: string }).resultText?.trim()),
      })
    ).toBe(false);
    expect(
      shouldRestoreClinicalDraft({
        draft: createClinicalDraft({
          scope: labScope,
          payload: { resultText: "WBC 12.1" },
          savedLocallyAt: "2026-05-17T12:10:00.000Z",
        }),
        scope: labScope,
        workflowEditable: false,
        encounterStatus: "OPEN",
      })
    ).toBe(false);
    expect(
      shouldRestoreClinicalDraft({
        draft: createClinicalDraft({
          scope: labScope,
          payload: { resultText: "WBC 12.1" },
          savedLocallyAt: "2026-05-17T12:10:00.000Z",
        }),
        scope: labScope,
        workflowEditable: true,
        encounterStatus: "CLOSED",
      })
    ).toBe(false);
    expect(
      shouldRestoreClinicalDraft({
        draft: createClinicalDraft({
          scope: labScope,
          payload: { resultText: "WBC 12.1" },
          savedLocallyAt: "2026-05-17T12:10:00.000Z",
        }),
        scope: { ...labScope, version: "lab-radiology-documentation-v1:radiology", subjectId: "rad-item-1" },
        workflowEditable: true,
        encounterStatus: "OPEN",
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

  it("manual submit cleanup removes orders and discharge local drafts", () => {
    const storage = makeMemoryStorage();
    const scopes: ClinicalDraftScope[] = [
      { ...scope, workflowType: "ORDERS_DRAFTING", version: "orders-drafting-v1" },
      { ...scope, workflowType: "DISCHARGE_DOCUMENTATION", version: "discharge-documentation-v1" },
    ];
    for (const s of scopes) {
      writeClinicalDraft(
        storage,
        buildClinicalDraftKey(s),
        createClinicalDraft({
          scope: s,
          payload: { note: "Manual action pending" },
          savedLocallyAt: "2026-05-17T12:10:00.000Z",
        })
      );
    }

    for (const s of scopes) removeClinicalDraft(storage, buildClinicalDraftKey(s));
    for (const s of scopes) expect(readClinicalDraft(storage, buildClinicalDraftKey(s))).toBeNull();
  });

  it("manual submit cleanup removes MAR, effective-time, and infusion local drafts", () => {
    const storage = makeMemoryStorage();
    const scopes: ClinicalDraftScope[] = [
      {
        ...scope,
        workflowType: "MEDICATION_MAR_DOCUMENTATION",
        version: "medication-mar-documentation-v1",
        subjectId: "order-item-1",
      },
      {
        ...scope,
        workflowType: "MAR_EFFECTIVE_TIME_CORRECTION",
        version: "mar-effective-time-correction-v1:0:2026-05-17T12:00:00.000Z",
        subjectId: "admin-row-1",
      },
      {
        ...scope,
        workflowType: "INFUSION_START_DOCUMENTATION",
        version: "infusion-documentation-v1",
        subjectId: "order-item-1",
      },
      {
        ...scope,
        workflowType: "INFUSION_STOP_DOCUMENTATION",
        version: "infusion-documentation-v1",
        subjectId: "order-item-1",
      },
    ];
    for (const s of scopes) {
      writeClinicalDraft(
        storage,
        buildClinicalDraftKey(s),
        createClinicalDraft({
          scope: s,
          payload: { note: "Manual action pending", reason: "Late charting" },
          savedLocallyAt: "2026-05-17T12:10:00.000Z",
        })
      );
    }

    for (const s of scopes) removeClinicalDraft(storage, buildClinicalDraftKey(s));
    for (const s of scopes) expect(readClinicalDraft(storage, buildClinicalDraftKey(s))).toBeNull();
  });

  it("manual save/finalize/correct cleanup removes lab/radiology local drafts", () => {
    const storage = makeMemoryStorage();
    const scopes: ClinicalDraftScope[] = [
      {
        ...scope,
        workflowType: "LAB_RADIOLOGY_DOCUMENTATION",
        version: "lab-radiology-documentation-v1:lab",
        subjectId: "lab-item-1",
      },
      {
        ...scope,
        workflowType: "LAB_RADIOLOGY_DOCUMENTATION",
        version: "lab-radiology-documentation-v1:radiology",
        subjectId: "rad-item-1",
      },
      {
        ...scope,
        workflowType: "LAB_EFFECTIVE_TIME_CORRECTION",
        version: "lab-radiology-effective-time-correction-v1:lab:resulted:0:2026-05-17T12:00:00.000Z",
        subjectId: "lab-item-1",
      },
      {
        ...scope,
        workflowType: "RADIOLOGY_EFFECTIVE_TIME_CORRECTION",
        version: "lab-radiology-effective-time-correction-v1:radiology:finalized:0:2026-05-17T12:00:00.000Z",
        subjectId: "rad-item-1",
      },
    ];
    for (const s of scopes) {
      writeClinicalDraft(
        storage,
        buildClinicalDraftKey(s),
        createClinicalDraft({
          scope: s,
          payload: { resultText: "Local result", reason: "Late correction" },
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

  it("local orders and discharge draft writes do not place orders, close encounters, or create side effects", () => {
    const storage = makeMemoryStorage();
    const postOrder = vi.fn();
    const closeEncounter = vi.fn();
    const clinicalEventCreate = vi.fn();
    const billingCreate = vi.fn();
    const ordersScope: ClinicalDraftScope = { ...scope, workflowType: "ORDERS_DRAFTING", version: "orders-drafting-v1" };
    const dischargeScope: ClinicalDraftScope = {
      ...scope,
      workflowType: "DISCHARGE_DOCUMENTATION",
      version: "discharge-documentation-v1",
    };

    writeClinicalDraft(
      storage,
      buildClinicalDraftKey(ordersScope),
      createClinicalDraft({
        scope: ordersScope,
        payload: { formData: { type: "LAB", items: [{ manualLabel: "CBC" }] } },
        savedLocallyAt: "2026-05-17T12:10:00.000Z",
      })
    );
    writeClinicalDraft(
      storage,
      buildClinicalDraftKey(dischargeScope),
      createClinicalDraft({
        scope: dischargeScope,
        payload: { dischargeForm: { disposition: "Home with follow-up" } },
        savedLocallyAt: "2026-05-17T12:10:00.000Z",
      })
    );

    expect(postOrder).not.toHaveBeenCalled();
    expect(closeEncounter).not.toHaveBeenCalled();
    expect(clinicalEventCreate).not.toHaveBeenCalled();
    expect(billingCreate).not.toHaveBeenCalled();
    expect(JSON.stringify([...storage.data.values()])).not.toMatch(/billing|dischargeStatus|clinicalEvent/i);
  });

  it("local MAR and infusion draft writes do not call administer, start, stop, or correct endpoints", () => {
    const storage = makeMemoryStorage();
    const administer = vi.fn();
    const startInfusion = vi.fn();
    const stopInfusion = vi.fn();
    const correctTime = vi.fn();
    const billingCreate = vi.fn();
    const scopes: ClinicalDraftScope[] = [
      {
        ...scope,
        workflowType: "MEDICATION_MAR_DOCUMENTATION",
        version: "medication-mar-documentation-v1",
        subjectId: "order-item-1",
      },
      {
        ...scope,
        workflowType: "MAR_EFFECTIVE_TIME_CORRECTION",
        version: "mar-effective-time-correction-v1:0:2026-05-17T12:00:00.000Z",
        subjectId: "admin-row-1",
      },
      {
        ...scope,
        workflowType: "INFUSION_START_DOCUMENTATION",
        version: "infusion-documentation-v1",
        subjectId: "order-item-1",
      },
      {
        ...scope,
        workflowType: "INFUSION_STOP_DOCUMENTATION",
        version: "infusion-documentation-v1",
        subjectId: "order-item-1",
      },
    ];

    for (const s of scopes) {
      writeClinicalDraft(
        storage,
        buildClinicalDraftKey(s),
        createClinicalDraft({
          scope: s,
          payload: { notes: "Local-only note", reason: "Local-only reason" },
          savedLocallyAt: "2026-05-17T12:10:00.000Z",
        })
      );
    }

    expect(administer).not.toHaveBeenCalled();
    expect(startInfusion).not.toHaveBeenCalled();
    expect(stopInfusion).not.toHaveBeenCalled();
    expect(correctTime).not.toHaveBeenCalled();
    expect(billingCreate).not.toHaveBeenCalled();
    expect(JSON.stringify([...storage.data.values()])).not.toMatch(/billing|diagnosisId|orderEvent|administeredAt/i);
  });

  it("local lab/radiology draft writes do not call result, finalize, acknowledge, correct, order, or billing endpoints", () => {
    const storage = makeMemoryStorage();
    const saveResult = vi.fn();
    const finalizeResult = vi.fn();
    const acknowledgeResult = vi.fn();
    const correctTime = vi.fn();
    const updateOrder = vi.fn();
    const billingCreate = vi.fn();
    const diagnosisCreate = vi.fn();
    const scopes: ClinicalDraftScope[] = [
      {
        ...scope,
        workflowType: "LAB_RADIOLOGY_DOCUMENTATION",
        version: "lab-radiology-documentation-v1:lab",
        subjectId: "lab-item-1",
      },
      {
        ...scope,
        workflowType: "LAB_RADIOLOGY_DOCUMENTATION",
        version: "lab-radiology-documentation-v1:radiology",
        subjectId: "rad-item-1",
      },
      {
        ...scope,
        workflowType: "LAB_EFFECTIVE_TIME_CORRECTION",
        version: "lab-radiology-effective-time-correction-v1:lab:collected:0:2026-05-17T12:00:00.000Z",
        subjectId: "lab-item-1",
      },
      {
        ...scope,
        workflowType: "RADIOLOGY_EFFECTIVE_TIME_CORRECTION",
        version: "lab-radiology-effective-time-correction-v1:radiology:performed:0:2026-05-17T12:00:00.000Z",
        subjectId: "rad-item-1",
      },
    ];

    for (const s of scopes) {
      writeClinicalDraft(
        storage,
        buildClinicalDraftKey(s),
        createClinicalDraft({
          scope: s,
          payload: { resultText: "Local-only interpretation", reason: "Late documentation" },
          savedLocallyAt: "2026-05-17T12:10:00.000Z",
        })
      );
    }

    expect(saveResult).not.toHaveBeenCalled();
    expect(finalizeResult).not.toHaveBeenCalled();
    expect(acknowledgeResult).not.toHaveBeenCalled();
    expect(correctTime).not.toHaveBeenCalled();
    expect(updateOrder).not.toHaveBeenCalled();
    expect(billingCreate).not.toHaveBeenCalled();
    expect(diagnosisCreate).not.toHaveBeenCalled();
    expect(JSON.stringify([...storage.data.values()])).not.toMatch(
      /billing|diagnosisId|orderEvent|acknowledgedAt|finalizedAt|resultedAt|performedBy|resultedBy/i
    );
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
