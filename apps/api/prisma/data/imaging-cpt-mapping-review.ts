/**
 * Review-only imaging CPT readiness map.
 *
 * No CPT codes are included here until a licensed CPT source is available.
 * This file is intentionally not wired into seed/runtime billing behavior.
 */
export type ImagingCptMappingReview = {
  medoraCode: string;
  suggestedCptCodes: string[];
  status: "pending_license";
  notes: string;
};

const pendingLicense = (medoraCode: string, notes = "Awaiting licensed CPT source review."): ImagingCptMappingReview => ({
  medoraCode,
  suggestedCptCodes: [],
  status: "pending_license",
  notes,
});

export const IMAGING_CPT_MAPPING_REVIEW: ImagingCptMappingReview[] = [
  pendingLicense("XR_CHEST"),
  pendingLicense("XR_KNEE"),
  pendingLicense("XR_FOOT"),
  pendingLicense("US_ABD", "Legacy abdomen ultrasound row; reconcile with US_ABDOMEN before licensed CPT import."),
  pendingLicense("US_OB"),
  pendingLicense("US_RENAL"),
  pendingLicense("CT_HEAD", "Legacy CT head row; reconcile with CT_HEAD_WO_CONTRAST before licensed CPT import."),
  pendingLicense("CT_ABD", "Legacy abdomen/pelvis CT row; reconcile with CT_ABDOMEN_PELVIS before licensed CPT import."),
  pendingLicense("DOPPLER_VEIN", "Legacy venous Doppler row; reconcile with US_VENOUS_DOPPLER_LE before licensed CPT import."),
  pendingLicense("XR_CHEST_2V"),
  pendingLicense("XR_ABD_AP"),
  pendingLicense("XR_WRIST"),
  pendingLicense("XR_ANKLE"),
  pendingLicense("XR_SHOULDER"),
  pendingLicense("XR_PELVIS"),
  pendingLicense("US_OB_FIRST"),
  pendingLicense("US_OB_GROWTH"),
  pendingLicense("US_SOFT"),
  pendingLicense("CT_CHEST"),
  pendingLicense("CT_CHEST_CTA", "Legacy CTA chest row; reconcile with CTA_CHEST before licensed CPT import."),
  pendingLicense("CT_SPINE_LUMBAR"),
  pendingLicense("US_FAST", "FAST exam identity/billing protocol requires site review and licensed CPT source."),
  pendingLicense("XR_ABDOMEN"),
  pendingLicense("CT_CERVICAL_SPINE"),
  pendingLicense("CT_ABDOMEN_PELVIS"),
  pendingLicense("CT_CHEST_ABDOMEN_PELVIS_TRAUMA", "Trauma pan-scan billing may require multiple CPT lines; pending licensed CPT source and site billing policy."),
  pendingLicense("CT_HEAD_WO_CONTRAST"),
  pendingLicense("CTA_CHEST"),
  pendingLicense("CTA_HEAD_NECK"),
  pendingLicense("CTA_ABDOMEN_PELVIS"),
  pendingLicense("US_ABDOMEN", "Reconcile with legacy US_ABD before licensed CPT import."),
  pendingLicense("US_RUQ_GALLBLADDER"),
  pendingLicense("US_PELVIS"),
  pendingLicense("US_SCROTUM_TESTICULAR"),
  pendingLicense("US_VENOUS_DOPPLER_LE", "Reconcile with legacy DOPPLER_VEIN before licensed CPT import."),
  pendingLicense("XR_HUMERUS"),
  pendingLicense("XR_ELBOW"),
  pendingLicense("XR_FOREARM"),
  pendingLicense("XR_HAND"),
  pendingLicense("XR_HIP"),
  pendingLicense("XR_FEMUR"),
  pendingLicense("XR_TIB_FIB"),
  pendingLicense("MRI_BRAIN"),
  pendingLicense("MRI_SPINE"),
];
