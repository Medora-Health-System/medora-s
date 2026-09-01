import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  classifyEdHospHospitalBoardSurface,
  isEdHospAdmissionsReceivingRow,
  isEdHospObservationReceivingRow,
  isEdHospPlacementQueueRow,
  preserveSignedProviderDispositionOnNursingWrite,
} from "@medora/shared";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  isHospitalBoardAdmissionsReceivingRow,
  isHospitalBoardObservationReceivingRow,
  isHospitalBoardPlacementQueueRow,
} from "./hospitalCarePlacementApi";
import { HOSPITAL_CARE_HOME, HOSPITAL_CARE_PLACEMENT_QUEUE } from "./hospitalCarePaths";

const root = join(__dirname);

describe("ED.HOSP.1G existing hospital board connection", () => {
  it("does not add a second incoming/placement/census route", () => {
    const paths = readFileSync(join(root, "hospitalCarePaths.ts"), "utf8");
    expect(paths).not.toMatch(/incoming-hospital|incoming-admission-board|incoming-board/i);
    expect(HOSPITAL_CARE_HOME).toBe("/app/hospitalisation");
    expect(HOSPITAL_CARE_PLACEMENT_QUEUE).toBe("/app/hospitalisation/placement-queue");
  });

  it("Placement queue uses 1G no-bed projection, not BED_ASSIGNED occupancy", () => {
    const queue = readFileSync(join(root, "HospitalCarePlacementQueueView.tsx"), "utf8");
    expect(queue).toContain("isHospitalBoardPlacementQueueRow");
    expect(queue).not.toContain("PLACEMENT_QUEUE_STATUS_SET.has");
    expect(
      isHospitalBoardPlacementQueueRow({
        id: "p1",
        status: "REQUESTED",
        trackboardLabel: null,
        requestedEncounterType: "OBSERVATION",
        requestedLevelOfCare: null,
        requestedService: null,
        clinicalPriority: null,
        acceptingProviderNameSnapshot: null,
        assignedUnitCode: null,
        assignedRoomKey: null,
        assignedBedKey: null,
        departedEdAt: null,
        arrivedDestinationAt: null,
        readyForTransferAt: null,
        originatingEncounterId: "ed-1",
        receivingEncounterId: null,
        requestedAt: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        patient: {
          id: "pt",
          firstName: "A",
          lastName: "B",
          mrn: "1",
          dob: null,
          sexAtBirth: null,
        },
      })
    ).toBe(true);
  });

  it("bed-assigned Observation is Observation receiving; Admission is Admissions receiving", () => {
    expect(
      isHospitalBoardObservationReceivingRow({
        id: "p2",
        status: "BED_ASSIGNED",
        trackboardLabel: null,
        requestedEncounterType: "OBSERVATION",
        requestedLevelOfCare: null,
        requestedService: null,
        clinicalPriority: null,
        acceptingProviderNameSnapshot: null,
        assignedUnitCode: "OBS",
        assignedRoomKey: "1",
        assignedBedKey: "OBS-1",
        departedEdAt: null,
        arrivedDestinationAt: null,
        readyForTransferAt: null,
        originatingEncounterId: "ed-2",
        receivingEncounterId: null,
        requestedAt: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        patient: {
          id: "pt",
          firstName: "A",
          lastName: "B",
          mrn: "1",
          dob: null,
          sexAtBirth: null,
        },
      })
    ).toBe(true);
    expect(
      isHospitalBoardAdmissionsReceivingRow({
        id: "p3",
        status: "BED_ASSIGNED",
        trackboardLabel: null,
        requestedEncounterType: "INPATIENT",
        requestedLevelOfCare: null,
        requestedService: null,
        clinicalPriority: null,
        acceptingProviderNameSnapshot: null,
        assignedUnitCode: "MS",
        assignedRoomKey: "2",
        assignedBedKey: "MS:2",
        departedEdAt: null,
        arrivedDestinationAt: null,
        readyForTransferAt: null,
        originatingEncounterId: "ed-3",
        receivingEncounterId: null,
        requestedAt: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        patient: {
          id: "pt",
          firstName: "A",
          lastName: "B",
          mrn: "1",
          dob: null,
          sexAtBirth: null,
        },
      })
    ).toBe(true);
  });

  it("Observation census overlays incoming on the existing Observation surface", () => {
    const census = readFileSync(
      join(root, "../observation-workspace/ObservationCensusView.tsx"),
      "utf8"
    );
    expect(census).toContain("HospitalCareIncomingPlacementSection");
    expect(census).toContain("isHospitalBoardObservationReceivingRow");
    expect(census).not.toMatch("/app/hospitalisation/incoming");
  });

  it("Admissions list uses 1G receiving filter and review path", () => {
    const admissions = readFileSync(join(root, "HospitalCareAdmissionsView.tsx"), "utf8");
    expect(admissions).toContain("isHospitalBoardAdmissionsReceivingRow");
    expect(admissions).toContain("hospitalAdmissionReviewPath");
    expect(admissions).not.toContain("PLACEMENT_QUEUE_STATUS_SET.has");
  });

  it("mirrors 1G i18n keys", () => {
    expect(Object.keys(en.edHosp1gHospitalBoard).sort()).toEqual(
      Object.keys(fr.edHosp1gHospitalBoard).sort()
    );
    expect(fr.edHosp1gHospitalBoard.startReceiving).toContain("admission infirmière");
  });

  it("reuses existing Start Nursing Admission copy and receiving workspace paths", () => {
    const incoming = readFileSync(join(root, "HospitalCareIncomingPlacementSection.tsx"), "utf8");
    expect(incoming).toContain("observationNursingWorkspacePath");
    expect(incoming).toContain("inpatientNursingWorkspacePath");
    expect(incoming).toContain("hospitalAdmissionReviewPath");
    expect(incoming).toContain("placementActionsForStatus");
    expect(incoming).toContain("MARK_READY");
    expect(incoming).toContain("MARK_DEPARTED");
    expect(incoming).not.toMatch("/admin/users");
  });

  it("#193 provider signature preservation remains available", () => {
    const prior = {
      erDispositionV1: {
        documentationStatus: "SIGNED",
        signedAt: "2026-09-01T12:00:00.000Z",
        signedByDisplayName: "Dr. Provider",
        revision: 2,
        signature: { savedByDisplayName: "Dr. Provider" },
      },
    };
    const incoming = {
      erDispositionV1: {
        documentationStatus: "DRAFT",
        signedAt: "2026-09-01T15:00:00.000Z",
        signedByDisplayName: "Synth EdHosp1fRn",
        signature: { savedByDisplayName: "Synth EdHosp1fRn" },
      },
    };
    const out = preserveSignedProviderDispositionOnNursingWrite(prior, incoming) as {
      erDispositionV1: { documentationStatus: string; signedAt: string; signedByDisplayName: string };
    };
    expect(out.erDispositionV1.documentationStatus).toBe("SIGNED");
    expect(out.erDispositionV1.signedByDisplayName).toBe("Dr. Provider");
    expect(out.erDispositionV1.signedAt).toBe("2026-09-01T12:00:00.000Z");
  });

  it("does not add a clinical-board reconcile button", () => {
    const home = readFileSync(join(root, "HospitalCareHomeView.tsx"), "utf8");
    const queue = readFileSync(join(root, "HospitalCarePlacementQueueView.tsx"), "utf8");
    expect(home).not.toMatch(/reconcile-signed-decisions|reconcileSigned/);
    expect(queue).not.toMatch(/reconcile-signed-decisions|reconcileSigned/);
  });

  it("excludes non-hospital destinations from hospital board surfaces", () => {
    for (const dest of ["HOME", "AMA", "LWBS", "ELOPEMENT", "DECEASED", "TRANSFER"]) {
      expect(classifyEdHospHospitalBoardSurface({ requestedEncounterType: dest, status: "REQUESTED" })).toBe(
        "EXCLUDED"
      );
      expect(isEdHospPlacementQueueRow({ requestedEncounterType: dest, status: "REQUESTED" })).toBe(
        false
      );
      expect(isEdHospObservationReceivingRow({ requestedEncounterType: dest, status: "BED_ASSIGNED", assignedBedKey: "X" })).toBe(
        false
      );
      expect(isEdHospAdmissionsReceivingRow({ requestedEncounterType: dest, status: "BED_ASSIGNED", assignedBedKey: "X" })).toBe(
        false
      );
    }
  });
});
