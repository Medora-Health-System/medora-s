import type { FacilityConfigurationSettings, FacilityModuleRuntime } from "./facilityConfiguration.js";

/** One registered parent/child rule. Future modules call `registerFacilityConfigurationDependency`. */
export type FacilityConfigurationDependency = {
  id: string;
  childPath: string;
  parentPath: string;
  messageKey: string;
  childOn: (settings: FacilityConfigurationSettings) => boolean;
  parentOn: (settings: FacilityConfigurationSettings) => boolean;
};

export type FacilityConfigurationIssue = {
  id: string;
  childPath: string;
  parentPath: string;
  messageKey: string;
};

export function facilityModuleIsActive(mod: FacilityModuleRuntime): boolean {
  return Boolean(mod.enabled) && !mod.hidden;
}

const builtinDependencies: FacilityConfigurationDependency[] = [
  {
    id: "messaging-requires-digital-care",
    childPath: "digitalCare.secureMessaging",
    parentPath: "modules.digitalCare",
    messageKey: "facilityConfig.validation.messagingRequiresDigitalCare",
    childOn: (s) =>
      s.digitalCare.secureMessaging ||
      s.messaging.enabled ||
      s.digitalCare.providerChat ||
      s.digitalCare.patientChat ||
      s.patientPortal.messages,
    parentOn: (s) => facilityModuleIsActive(s.modules.digitalCare),
  },
  {
    id: "portal-messaging-requires-digital-care",
    childPath: "patientPortal.messages",
    parentPath: "modules.digitalCare",
    messageKey: "facilityConfig.validation.portalMessagingRequiresDigitalCare",
    childOn: (s) => s.patientPortal.messages && (s.patientPortal.enabled || facilityModuleIsActive(s.modules.patientPortal)),
    parentOn: (s) =>
      facilityModuleIsActive(s.modules.digitalCare) && s.digitalCare.secureMessaging && s.digitalCare.patientChat,
  },
  {
    id: "medication-reconciliation-requires-pharmacy",
    childPath: "clinicalRules.medicationReconciliation",
    parentPath: "modules.pharmacy",
    messageKey: "facilityConfig.validation.medRecRequiresPharmacy",
    childOn: (s) => s.clinicalRules.medicationReconciliation || s.medication.reconciliationRequired,
    parentOn: (s) => facilityModuleIsActive(s.modules.pharmacy),
  },
  {
    id: "auto-release-requires-result-release",
    childPath: "digitalCare.autoRelease",
    parentPath: "digitalCare.resultRelease",
    messageKey: "facilityConfig.validation.autoReleaseRequiresResultRelease",
    childOn: (s) => s.digitalCare.autoRelease || s.resultRelease.mode === "AUTO",
    parentOn: (s) => facilityModuleIsActive(s.modules.digitalCare) && s.digitalCare.resultRelease,
  },
  {
    id: "video-visits-require-telehealth",
    childPath: "digitalCare.videoVisits",
    parentPath: "modules.telemedicine",
    messageKey: "facilityConfig.validation.videoVisitsRequireTelehealth",
    childOn: (s) => s.digitalCare.videoVisits || s.telehealth.videoVisits || s.patientPortal.telehealth,
    parentOn: (s) => facilityModuleIsActive(s.modules.telemedicine),
  },
  {
    id: "billing-portal-requires-billing",
    childPath: "patientPortal.invoices",
    parentPath: "modules.billing",
    messageKey: "facilityConfig.validation.billingPortalRequiresBilling",
    childOn: (s) => s.patientPortal.invoices,
    parentOn: (s) => facilityModuleIsActive(s.modules.billing),
  },
  {
    id: "portal-features-require-portal-module",
    childPath: "patientPortal.enabled",
    parentPath: "modules.patientPortal",
    messageKey: "facilityConfig.validation.portalRequiresModule",
    childOn: (s) =>
      s.patientPortal.enabled ||
      s.patientPortal.messages ||
      s.patientPortal.invoices ||
      s.patientPortal.labResults,
    parentOn: (s) => facilityModuleIsActive(s.modules.patientPortal),
  },
];

const extraDependencies: FacilityConfigurationDependency[] = [];

export function registerFacilityConfigurationDependency(dependency: FacilityConfigurationDependency): void {
  if (listFacilityConfigurationDependencies().some((row) => row.id === dependency.id)) {
    throw new Error(`Facility configuration dependency already registered: ${dependency.id}`);
  }
  extraDependencies.push(dependency);
}

export function resetFacilityConfigurationDependencyRegistry(): void {
  extraDependencies.length = 0;
}

export function listFacilityConfigurationDependencies(): FacilityConfigurationDependency[] {
  return [...builtinDependencies, ...extraDependencies];
}

export function validateFacilityConfiguration(settings: FacilityConfigurationSettings): FacilityConfigurationIssue[] {
  const issues: FacilityConfigurationIssue[] = [];
  for (const rule of listFacilityConfigurationDependencies()) {
    if (rule.childOn(settings) && !rule.parentOn(settings)) {
      issues.push({
        id: rule.id,
        childPath: rule.childPath,
        parentPath: rule.parentPath,
        messageKey: rule.messageKey,
      });
    }
  }
  return issues;
}

export function facilityConfigurationIsValid(settings: FacilityConfigurationSettings): boolean {
  return validateFacilityConfiguration(settings).length === 0;
}
