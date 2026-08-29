import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  D4C8A_CERTIFICATION_ID,
  enterpriseEncounterRecordPath,
  isEnterpriseEncounterClosed,
  projectEnterpriseEncounterListLifecycle,
  shouldShowEnterpriseReopenAction,
} from "@medora/shared";
import { resolveClinicBoardPatientNameHref } from "@/features/clinic-care/clinicCareBoardRoutes";
import { resolveEdBoardPatientNameHref } from "@/features/emergency/emergencyRoutes";
import { projectEncounterListLifecycle } from "@/components/patient-chart/encounterListProjection";

describe("MEDUI.D4C.8A enterprise closed encounter viewer & navigation", () => {
  it("exports certification id and shared closed predicate", () => {
    expect(D4C8A_CERTIFICATION_ID).toBe("MEDUI.D4C.8A");
    expect(isEnterpriseEncounterClosed("CLOSED")).toBe(true);
    expect(isEnterpriseEncounterClosed("OPEN")).toBe(false);
  });

  it("Clinic closed patient click routes to encounterId, not patientId", () => {
    expect(
      resolveClinicBoardPatientNameHref({
        encounterId: "enc-closed",
        patientId: "pat-1",
        status: "CLOSED",
      })
    ).toBe("/app/encounters/enc-closed");
    expect(
      resolveClinicBoardPatientNameHref({
        encounterId: "enc-open",
        patientId: "pat-1",
        status: "OPEN",
      })
    ).toContain("workspace=ambulatory");
  });

  it("does not treat SIGNED as CLOSED on Clinic or ED boards", () => {
    expect(
      resolveClinicBoardPatientNameHref({
        encounterId: "enc-signed",
        patientId: "pat-1",
        status: "SIGNED",
      })
    ).not.toContain("/app/patients/");
    expect(
      resolveEdBoardPatientNameHref({ encounterId: "enc-signed", status: "SIGNED" })
    ).toContain("/app/emergency/active/");
  });

  it("list projection keeps lock + encounter route for CLOSED only", () => {
    const closed = projectEncounterListLifecycle({
      id: "c1",
      status: "CLOSED",
      closedAt: "2026-08-14T12:00:00.000Z",
    });
    expect(closed.isClosed).toBe(true);
    expect(closed.href).toBe(enterpriseEncounterRecordPath("c1"));
    expect(
      projectEnterpriseEncounterListLifecycle({
        id: "o1",
        status: "OPEN",
        providerDocumentationStatus: "SIGNED",
      }).isClosed
    ).toBe(false);
  });

  it("reopen affordance uses D4C.7K roles only on CLOSED", () => {
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["ADMIN"] })).toBe(true);
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["PROVIDER"] })).toBe(false);
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["RN"] })).toBe(false);
    expect(shouldShowEnterpriseReopenAction({ status: "OPEN", roleCodes: ["ADMIN"] })).toBe(false);
  });

  it("wires enterprise closed shell, banner, lifecycle, and reopen into encounter surfaces", () => {
    const viewer = readFileSync(
      resolve(__dirname, "./EnterpriseClosedEncounterViewer.tsx"),
      "utf8"
    );
    expect(viewer).toContain("CLOSED_READ_ONLY");
    expect(viewer).toContain("EnterpriseClosedEncounterBanner");
    expect(viewer).toContain("EnterpriseReopenEncounterAction");
    expect(viewer).toContain("EnterpriseEncounterLifecycleTimeline");
    expect(viewer).not.toContain("JSON.stringify");

    const encounterPage = readFileSync(
      resolve(__dirname, "../../../app/app/encounters/[id]/page.tsx"),
      "utf8"
    );
    expect(encounterPage).toContain("EnterpriseClosedEncounterViewer");
    expect(encounterPage).toContain("isEnterpriseEncounterClosed");

    const ambulatory = readFileSync(
      resolve(__dirname, "../../features/clinic-care/ClinicCareActiveAmbulatoryWorkspaceView.tsx"),
      "utf8"
    );
    expect(ambulatory).toContain("EnterpriseClosedEncounterViewer");

    const edArchive = readFileSync(
      resolve(__dirname, "../../features/emergency/EmergencyClosedChartArchiveView.tsx"),
      "utf8"
    );
    expect(edArchive).toContain("EnterpriseClosedEncounterViewer");
    expect(edArchive).toContain('data-testid="ed-closed-chart-archive"');

    // INP.HIST.1A — CLOSED inpatient uses the same enterprise shell + history strip
    expect(encounterPage).toContain("InpatientClosedEncounterHistoryStrip");
    expect(encounterPage).toContain("careSetting.inpatient");
    expect(encounterPage).toContain("inpatientAllEncounters");
    expect(encounterPage).toContain("inpatientAllEncountersPath");
  });

  it("French lock / banner keys exist without raw-key leakage", () => {
    const fr = readFileSync(resolve(__dirname, "../../i18n/messages/fr.ts"), "utf8");
    const en = readFileSync(resolve(__dirname, "../../i18n/messages/en.ts"), "utf8");
    for (const src of [fr, en]) {
      expect(src).toContain("enterpriseClosedEncounterD4c8a:");
      expect(src).toContain('title: "');
      expect(src).toContain("lifecycle:");
    }
    expect(fr).toContain("Rencontre fermée");
    expect(fr).toContain("lecture seule");
    expect(en).toContain("Closed Encounter");
  });
});
