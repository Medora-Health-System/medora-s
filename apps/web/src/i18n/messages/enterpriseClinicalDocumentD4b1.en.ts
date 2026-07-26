/**
 * MEDUI.D4B.1 — English strings for enterprise clinical document foundation primitives.
 */
export const enterpriseClinicalDocumentD4b1En = {
  status: {
    DRAFT: "Draft",
    IN_PROGRESS: "In progress",
    READY_FOR_SIGNATURE: "Ready for signature",
    SIGNED: "Signed",
    COSIGN_REQUIRED: "Cosign required",
    COSIGNED: "Cosigned",
    AMENDED: "Amended",
    CORRECTED: "Corrected",
    ENTERED_IN_ERROR: "Entered in error",
    VOIDED: "Voided",
  },
  labels: {
    amended: "Amended document",
    addendum: "Addendum",
    unsignedDraft: "Unsigned draft — not a final legal record",
    enteredInError: "Entered in error — not valid clinical documentation",
    templateVersion: "Template version",
    author: "Author",
    signer: "Signer",
    cosigner: "Cosigner",
    serviceAt: "Service time",
    signedAt: "Signed at",
    completeness: "Completeness",
    complete: "Complete",
    incomplete: "Incomplete",
    signatureReady: "Ready to sign",
    notSignatureReady: "Not ready to sign",
    versionHistory: "Version history",
    legalRecord: "Legal record",
    validationIssues: "Validation issues",
  },
  validation: {
    requiredField: "Required field missing",
    mutuallyExclusive: "Mutually exclusive fields are both present",
    hardStop: "Must fix before signing",
    warning: "Warning",
  },
  documentTypes: {
    encounterNoteProvider: "Provider encounter note",
    encounterNoteNursing: "Nursing encounter note",
    encounterNoteTechnician: "Technician encounter note",
    edocStructuredEntry: "Structured clinical documentation entry",
    providerDocumentationShell: "Provider documentation",
    nursingAdmission: "Nursing admission assessment",
  },
  legal: {
    footer: "Medora clinical document — status and authorship shown for legal chart use.",
  },
};
