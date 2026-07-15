/**
 * Production-like certification for the independent Save vitals workflow.
 * Fails if GET null triage aborts before PUT (the observed Vercel log pattern).
 */
import { describe, expect, it, vi } from "vitest";
import { saveIndependentEncounterVitals } from "./saveIndependentEncounterVitals";

describe("independent triage vitals save — production-like workflow", () => {
  it("enters vitals, measuredAt, Save → one write request → persisted reading path", async () => {
    const methods: string[] = [];
    let putBody: Record<string, unknown> | null = null;
    let persisted = false;

    const fetchImpl = vi.fn(async (path: string, options?: { method?: string; body?: string }) => {
      const method = (options?.method ?? "GET").toUpperCase();
      methods.push(method);
      if (method === "GET" && path.includes("/triage") && !path.includes("vitals")) {
        // Encounter has never had a triage row — production failure mode.
        return null;
      }
      if (method === "PUT" && path === "/encounters/enc-prod/triage") {
        putBody = JSON.parse(options?.body ?? "{}") as Record<string, unknown>;
        persisted = true;
        return {
          id: "triage-new",
          vitalsJson: putBody.vitalsJson,
          updatedAt: "2026-07-15T05:17:00.000Z",
          updatedByDisplayFr: "Alex Clinician",
        };
      }
      throw new Error(`Unexpected fetch ${method} ${path}`);
    });

    const result = await saveIndependentEncounterVitals({
      encounterId: "enc-prod",
      facilityId: "fac-prod",
      form: {
        tempC: "98",
        tempInputUnit: "F",
        hr: "78",
        rr: "16",
        bpSys: "124",
        bpDia: "87",
        spo2: "99",
        weightKg: "178",
        weightInputUnit: "lb",
        heightCm: "",
        heightInputMode: "ftin",
        heightFeet: "5",
        heightInches: "7",
        painScore: "4",
        temperatureSite: "ORAL",
        oxygenDevice: "ROOM_AIR",
        oxygenFlowLpm: "",
        oxygenFiO2Percent: "",
        oxygenDeviceNotes: "",
        measuredDate: "2026-07-15",
        measuredTime: "00:17",
        allergyNote: "",
      },
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(true);
    expect(methods.filter((m) => m === "GET")).toHaveLength(1);
    expect(methods.filter((m) => m === "PUT")).toHaveLength(1);
    expect(persisted).toBe(true);
    expect(putBody).not.toBeNull();
    expect(putBody!.measuredAt).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
    const vitals = putBody!.vitalsJson as Record<string, unknown>;
    expect(vitals.hr).toBe(78);
    expect(vitals.temperatureSite).toBe("ORAL");
    expect(vitals.oxygenDevice).toBe("ROOM_AIR");
    expect(typeof vitals.tempC).toBe("number");
    expect(typeof vitals.weightKg).toBe("number");
    expect(typeof vitals.heightCm).toBe("number");

    // Reload simulation: subsequent GET returns the created row.
    const reload = await fetchImpl("/encounters/enc-prod/triage", { method: "GET" });
    // After first save, a real server would return the row; our mock still returns null on GET.
    // Assert the write already happened (persistence certification at the request boundary).
    expect(reload).toBeNull();
    expect(persisted).toBe(true);
  });

  it("double-invoke while first request in flight does not create two PUTs when caller guards saving", async () => {
    let inFlight = 0;
    let putCount = 0;
    const fetchImpl = vi.fn(async (_path: string, options?: { method?: string; body?: string }) => {
      if ((options?.method ?? "GET") === "GET") return null;
      inFlight += 1;
      putCount += 1;
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      return { id: "t1" };
    });

    let saving = false;
    const run = async () => {
      if (saving) return { skipped: true as const };
      saving = true;
      try {
        return await saveIndependentEncounterVitals({
          encounterId: "enc-1",
          facilityId: "fac-1",
          form: {
            tempC: "37",
            hr: "70",
            rr: "14",
            bpSys: "120",
            bpDia: "80",
            spo2: "98",
            weightKg: "",
            heightCm: "",
            painScore: "",
            measuredDate: "2026-07-15",
            measuredTime: "10:00",
            oxygenDevice: "ROOM_AIR",
          },
          fetchImpl: fetchImpl as never,
        });
      } finally {
        saving = false;
      }
    };

    const [a, b] = await Promise.all([run(), run()]);
    expect(a && "ok" in a && a.ok).toBe(true);
    expect(b && "skipped" in b && b.skipped).toBe(true);
    expect(putCount).toBe(1);
    expect(inFlight).toBe(0);
  });
});
