/**
 * Client-side US registration packet section catalog (v2).
 * Mirrors API content library for wizard when template API is unavailable.
 * Status: pending legal approval — not presented as approved legal final copy.
 */

export type PacketSectionContent = {
  key: string;
  titleKey: string;
  summaryKey: string;
  fullKey: string;
  sourceLabel?: string;
  sourceUrl?: string;
  acknowledgmentRequired?: boolean;
};

const CORE: PacketSectionContent[] = [
  { key: "demographics", titleKey: "packetWizard.sectionDemographics", summaryKey: "packetWizard.demographicsSummary", fullKey: "packetWizard.demographicsFull" },
  { key: "emergencyContact", titleKey: "packetWizard.sectionEmergencyContact", summaryKey: "packetWizard.emergencyContactSummary", fullKey: "packetWizard.emergencyContactFull" },
  { key: "insurance", titleKey: "packetWizard.sectionInsurance", summaryKey: "packetWizard.insuranceSummary", fullKey: "packetWizard.insuranceFull", acknowledgmentRequired: true },
  { key: "consent", titleKey: "packetWizard.sectionConsent", summaryKey: "packetWizard.consentSummary", fullKey: "packetWizard.consentFull", acknowledgmentRequired: true },
  { key: "aob", titleKey: "packetWizard.sectionAob", summaryKey: "packetWizard.aobSummary", fullKey: "packetWizard.aobFull", acknowledgmentRequired: true },
  { key: "facilityDisclosure", titleKey: "packetWizard.sectionFacilityDisclosure", summaryKey: "packetWizard.facilityDisclosureSummary", fullKey: "packetWizard.facilityDisclosureFull" },
  { key: "privacy", titleKey: "packetWizard.sectionPrivacy", summaryKey: "packetWizard.privacySummary", fullKey: "packetWizard.privacyFull", acknowledgmentRequired: true, sourceLabel: "HHS Model Notice of Privacy Practices", sourceUrl: "https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/privacy-practices-health-care-provider/" },
  { key: "rights", titleKey: "packetWizard.sectionRights", summaryKey: "packetWizard.rightsSummary", fullKey: "packetWizard.rightsFull", acknowledgmentRequired: true },
  { key: "advanceDirectives", titleKey: "packetWizard.sectionAdvanceDirectives", summaryKey: "packetWizard.advanceDirectivesSummary", fullKey: "packetWizard.advanceDirectivesFull" },
  { key: "personalBelongings", titleKey: "packetWizard.sectionPersonalBelongings", summaryKey: "packetWizard.personalBelongingsSummary", fullKey: "packetWizard.personalBelongingsFull" },
  { key: "communications", titleKey: "packetWizard.sectionCommunications", summaryKey: "packetWizard.communicationsSummary", fullKey: "packetWizard.communicationsFull" },
  { key: "safetyPolicy", titleKey: "packetWizard.sectionSafetyPolicy", summaryKey: "packetWizard.safetyPolicySummary", fullKey: "packetWizard.safetyPolicyFull", acknowledgmentRequired: true },
  { key: "grievance", titleKey: "packetWizard.sectionGrievance", summaryKey: "packetWizard.grievanceSummary", fullKey: "packetWizard.grievanceFull" },
  { key: "nondiscrimination", titleKey: "packetWizard.sectionNondiscrimination", summaryKey: "packetWizard.nondiscriminationSummary", fullKey: "packetWizard.nondiscriminationFull" },
];

const ER_EXTRA: PacketSectionContent[] = [
  { key: "medicareMedicaid", titleKey: "packetWizard.sectionMedicareMedicaid", summaryKey: "packetWizard.medicareMedicaidSummary", fullKey: "packetWizard.medicareMedicaidFull", acknowledgmentRequired: true },
];

const HOSPITAL_EXTRA: PacketSectionContent[] = [
  { key: "emtalaNotice", titleKey: "packetWizard.sectionEmtala", summaryKey: "packetWizard.emtalaSummary", fullKey: "packetWizard.emtalaFull", sourceLabel: "CMS EMTALA", sourceUrl: "https://www.cms.gov/medicare/regulations-guidance/legislation/emergency-medical-treatment-labor-act" },
];

export function sectionCatalogForTemplate(template: string): PacketSectionContent[] {
  if (template === "FREESTANDING_ER") return [...CORE, ...ER_EXTRA];
  if (template === "HOSPITAL") return [...CORE, ...HOSPITAL_EXTRA];
  if (template === "CLINIC") {
    return CORE.filter((s) => s.key !== "personalBelongings" && s.key !== "safetyPolicy");
  }
  return CORE;
}

export const CURRENT_PACKET_CONTENT_VERSION = "2.0";
