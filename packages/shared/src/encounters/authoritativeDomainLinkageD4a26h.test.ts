import { describe, expect, it } from "vitest";
import { emptyMedSurgNursingAdmissionDocV1 } from "./medSurgNursingAdmissionD4a1.js";
import {
  AUTHORITATIVE_DOMAIN_LINKAGE_CERTIFICATION_ID,
  assertReferenceIsLinkable,
  buildAuthoritativeReferenceFromEdoc,
  buildProviderDomainProjection,
  classifyDomainReference,
  completionMustRejectSyntheticDomainReferences,
  isPersistedEdocRecordId,
  isSyntheticDomainRecordId,
  nursingAmendmentPolicyForEncounterState,
  printMustNotSubstituteLatestForReferencedRecord,
  projectAuthoritativeSectionCompletion,
  providerMustRejectSyntheticDomainSources,
  resolveAuthoritativeCodeStatus,
  resolveAuthoritativeIsolation,
} from "./authoritativeDomainLinkageD4a26h.js";

const UUID = "11111111-2222-4333-8444-555555555555";

describe("D4A.2.6H authoritative domain linkage", () => {
  it("certifies hardening invariants", () => {
    expect(AUTHORITATIVE_DOMAIN_LINKAGE_CERTIFICATION_ID).toBe(
      "MEDUI.AUTHORITATIVE_DOMAIN_LINKAGE.D4A2_6H"
    );
    expect(completionMustRejectSyntheticDomainReferences()).toBe(true);
    expect(providerMustRejectSyntheticDomainSources()).toBe(true);
    expect(printMustNotSubstituteLatestForReferencedRecord()).toBe(true);
  });

  it("detects synthetic client IDs and accepts persisted EDOC UUIDs", () => {
    expect(isSyntheticDomainRecordId(`edoc-pain_initial_assessment-${Date.now()}`)).toBe(true);
    expect(isSyntheticDomainRecordId(`ref-pain_edoc13-${Date.now()}`)).toBe(true);
    expect(isSyntheticDomainRecordId("tmp-1")).toBe(true);
    expect(isSyntheticDomainRecordId(UUID)).toBe(false);
    expect(isPersistedEdocRecordId(UUID)).toBe(true);
    expect(isPersistedEdocRecordId("allergy-note")).toBe(false);
    expect(assertReferenceIsLinkable({ recordId: `edoc-x-${Date.now()}` }).ok).toBe(false);
    expect(assertReferenceIsLinkable({ recordId: UUID }).ok).toBe(true);
  });

  it("does not complete pain from synthetic or unresolved links", () => {
    let doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "p1",
      facilityId: "f1",
      encounterId: "e1",
    });
    doc = {
      ...doc,
      sections: {
        ...doc.sections,
        PAIN: {
          sectionId: "PAIN",
          completionState: "COMPLETE",
          expectedVersion: 1,
          answers: { painPresent: "YES" },
        },
      },
      domainReferences: [
        {
          domain: "PAIN_EDOC13",
          recordId: `edoc-pain_initial_assessment-${Date.now()}`,
          status: "LINKED",
          sectionId: "PAIN",
          source: "LEGACY_SYNTHETIC",
        },
      ],
    };
    const projection = projectAuthoritativeSectionCompletion({
      doc,
      sectionId: "PAIN",
      expectedEncounterId: "e1",
      expectedPatientId: "p1",
      expectedFacilityId: "f1",
      resolvedByRecordId: {},
    });
    expect(projection.projectedState).toBe("IN_PROGRESS");
    expect(projection.authoritativeLinkedCount).toBe(0);
    expect(projection.legacySyntheticCount).toBe(1);
    expect(projection.reasons).toContain("AUTHORITATIVE_DOMAIN_RECORD_REQUIRED");
  });

  it("completes when resolved authoritative EDOC row matches encounter", () => {
    let doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "p1",
      facilityId: "f1",
      encounterId: "e1",
    });
    const ref = buildAuthoritativeReferenceFromEdoc({
      domain: "PAIN_EDOC13",
      sectionId: "PAIN",
      actorUserId: "rn1",
      row: {
        id: UUID,
        facilityId: "f1",
        encounterId: "e1",
        patientId: "p1",
        category: "PAIN",
        cardId: "pain_initial_assessment",
        createdAt: "2026-07-22T10:00:00.000Z",
      },
    });
    doc = {
      ...doc,
      sections: {
        ...doc.sections,
        PAIN: {
          sectionId: "PAIN",
          completionState: "COMPLETE",
          expectedVersion: 1,
        },
      },
      domainReferences: [ref],
    };
    const projection = projectAuthoritativeSectionCompletion({
      doc,
      sectionId: "PAIN",
      expectedEncounterId: "e1",
      expectedPatientId: "p1",
      expectedFacilityId: "f1",
      resolvedByRecordId: {
        [UUID]: {
          id: UUID,
          facilityId: "f1",
          encounterId: "e1",
          patientId: "p1",
          category: "PAIN",
          cardId: "pain_initial_assessment",
          createdAt: "2026-07-22T10:00:00.000Z",
        },
      },
    });
    expect(projection.projectedState).toBe("COMPLETE");
    expect(projection.authoritativeLinkedCount).toBe(1);
  });

  it("rejects cross-encounter and voided records", () => {
    const ref = {
      domain: "PAIN_EDOC13" as const,
      recordId: UUID,
      status: "LINKED" as const,
      source: "ENTERPRISE_DOMAIN" as const,
    };
    expect(
      classifyDomainReference({
        reference: ref,
        expectedEncounterId: "e1",
        expectedPatientId: "p1",
        expectedFacilityId: "f1",
        expectedDomain: "PAIN_EDOC13",
        resolved: {
          id: UUID,
          facilityId: "f1",
          encounterId: "other",
          patientId: "p1",
          category: "PAIN",
          cardId: "pain_initial_assessment",
          createdAt: "2026-07-22T10:00:00.000Z",
        },
      }).state
    ).toBe("ENCOUNTER_MISMATCH");
    expect(
      classifyDomainReference({
        reference: ref,
        expectedEncounterId: "e1",
        expectedPatientId: "p1",
        expectedFacilityId: "f1",
        expectedDomain: "PAIN_EDOC13",
        resolved: {
          id: UUID,
          facilityId: "f1",
          encounterId: "e1",
          patientId: "p1",
          category: "PAIN",
          cardId: "pain_initial_assessment",
          createdAt: "2026-07-22T10:00:00.000Z",
          voidedAt: "2026-07-22T11:00:00.000Z",
        },
      }).state
    ).toBe("VOIDED_OR_ENTERED_IN_ERROR");
  });

  it("provider projection excludes synthetic sources and distinguishes current vs admission", () => {
    const admissionId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const currentId = "ffffffff-1111-4222-8333-444444444444";
    const projection = buildProviderDomainProjection({
      domain: "PAIN_EDOC13",
      admissionRefs: [
        {
          domain: "PAIN_EDOC13",
          recordId: admissionId,
          status: "LINKED",
          source: "ENTERPRISE_DOMAIN",
        },
        {
          domain: "PAIN_EDOC13",
          recordId: `edoc-pain-${Date.now()}`,
          status: "LINKED",
          source: "LEGACY_SYNTHETIC",
        },
      ],
      resolvedByRecordId: {
        [admissionId]: {
          id: admissionId,
          facilityId: "f1",
          encounterId: "e1",
          patientId: "p1",
          category: "PAIN",
          cardId: "pain_initial_assessment",
          createdAt: "2026-07-22T09:00:00.000Z",
          authorDisplayName: "RN A",
        },
      },
      expectedEncounterId: "e1",
      expectedPatientId: "p1",
      expectedFacilityId: "f1",
      currentRecord: {
        id: currentId,
        facilityId: "f1",
        encounterId: "e1",
        patientId: "p1",
        category: "PAIN",
        cardId: "pain_reassessment",
        createdAt: "2026-07-22T15:00:00.000Z",
        authorDisplayName: "RN B",
      },
    });
    expect(projection.state).toBe("RESOLVED");
    expect(projection.currentRecordId).toBe(currentId);
    expect(projection.admissionTimeRecordId).toBe(admissionId);
    expect(projection.provenance).toBe("ENTERPRISE_DOMAIN");
  });

  it("reads code status and isolation from clinical ops without inventing defaults", () => {
    expect(resolveAuthoritativeCodeStatus(null).documented).toBe(false);
    expect(resolveAuthoritativeCodeStatus({ version: 1 }).value).toBeNull();
    expect(
      resolveAuthoritativeCodeStatus({
        version: 1,
        codeStatus: {
          status: "DNR",
          effectiveAt: "2026-07-22T10:00:00.000Z",
          documentedByUserId: "u1",
        },
      }).value
    ).toBe("DNR");
    expect(
      resolveAuthoritativeIsolation({
        version: 1,
        isolation: {
          precautions: ["CONTACT"],
          startedAt: "2026-07-22T10:00:00.000Z",
          orderedByUserId: "u1",
        },
      }).value
    ).toBe("CONTACT");
  });

  it("governs amendment policy after discharge, cancel, and void", () => {
    expect(
      nursingAmendmentPolicyForEncounterState({
        encounterStatus: "CLOSED",
        nursingSigned: true,
      })
    ).toBe("ALLOW_CLINICAL_AMENDMENT");
    expect(
      nursingAmendmentPolicyForEncounterState({
        encounterStatus: "OPEN",
        nursingSigned: false,
      })
    ).toBe("DENY");
    expect(
      nursingAmendmentPolicyForEncounterState({
        encounterStatus: "CLOSED",
        cancelled: true,
        nursingSigned: true,
      })
    ).toBe("ALLOW_CLINICAL_AMENDMENT");
    expect(
      nursingAmendmentPolicyForEncounterState({
        encounterStatus: "CLOSED",
        cancelled: true,
        nursingSigned: false,
      })
    ).toBe("READ_ONLY");
    expect(
      nursingAmendmentPolicyForEncounterState({
        encounterStatus: "CLOSED",
        voided: true,
        nursingSigned: true,
      })
    ).toBe("ADMINISTRATIVE_ONLY");
  });
});
