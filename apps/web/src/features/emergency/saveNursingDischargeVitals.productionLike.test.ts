/**
 * Production-like first-save certification for nursing discharge vitals.
 * Must fail if GET /triage null aborts before PUT (pre-hotfix behavior).
 */
import { describe, expect, it, vi } from "vitest";
import { saveNursingDischargeVitals } from "./saveNursingDischargeVitals";
import {
  resolveAuthoritativeNursingDischargeReadingId,
  validateNursingDischargeVitalsGate,
} from "./nursingDischargeVitalsModel";

const dischargeForm = {
  tempC: "98.6",
  tempInputUnit: "F" as const,
  hr: "72",
  rr: "16",
  bpSys: "118",
  bpDia: "76",
  spo2: "99",
  weightKg: "",
  heightCm: "",
  painScore: "2",
  temperatureSite: "ORAL",
  oxygenDevice: "ROOM_AIR",
  oxygenFlowLpm: "",
  oxygenFiO2Percent: "",
  oxygenDeviceNotes: "",
  measuredDate: "2026-07-15",
  measuredTime: "01:05",
  allergyNote: "",
};

describe("saveNursingDischargeVitals — first-save null triage", () => {
  it("GET null → exactly one PUT with NURSING_DISCHARGE → associates ACTIVE reading", async () => {
    const methods: string[] = [];
    let putBody: Record<string, unknown> | null = null;
    const readingId = "reading-nd-1";

    const fetchImpl = vi.fn(async (path: string, options?: { method?: string; body?: string }) => {
      const method = (options?.method ?? "GET").toUpperCase();
      methods.push(`${method} ${path}`);
      if (method === "GET" && path === "/encounters/enc-nd/triage") {
        return null;
      }
      if (method === "PUT" && path === "/encounters/enc-nd/triage") {
        putBody = JSON.parse(options?.body ?? "{}") as Record<string, unknown>;
        return { id: "triage-new", vitalsJson: putBody.vitalsJson, updatedAt: "2026-07-15T06:05:00.000Z" };
      }
      if (method === "GET" && path.startsWith("/patients/pat-1/triage")) {
        const vitals = (putBody?.vitalsJson ?? {}) as Record<string, unknown>;
        return {
          latest: {
            encounterId: "enc-nd",
            encounterType: "EMERGENCY",
            triageId: "triage-new",
            updatedAt: "2026-07-15T06:05:00.000Z",
            triageCompleteAt: null,
            vitalsJson: vitals,
            readingId,
            measuredAt: putBody?.measuredAt as string,
            status: "ACTIVE",
            recordedByInitials: "AC",
            recordedByDisplayName: "Alex Clinician",
          },
          history: [],
        };
      }
      throw new Error(`Unexpected ${method} ${path}`);
    });

    const result = await saveNursingDischargeVitals({
      encounterId: "enc-nd",
      facilityId: "fac-1",
      patientId: "pat-1",
      confirmedByDisplayName: "Alex Clinician",
      form: dischargeForm,
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(methods.filter((m) => m.startsWith("GET /encounters/enc-nd/triage"))).toHaveLength(1);
    expect(methods.filter((m) => m.startsWith("PUT /encounters/enc-nd/triage"))).toHaveLength(1);
    expect(putBody).not.toBeNull();
    expect((putBody!.vitalsJson as Record<string, unknown>).recordingContext).toBe("NURSING_DISCHARGE");
    expect(putBody!.measuredAt).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
    expect(result.readingId).toBe(readingId);
    expect(result.association.dischargeVitalReadingId).toBe(readingId);
    expect(result.association.dischargeVitalsSelectedFromExisting).toBe(false);
    expect(result.snapshot.hr).toBe("72");
    expect(result.createdFirstTriageRow).toBe(true);
    expect(validateNursingDischargeVitalsGate(result.association).ok).toBe(true);
  });

  it("preserves existing non-null triage fields on subsequent discharge save", async () => {
    const fetchImpl = vi.fn(async (path: string, options?: { method?: string; body?: string }) => {
      if ((options?.method ?? "GET") === "GET" && path.includes("/encounters/")) {
        return {
          id: "triage-1",
          chiefComplaint: "Abdominal pain",
          esi: 3,
          vitalsJson: { hr: 80 },
          updatedAt: "2026-07-15T05:00:00.000Z",
        };
      }
      if (options?.method === "PUT") {
        const body = JSON.parse(options.body ?? "{}") as Record<string, unknown>;
        expect(body.chiefComplaint).toBe("Abdominal pain");
        expect(body.esi).toBe(3);
        return { id: "triage-1", vitalsJson: body.vitalsJson };
      }
      return {
        latest: {
          encounterId: "enc-nd",
          encounterType: "EMERGENCY",
          triageId: "triage-1",
          updatedAt: "2026-07-15T06:05:00.000Z",
          triageCompleteAt: null,
          vitalsJson: { recordingContext: "NURSING_DISCHARGE", hr: 72 },
          readingId: "r2",
          measuredAt: "2026-07-15T06:05:00.000Z",
          status: "ACTIVE",
        },
        history: [],
      };
    });

    const result = await saveNursingDischargeVitals({
      encounterId: "enc-nd",
      facilityId: "fac-1",
      patientId: "pat-1",
      confirmedByDisplayName: "Nurse B",
      form: dischargeForm,
      fetchImpl: fetchImpl as never,
    });
    expect(result.ok).toBe(true);
  });

  it("double-invoke with saving guard yields one PUT", async () => {
    let putCount = 0;
    const fetchImpl = vi.fn(async (path: string, options?: { method?: string; body?: string }) => {
      if ((options?.method ?? "GET") === "GET" && path.includes("/encounters/")) return null;
      if (options?.method === "PUT") {
        putCount += 1;
        await new Promise((r) => setTimeout(r, 8));
        return { id: "t1", vitalsJson: { recordingContext: "NURSING_DISCHARGE", hr: 70 } };
      }
      return {
        latest: {
          encounterId: "enc-nd",
          encounterType: "EMERGENCY",
          triageId: "t1",
          updatedAt: new Date().toISOString(),
          triageCompleteAt: null,
          vitalsJson: { recordingContext: "NURSING_DISCHARGE", hr: 70 },
          readingId: "r-dup",
          measuredAt: "2026-07-15T06:05:00.000Z",
          status: "ACTIVE",
        },
        history: [],
      };
    });

    let saving = false;
    const run = async () => {
      if (saving) return { skipped: true as const };
      saving = true;
      try {
        return await saveNursingDischargeVitals({
          encounterId: "enc-nd",
          facilityId: "fac-1",
          patientId: "pat-1",
          confirmedByDisplayName: "AC",
          form: dischargeForm,
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
  });

  it("failed PUT preserves caller draft (no mutation of form)", async () => {
    const form = { ...dischargeForm, hr: "88" };
    const fetchImpl = vi.fn(async (_path: string, options?: { method?: string }) => {
      if ((options?.method ?? "GET") === "GET") return null;
      throw new Error("network down");
    });
    const result = await saveNursingDischargeVitals({
      encounterId: "enc-nd",
      facilityId: "fac-1",
      patientId: "pat-1",
      confirmedByDisplayName: "AC",
      form,
      fetchImpl: fetchImpl as never,
    });
    expect(result.ok).toBe(false);
    expect(form.hr).toBe("88");
    expect(form.measuredDate).toBe("2026-07-15");
  });
});

describe("resolveAuthoritativeNursingDischargeReadingId", () => {
  it("rejects VOIDED readings and prefers NURSING_DISCHARGE context", () => {
    const measuredAt = "2026-07-15T06:05:00.000Z";
    const id = resolveAuthoritativeNursingDischargeReadingId({
      encounterId: "enc-1",
      measuredAtIso: measuredAt,
      candidates: [
        {
          encounterId: "enc-1",
          readingId: "voided",
          measuredAt,
          status: "VOIDED",
          vitalsJson: { recordingContext: "NURSING_DISCHARGE" },
        },
        {
          encounterId: "enc-1",
          readingId: "old-triage",
          measuredAt,
          status: "ACTIVE",
          vitalsJson: { recordingContext: "TRIAGE" },
        },
        {
          encounterId: "enc-1",
          readingId: "discharge",
          measuredAt,
          status: "ACTIVE",
          vitalsJson: { recordingContext: "NURSING_DISCHARGE" },
        },
      ],
    });
    expect(id).toBe("discharge");
  });

  it("does not associate a reading from another encounter", () => {
    const id = resolveAuthoritativeNursingDischargeReadingId({
      encounterId: "enc-1",
      measuredAtIso: "2026-07-15T06:05:00.000Z",
      candidates: [
        {
          encounterId: "enc-other",
          readingId: "x",
          measuredAt: "2026-07-15T06:05:00.000Z",
          status: "ACTIVE",
          vitalsJson: { recordingContext: "NURSING_DISCHARGE" },
        },
      ],
    });
    expect(id).toBeNull();
  });
});
