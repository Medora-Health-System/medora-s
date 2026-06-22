/**
 * MEDUI.MEDICATION_CATALOG.HOSPITAL_ORDERABILITY_AND_TDAP.1
 * Vaccine Information Statement (VIS) documentation governance.
 */

export type VaccineVisRecipient = "patient" | "family" | "none";

export type VaccineVisDocumentation = {
  visGiven: boolean;
  visRecipient: VaccineVisRecipient;
  /** ISO date string YYYY-MM-DD — clinician-entered; not a permanent hardcoded VIS edition date. */
  visDate: string;
};

export const VACCINE_VIS_RECIPIENT_VALUES = ["patient", "family", "none"] as const;

/** Official VIS reference for Tdap — documentation link only; edition date entered at administration time. */
export const TDAP_VIS_REFERENCE = {
  vaccineNameEn: "Tdap (Tetanus, Diphtheria, Pertussis)",
  vaccineNameFr: "Tdap (tétanos, diphtérie, coqueluche)",
  cdcVisUrl: "https://www.cdc.gov/vaccines/hcp/vis/vis-statements/tdap.html",
} as const;

export function validateVaccineVisDocumentation(vis: VaccineVisDocumentation): string[] {
  const errors: string[] = [];
  if (vis.visGiven && !vis.visDate.trim()) {
    errors.push("vis_date_required_when_given");
  }
  if (vis.visGiven && vis.visRecipient === "none") {
    errors.push("vis_recipient_required_when_given");
  }
  return errors;
}

export function visDocumentationIsComplete(vis: VaccineVisDocumentation): boolean {
  return validateVaccineVisDocumentation(vis).length === 0;
}
