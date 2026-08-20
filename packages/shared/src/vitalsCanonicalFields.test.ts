import { describe, expect, it } from "vitest";
import {
  readCanonicalVitalsMeasurements,
  canonicalVitalsHaveAnyMeasurement,
} from "./vitalsCanonicalFields.js";
import { computeBmiFromHeightCmWeightKg } from "./vitalsUnitConversions.js";
import { projectProviderVitals } from "./encounters/providerClinicalSynthesisD4a26a.js";
import { projectHospitalHeaderVitalsLiteFromJson } from "./encounters/inpatientRapidConvergenceD4a27c.js";
import { projectFacilityPrintIdentity } from "./auth/facilityClinicCareProfileD4c1.js";

describe("MEDUI.INP.2F canonical vitals projection", () => {
  it("reads enterprise storage keys bpSys/bpDia/hr/rr/tempC/spo2/painScore/heightCm/weightKg", () => {
    const m = readCanonicalVitalsMeasurements({
      bpSys: 126,
      bpDia: 78,
      hr: 88,
      rr: 16,
      tempC: 37.1,
      spo2: 97,
      painScore: 3,
      heightCm: 170,
      weightKg: 84.37,
    });
    expect(m).toEqual({
      bpSys: 126,
      bpDia: 78,
      hr: 88,
      rr: 16,
      tempC: 37.1,
      spo2: 97,
      painScore: 3,
      heightCm: 170,
      weightKg: 84.37,
    });
  });

  it("maps documented aliases without preferring updatedAt", () => {
    const m = readCanonicalVitalsMeasurements({
      systolic: 140,
      diastolic: 90,
      heartRate: 70,
      respiratoryRate: 18,
      temperatureC: 36.6,
      oxygenSaturation: 99,
      pain: 0,
      height: 165,
      weight: 60,
    });
    expect(m.bpSys).toBe(140);
    expect(m.bpDia).toBe(90);
    expect(m.hr).toBe(70);
    expect(m.rr).toBe(18);
    expect(m.tempC).toBe(36.6);
    expect(m.spo2).toBe(99);
    expect(m.painScore).toBe(0);
    expect(m.heightCm).toBe(165);
    expect(m.weightKg).toBe(60);
  });

  it("projects header lite from bpSys/bpDia and does not hardcode facility identity", () => {
    const lite = projectHospitalHeaderVitalsLiteFromJson(
      { bpSys: 126, bpDia: 78, hr: 80, heightCm: 170, weightKg: 84.37 },
      "2026-08-19T12:00:00.000Z"
    );
    expect(lite.availability).toBe("AVAILABLE");
    expect(lite.systolic).toBe(126);
    expect(lite.diastolic).toBe(78);
    expect(lite.heightCm).toBe(170);
    expect(lite.weightKg).toBe(84.37);
    expect(lite.heartRate).toBe(80);

    const a = projectFacilityPrintIdentity({
      facilityName: "Facility Alpha",
      careProfileJson: {
        schemaVersion: 1,
        address: { line1: "1 Alpha Way", city: "Port-au-Prince", phone: "111" },
        printDisplayName: "Facility Alpha",
      },
    });
    const b = projectFacilityPrintIdentity({
      facilityName: "Facility Beta",
      careProfileJson: {
        schemaVersion: 1,
        address: { line1: "2 Beta Road", city: "Santo Domingo", phone: "222" },
        printDisplayName: "Facility Beta",
      },
    });
    expect(a.displayName).toBe("Facility Alpha");
    expect(a.address.line1).toBe("1 Alpha Way");
    expect(b.displayName).toBe("Facility Beta");
    expect(b.address.line1).toBe("2 Beta Road");
    expect(JSON.stringify(a)).not.toMatch(/Clinique Bon Samaritain|Wayne Urgent Care/i);
  });

  it("projects Overview BP/height/weight from canonical storage keys", () => {
    const vitals = projectProviderVitals({
      readings: [
        {
          measuredAt: "2026-08-19T10:00:00.000Z",
          vitals: { bpSys: 126, bpDia: 78, hr: 88, tempC: 37, weightKg: 84.37, heightCm: 170 },
        },
        {
          measuredAt: "2026-08-19T06:00:00.000Z",
          vitals: { bpSys: 118, bpDia: 72, hr: 80, tempC: 36.8, weightKg: 84.1, heightCm: 170 },
        },
      ],
      nowIso: "2026-08-19T11:00:00.000Z",
    });
    expect(vitals.find((v) => v.key === "BP")?.current).toBe("126/78");
    expect(vitals.find((v) => v.key === "BP")?.previous).toBe("118/72");
    expect(vitals.find((v) => v.key === "TEMP")?.current).toBe("37");
    expect(vitals.find((v) => v.key === "WEIGHT")?.current).toBe("84.37");
    expect(vitals.find((v) => v.key === "HEIGHT")?.current).toBe("170");
    expect(vitals.find((v) => v.key === "BMI")?.current).toBe("29.2");
  });

  it("derives BMI only at presentation from height and weight", () => {
    expect(computeBmiFromHeightCmWeightKg(170, 84.37)).toBe(29.2);
    expect(computeBmiFromHeightCmWeightKg(null, 84.37)).toBeNull();
    expect(canonicalVitalsHaveAnyMeasurement(readCanonicalVitalsMeasurements({}))).toBe(false);
  });
});
