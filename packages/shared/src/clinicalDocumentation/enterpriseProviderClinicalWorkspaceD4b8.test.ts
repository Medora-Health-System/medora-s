/**
 * MEDUI.D4B.8 — Enterprise provider clinical workspace tests (composition v2).
 */

import { describe, expect, it } from "vitest";
import {
  assertNoteProblemDoesNotMutateProblemList,
  buildEnterpriseProviderClinicalWorkspaceSummary,
  buildProviderCensusRow,
  canIndependentlyFinalizeProviderNote,
  composeEncounterNoteProviderDocument,
  composeProviderDocumentationShellDocument,
  createAssessmentPlanProblemEntry,
  createMedicalDecisionMaking,
  distinguishAttestationFromAuthorship,
  distinguishCarePlanReviewFromRewrite,
  distinguishConsultRecFromOrder,
  distinguishCoordinationReviewFromRewrite,
  distinguishDiagnosisRefFromBilling,
  distinguishMarProjectionFromAdministration,
  distinguishMedicationProjectionFromReconciliation,
  distinguishNoteProblemFromProblemList,
  distinguishNoteTextFromOrder,
  distinguishProgressNoteFromDischargeSummary,
  distinguishProviderAssignmentFromAuthorization,
  distinguishProviderDischargeReadinessFromAuthorization,
  distinguishResultInclusionFromAcknowledgment,
  durableLifecycleOwnerForProviderNoteType,
  ENTERPRISE_PROVIDER_CLINICAL_WORKSPACE_CERTIFICATION_ID,
  evaluateCopyForwardSafety,
  PROVIDER_CLINICAL_WORKSPACE_AUTHORITY_INVARIANTS,
  PROVIDER_CLINICAL_WORKSPACE_COMPOSITION,
  PROVIDER_NOTE_TYPE_DEFERRED_IDS,
  PROVIDER_NOTE_TYPE_IDS,
  PROVIDER_NOTE_TYPE_REGISTRY,
  projectProviderCatalogVirtualDocument,
  providerNoteCreationAllowedInCareSetting,
  resolveProviderRoleProfile,
} from "./enterpriseProviderClinicalWorkspaceD4b8.js";
import { getEnterpriseClinicalDocumentType } from "./enterpriseClinicalDocumentRegistryD4b1.js";

describe("MEDUI.D4B.8 enterprise provider clinical workspace", () => {
  it("exposes certification id, composition anchors, and hard authority false flags", () => {
    expect(ENTERPRISE_PROVIDER_CLINICAL_WORKSPACE_CERTIFICATION_ID).toContain("D4B8");
    expect(PROVIDER_CLINICAL_WORKSPACE_COMPOSITION.createsIndependentDocumentationEngine).toBe(
      false
    );
    expect(PROVIDER_CLINICAL_WORKSPACE_COMPOSITION.createsIndependentSignatureEngine).toBe(false);
    expect(PROVIDER_CLINICAL_WORKSPACE_COMPOSITION.replacesProviderDocumentationWorkspace).toBe(
      false
    );
    expect(PROVIDER_CLINICAL_WORKSPACE_COMPOSITION.replacesInpatientProviderWorkspaceD4a26).toBe(
      false
    );
    expect(PROVIDER_CLINICAL_WORKSPACE_COMPOSITION.replacesEncounterNote).toBe(false);
    expect(PROVIDER_CLINICAL_WORKSPACE_COMPOSITION.webEditor).toBe(
      "ProviderDocumentationWorkspace"
    );
    expect(PROVIDER_CLINICAL_WORKSPACE_COMPOSITION.durableLegalRecord).toBe("EncounterNote");
    expect(PROVIDER_CLINICAL_WORKSPACE_COMPOSITION.inpatientObsWorkflowModule).toBe(
      "inpatientProviderWorkspaceD4a26"
    );

    expect(PROVIDER_CLINICAL_WORKSPACE_AUTHORITY_INVARIANTS.createsProviderOrders).toBe(false);
    expect(PROVIDER_CLINICAL_WORKSPACE_AUTHORITY_INVARIANTS.mutatesDiagnosis).toBe(false);
    expect(PROVIDER_CLINICAL_WORKSPACE_AUTHORITY_INVARIANTS.usesD4b1DocumentLifecycle).toBe(true);
    expect(PROVIDER_CLINICAL_WORKSPACE_AUTHORITY_INVARIANTS.independentSignatureEngine).toBe(false);

    const summary = buildEnterpriseProviderClinicalWorkspaceSummary({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "INPATIENT",
      roleProfile: "ATTENDING_PHYSICIAN",
    });
    expect(summary.createsProviderOrders).toBe(false);
    expect(summary.createsIndependentDocumentationEngine).toBe(false);
    expect(summary.replacesProviderDocumentationWorkspace).toBe(false);
    expect(summary.replacesInpatientProviderWorkspaceD4a26).toBe(false);
    expect(summary.replacesEncounterNote).toBe(false);
    expect(summary.independentSignatureEngine).toBe(false);
    expect(summary.usesD4b1Lifecycle).toBe(true);
    expect(summary.composition.shellAdapter).toContain("adaptProviderDocumentationShell");
  });

  it("resolves role profiles and denies student independent finalize policy", () => {
    expect(resolveProviderRoleProfile(["MD"])).toBe("ATTENDING_PHYSICIAN");
    expect(resolveProviderRoleProfile(["NP"])).toBe("NURSE_PRACTITIONER");
    expect(resolveProviderRoleProfile(["STUDENT"])).toBe("MEDICAL_STUDENT");
    expect(canIndependentlyFinalizeProviderNote("MEDICAL_STUDENT")).toBe(false);
    expect(canIndependentlyFinalizeProviderNote("SCRIBE")).toBe(false);
    expect(canIndependentlyFinalizeProviderNote("ATTENDING_PHYSICIAN")).toBe(true);
  });

  it("curates note types with durable owners and keeps deferred discharge/procedure unselected", () => {
    expect(PROVIDER_NOTE_TYPE_IDS).toHaveLength(11);
    expect(PROVIDER_NOTE_TYPE_REGISTRY.every((n) => n.selectedInD4b8)).toBe(true);
    expect(PROVIDER_NOTE_TYPE_REGISTRY.every((n) => n.createsOrders === false)).toBe(true);
    expect(PROVIDER_NOTE_TYPE_REGISTRY.every((n) => n.isDischargeSummary === false)).toBe(true);
    expect(PROVIDER_NOTE_TYPE_IDS).toEqual(
      expect.arrayContaining([
        "provider.history_and_physical",
        "provider.progress_note",
        "provider.consult_note",
        "provider.assessment_plan",
        "provider.cross_cover",
        "provider.event_note",
        "provider.attestation",
        "provider.addendum",
        "provider.amendment",
        "provider.correction",
        "provider.entered_in_error",
      ])
    );
    expect(durableLifecycleOwnerForProviderNoteType("provider.history_and_physical")).toBe(
      "INPATIENT_PROVIDER_WORKSPACE_V1"
    );
    expect(durableLifecycleOwnerForProviderNoteType("provider.progress_note")).toBe(
      "ENCOUNTER_NOTE"
    );
    expect(PROVIDER_NOTE_TYPE_DEFERRED_IDS).toEqual(
      expect.arrayContaining([
        "provider.discharge_summary",
        "provider.operative_note",
        "provider.procedure_note",
        "provider.anesthesia_note",
      ])
    );
  });

  it("gates care-setting policy without inventing a draft/finalize engine", () => {
    expect(
      providerNoteCreationAllowedInCareSetting({
        careSetting: "INPATIENT",
        documentTypeId: "provider.history_and_physical",
      })
    ).toEqual({ allowed: true, reason: "OK", usesExistingEditor: true });
    expect(
      providerNoteCreationAllowedInCareSetting({
        careSetting: "EMERGENCY",
        documentTypeId: "provider.history_and_physical",
      }).reason
    ).toBe("ED_LIMITED");
    expect(
      providerNoteCreationAllowedInCareSetting({
        careSetting: "INPATIENT",
        documentTypeId: "provider.discharge_summary",
      }).reason
    ).toBe("DEFERRED_NOTE_TYPE");
  });

  it("composes Provider Documentation Shell and EncounterNote adapters", () => {
    const shell = composeProviderDocumentationShellDocument(
      {
        encounterId: "e1",
        patientId: "p1",
        facilityId: "f1",
        status: "DRAFT",
        createdAt: "2026-07-26T12:00:00.000Z",
        careSetting: "INPATIENT",
      },
      { catalogTypeId: "provider.history_and_physical" }
    );
    expect(shell.sourceArchitecture).toBe("PROVIDER_DOCUMENTATION_SHELL");
    expect(shell.documentTypeId).toBe("provider.history_and_physical");
    expect(shell.structured?.payload.composedFrom).toBe("PROVIDER_DOCUMENTATION_SHELL");
    expect(shell.structured?.payload.createsProviderOrders).toBe(false);

    const note = composeEncounterNoteProviderDocument(
      {
        id: "note-1",
        encounterId: "e1",
        patientId: "p1",
        facilityId: "f1",
        noteType: "PROVIDER",
        body: "Progress body",
        authorUserId: "md-1",
        authorDisplayName: "Dr A",
        authorRoleTitle: "PROVIDER",
        createdAt: "2026-07-26T12:00:00.000Z",
        careSetting: "INPATIENT",
      },
      { catalogTypeId: "provider.progress_note" }
    );
    expect(note.sourceArchitecture).toBe("ENCOUNTER_NOTE");
    expect(note.documentTypeId).toBe("provider.progress_note");
    expect(note.author.userId).toBe("md-1");
    expect(note.structured?.payload.durableOwner).toBe("ENCOUNTER_NOTE");
  });

  it("keeps A&P non-mutating, MDM autoEmLevel null, and copy-forward mark required", () => {
    const entry = createAssessmentPlanProblemEntry({
      problemEntryId: "ap1",
      displayName: "Pneumonia",
      status: "ACTIVE",
      authorUserId: "md-1",
      serviceAt: "2026-07-26T12:00:00.000Z",
      diagnosisRefIds: ["dx-1"],
    });
    expect(entry.isNotProblemListMutation).toBe(true);
    expect(assertNoteProblemDoesNotMutateProblemList(entry)).toBe(true);

    const rejectedMdm = createMedicalDecisionMaking({ autoEmLevel: "99223" });
    expect(rejectedMdm.accepted).toBe(false);
    expect(rejectedMdm.reason).toBe("AUTO_EM_FORBIDDEN");

    const mdm = createMedicalDecisionMaking({
      problemsAddressed: ["Pneumonia"],
      externalRecordsReviewed: true,
    });
    expect(mdm.accepted).toBe(true);
    expect(mdm.mdm?.autoEmLevel).toBeNull();

    expect(
      evaluateCopyForwardSafety({
        sourceDocumentId: "src-1",
        sourceSignedAt: "2026-07-26T10:00:00.000Z",
        copyTimestamp: "2026-07-26T12:00:00.000Z",
        markAsCopied: false,
      }).reason
    ).toBe("MARK_AS_COPIED_REQUIRED");
  });

  it("builds census rows that suppress full narratives", () => {
    const row = buildProviderCensusRow({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "INPATIENT",
      displayName: "Patient A",
      unsignedDraft: true,
      fullNoteNarrative: "Should not appear",
      fullSocialWorkNarrative: "Sensitive SW text",
    });
    expect(row.fullNoteNarrative).toBeNull();
    expect(row.fullSocialWorkNarrative).toBeNull();
    expect(row.suppressesFullNarratives).toBe(true);
  });

  it("returns expected separation from all distinguish helpers", () => {
    expect(distinguishNoteTextFromOrder({ noteTextPresent: true }).createsProviderOrders).toBe(false);
    expect(distinguishDiagnosisRefFromBilling({ diagnosisRefId: "dx-1" }).isNotBillingDiagnosis).toBe(
      true
    );
    expect(
      distinguishNoteProblemFromProblemList({ noteProblemEntryId: "ap1" }).mutatesProblemList
    ).toBe(false);
    expect(
      distinguishResultInclusionFromAcknowledgment({ resultIncluded: true })
        .inclusionIsNotAcknowledgment
    ).toBe(true);
    expect(
      distinguishMedicationProjectionFromReconciliation({ medicationProjected: true })
        .isNotReconciliation
    ).toBe(true);
    expect(distinguishMarProjectionFromAdministration({ marProjected: true }).isNotAdministration).toBe(
      true
    );
    expect(distinguishConsultRecFromOrder({ recommendationPresent: true }).recommendationIsNotOrder).toBe(
      true
    );
    expect(distinguishCarePlanReviewFromRewrite({ carePlanReviewed: true }).rewritesD4b6CarePlans).toBe(
      false
    );
    expect(
      distinguishCoordinationReviewFromRewrite({ coordinationReviewed: true }).rewritesD4b7Coordination
    ).toBe(false);
    expect(
      distinguishProviderDischargeReadinessFromAuthorization({ readinessHintPresent: true })
        .authorizesDischarge
    ).toBe(false);
    expect(
      distinguishProgressNoteFromDischargeSummary({ documentTypeId: "provider.progress_note" })
        .isDischargeSummary
    ).toBe(false);
    expect(
      distinguishAttestationFromAuthorship({ attesterUserId: "t1", authorUserId: "a1" })
        .attestationReplacesAuthorship
    ).toBe(false);
    expect(
      distinguishProviderAssignmentFromAuthorization({ assignedUserId: "cov-1" })
        .assignmentEqualsAuthorization
    ).toBe(false);
  });

  it("registers curated provider note types and projects catalog virtual documents", () => {
    for (const id of PROVIDER_NOTE_TYPE_IDS) {
      const reg = getEnterpriseClinicalDocumentType(id);
      expect(reg?.templateVersion).toBe("D4B.8");
      expect(reg?.sourceArchitecture).toBe("REFERENCE_VIRTUAL");
      expect(reg?.allowedDisciplines).toContain("PROVIDER");
    }
    const progress = getEnterpriseClinicalDocumentType("provider.progress_note");
    expect(progress?.allowedCareSettings).toEqual(
      expect.arrayContaining(["EMERGENCY", "OBSERVATION", "INPATIENT"])
    );
    const hp = getEnterpriseClinicalDocumentType("provider.history_and_physical");
    expect(hp?.allowedCareSettings).toEqual(["OBSERVATION", "INPATIENT"]);

    const doc = projectProviderCatalogVirtualDocument({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      documentId: "d1",
      documentTypeId: "provider.progress_note",
      body: "Progress note body",
      authorUserId: "md-1",
      createdAt: "2026-07-26T12:00:00.000Z",
      careSetting: "INPATIENT",
      lifecycleState: "SIGNED",
    });
    expect(doc.discipline).toBe("PROVIDER");
    expect(doc.sourceArchitecture).toBe("REFERENCE_VIRTUAL");
    expect(doc.structured?.payload.isProjectionOnly).toBe(true);
    expect(doc.structured?.payload.createsProviderOrders).toBe(false);
  });
});
