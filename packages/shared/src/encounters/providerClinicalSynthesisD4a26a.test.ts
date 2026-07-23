import { describe, expect, it } from "vitest";
import {
  PROVIDER_CLINICAL_SYNTHESIS_CERTIFICATION_ID,
  buildCarryForwardDiff,
  buildProgressNoteCarryForward,
  buildProviderPrintPackage,
  classifyLabPanel,
  classifyMedGroup,
  computeProviderHospitalDay,
  filterProviderCensusRows,
  groupProviderTasks,
  projectDischargeReadiness,
  projectIntakeOutputSynthesis,
  projectLabLines,
  projectMedicationSnapshot,
  projectProviderVitals,
  projectRadiologyStudies,
  providerSynthesisMustNotAutoAcknowledge,
  providerSynthesisMustNotAutoGenerateAssessment,
  providerSynthesisMustNotDuplicateEnterpriseDomains,
  providerSynthesisMustSeparateCurrentVsAdmission,
  saveProviderProgressNoteDraft,
  signProviderProgressNote,
  sortProviderCensusRows,
} from "./providerClinicalSynthesisD4a26a.js";
import type { HospitalCensusPatientRow } from "./hospitalCensusV1.js";

describe("D4A.2.6A provider clinical synthesis", () => {
  it("certifies synthesis id and clinical safety invariants", () => {
    expect(PROVIDER_CLINICAL_SYNTHESIS_CERTIFICATION_ID).toBe(
      "MEDUI.PROVIDER_CLINICAL_SYNTHESIS.D4A2_6A"
    );
    expect(providerSynthesisMustNotAutoAcknowledge()).toBe(true);
    expect(providerSynthesisMustNotAutoGenerateAssessment()).toBe(true);
    expect(providerSynthesisMustNotDuplicateEnterpriseDomains()).toBe(true);
    expect(providerSynthesisMustSeparateCurrentVsAdmission()).toBe(true);
  });

  it("computes hospital day and projects vitals current/previous/abnormal", () => {
    expect(computeProviderHospitalDay("2026-07-20T08:00:00.000Z", "2026-07-22T10:00:00.000Z")).toBe(3);
    const vitals = projectProviderVitals({
      readings: [
        {
          measuredAt: "2026-07-22T08:00:00.000Z",
          vitals: { hr: 120, spo2: 88, systolic: 170, diastolic: 100, pain: 8 },
        },
        {
          measuredAt: "2026-07-22T04:00:00.000Z",
          vitals: { hr: 90, spo2: 96, systolic: 130, diastolic: 80, pain: 3 },
        },
      ],
      nowIso: "2026-07-22T09:00:00.000Z",
    });
    const hr = vitals.find((v) => v.key === "HR");
    expect(hr?.current).toBe("120");
    expect(hr?.previous).toBe("90");
    expect(hr?.abnormal).toBe(true);
    expect(hr?.source).toBe("ENTERPRISE_VITALS");
  });

  it("projects I&O with missing-documentation and balance warnings", () => {
    const missing = projectIntakeOutputSynthesis({ entries: [] });
    expect(missing.warnings).toContain("MISSING_DOCUMENTATION");
    const io = projectIntakeOutputSynthesis({
      nowIso: "2026-07-22T12:00:00.000Z",
      entries: [
        {
          cardId: "io-intake-output-summary",
          createdAt: "2026-07-22T10:00:00.000Z",
          payloadJson: { totalIntakeMl: 3000, totalOutputMl: 800, netBalanceMl: 2200 },
        },
        {
          cardId: "io-urine-output",
          createdAt: "2026-07-22T09:00:00.000Z",
          payloadJson: { amount: 200, unit: "mL" },
        },
      ],
    });
    expect(io.documentationPresent).toBe(true);
    expect(io.warnings).toContain("POSITIVE_BALANCE");
    expect(io.warnings).toContain("LOW_URINE_OUTPUT");
  });

  it("classifies labs/radiology/meds and never auto-acks", () => {
    expect(classifyLabPanel("CBC with differential")).toBe("CBC");
    expect(classifyMedGroup({ label: "Vancomycin 1g" })).toBe("ANTIBIOTICS");
    const labs = projectLabLines({
      items: [
        {
          orderItemId: "oi1",
          orderId: "o1",
          label: "Troponin",
          status: "COMPLETED",
          resultText: "0.12",
          previousResultText: "0.04",
          criticalValue: true,
          acknowledgedByProviderAt: null,
          resultUpdatedAt: "2026-07-22T08:00:00.000Z",
        },
      ],
    });
    expect(labs.critical[0]?.acknowledgedByProvider).toBe(false);
    expect(labs.critical[0]?.panel).toBe("TROPONIN");
    const rad = projectRadiologyStudies({
      items: [
        {
          orderItemId: "ri1",
          orderId: "r1",
          label: "CXR",
          status: "FINAL",
          impression: "No acute process",
          criticalValue: false,
          acknowledgedByProviderAt: null,
        },
      ],
    });
    expect(rad.final).toHaveLength(1);
    expect(rad.final[0]?.acknowledgedByProvider).toBe(false);
    const meds = projectMedicationSnapshot({
      items: [
        {
          orderItemId: "m1",
          orderId: "mo1",
          label: "Heparin infusion",
          dose: "12 u/kg/hr",
          route: "IV",
          held: false,
          recentlyChanged: true,
        },
      ],
    });
    expect(meds.groups.ANTICOAGULANTS?.[0]?.deepLinkDomain).toBe("MEDICATION_INTELLIGENCE");
    expect(meds.changes).toHaveLength(1);
  });

  it("supports progress note draft/sign/carry-forward without silent overwrite", () => {
    const draft = {
      noteId: "pn1",
      expectedVersion: 0,
      status: "DRAFT" as const,
      text: "Day 1 — improving",
      serviceDate: "2026-07-21",
    };
    const saved = saveProviderProgressNoteDraft({
      notes: [],
      note: draft,
      clientExpectedVersion: 0,
      documentExpectedVersion: 0,
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const signed = signProviderProgressNote({
      notes: saved.notes,
      noteId: "pn1",
      actorUserId: "u1",
      clientExpectedVersion: 0,
      documentExpectedVersion: 1,
    });
    expect(signed.ok).toBe(false);
    const signedOk = signProviderProgressNote({
      notes: saved.notes,
      noteId: "pn1",
      actorUserId: "u1",
      clientExpectedVersion: 1,
      documentExpectedVersion: 1,
    });
    expect(signedOk.ok).toBe(true);
    if (!signedOk.ok) return;
    const stale = saveProviderProgressNoteDraft({
      notes: signedOk.notes,
      note: { ...draft, text: "hack" },
      clientExpectedVersion: 1,
      documentExpectedVersion: 2,
    });
    expect(stale.ok).toBe(false);
    const cf = buildProgressNoteCarryForward({
      from: signedOk.notes[0]!,
      actorUserId: "u1",
      serviceDate: "2026-07-22",
    });
    expect(cf.carryForwardFromNoteId).toBe("pn1");
    expect(cf.status).toBe("DRAFT");
    const diff = buildCarryForwardDiff("A\nB", "A\nC");
    expect(diff.removed).toContain("B");
    expect(diff.new).toContain("C");
  });

  it("projects discharge readiness without auto-discharge", () => {
    const dc = projectDischargeReadiness({
      workflowState: "PLANNING",
      pendingConsultCount: 1,
      pendingPt: true,
      barriersText: "family and transportation",
    });
    expect(dc.neverAutoDischarge).toBe(true);
    expect(dc.medicalReady).toBe(false);
    expect(dc.barriers.some((b) => b.key === "PENDING_CONSULT")).toBe(true);
    expect(dc.barriers.some((b) => b.key === "PENDING_FAMILY")).toBe(true);
  });

  it("groups tasks and filters/sorts provider census", () => {
    const grouped = groupProviderTasks([
      {
        taskId: "1",
        type: "CRITICAL_RESULT_ACK",
        status: "OPEN",
        priority: "STAT",
        title: "Critical troponin",
      },
      {
        taskId: "2",
        type: "HP_DUE",
        status: "OPEN",
        priority: "URGENT",
        title: "H&P",
      },
      {
        taskId: "3",
        type: "MED_RECON_INCOMPLETE",
        status: "OPEN",
        priority: "ROUTINE",
        title: "Med recon",
      },
      {
        taskId: "4",
        type: "DISCHARGE_SUMMARY",
        status: "COMPLETED",
        priority: "ROUTINE",
        title: "DC summary",
      },
    ]);
    expect(grouped.critical).toHaveLength(1);
    expect(grouped.today).toHaveLength(1);
    expect(grouped.upcoming).toHaveLength(1);
    expect(grouped.completed).toHaveLength(1);

    const rows: HospitalCensusPatientRow[] = [
      {
        encounterId: "e1",
        clinicalContext: "INPATIENT",
        patientName: "Ada",
        mrn: "1",
        ageSex: null,
        unitRoomBed: "MS-2",
        chiefComplaint: null,
        attendingName: "Dr A",
        nurseName: null,
        admittedAt: null,
        losHours: 40,
        alerts: [{ code: "DISCHARGE_READY", severity: "info" }],
      },
      {
        encounterId: "e2",
        clinicalContext: "OBSERVATION",
        patientName: "Bob",
        mrn: "2",
        ageSex: null,
        unitRoomBed: "OBS-1",
        chiefComplaint: null,
        attendingName: "Dr B",
        nurseName: null,
        admittedAt: null,
        losHours: 10,
        alerts: [{ code: "PENDING_CONSULT", severity: "warning" }],
      },
    ];
    const filtered = filterProviderCensusRows(rows, { attending: "Dr A", medSurg: true });
    expect(filtered).toHaveLength(1);
    expect(sortProviderCensusRows(rows, "LOS")[0]?.encounterId).toBe("e1");
  });

  it("builds governed print packages as signed/revision-aware", () => {
    const pkg = buildProviderPrintPackage({
      kind: "PROVIDER_ROUNDING_SUMMARY",
      title: "Rounding summary",
      signed: true,
      revision: 2,
      providerSigned: true,
      sections: [{ heading: "Problems", body: "PNA — improving" }],
    });
    expect(pkg.authoritative).toBe(true);
    expect(pkg.auditEvent).toBe("PROVIDER_PRINT_PACKAGE_GENERATED");
    expect(pkg.revision).toBe(2);
  });
});
