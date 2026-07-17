/**
 * Phase 19 (Commit 1) — derived governance counts for enterprise certification tests.
 * Single source so template/family/diagnosis totals do not silently drift via hardcoded literals.
 */
import { COMMON_DIAGNOSES } from "@/constants/clinicalTemplates";
import {
  BATCH28_PSYCHIATRIC_BEHAVIORAL_CAPACITY_COMPLAINT_TEMPLATE_IDS,
} from "@/lib/providerDocumentationComplaintIntelligence";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationModel";
import { CLINICAL_CONDITION_FAMILY_DEFINITIONS } from "./providerDischargeConditionFamilies";

export const ENTERPRISE_DIAGNOSTIC_GOVERNANCE_COUNTS = {
  visibleTemplates: PROVIDER_DOCUMENTATION_TEMPLATES.length,
  dischargeFamiliesUnique: new Set(CLINICAL_CONDITION_FAMILY_DEFINITIONS.map((family) => family.id)).size,
  dischargeFamiliesTotal: CLINICAL_CONDITION_FAMILY_DEFINITIONS.length,
  commonDiagnoses: COMMON_DIAGNOSES.length,
  batch28PsychTemplates: BATCH28_PSYCHIATRIC_BEHAVIORAL_CAPACITY_COMPLAINT_TEMPLATE_IDS.length,
} as const;
