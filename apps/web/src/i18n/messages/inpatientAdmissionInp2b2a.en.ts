/** MEDUI.INP.2B.2A — Nursing Admission UAT correction (EN). */
export const inpatientAdmissionInp2b2aEn = {
  addNote: "+ Add note",
  unableToComplete: "Unable to complete",
  notApplicable: "Not applicable",
  derivedStatus: "Section status",
  assignmentTitle: "Assigned location and team",
  assignmentHint: "Projected from the hospital assignment and bed engine. Not a second unit or bed authority.",
  assignedUnit: "Assigned unit",
  assignedBed: "Assigned bed",
  attendingProvider: "Attending provider",
  receivingNurse: "Receiving nurse",
  notAssigned: "Not assigned",
  conflict: {
    title: "Save conflict",
    body: "Another user or session changed this admission section after you began editing.",
    reload: "Review latest version",
    preserve: "Keep my draft",
    retry: "Retry after review",
    discard: "Discard my draft",
  },
  saveFailed: "Unable to save this admission section. Your draft was preserved.",
  saveNetwork: "Unable to reach the server. Check your connection and try again.",
  saveDomainLink:
    "Required clinical documentation could not be linked. Your admission draft was preserved. Retry or open Clinical Documentation.",
  saveValidation: "This section could not be saved. Check the required answers and try again.",
  savePreloadConfirm:
    "There is no shared history item to confirm. Use Update to record history in the enterprise chart, or confirm after history is on file.",
  saveAuth: "Your session expired. Sign in again to continue.",
  saveForbidden: "You do not have authority to change this admission section.",
  saveNotFound: "This admission record could not be found. Reload the chart and try again.",
  saveServer: "The server could not save this admission section. Try again in a moment.",
  preloadEmpty: "No shared history is on file for this section yet. Update uses the enterprise history record.",
  historyEditor: {
    reuseHint: "This edits the shared patient history. It does not create a second Nursing Admission list.",
    loadError: "Could not load the authoritative history.",
    saveError: "Could not save the authoritative history.",
    title: {
      MEDICAL_HISTORY: "Update medical history",
      SURGICAL_HISTORY: "Update surgical history",
      HOME_MEDICATIONS: "Update home medications",
    },
  },
};
