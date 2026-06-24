/**
 * MEDUI.MEDICATION.PAIN_MANAGEMENT_AND_CONTROLLED_SUBSTANCES_EXPANSION.1
 * Catalog remediation for pain-management medications.
 *
 * No CREATE rows are added here — absent molecules (oxycodone, hydrocodone,
 * codeine combinations, cyclobenzaprine, methocarbamol, lidocaine patch/topical,
 * ketorolac 60 mg, hydromorphone 0.5 mg/mL, fentanyl 25 mcg) remain
 * audit-only until certified Wave / Haiti formulary rows exist.
 */

type PainManagementFormularyEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  bucket: "PAIN_MANAGEMENT";
  mode: "CREATE";
  aliases: Array<{ text: string; language: "en" | "fr"; aliasType: "OTHER" }>;
  searchTerms: string[];
  governance: {
    isControlled: boolean;
    controlledSchedule: string | null;
    isHighAlert: boolean;
    requiresWitness: boolean;
    requiresDoubleSign: boolean;
    lasaGroupId: string | null;
    requiresPharmacyVerification: boolean;
    requiresSpecialtyReview?: boolean;
  };
  isEssential: false;
  administrationType: string;
  billingClass: string;
};

/** Intentionally empty — no fabricated catalog CREATE rows. */
export const ENTERPRISE_PAIN_MANAGEMENT_FORMULARY_MANIFEST: PainManagementFormularyEntry[] = [];

export const ENTERPRISE_PAIN_MANAGEMENT_FORMULARY_BY_CODE = Object.fromEntries(
  ENTERPRISE_PAIN_MANAGEMENT_FORMULARY_MANIFEST.map((entry) => [entry.catalogCode, entry])
) as Record<string, PainManagementFormularyEntry>;
