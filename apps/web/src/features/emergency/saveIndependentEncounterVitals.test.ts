import { describe, expect, it, vi } from "vitest";
import { saveIndependentEncounterVitals } from "./saveIndependentEncounterVitals";

const baseForm = {
  tempC: "98",
  hr: "78",
  rr: "16",
  bpSys: "124",
  bpDia: "87",
  spo2: "99",
  weightKg: "178",
  heightCm: "",
  heightFeet: "5",
  heightInches: "7",
  painScore: "4",
  tempInputUnit: "F" as const,
  weightInputUnit: "lb" as const,
  heightInputMode: "ftin" as const,
  temperatureSite: "ORAL",
  oxygenDevice: "ROOM_AIR",
  oxygenFlowLpm: "",
  oxygenFiO2Percent: "",
  oxygenDeviceNotes: "",
  measuredDate: "2026-07-15",
  measuredTime: "00:17",
  allergyNote: "",
};

describe("saveIndependentEncounterVitals", () => {
  it("still sends PUT when GET triage returns null (first vitals save)", async () => {
    const calls: Array<{ path: string; method?: string; body?: string }> = [];
    const fetchImpl = vi.fn(async (path: string, options?: { method?: string; body?: string }) => {
      calls.push({ path, method: options?.method, body: options?.body });
      if (!options?.method || options.method === "GET") {
        return null;
      }
      return { id: "triage-1", vitalsJson: { hr: 78 }, updatedAt: "2026-07-15T05:17:00.000Z" };
    });

    const result = await saveIndependentEncounterVitals({
      encounterId: "enc-1",
      facilityId: "fac-1",
      form: baseForm,
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.createdFirstTriageRow).toBe(true);
      expect(result.measuredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.vitalsJson.hr).toBe(78);
    }
    expect(calls.filter((c) => (c.method ?? "GET") === "GET")).toHaveLength(1);
    const puts = calls.filter((c) => c.method === "PUT");
    expect(puts).toHaveLength(1);
    expect(puts[0]!.path).toBe("/encounters/enc-1/triage");
    const body = JSON.parse(puts[0]!.body ?? "{}") as Record<string, unknown>;
    expect(body.measuredAt).toEqual(expect.any(String));
    expect(body.vitalsJson).toEqual(
      expect.objectContaining({
        hr: 78,
        rr: 16,
        bpSys: 124,
        bpDia: 87,
        spo2: 99,
        temperatureSite: "ORAL",
        oxygenDevice: "ROOM_AIR",
      })
    );
    expect(body.esi).toBeNull();
    expect(body.chiefComplaint).toBeNull();
  });

  it("blocks before request when measuredAt is invalid", async () => {
    const fetchImpl = vi.fn();
    const result = await saveIndependentEncounterVitals({
      encounterId: "enc-1",
      facilityId: "fac-1",
      form: { ...baseForm, measuredDate: "", measuredTime: "00:17" },
      fetchImpl: fetchImpl as never,
    });
    expect(result).toEqual({ ok: false, code: "INVALID_MEASURED_AT" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("preserves existing non-vitals fields on subsequent save", async () => {
    const fetchImpl = vi.fn(async (path: string, options?: { method?: string; body?: string }) => {
      if (!options?.method || options.method === "GET") {
        return {
          id: "triage-1",
          chiefComplaint: "Chest pain",
          esi: 3,
          vitalsJson: { hr: 70 },
          updatedAt: "2026-07-15T04:00:00.000Z",
          strokeScreen: null,
          sepsisScreen: null,
          onsetAt: null,
          triageCompleteAt: null,
        };
      }
      return { id: "triage-1" };
    });

    const result = await saveIndependentEncounterVitals({
      encounterId: "enc-1",
      facilityId: "fac-1",
      form: baseForm,
      fetchImpl: fetchImpl as never,
    });
    expect(result.ok).toBe(true);
    const putCall = fetchImpl.mock.calls.find((c) => c[1]?.method === "PUT");
    const body = JSON.parse(String(putCall?.[1]?.body ?? "{}")) as Record<string, unknown>;
    expect(body.chiefComplaint).toBe("Chest pain");
    expect(body.esi).toBe(3);
    expect(body.lastKnownTriageUpdatedAt).toBe("2026-07-15T04:00:00.000Z");
  });

  it("requires encounter and facility context", async () => {
    const result = await saveIndependentEncounterVitals({
      encounterId: "",
      facilityId: "fac-1",
      form: baseForm,
      fetchImpl: vi.fn() as never,
    });
    expect(result).toEqual({ ok: false, code: "MISSING_CONTEXT" });
  });
});
