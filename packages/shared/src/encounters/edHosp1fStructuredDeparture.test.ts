import { describe, expect, it } from "vitest";
import { buildSmartAdmissionProposals } from "./smartAdmissionProposalsD4a2.js";
import {
  admissionReceivingUnitOptions,
  deriveEmtalaAttestationsFromEvidence,
  deriveOrderAckFromOrders,
  ED_HOSP_1F_UNIT_PENDING,
  hydrateBedFromPlacement,
  hydrateIvAccessFromChart,
  hydrateObservationNursingDefaults,
  hydrateReceivingUnitFromPlacement,
  encodeReceivingNurse,
  decodeReceivingNurse,
  isStructuredObservationNursingValue,
  isUnitedStatesEmtalaJurisdiction,
  isEmtalaLegalContentApplicable,
  observationReceivingUnitOptions,
  projectNursingDepartureReadiness,
  receivingUnitOptionsForPathway,
} from "../index.js";
import { requiredCompletionFieldsForPathway as requiredFields } from "./adaptiveEdNursingExecutionD4a2.js";

describe("ED.HOSP.1F structured departure + EMTALA derivation", () => {
  it("does not persist EMTALA YES without MSE evidence", () => {
    const gap = deriveEmtalaAttestationsFromEvidence({
      mseDocumentedAt: null,
      unitedStatesJurisdiction: true,
    });
    expect(gap.msePerformed).toBeNull();
    expect(gap.emergencyConditionConsidered).toBeNull();
    expect(gap.stabilizingTreatmentProvidedOrNotApplicable).toBeNull();
    expect(gap.mseStructuredGap).toBe(true);
    expect(gap.emcStructuredGap).toBe(true);
    expect(gap.stabilizingStructuredGap).toBe(true);
  });

  it("derives MSE YES only from documented MSE timestamp in US jurisdiction", () => {
    const yes = deriveEmtalaAttestationsFromEvidence({
      mseDocumentedAt: "2026-08-31T12:00:00.000Z",
      unitedStatesJurisdiction: true,
    });
    expect(yes.msePerformed).toBe(true);
    expect(yes.mseStructuredGap).toBe(false);
    expect(yes.emergencyConditionConsidered).toBeNull();
  });

  it("does not project EMTALA attestations for Haiti / non-US facilities", () => {
    expect(isUnitedStatesEmtalaJurisdiction("HT")).toBe(false);
    expect(isUnitedStatesEmtalaJurisdiction("Haiti")).toBe(false);
    expect(isUnitedStatesEmtalaJurisdiction("US")).toBe(true);
    expect(isUnitedStatesEmtalaJurisdiction("United States")).toBe(true);
    const ht = deriveEmtalaAttestationsFromEvidence({
      mseDocumentedAt: "2026-08-31T12:00:00.000Z",
      unitedStatesJurisdiction: false,
    });
    expect(ht.msePerformed).toBeNull();
  });

  it("HOSPITAL type / unknown applicability never auto-asserts EMTALA legal content", () => {
    expect(
      isEmtalaLegalContentApplicable({
        facilityCountry: "US",
        emtalaApplicability: "HOSPITAL_EMERGENCY_DEPARTMENT",
      }),
    ).toBe(true);
    expect(
      isEmtalaLegalContentApplicable({
        facilityCountry: "US",
        emtalaApplicability: "HOSPITAL_AFFILIATED_OFF_CAMPUS_ED",
      }),
    ).toBe(true);
    expect(
      isEmtalaLegalContentApplicable({
        facilityCountry: "HT",
        emtalaApplicability: "HOSPITAL_EMERGENCY_DEPARTMENT",
      }),
    ).toBe(false);
    expect(
      isEmtalaLegalContentApplicable({
        facilityCountry: "US",
        emtalaApplicability: "NOT_CONFIGURED",
      }),
    ).toBe(false);
    expect(
      isEmtalaLegalContentApplicable({
        facilityCountry: "US",
        emtalaApplicability: null,
      }),
    ).toBe(false);
    expect(
      isEmtalaLegalContentApplicable({
        facilityCountry: "US",
        emtalaApplicability: "INDEPENDENT_FREESTANDING_ER",
      }),
    ).toBe(false);
  });

  it("hydrates bed pending vs assigned without a second bed engine", () => {
    expect(hydrateBedFromPlacement(null, null)).toBe("BED_PENDING");
    expect(hydrateBedFromPlacement("A1", null)).toBe("A1");
  });

  it("hydrates IV from canonical lines; empty means no access", () => {
    expect(hydrateIvAccessFromChart([])).toBe("NO_ACCESS");
    expect(hydrateIvAccessFromChart([{ site: "LAC", gauge: "20G" }])).toContain("PERIPHERAL");
    expect(hydrateIvAccessFromChart([{ site: "LAC", gauge: "20G" }])).toContain("site:LAC");
  });

  it("order ack is derived from order state, not administration", () => {
    expect(deriveOrderAckFromOrders([])).toBe("NO_OUTSTANDING");
    expect(deriveOrderAckFromOrders([{ status: "PLACED", isInfusion: false }])).toBe("PENDING_IDENTIFIED");
  });

  it("observation nursing defaults stay on existing section keys", () => {
    const next = hydrateObservationNursingDefaults({
      sections: {},
      pathway: "OBSERVATION",
      chart: { assignedUnitCode: "OBS", assignedBedKey: null },
    });
    expect(next.receivingUnit).toBe("OBS");
    expect(next.assignedBed).toBe("BED_PENDING");
    expect(requiredFields("OBSERVATION")).toContain("receivingUnit");
  });

  it("Observation destination options are Observation-appropriate", () => {
    const opts = observationReceivingUnitOptions();
    expect(opts).toContain("OBS");
    expect(opts).not.toContain("MS");
    expect(opts).not.toContain("ICU");
    expect(opts).not.toContain("ED");
  });

  it("Admission destination options are inpatient-appropriate and do not default to OBS", () => {
    const opts = admissionReceivingUnitOptions();
    expect(opts).toContain("MS");
    expect(opts).toContain("ICU");
    expect(opts).not.toContain("OBS");
    expect(opts).not.toContain("ED");
    expect(opts).not.toContain("TELEMETRY");
    expect(opts).not.toContain("STEPDOWN");
    expect(hydrateReceivingUnitFromPlacement(null, "ADMISSION")).toBe(ED_HOSP_1F_UNIT_PENDING);
    expect(hydrateReceivingUnitFromPlacement(null, "ADMISSION")).not.toBe("OBS");
  });

  it("Admission does not silently default to OBS when hydrating empty sections", () => {
    const next = hydrateObservationNursingDefaults({
      sections: {},
      pathway: "ADMISSION",
      chart: { assignedUnitCode: null, assignedBedKey: null },
    });
    expect(next.receivingUnit).toBe(ED_HOSP_1F_UNIT_PENDING);
    expect(next.receivingUnit).not.toBe("OBS");
  });

  it("canonical assignedUnitCode hydrates for both pathways", () => {
    const adm = hydrateObservationNursingDefaults({
      sections: { receivingUnit: "OBS" },
      pathway: "ADMISSION",
      chart: { assignedUnitCode: "MS" },
    });
    expect(adm.receivingUnit).toBe("MS");
    const obs = hydrateObservationNursingDefaults({
      sections: {},
      pathway: "OBSERVATION",
      chart: { assignedUnitCode: "OBS" },
    });
    expect(obs.receivingUnit).toBe("OBS");
  });

  it("canonical assigned bed/room still hydrates", () => {
    expect(hydrateBedFromPlacement("MS:12", "3")).toBe("MS:12");
    expect(hydrateBedFromPlacement(null, "ROOM-4")).toBe("ROOM-4");
    const next = hydrateObservationNursingDefaults({
      sections: {},
      pathway: "ADMISSION",
      chart: { assignedUnitCode: "ICU", assignedBedKey: "ICU:2", assignedRoomKey: "2" },
    });
    expect(next.assignedBed).toBe("ICU:2");
    expect(next.receivingUnit).toBe("ICU");
  });

  it("missing Admission unit becomes structured pending, not a textarea", () => {
    expect(isStructuredObservationNursingValue("receivingUnit", ED_HOSP_1F_UNIT_PENDING)).toBe(true);
    const chips = projectNursingDepartureReadiness({
      sections: { receivingUnit: ED_HOSP_1F_UNIT_PENDING, assignedBed: "BED_PENDING" },
      requiredFieldIds: requiredFields("ADMISSION"),
    });
    expect(chips.find((c) => c.groupId === "destination")?.ready).toBe(false);
    const opts = receivingUnitOptionsForPathway({
      pathway: "ADMISSION",
      availableUnitCodes: [],
    });
    expect(opts).toEqual([]);
  });

  it("Admission OBS is kept only when canonical placement assigned OBS", () => {
    const explicit = hydrateObservationNursingDefaults({
      sections: {},
      pathway: "ADMISSION",
      chart: { assignedUnitCode: "OBS" },
    });
    expect(explicit.receivingUnit).toBe("OBS");
    expect(receivingUnitOptionsForPathway({ pathway: "ADMISSION", assignedUnitCode: "OBS" })).toContain(
      "OBS"
    );
  });

  it("does not invent a parallel nursing store key", () => {
    expect(requiredFields("OBSERVATION")).toContain("edDepartureAt");
    expect(requiredFields("ADMISSION")).toContain("receivingUnit");
  });

  it("readiness groups are compact chips, not an engineering paragraph", () => {
    const chips = projectNursingDepartureReadiness({
      sections: { receivingUnit: "OBS", assignedBed: "BED_PENDING" },
      requiredFieldIds: requiredFields("OBSERVATION"),
    });
    expect(chips.find((c) => c.groupId === "destination")?.ready).toBe(true);
    expect(chips.find((c) => c.groupId === "handoff")?.ready).toBe(false);
  });

  it("decodes structured receiving-nurse identity for handoff reuse", () => {
    const encoded = encodeReceivingNurse({
      source: "HANDOFF",
      userId: "rn-marie",
      displayName: "Marie Claire, RN",
    });
    expect(decodeReceivingNurse(encoded)).toEqual({
      source: "HANDOFF",
      userId: "rn-marie",
      displayName: "Marie Claire, RN",
    });
  });

  it("routine observation fields are structured codes, not free text", () => {
    expect(isStructuredObservationNursingValue("transportMethod", "WHEELCHAIR")).toBe(true);
    expect(isStructuredObservationNursingValue("transportMethod", "walked with family")).toBe(false);
    expect(isStructuredObservationNursingValue("conditionLeavingEd", "STABLE")).toBe(true);
    expect(isStructuredObservationNursingValue("handoff", "HANDOFF_REVIEWED")).toBe(true);
    expect(isStructuredObservationNursingValue("edDepartureAt", "2026-08-31T16:00:00.000Z")).toBe(true);
  });

  it("English proposal prefixes are English; clinician narrative is preserved", () => {
    const packet = buildSmartAdmissionProposals(
      { chiefComplaint: "Chest pain UAT", primaryDiagnosisDisplay: "R07.9" },
      "en"
    );
    expect(packet.fields.admissionReason?.value).toContain("Chief complaint: Chest pain UAT");
    expect(packet.fields.admissionReason?.value).not.toMatch(/Motif de consultation/);
    expect(packet.fields.admissionReason?.value).not.toMatch(/Diagnostic d'admission/);
    expect(packet.fields.admissionReason?.value).toContain("R07.9");
  });

  it("French proposal prefixes stay French while authored text is unchanged", () => {
    const packet = buildSmartAdmissionProposals(
      { chiefComplaint: "Chest pain UAT" },
      "fr"
    );
    expect(packet.fields.admissionReason?.value).toContain("Motif de consultation: Chest pain UAT");
  });
});
