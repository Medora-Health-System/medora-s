/** D4A.1 — Med/Surg nursing admission (English). */
export const hospitalAdmissionD4a1En = {
  intro:
    "Verify shared patient history with provenance, complete structured Med/Surg nursing admission, and hand off to the provider — without duplicating the longitudinal record.",
  loadError: "Unable to load nursing admission documentation.",
  saveConflict: "Save conflict — documentation was refreshed. Retry your change.",
  sign: "Sign nursing admission",
  alreadySigned: "Nursing admission signed",
  signed: "Nursing admission signed. Provider handoff created.",
  signError: "Unable to sign nursing admission.",
  preloadEmpty: "No longitudinal history available to preload for this patient.",
  provenance: {
    source: "Source",
    verified: "Verified",
  },
  verify: {
    CONFIRMED: "Confirm",
    UPDATED: "Update",
    UNABLE_TO_VERIFY: "Unable to verify",
    UNKNOWN: "Unknown",
  },
  completion: {
    title: "Admission completion",
    complete: "Complete",
    inProgress: "In progress",
  },
  homeMeds: {
    noOrders: "Home medication reconciliation never creates inpatient medication orders or MAR rows.",
    notOrder: "documentation only",
  },
  cash: {
    hint: "Document cash by denomination and quantity with receipt and witness when secured.",
  },
  wounds: {
    documented: "wound(s) on file",
  },
  headToToe: {
    hint: "Head-to-toe assessment reuses existing Medora clinical domains (EDOC / nursing).",
    NEUROLOGIC: "Neurologic",
    HEENT: "HEENT",
    RESPIRATORY: "Respiratory",
    CARDIOVASCULAR: "Cardiovascular",
    GI: "Gastrointestinal",
    GU: "Genitourinary",
    MUSCULOSKELETAL: "Musculoskeletal",
    SKIN: "Skin",
    ENDOCRINE: "Endocrine",
    PSYCHOSOCIAL: "Psychosocial",
    PAIN: "Pain",
    SAFETY: "Safety",
    EDUCATION: "Education",
  },
  handoff: {
    task: "Provider admission task",
    pendingSign: "Provider handoff is created when nursing admission is signed.",
  },
} as const;
