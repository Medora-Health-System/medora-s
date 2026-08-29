/**
 * INP.HIST.1A — CLOSED archive / closed-viewer wiring regressions.
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

describe("INP.HIST.1A inpatient closed encounter history", () => {
  it("parses landing modes", () => {
    expect(parseInpatientLandingPatientMode(null)).toBe("active");
    expect(parseInpatientLandingPatientMode("allEncounters")).toBe("allEncounters");
  });

  it("View Record always opens enterprise closed chart — never active workspace", () => {
    expect(inpatientHistoryRecordHref({ id: "ip-1", status: "CLOSED" })).toBe(
      "/app/encounters/ip-1?from=inpatientAllEncounters"
    );
    expect(inpatientHistoryRecordHref({ id: "ip-2", status: "OPEN" })).toBe(
      "/app/encounters/ip-2?from=inpatientAllEncounters"
    );
    expect(inpatientHistoryRecordHref({ id: "ip-1" })).not.toContain("/inpatient/active/");
    expect(inpatientHistoryRecordHref({ id: "ip-1" })).not.toContain("section=summary");
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

  it("archive is CLOSED-only UI: no status filter, no row engineering warning, no live actions", () => {
    const ws = readFileSync(join(root, "InpatientAllEncountersWorkspace.tsx"), "utf8");
    expect(ws).toContain("printEncounterChartLivePreview");
    expect(ws).toContain("loadInpatientArchiveMedicalRecordPrintInputs");
    expect(ws).toContain("inpatientHistoryRecordHref");
    expect(ws).toContain("legalMedicalRecord: true");
    expect(ws).not.toContain("orders: []");
    expect(ws).not.toContain("triage: null");
    expect(ws).not.toContain("inp-hist-1a-status");
    expect(ws).not.toContain("statusAll");
    expect(ws).not.toContain("timelineIncomplete");
    expect(ws).not.toContain("canProviderWrite");
    expect(ws).not.toContain("patchInpatient");
    expect(ws).not.toContain("inpatient/active");
    expect(ws).toContain("table.disposition");
  });

  it("archive print preload loads canonical orders and triage endpoints", () => {
    const api = readFileSync(join(root, "inpatientEncounterHistoryApi.ts"), "utf8");
    expect(api).toContain("loadInpatientArchiveMedicalRecordPrintInputs");
    expect(api).toContain("fetchOrdersForEncounter");
    expect(api).toContain("/triage");
    expect(api).not.toMatch(/orders:\s*\[\]/);
    expect(api).not.toContain("inpatientActiveWorkspacePath");
  });

  it("closed strip has location history section + related ED without orange row warnings", () => {
    const strip = readFileSync(join(root, "InpatientClosedEncounterHistoryStrip.tsx"), "utf8");
    expect(strip).toContain("buildInpatientHospitalCourseProjection");
    expect(strip).toContain("originatingEdEncounterId");
    expect(strip).toContain("inp-hist-1a-location-history");
    expect(strip).toContain("locationHistoryUnavailable");
    expect(strip).toContain("locationHistoryFromTransfers");
    expect(strip).not.toContain("inferSameDay");
    expect(strip).not.toContain("#92400e");
  });

  it("generic encounters page mounts EnterpriseClosedEncounterViewer for inpatient CLOSED", () => {
    const page = readFileSync(
      join(process.cwd(), "app/app/encounters/[id]/page.tsx"),
      "utf8"
    );
    expect(page).toContain("EnterpriseClosedEncounterViewer");
    expect(page).toContain("InpatientClosedEncounterHistoryStrip");
    expect(page).toContain("inpatientAllEncounters");
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
