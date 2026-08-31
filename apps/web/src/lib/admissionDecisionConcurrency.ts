/**
 * Re-export canonical admission-decision CAS helpers for the ED disposition UI.
 * Implementation lives in @medora/shared (packages/shared/src/encounters/admissionDecisionConcurrency.ts).
 */
export {
  extractAdmissionDecisionErrorCode,
  isAdmissionDecisionStaleErrorCode,
  mergeAdmissionDecisionExpectedVersion,
  parseEncounterVersionFromAdmissionDecisionResponse,
  preferNewerEncounterVersion,
} from "../../../../packages/shared/src/encounters/admissionDecisionConcurrency";
