import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ED_DISCHARGE_MODE_HOME,
  EdClosedEncounterCertificationStatus,
} from "@medora/shared";
import {
  ED_ALL_ENCOUNTERS_ARCHIVE_DEFAULT_LIMIT,
  ED_ALL_ENCOUNTERS_ARCHIVE_MAX_LIMIT,
  computeArchiveLos,
  filterEdAllEncountersArchiveRows,
  isEncounterCertifiedClosedForDisplay,
  isEncounterEligibleForAllEncounters,
  mapEmergencyEncountersArchiveApiRow,
  resolveEdArchiveBillingStatusLabelKey,
  shouldReplaceArchiveRows,
  type EdAllEncountersArchiveRow,
} from "@/features/emergency/edAllEncountersArchive";
import { buildEdClosedEncounterCertificationFromEncounter } from "@/features/emergency/edClosedEncounterCertificationFromEncounter";

function certifiedClosedEncounter(overrides: Record<string, unknown> = {}) {
  return {
    id: "enc-archive-1",
    status: "CLOSED",
    type: "EMERGENCY",
    providerDocumentationStatus: "SIGNED",
    chiefComplaint: "Chest pain",
    providerNote: "Note",
    treatmentPlan: "Plan",
    createdAt: "2026-06-01T10:00:00.000Z",
    dischargedAt: "2026-06-01T14:30:00.000Z",
    dischargeSummaryJson: {
      dischargeMode: ED_DISCHARGE_MODE_HOME,
      nursingDischargeSummary: "Discharge done",
    },
    nursingAssessment: {
      nursingEvalV1: { sections: { assessment: { text: "Done" } } },
      erDispositionExecutionV1: {
        dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
        dischargeSortieCompletedByDisplayName: "RN",
      },
    },
    patient: {
      id: "pat-1",
      firstName: "Marie",
      lastName: "Joseph",
      dob: "1990-01-01",
      sexAtBirth: "F",
      mrn: "MRN-100",
      phone: "555-0100",
    },
    facility: { name: "Clinique Medora" },
    billingFinalizationStatus: "READY",
    billingReadinessSnapshotJson: { isReady: true },
    ...overrides,
  };
}

function baseArchiveRow(overrides: Partial<EdAllEncountersArchiveRow> = {}): EdAllEncountersArchiveRow {
  return {
    id: "enc-archive-1",
    patientName: "Marie Joseph",
    mrn: "MRN-100",
    gender: "F",
    age: 36,
    dob: "1990-01-01",
    chiefComplaint: "Chest pain",
    visitDate: "2026-06-01T10:00:00.000Z",
    los: "04h 30m",
    status: "certified_closed",
    facilityName: "Clinique Medora",
    billingStatusLabel: "ready_for_billing",
    billingReady: true,
    codingReady: true,
    billingFinalizationStatus: "READY",
    billingReadinessSnapshot: { isReady: true },
    phone: "555-0100",
    chartHref: "/app/emergency/chart/enc-archive-1",
    demoHref: "/app/patients/pat-1/profile",
    certifiedClosed: true,
    allEncountersEligible: true,
    updatedAt: "2026-06-01T14:30:00.000Z",
    ...overrides,
  };
}

describe("edAllEncountersArchive (MEDUI.ED.LIFECYCLE.7A)", () => {
  it("includes CLOSED + SIGNED + certified encounters", () => {
    const encounter = certifiedClosedEncounter();
    expect(isEncounterEligibleForAllEncounters(encounter)).toBe(true);
    const row = mapEmergencyEncountersArchiveApiRow({ ...encounter, diagnosisCount: 1 });
    expect(row).not.toBeNull();
    expect(row?.certifiedClosed).toBe(true);
    expect(row?.status).toBe("certified_closed");
  });

  it("includes CLOSED + SIGNED even when billing is not ready", () => {
    const encounter = certifiedClosedEncounter({
      billingReadinessSnapshotJson: { isReady: false },
      billingFinalizationStatus: "NOT_READY",
    });
    expect(isEncounterEligibleForAllEncounters(encounter)).toBe(true);
    const row = mapEmergencyEncountersArchiveApiRow({ ...encounter, diagnosisCount: 1 });
    expect(row).not.toBeNull();
    expect(row?.billingReady).toBe(false);
    expect(row?.billingStatusLabel).toBe("billing_not_ready");
  });

  it("includes CLOSED + SIGNED when coding review is needed", () => {
    const encounter = certifiedClosedEncounter({ billingReadinessSnapshotJson: { isReady: true } });
    const row = mapEmergencyEncountersArchiveApiRow({ ...encounter, diagnosisCount: 0 });
    expect(row).not.toBeNull();
    expect(row?.codingReady).toBe(false);
    expect(row?.billingStatusLabel).toBe("coding_review_needed");
  });

  it("includes CLOSED + SIGNED when billing snapshot is missing", () => {
    const encounter = certifiedClosedEncounter({ billingReadinessSnapshotJson: null });
    const row = mapEmergencyEncountersArchiveApiRow({ ...encounter, diagnosisCount: 1 });
    expect(row).not.toBeNull();
    expect(row?.billingStatusLabel).toBe("not_reviewed");
  });

  it("allEncountersEligible false does not exclude closed signed chart", () => {
    const encounter = certifiedClosedEncounter({
      billingReadinessSnapshotJson: { isReady: false },
    });
    expect(isEncounterCertifiedClosedForDisplay(encounter, { diagnosisCount: 0 })).toBe(false);
    expect(isEncounterEligibleForAllEncounters(encounter)).toBe(true);
    expect(mapEmergencyEncountersArchiveApiRow({ ...encounter, diagnosisCount: 0 })).not.toBeNull();
  });

  it("excludes CLOSED unsigned encounters", () => {
    const encounter = certifiedClosedEncounter({
      status: "CLOSED",
      providerDocumentationStatus: "DRAFT",
    });
    expect(isEncounterEligibleForAllEncounters(encounter)).toBe(false);
    expect(mapEmergencyEncountersArchiveApiRow({ ...encounter, diagnosisCount: 1 })).toBeNull();
  });

  it("excludes OPEN encounters", () => {
    const encounter = certifiedClosedEncounter({ status: "OPEN" });
    expect(isEncounterEligibleForAllEncounters(encounter)).toBe(false);
    expect(mapEmergencyEncountersArchiveApiRow({ ...encounter, diagnosisCount: 1 })).toBeNull();
  });

  it("excludes incomplete chart lifecycle encounters (OPEN unsigned)", () => {
    const encounter = certifiedClosedEncounter({
      status: "OPEN",
      providerDocumentationStatus: "DRAFT",
    });
    expect(isEncounterEligibleForAllEncounters(encounter)).toBe(false);
  });

  it("excludes ready-for-closure encounters (OPEN signed but not closed)", () => {
    const encounter = certifiedClosedEncounter({ status: "OPEN" });
    const certification = buildEdClosedEncounterCertificationFromEncounter(encounter, {
      dispositionReadiness: {
        canClose: true,
        blockers: [],
        warnings: [],
        activeOrderCounts: { lab: 0, imaging: 0, medication: 0, care: 0 },
      },
      diagnosisCount: 1,
    });
    expect(certification.status).toBe(EdClosedEncounterCertificationStatus.READY_FOR_CLOSURE);
    expect(isEncounterEligibleForAllEncounters(encounter)).toBe(false);
  });

  it("displays billing readiness when source present", () => {
    const encounter = certifiedClosedEncounter();
    const certification = buildEdClosedEncounterCertificationFromEncounter(encounter, {
      diagnosisCount: 1,
    });
    expect(resolveEdArchiveBillingStatusLabelKey(encounter, certification)).toBe("ready_for_billing");
  });

  it("displays coding review needed when coding blockers exist", () => {
    const encounter = certifiedClosedEncounter({ billingReadinessSnapshotJson: { isReady: true } });
    const certification = buildEdClosedEncounterCertificationFromEncounter(encounter, {
      diagnosisCount: 0,
    });
    expect(resolveEdArchiveBillingStatusLabelKey(encounter, certification)).toBe("coding_review_needed");
  });

  it("displays billing not ready when blockers exist", () => {
    const encounter = certifiedClosedEncounter({
      billingReadinessSnapshotJson: { isReady: false, reason: "payer missing" },
    });
    const certification = buildEdClosedEncounterCertificationFromEncounter(encounter, {
      diagnosisCount: 1,
    });
    expect(resolveEdArchiveBillingStatusLabelKey(encounter, certification)).toBe("billing_not_ready");
  });

  it("displays not reviewed when billing source missing", () => {
    const encounter = certifiedClosedEncounter({ billingReadinessSnapshotJson: null });
    const certification = buildEdClosedEncounterCertificationFromEncounter(encounter, {
      diagnosisCount: 1,
    });
    expect(resolveEdArchiveBillingStatusLabelKey(encounter, certification)).toBe("not_reviewed");
  });

  it("filters search by patient name", () => {
    const rows = [baseArchiveRow(), baseArchiveRow({ id: "enc-2", patientName: "Jean Paul" })];
    expect(filterEdAllEncountersArchiveRows(rows, { search: "marie", startDate: "", endDate: "" })).toHaveLength(1);
  });

  it("filters search by MRN", () => {
    const rows = [baseArchiveRow(), baseArchiveRow({ id: "enc-2", mrn: "MRN-200" })];
    expect(filterEdAllEncountersArchiveRows(rows, { search: "mrn-100", startDate: "", endDate: "" })).toHaveLength(1);
  });

  it("filters search by chief complaint", () => {
    const rows = [baseArchiveRow(), baseArchiveRow({ id: "enc-2", chiefComplaint: "Fever" })];
    expect(filterEdAllEncountersArchiveRows(rows, { search: "chest", startDate: "", endDate: "" })).toHaveLength(1);
  });

  it("filters by visit date range", () => {
    const rows = [
      baseArchiveRow({ visitDate: "2026-06-01T10:00:00.000Z" }),
      baseArchiveRow({ id: "enc-2", visitDate: "2026-06-10T10:00:00.000Z" }),
    ];
    const filtered = filterEdAllEncountersArchiveRows(rows, {
      search: "",
      startDate: "2026-06-01",
      endDate: "2026-06-05",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("enc-archive-1");
  });

  it("certifies archive fetch limit bounds", () => {
    expect(ED_ALL_ENCOUNTERS_ARCHIVE_DEFAULT_LIMIT).toBe(100);
    expect(ED_ALL_ENCOUNTERS_ARCHIVE_MAX_LIMIT).toBe(200);
    const archive = readFileSync(join(import.meta.dirname, "edAllEncountersArchive.ts"), "utf8");
    expect(archive).toContain("ED_ALL_ENCOUNTERS_ARCHIVE_DEFAULT_LIMIT");
    expect(archive).toContain("ED_ALL_ENCOUNTERS_ARCHIVE_MAX_LIMIT");
    expect(archive).toContain("paginated server-side");
  });

  it("does not call billing mutation APIs from archive module", () => {
    const archive = readFileSync(join(import.meta.dirname, "edAllEncountersArchive.ts"), "utf8");
    expect(archive).toContain("/emergency/encounters/archive");
    expect(archive).not.toContain("method: \"POST\"");
    expect(archive).not.toContain("finalizeBilling");
    expect(archive).not.toContain("submitClaim");
  });

  it("silent refresh preserves rows when snapshot unchanged", () => {
    const rows = [baseArchiveRow()];
    expect(shouldReplaceArchiveRows(rows, rows)).toBe(false);
  });

  it("computes archive LOS from discharge timestamp", () => {
    expect(computeArchiveLos("2026-06-01T10:00:00.000Z", "2026-06-01T14:30:00.000Z")).toBe("04h 30m");
  });
});
