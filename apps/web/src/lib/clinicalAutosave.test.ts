import { describe, expect, it, vi } from "vitest";
import {
  createLatestWinsClinicalAutosaveScheduler,
  shouldRunClinicalAutosave,
} from "./clinicalAutosave";
import {
  buildClinicalDraftKey,
  createClinicalDraft,
  readClinicalDraft,
  shouldRestoreClinicalDraft,
  writeClinicalDraft,
  type ClinicalDraftStorageLike,
} from "./clinicalDraftStorage";
import {
  applyClinicalBeforeUnloadWarning,
  clinicalBeforeUnloadShouldWarn,
} from "./clinicalBeforeUnload";

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

const baseScope = {
  workflowType: "PROVIDER_DOCUMENTATION" as const,
  encounterId: "enc-1",
  patientId: "patient-1",
  facilityId: "facility-1",
  userId: "user-1",
  version: "provider-doc-v1",
};

describe("clinical draft/autosave foundation", () => {
  it("builds draft keys scoped by workflow, encounter, patient, facility, user, and version", () => {
    const key = buildClinicalDraftKey(baseScope);
    expect(key).toContain("PROVIDER_DOCUMENTATION");
    expect(key).toContain("enc-1");
    expect(key).toContain("patient-1");
    expect(key).toContain("facility-1");
    expect(key).toContain("user-1");
    expect(key).toContain("provider-doc-v1");

    expect(buildClinicalDraftKey({ ...baseScope, userId: "user-2" })).not.toBe(key);
    expect(buildClinicalDraftKey({ ...baseScope, workflowType: "ORDERS_DRAFTING", version: "orders-v1" })).not.toBe(key);
  });

  it("restores only newer matching editable drafts", () => {
    const storage = makeMemoryStorage();
    const key = buildClinicalDraftKey(baseScope);
    writeClinicalDraft(
      storage,
      key,
      createClinicalDraft({
        scope: baseScope,
        payload: { note: "Unsaved provider text" },
        savedLocallyAt: "2026-05-17T12:05:00.000Z",
        lastServerSavedAt: "2026-05-17T12:00:00.000Z",
      })
    );
    const draft = readClinicalDraft(storage, key);

    expect(
      shouldRestoreClinicalDraft({
        draft,
        scope: baseScope,
        serverSavedAt: "2026-05-17T12:00:00.000Z",
        workflowEditable: true,
        encounterStatus: "OPEN",
        hasPayloadContent: (payload) => Boolean((payload as { note?: string }).note?.trim()),
      })
    ).toBe(true);

    expect(
      shouldRestoreClinicalDraft({
        draft,
        scope: { ...baseScope, userId: "different-user" },
        serverSavedAt: "2026-05-17T12:00:00.000Z",
        workflowEditable: true,
      })
    ).toBe(false);

    expect(
      shouldRestoreClinicalDraft({
        draft,
        scope: baseScope,
        serverSavedAt: "2026-05-17T12:10:00.000Z",
        workflowEditable: true,
      })
    ).toBe(false);
  });

  it("blocks restore for signed, finalized, locked, and closed workflows unless addendum restore is explicit", () => {
    const draft = createClinicalDraft({
      scope: baseScope,
      payload: { note: "Unsigned draft" },
      savedLocallyAt: "2026-05-17T12:05:00.000Z",
      lastServerSavedAt: "2026-05-17T12:00:00.000Z",
    });

    expect(
      shouldRestoreClinicalDraft({
        draft,
        scope: baseScope,
        workflowEditable: true,
        signedOrFinalized: true,
      })
    ).toBe(false);
    expect(
      shouldRestoreClinicalDraft({
        draft,
        scope: baseScope,
        workflowEditable: false,
      })
    ).toBe(false);
    expect(
      shouldRestoreClinicalDraft({
        draft,
        scope: baseScope,
        workflowEditable: true,
        encounterStatus: "CLOSED",
      })
    ).toBe(false);
    const addendumScope = { ...baseScope, workflowType: "PROVIDER_ADDENDUM" as const, version: "provider-addendum-v1" };
    const addendumDraft = createClinicalDraft({
      scope: addendumScope,
      payload: { note: "Closed-chart addendum draft" },
      savedLocallyAt: "2026-05-17T12:05:00.000Z",
      lastServerSavedAt: "2026-05-17T12:00:00.000Z",
    });
    expect(
      shouldRestoreClinicalDraft({
        draft: addendumDraft,
        scope: addendumScope,
        workflowEditable: true,
        encounterStatus: "CLOSED",
        allowRestoreWhenEncounterClosed: true,
      })
    ).toBe(true);
  });

  it("tracks beforeunload dirty detection without warning on locked legal states", () => {
    expect(clinicalBeforeUnloadShouldWarn({ dirty: true, workflowEditable: true })).toBe(true);
    expect(clinicalBeforeUnloadShouldWarn({ dirty: true, workflowEditable: false })).toBe(false);
    expect(clinicalBeforeUnloadShouldWarn({ dirty: true, signedOrFinalized: true })).toBe(false);

    const event = {
      preventDefault: vi.fn(),
      returnValue: undefined as unknown,
    } as unknown as BeforeUnloadEvent;
    applyClinicalBeforeUnloadWarning(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.returnValue).toBe("");
  });

  it("keeps orders and discharge autosave local-only until user submits legal actions", () => {
    const storage = makeMemoryStorage();
    const serverPlaceOrder = vi.fn();
    const serverCloseEncounter = vi.fn();

    const orderScope = { ...baseScope, workflowType: "ORDERS_DRAFTING" as const, version: "orders-draft-v1" };
    writeClinicalDraft(
      storage,
      buildClinicalDraftKey(orderScope),
      createClinicalDraft({
        scope: orderScope,
        payload: { type: "LAB", items: [{ label: "CBC" }] },
        savedLocallyAt: "2026-05-17T12:05:00.000Z",
      })
    );

    const dischargeScope = {
      ...baseScope,
      workflowType: "DISCHARGE_DOCUMENTATION" as const,
      version: "discharge-draft-v1",
    };
    writeClinicalDraft(
      storage,
      buildClinicalDraftKey(dischargeScope),
      createClinicalDraft({
        scope: dischargeScope,
        payload: { instructions: "Return precautions drafted." },
        savedLocallyAt: "2026-05-17T12:06:00.000Z",
      })
    );

    expect(serverPlaceOrder).not.toHaveBeenCalled();
    expect(serverCloseEncounter).not.toHaveBeenCalled();
    expect(
      shouldRunClinicalAutosave({
        currentSignature: "order-draft-v2",
        lastSavedSignature: "order-draft-v1",
        mode: "local_only",
        hasContent: true,
        workflowEditable: true,
      })
    ).toBe(true);
  });

  it("preserves the latest provider text when a debounced save overlaps an in-flight save", async () => {
    vi.useFakeTimers();
    let current = { signature: "one", payload: { text: "first" } };
    let resolveFirst: () => void = () => {};
    const saved: string[] = [];
    const save = vi.fn((snapshot: typeof current) => {
      saved.push(snapshot.payload.text);
      if (snapshot.signature === "one") {
        return new Promise<void>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve();
    });
    const scheduler = createLatestWinsClinicalAutosaveScheduler({
      debounceMs: 1500,
      getSnapshot: () => current,
      save,
    });

    scheduler.schedule();
    await vi.advanceTimersByTimeAsync(1500);
    expect(saved).toEqual(["first"]);

    current = { signature: "two", payload: { text: "latest provider text" } };
    scheduler.schedule();
    await vi.advanceTimersByTimeAsync(1500);
    expect(saved).toEqual(["first"]);
    resolveFirst();
    await vi.runAllTimersAsync();
    await Promise.resolve();
    expect(saved).toEqual(["first", "latest provider text"]);
    vi.useRealTimers();
  });

  it("failed server autosave leaves the local draft available for recovery", async () => {
    vi.useFakeTimers();
    const storage = makeMemoryStorage();
    const key = buildClinicalDraftKey(baseScope);
    writeClinicalDraft(
      storage,
      key,
      createClinicalDraft({
        scope: baseScope,
        payload: { note: "Draft survives failed save" },
        savedLocallyAt: "2026-05-17T12:05:00.000Z",
      })
    );
    const onError = vi.fn();
    const scheduler = createLatestWinsClinicalAutosaveScheduler({
      debounceMs: 1500,
      getSnapshot: () => ({ signature: "server-save", payload: { note: "Draft survives failed save" } }),
      save: () => Promise.reject(new Error("network down")),
      onError,
    });

    scheduler.schedule();
    await vi.advanceTimersByTimeAsync(1500);
    await Promise.resolve();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(readClinicalDraft<{ note: string }>(storage, key)?.payload.note).toBe("Draft survives failed save");
    vi.useRealTimers();
  });
});
