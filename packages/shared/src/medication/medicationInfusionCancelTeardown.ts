/** MEDUI.ED.MAR.H6B — re-exports for order-cancel infusion teardown (H6C governance). */

export {
  MEDICATION_INFUSION_STOP_REASON_ORDER_CANCELLED,
  MEDICATION_INFUSION_STOP_REASON_CODES,
  type MedicationInfusionStopReasonCode,
  buildMedicationInfusionOrderCancelStopNotes,
  parseMedicationInfusionStopReasonFromNotes,
} from "./medicationInfusionStopReasonGovernance.js";
