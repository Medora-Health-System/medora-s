/**
 * INP.HIST.1A — navigation / archive wiring regressions.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  inpatientHistoryRecordHref,
  inpatientAllEncountersPath,
} from "./inpatientEncounterHistoryApi";
import { parseInpatientLandingPatientMode } from "./InpatientLandingPatientModeTabs";
import {
  HOSPITAL_CARE_INPATIENT,
  HOSPITAL_CARE_BEDS,
  HOSPITAL_CARE_TRANSFERS,
} from "@/features/hospital-care/hospitalCarePaths";

const root = join(__dirname);

describe("INP.HIST.1A inpatient encounter history", () => {
  it("parses landing modes", () => {
    expect(parseInpatientLandingPatientMode(null)).toBe("active");
    expect(parseInpatientLandingPatientMode("allEncounters")).toBe("allEncounters");
  });

  it("routes closed records to enterprise viewer; open to Summary", () => {
    expect(inpatientHistoryRecordHref({ id: "ip-1", status: "CLOSED" })).toContain(
      "/app/encounters/ip-1"
    );
    expect(inpatientHistoryRecordHref({ id: "ip-1", status: "CLOSED" })).toContain(
      "from=inpatientAllEncounters"
    );
    expect(inpatientHistoryRecordHref({ id: "ip-2", status: "OPEN" })).toContain(
      "section=summary"
    );
    expect(inpatientAllEncountersPath()).toBe("/app/hospitalisation/inpatient?mode=allEncounters");
  });

  it("hub mounts Active/All tabs; unit boards are not the archive", () => {
    const hub = readFileSync(join(root, "InpatientGraphicalHubView.tsx"), "utf8");
    expect(hub).toContain("InpatientLandingPatientModeTabs");
    expect(hub).toContain("InpatientAllEncountersWorkspace");
    expect(hub).toContain('mode === "allEncounters"');
    expect(HOSPITAL_CARE_INPATIENT).toBe("/app/hospitalisation/inpatient");
    expect(HOSPITAL_CARE_BEDS).not.toContain("allEncounters");
    expect(HOSPITAL_CARE_TRANSFERS).not.toContain("allEncounters");
  });

  it("archive UI uses View Record + Print and does not invent write controls", () => {
    const ws = readFileSync(join(root, "InpatientAllEncountersWorkspace.tsx"), "utf8");
    expect(ws).toContain("printEncounterChartLivePreview");
    expect(ws).toContain("loadInpatientArchiveMedicalRecordPrintInputs");
    expect(ws).toContain("inpatientHistoryRecordHref");
    expect(ws).toContain("legalMedicalRecord: true");
    expect(ws).not.toContain("orders: []");
    expect(ws).not.toContain("triage: null");
    expect(ws).not.toContain("canProviderWrite");
    expect(ws).not.toContain("patchInpatient");
  });

  it("archive print preload loads canonical orders and triage endpoints", () => {
    const api = readFileSync(join(root, "inpatientEncounterHistoryApi.ts"), "utf8");
    expect(api).toContain("loadInpatientArchiveMedicalRecordPrintInputs");
    expect(api).toContain("fetchOrdersForEncounter");
    expect(api).toContain("/triage");
    expect(api).not.toMatch(/orders:\s*\[\]/);
  });

  it("closed strip projects canonical course + related ED only", () => {
    const strip = readFileSync(join(root, "InpatientClosedEncounterHistoryStrip.tsx"), "utf8");
    expect(strip).toContain("buildInpatientHospitalCourseProjection");
    expect(strip).toContain("originatingEdEncounterId");
    expect(strip).not.toContain("inferSameDay");
  });

  it("hospital care operational tab paths unchanged (no All Encounters global tab)", () => {
    const paths = readFileSync(
      join(__dirname, "../hospital-care/hospitalCarePaths.ts"),
      "utf8"
    );
    expect(paths).toContain('HOSPITAL_CARE_INPATIENT = "/app/hospitalisation/inpatient"');
    expect(paths).not.toContain("allEncounters");
    expect(paths).toContain("HOSPITAL_CARE_BEDS");
    expect(paths).toContain("HOSPITAL_CARE_TRANSFERS");
  });
});
