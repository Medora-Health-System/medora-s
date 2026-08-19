/**
 * MEDUI.INP.2B.2D — Nursing Admission preload verification projection.
 * Does not create a second PMH / surgical / allergy / social / medication store.
 */

export const NURSING_ADMISSION_SOCIAL_PRELOAD_DOMAINS = [
  "SMOKING",
  "ALCOHOL",
  "RECREATIONAL_DRUGS",
] as const;

export type NursingAdmissionSocialPreloadDomain =
  (typeof NURSING_ADMISSION_SOCIAL_PRELOAD_DOMAINS)[number];

const PRELOAD_LABEL_KEYS: Record<string, string> = {
  "pmh-summary": "inpatientAdmissionInp2b2d.preload.pmh",
  "psh-summary": "inpatientAdmissionInp2b2d.preload.psh",
  "home-meds-summary": "inpatientAdmissionInp2b2d.preload.homeMeds",
  "allergy-note": "inpatientAdmissionInp2b2d.preload.allergies",
  smoking: "inpatientAdmissionInp2b2d.preload.smoking",
  alcohol: "inpatientAdmissionInp2b2d.preload.alcohol",
  "recreational-drugs": "inpatientAdmissionInp2b2d.preload.recreational",
};

export function nursingAdmissionPreloadLabelKey(itemId: string): string | null {
  return PRELOAD_LABEL_KEYS[itemId] ?? null;
}

export function nursingAdmissionPreloadActionIsSelected(input: {
  verificationStatus?: string | null;
  verifiedAt?: string | null;
  action: string;
}): boolean {
  if (!input.verifiedAt) return false;
  return String(input.verificationStatus ?? "") === input.action;
}

function rapidReviewCode(status: string): string {
  if (status === "UNABLE_TO_VERIFY") return "UNABLE_TO_REVIEW";
  if (status === "UNKNOWN") return "NOT_APPLICABLE";
  return "REVIEWED";
}

/**
 * Local admission answers derived from a preload verification action.
 * UNKNOWN is a real persisted action (not a no-op).
 */
export function reviewCompletePatchForDomain(
  domain: string | undefined,
  status: string
): Record<string, unknown> | null {
  if (!domain) return null;
  const reviewed =
    status === "CONFIRMED" ||
    status === "UPDATED" ||
    status === "UNABLE_TO_VERIFY" ||
    status === "UNKNOWN" ||
    status === "PATIENT_DENIES";
  if (!reviewed) return null;
  const rapid = rapidReviewCode(status);
  if (domain === "MEDICAL_HISTORY") {
    return {
      historyReviewComplete: "YES",
      historyVerificationAction: status,
      rapidHistoryReviewed: rapid,
    };
  }
  if (domain === "SURGICAL_HISTORY") {
    return {
      surgicalReviewComplete: "YES",
      surgicalVerificationAction: status,
    };
  }
  if (domain === "HOME_MEDICATIONS") {
    return {
      reconComplete: "YES",
      homeMedVerificationAction: status,
      rapidHomeMedReviewed: rapid,
    };
  }
  if (domain === "ALLERGIES") {
    return {
      allergyReviewComplete: "YES",
      allergyVerificationAction: status,
      rapidAllergyReviewed: rapid,
    };
  }
  if (domain === "SMOKING") {
    return {
      smokingVerificationAction: status,
      socialReviewComplete: "YES",
    };
  }
  if (domain === "ALCOHOL") {
    return {
      alcoholVerificationAction: status,
      socialReviewComplete: "YES",
    };
  }
  if (domain === "RECREATIONAL_DRUGS") {
    return {
      recreationalVerificationAction: status,
      socialReviewComplete: "YES",
    };
  }
  return null;
}

export function nursingAdmissionHistoryEditorDomainForPreload(domain: string | undefined):
  | "MEDICAL_HISTORY"
  | "SURGICAL_HISTORY"
  | "HOME_MEDICATIONS"
  | "SOCIAL_HISTORY"
  | "ALLERGIES"
  | null {
  if (
    domain === "MEDICAL_HISTORY" ||
    domain === "SURGICAL_HISTORY" ||
    domain === "HOME_MEDICATIONS" ||
    domain === "ALLERGIES"
  ) {
    return domain;
  }
  if (
    domain === "SMOKING" ||
    domain === "ALCOHOL" ||
    domain === "RECREATIONAL_DRUGS"
  ) {
    return "SOCIAL_HISTORY";
  }
  return null;
}

export function nursingAdmissionEngineDependsOnFacilityId(): false {
  return false;
}

export function inpatientMarMountsMedicationReconciliation(): false {
  return false;
}

export function nursingAdmissionHomeMedSearchMinChars(): 3 {
  return 3;
}

export function nursingAdmissionHomeMedUpdateCreatesOrderOrMar(): false {
  return false;
}
