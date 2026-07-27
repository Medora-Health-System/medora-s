/**
 * MEDUI.D4B.8 — English strings for enterprise provider clinical workspace.
 */
export const enterpriseProviderClinicalWorkspaceD4b8En = {
  title: "Provider clinical workspace",
  subtitle:
    "Enterprise composition layer over existing provider documentation — note ≠ order ≠ diagnosis mutation ≠ discharge authorization",
  foundationBanner:
    "Uses enterprise clinical documentation foundation (D4B.1). Composes ProviderDocumentationWorkspace, inpatientProviderWorkspace (D4A.26), and EncounterNote — does not invent a parallel note or signature engine. Server identity is authoritative. Assignment is not authorization. Attestation and co-signature do not replace authorship. Notes do not create provider orders, mutate diagnosis or problem list, alter MAR, perform medication reconciliation, acknowledge results, authorize discharge, or rewrite care plans (D4B.6) or care coordination (D4B.7). No ambient AI. No automatic E/M coding.",
  edLimitedBanner:
    "Emergency: limited provider projection and compatibility only. Preserve the existing ED provider documentation workflow. Full composition surfaces are available in Observation and Inpatient.",
  edCompatibilityBanner:
    "ED provider notes remain on the existing EmergencyErNotesPanel / ProviderDocumentationWorkspace path. This shell projects boundaries and review surfaces without replacing ED documentation.",
  loading: "Loading provider clinical workspace…",
  empty: "No provider notes for this encounter yet.",
  error: "Unable to load provider clinical workspace.",
  composition: {
    heading: "Composition — not replacement",
    body: "Documentation is authored and signed through existing Medora engines. D4B.8 hosts projections, capability boundaries, and optional embedding of ProviderDocumentationWorkspace.",
    noFork:
      "No ProviderNoteV2 / independent signature engine — EncounterNote and provider documentation shell remain durable.",
    useExistingEditor:
      "Use ProviderDocumentationWorkspace / D4A.26 / EncounterNote hosts for draft and sign. This shell does not finalize notes locally.",
  },
  sections: {
    overview: "Overview",
    census: "Census",
    documentation: "Documentation",
    historyPhysical: "History and physical",
    progressNotes: "Progress notes",
    consultNotes: "Consult notes",
    assessmentPlan: "Assessment and plan",
    medicalDecisionMaking: "Medical decision making",
    clinicalReview: "Clinical review",
    nursingProjection: "Nursing projection",
    rtProjection: "Respiratory projection",
    rehabProjection: "Rehabilitation projection",
    techProjection: "Technician projection",
    carePlanProjection: "Care-plan projection",
    careCoordinationProjection: "Care-coordination projection",
    ordersResultsMeds: "Orders, results, and medications",
    timeline: "Timeline",
    handoff: "Limited handoff",
    deferredBoundaries: "Boundaries and deferrals",
  },
  capabilities: {
    viewCensus: "View census",
    viewPatientWorkspace: "View patient workspace",
    viewInterdisciplinaryProjections: "View interdisciplinary projections",
    createHpDraft: "Create H&P draft (via existing engines)",
    finalizeHp: "Sign H&P (via existing signature APIs)",
    createProgressDraft: "Create progress-note draft (via existing engines)",
    finalizeProgress: "Sign progress note (via existing signature APIs)",
    createConsultDraft: "Create consult-note draft (via existing engines)",
    finalizeConsult: "Sign consult note (via existing signature APIs)",
    documentAssessmentPlan: "Document assessment and plan",
    documentMdm: "Document medical decision making",
    amendOwnNote: "Amend own note (EncounterNote amendment)",
    correctOwnNote: "Correct own note (EncounterNote correction)",
    enterNoteInError: "Enter note in error (EncounterNote EIE)",
    attestResidentNote: "Attest resident note",
    cosignAppNote: "Co-sign APP note",
    cosignStudentNote: "Co-sign student note",
    reviewRecommendations: "Review recommendations",
    reviewCarePlan: "Review care plan",
    reviewCareCoordination: "Review care coordination",
    viewOrdersResultsMeds: "View orders, results, and medications",
    limitedHandoff: "Limited handoff",
    printExportAuthorized: "Print / export when authorized",
  },
  noteTypes: {
    providerHistoryAndPhysical: "History and physical",
    providerProgressNote: "Progress note",
    providerConsultNote: "Consult note",
    providerAssessmentPlan: "Assessment and plan",
    providerCrossCover: "Cross-cover note",
    providerEventNote: "Event note",
    providerAttestation: "Attestation",
    providerAddendum: "Addendum",
    providerAmendment: "Amendment",
    providerCorrection: "Correction",
    providerEnteredInError: "Entered in error",
  },
  overview: {
    sectionsHint:
      "Compose existing H&P, progress, and consult documentation; review A&P and MDM without E/M coding; review interdisciplinary projections — without creating orders or authorizing discharge.",
    authorityHeading: "Authority boundaries (all false in this workspace)",
  },
  boundaries: {
    orders: "Note text is not a provider order. Orders are created elsewhere.",
    diagnosis:
      "Diagnosis references in notes do not mutate the diagnosis or problem list and are not billing diagnoses.",
    mar: "MAR projection is not medication administration and does not alter the MAR.",
    results: "Including a result in a note is not result acknowledgment.",
    carePlan: "Care-plan projection is read-only — this workspace never rewrites D4B.6 authorship.",
    careCoord:
      "Care-coordination projection is read-only — this workspace never rewrites D4B.7 episodes.",
    discharge: "Readiness and planning cues are not discharge authorization.",
    attestation: "Attestation and co-signature do not replace original authorship.",
  },
  deferred:
    "Deferred (D4B.9+): procedure / operative / anesthesia notes, discharge summary, medication reconciliation, billing / E/M coding / CDI, ambient AI documentation.",
  census: {
    empty: "No census rows for this workspace yet.",
  },
  documents: {
    empty: "No adapted provider documents projected yet.",
  },
  projections: {
    empty: "No projections yet.",
  },
  messages: {
    ED_LIMITED: "Emergency setting: D4B.8 draft create is limited — use existing ED editor.",
    CAPABILITY_DENIED: "Capability denied for this role profile.",
    CARE_SETTING_DENIED: "Note type not allowed for this care setting.",
    DEFERRED_NOTE_TYPE: "This note type is deferred.",
    UNKNOWN_NOTE_TYPE: "Unknown note type.",
    OK: "OK",
  },
};
