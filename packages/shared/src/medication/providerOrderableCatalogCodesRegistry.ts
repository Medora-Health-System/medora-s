/**
 * MEDUI.PERFORMANCE.MEDICATION_RUNTIME_REMEDIATION.1
 * Single enterprise registry for provider-orderable catalog codes.
 * Built once at startup — never recomputed on request hot paths.
 */

import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { listActiveAnticoagulationProviderOrderingCatalogCodes } from "./anticoagulationProviderOrderingActivation.js";
import { listActiveInsulinDiabetesProviderOrderingCatalogCodes } from "./insulinDiabetesProviderOrderingActivation.js";
import { listActiveVaccineProviderOrderingCatalogCodes } from "./vaccineProviderOrderingActivation.js";
import { listActiveCriticalCareProviderOrderingCatalogCodes } from "./criticalCareProviderOrderingActivation.js";
import {
  listActiveNeurologyProviderOrderingCatalogCodes,
  listActiveInfectiousDiseaseProviderOrderingCatalogCodes,
} from "./neurologyInfectiousDiseaseProviderOrderingActivation.js";
import { listActiveCardiologyProviderOrderingCatalogCodes } from "./cardiologyProviderOrderingActivation.js";
import { listActiveIvFluidsProviderOrderingCatalogCodes } from "./ivFluidsProviderOrderingActivation.js";
import { listActiveObgynProviderOrderingCatalogCodes } from "./obgynProviderOrderingActivation.js";
import { listActivePsychiatryProviderOrderingCatalogCodes } from "./psychiatryProviderOrderingActivation.js";
import { listActiveGastroenterologyProviderOrderingCatalogCodes } from "./gastroenterologyProviderOrderingActivation.js";
import { listActivePediatricsProviderOrderingCatalogCodes } from "./pediatricsProviderOrderingActivation.js";
import { listActiveSurgeryPerioperativeProviderOrderingCatalogCodes } from "./surgeryPerioperativeProviderOrderingActivation.js";
import { listActivePainManagementProviderOrderingCatalogCodes } from "./painManagementProviderOrderingActivation.js";
import { listActiveControlledSubstanceProviderOrderingCatalogCodes } from "./controlledSubstanceProviderOrderingActivation.js";
import { isActiveTranche2ProviderOrderingMedication, validateTranche2ProviderOrderPlacement } from "./tranche2ProviderOrderingActivation.js";
import {
  isActiveAnticoagulationProviderOrderingMedication,
  validateAnticoagulationProviderOrderPlacement,
} from "./anticoagulationProviderOrderingActivation.js";
import {
  isActiveInsulinDiabetesProviderOrderingMedication,
  validateInsulinDiabetesProviderOrderPlacement,
} from "./insulinDiabetesProviderOrderingActivation.js";
import {
  isActiveVaccineProviderOrderingMedication,
  validateVaccineProviderOrderPlacement,
} from "./vaccineProviderOrderingActivation.js";
import {
  isActiveCriticalCareProviderOrderingMedication,
  validateCriticalCareProviderOrderPlacement,
} from "./criticalCareProviderOrderingActivation.js";
import {
  isActiveNeurologyProviderOrderingMedication,
  validateNeurologyProviderOrderPlacement,
  isActiveInfectiousDiseaseProviderOrderingMedication,
  validateInfectiousDiseaseProviderOrderPlacement,
} from "./neurologyInfectiousDiseaseProviderOrderingActivation.js";
import {
  isActiveCardiologyProviderOrderingMedication,
  validateCardiologyProviderOrderPlacement,
} from "./cardiologyProviderOrderingActivation.js";
import {
  isActiveIvFluidsProviderOrderingMedication,
  validateIvFluidsProviderOrderPlacement,
} from "./ivFluidsProviderOrderingActivation.js";
import {
  isActiveObgynProviderOrderingMedication,
  validateObgynProviderOrderPlacement,
} from "./obgynProviderOrderingActivation.js";
import {
  isActivePsychiatryProviderOrderingMedication,
  validatePsychiatryProviderOrderPlacement,
} from "./psychiatryProviderOrderingActivation.js";
import {
  isActiveGastroenterologyProviderOrderingMedication,
  validateGastroenterologyProviderOrderPlacement,
} from "./gastroenterologyProviderOrderingActivation.js";
import {
  isActivePediatricsProviderOrderingMedication,
  validatePediatricsProviderOrderPlacement,
} from "./pediatricsProviderOrderingActivation.js";
import {
  isActiveSurgeryPerioperativeProviderOrderingMedication,
  validateSurgeryPerioperativeProviderOrderPlacement,
} from "./surgeryPerioperativeProviderOrderingActivation.js";
import {
  isActivePainManagementProviderOrderingMedication,
  validatePainManagementProviderOrderPlacement,
} from "./painManagementProviderOrderingActivation.js";
import {
  isActiveControlledSubstanceProviderOrderingMedication,
  validateControlledSubstanceProviderOrderPlacement,
} from "./controlledSubstanceProviderOrderingActivation.js";
import {
  isActivePulmonaryProviderOrderingMedication,
  validatePulmonaryProviderOrderPlacement,
  listActivePulmonaryProviderOrderingCatalogCodes,
} from "./pulmonaryProviderOrderingActivation.js";
import {
  bindProviderOrderablePrewarm,
  getActiveCodesForDomain,
  getPriorProviderOrderableCatalogCodesForDomain,
  markProviderOrderablePrewarmComplete,
  resetProviderOrderablePriorCodesStateForTests,
  setActiveCodesForDomain,
  setPriorCodesForDomain,
  type ProviderOrderingDomainId,
} from "./providerOrderablePriorCodesState.js";

export type { ProviderOrderingDomainId } from "./providerOrderablePriorCodesState.js";
export { getPriorProviderOrderableCatalogCodesForDomain } from "./providerOrderablePriorCodesState.js";

/** Domains whose active codes must be treated as already covered when building a later domain registry. */
const PRIOR_DOMAINS_BY_ID: Record<ProviderOrderingDomainId, readonly ProviderOrderingDomainId[]> = {
  tranche2: [],
  anticoagulation: [],
  insulinDiabetes: [],
  vaccine: [],
  criticalCare: ["anticoagulation", "insulinDiabetes", "vaccine"],
  neurology: ["tranche2", "anticoagulation", "insulinDiabetes", "vaccine", "criticalCare"],
  infectiousDisease: ["tranche2", "anticoagulation", "insulinDiabetes", "vaccine", "criticalCare"],
  cardiology: [
    "tranche2",
    "anticoagulation",
    "insulinDiabetes",
    "vaccine",
    "criticalCare",
    "neurology",
    "infectiousDisease",
  ],
  ivFluids: [
    "tranche2",
    "anticoagulation",
    "insulinDiabetes",
    "vaccine",
    "criticalCare",
    "neurology",
    "infectiousDisease",
    "cardiology",
  ],
  obgyn: [
    "tranche2",
    "anticoagulation",
    "insulinDiabetes",
    "vaccine",
    "criticalCare",
    "neurology",
    "infectiousDisease",
    "cardiology",
    "ivFluids",
  ],
  psychiatry: [
    "tranche2",
    "anticoagulation",
    "insulinDiabetes",
    "vaccine",
    "criticalCare",
    "neurology",
    "infectiousDisease",
    "cardiology",
    "ivFluids",
    "obgyn",
  ],
  gastroenterology: [
    "tranche2",
    "anticoagulation",
    "insulinDiabetes",
    "vaccine",
    "criticalCare",
    "neurology",
    "infectiousDisease",
    "cardiology",
    "ivFluids",
    "obgyn",
    "psychiatry",
  ],
  pediatrics: [
    "tranche2",
    "anticoagulation",
    "insulinDiabetes",
    "vaccine",
    "criticalCare",
    "neurology",
    "infectiousDisease",
    "cardiology",
    "ivFluids",
    "obgyn",
    "psychiatry",
    "gastroenterology",
  ],
  surgery: [
    "tranche2",
    "anticoagulation",
    "insulinDiabetes",
    "vaccine",
    "criticalCare",
    "neurology",
    "infectiousDisease",
    "cardiology",
    "ivFluids",
    "obgyn",
    "psychiatry",
    "gastroenterology",
    "pediatrics",
  ],
  painManagement: [
    "tranche2",
    "anticoagulation",
    "insulinDiabetes",
    "vaccine",
    "criticalCare",
    "neurology",
    "infectiousDisease",
    "cardiology",
    "ivFluids",
    "obgyn",
    "psychiatry",
    "gastroenterology",
    "pediatrics",
    "surgery",
  ],
  controlledSubstance: [
    "tranche2",
    "anticoagulation",
    "insulinDiabetes",
    "vaccine",
    "criticalCare",
    "neurology",
    "infectiousDisease",
    "cardiology",
    "ivFluids",
    "obgyn",
    "psychiatry",
    "gastroenterology",
    "pediatrics",
    "surgery",
    "painManagement",
  ],
  pulmonary: [
    "tranche2",
    "anticoagulation",
    "insulinDiabetes",
    "vaccine",
    "criticalCare",
    "neurology",
    "infectiousDisease",
    "cardiology",
    "ivFluids",
    "obgyn",
    "psychiatry",
    "gastroenterology",
    "pediatrics",
    "surgery",
    "painManagement",
    "controlledSubstance",
  ],
};

const BUILD_ORDER: readonly ProviderOrderingDomainId[] = [
  "tranche2",
  "anticoagulation",
  "insulinDiabetes",
  "vaccine",
  "criticalCare",
  "neurology",
  "infectiousDisease",
  "cardiology",
  "ivFluids",
  "obgyn",
  "psychiatry",
  "gastroenterology",
  "pediatrics",
  "surgery",
  "painManagement",
  "controlledSubstance",
  "pulmonary",
];

const LIST_ACTIVE_BY_DOMAIN: Record<ProviderOrderingDomainId, () => readonly string[]> = {
  tranche2: listActiveTranche2ProviderOrderingCatalogCodes,
  anticoagulation: listActiveAnticoagulationProviderOrderingCatalogCodes,
  insulinDiabetes: listActiveInsulinDiabetesProviderOrderingCatalogCodes,
  vaccine: listActiveVaccineProviderOrderingCatalogCodes,
  criticalCare: listActiveCriticalCareProviderOrderingCatalogCodes,
  neurology: listActiveNeurologyProviderOrderingCatalogCodes,
  infectiousDisease: listActiveInfectiousDiseaseProviderOrderingCatalogCodes,
  cardiology: listActiveCardiologyProviderOrderingCatalogCodes,
  ivFluids: listActiveIvFluidsProviderOrderingCatalogCodes,
  obgyn: listActiveObgynProviderOrderingCatalogCodes,
  psychiatry: listActivePsychiatryProviderOrderingCatalogCodes,
  gastroenterology: listActiveGastroenterologyProviderOrderingCatalogCodes,
  pediatrics: listActivePediatricsProviderOrderingCatalogCodes,
  surgery: listActiveSurgeryPerioperativeProviderOrderingCatalogCodes,
  painManagement: listActivePainManagementProviderOrderingCatalogCodes,
  controlledSubstance: listActiveControlledSubstanceProviderOrderingCatalogCodes,
  pulmonary: listActivePulmonaryProviderOrderingCatalogCodes,
};

let activeProviderOrderableCodes: ReadonlySet<string> | null = null;

export type ProviderOrderPlacementValidation = {
  allowed: boolean;
  blockers: string[];
  errorCode: string;
  message: string;
  logEvent: string;
};

const DOMAIN_ORDER_VALIDATORS: Array<{
  isActive: (catalogCode: string) => boolean;
  validate: (input: { catalogCode: string }) => { allowed: boolean; blockers: string[] };
  errorCode: string;
  message: string;
  logEvent: string;
}> = [
  {
    isActive: isActiveTranche2ProviderOrderingMedication,
    validate: validateTranche2ProviderOrderPlacement,
    errorCode: "TRANCHE_2_MEDICATION_ORDER_BLOCKED",
    message: "Ce médicament de tranche 2 n'est pas disponible pour cette commande.",
    logEvent: "tranche2_medication_order_blocked",
  },
  {
    isActive: isActiveAnticoagulationProviderOrderingMedication,
    validate: validateAnticoagulationProviderOrderPlacement,
    errorCode: "ANTICOAGULATION_MEDICATION_ORDER_BLOCKED",
    message: "Cet anticoagulant n'est pas disponible pour cette commande.",
    logEvent: "anticoagulation_medication_order_blocked",
  },
  {
    isActive: isActiveInsulinDiabetesProviderOrderingMedication,
    validate: validateInsulinDiabetesProviderOrderPlacement,
    errorCode: "INSULIN_DIABETES_MEDICATION_ORDER_BLOCKED",
    message: "Ce médicament pour le diabète n'est pas disponible pour cette commande.",
    logEvent: "insulin_diabetes_medication_order_blocked",
  },
  {
    isActive: isActiveVaccineProviderOrderingMedication,
    validate: validateVaccineProviderOrderPlacement,
    errorCode: "VACCINE_MEDICATION_ORDER_BLOCKED",
    message: "Ce vaccin n'est pas disponible pour cette commande.",
    logEvent: "vaccine_medication_order_blocked",
  },
  {
    isActive: isActiveCriticalCareProviderOrderingMedication,
    validate: validateCriticalCareProviderOrderPlacement,
    errorCode: "CRITICAL_CARE_MEDICATION_ORDER_BLOCKED",
    message: "Ce médicament de soins critiques n'est pas disponible pour cette commande.",
    logEvent: "critical_care_medication_order_blocked",
  },
  {
    isActive: isActiveNeurologyProviderOrderingMedication,
    validate: validateNeurologyProviderOrderPlacement,
    errorCode: "NEUROLOGY_MEDICATION_ORDER_BLOCKED",
    message: "Ce médicament neurologique n'est pas disponible pour cette commande.",
    logEvent: "neurology_medication_order_blocked",
  },
  {
    isActive: isActiveInfectiousDiseaseProviderOrderingMedication,
    validate: validateInfectiousDiseaseProviderOrderPlacement,
    errorCode: "INFECTIOUS_DISEASE_MEDICATION_ORDER_BLOCKED",
    message: "Ce médicament infectiologique n'est pas disponible pour cette commande.",
    logEvent: "infectious_disease_medication_order_blocked",
  },
  {
    isActive: isActiveCardiologyProviderOrderingMedication,
    validate: validateCardiologyProviderOrderPlacement,
    errorCode: "CARDIOLOGY_MEDICATION_ORDER_BLOCKED",
    message: "Ce médicament cardiologique n'est pas disponible pour cette commande.",
    logEvent: "cardiology_medication_order_blocked",
  },
  {
    isActive: isActiveIvFluidsProviderOrderingMedication,
    validate: validateIvFluidsProviderOrderPlacement,
    errorCode: "IV_FLUIDS_MEDICATION_ORDER_BLOCKED",
    message: "Ce soluté IV n'est pas disponible pour cette commande.",
    logEvent: "iv_fluids_medication_order_blocked",
  },
  {
    isActive: isActiveObgynProviderOrderingMedication,
    validate: validateObgynProviderOrderPlacement,
    errorCode: "OBGYN_MEDICATION_ORDER_BLOCKED",
    message: "Ce médicament obstétrical n'est pas disponible pour cette commande.",
    logEvent: "obgyn_medication_order_blocked",
  },
  {
    isActive: isActivePsychiatryProviderOrderingMedication,
    validate: validatePsychiatryProviderOrderPlacement,
    errorCode: "PSYCHIATRY_MEDICATION_ORDER_BLOCKED",
    message: "Ce médicament psychiatrique n'est pas disponible pour cette commande.",
    logEvent: "psychiatry_medication_order_blocked",
  },
  {
    isActive: isActiveGastroenterologyProviderOrderingMedication,
    validate: validateGastroenterologyProviderOrderPlacement,
    errorCode: "GASTROENTEROLOGY_MEDICATION_ORDER_BLOCKED",
    message: "Ce médicament gastro-entérologique n'est pas disponible pour cette commande.",
    logEvent: "gastroenterology_medication_order_blocked",
  },
  {
    isActive: isActivePediatricsProviderOrderingMedication,
    validate: validatePediatricsProviderOrderPlacement,
    errorCode: "PEDIATRICS_MEDICATION_ORDER_BLOCKED",
    message: "Ce médicament pédiatrique n'est pas disponible pour cette commande.",
    logEvent: "pediatrics_medication_order_blocked",
  },
  {
    isActive: isActiveSurgeryPerioperativeProviderOrderingMedication,
    validate: validateSurgeryPerioperativeProviderOrderPlacement,
    errorCode: "SURGERY_PERIOPERATIVE_MEDICATION_ORDER_BLOCKED",
    message: "Ce médicament périopératoire n'est pas disponible pour cette commande.",
    logEvent: "surgery_perioperative_medication_order_blocked",
  },
  {
    isActive: isActivePainManagementProviderOrderingMedication,
    validate: validatePainManagementProviderOrderPlacement,
    errorCode: "PAIN_MANAGEMENT_MEDICATION_ORDER_BLOCKED",
    message: "Ce médicament antalgique n'est pas disponible pour cette commande.",
    logEvent: "pain_management_medication_order_blocked",
  },
  {
    isActive: isActiveControlledSubstanceProviderOrderingMedication,
    validate: validateControlledSubstanceProviderOrderPlacement,
    errorCode: "CONTROLLED_SUBSTANCE_MEDICATION_ORDER_BLOCKED",
    message: "Ce médicament contrôlé n'est pas disponible pour cette commande.",
    logEvent: "controlled_substance_medication_order_blocked",
  },
  {
    isActive: isActivePulmonaryProviderOrderingMedication,
    validate: validatePulmonaryProviderOrderPlacement,
    errorCode: "PULMONARY_MEDICATION_ORDER_BLOCKED",
    message: "Ce médicament respiratoire n'est pas disponible pour cette commande.",
    logEvent: "pulmonary_medication_order_blocked",
  },
];

function buildPriorSet(domain: ProviderOrderingDomainId): ReadonlySet<string> {
  const priorDomains = PRIOR_DOMAINS_BY_ID[domain];
  const codes = new Set<string>();
  for (const priorDomain of priorDomains) {
    for (const code of getActiveCodesForDomain(priorDomain)) codes.add(code);
  }
  return codes;
}

/** All provider-orderable catalog codes across certified domains. */
export function getActiveProviderOrderableCatalogCodes(): ReadonlySet<string> {
  if (!activeProviderOrderableCodes) {
    prewarmProviderOrderableCatalogCodesRegistry();
  }
  return activeProviderOrderableCodes ?? new Set<string>();
}

/** Alias for hot-path readability in API services. */
export const ACTIVE_PROVIDER_ORDERABLE_CODES = {
  get size() {
    return getActiveProviderOrderableCatalogCodes().size;
  },
  has(catalogCode: string) {
    return getActiveProviderOrderableCatalogCodes().has(catalogCode);
  },
  values() {
    return getActiveProviderOrderableCatalogCodes().values();
  },
  [Symbol.iterator]() {
    return getActiveProviderOrderableCatalogCodes()[Symbol.iterator]();
  },
};

export function isActiveProviderOrderableCatalogCode(catalogCode: string): boolean {
  return getActiveProviderOrderableCatalogCodes().has(catalogCode);
}

/**
 * Build all domain registries once. Must run during API startup before serving traffic.
 */
export function prewarmProviderOrderableCatalogCodesRegistry(): ReadonlySet<string> {
  if (activeProviderOrderableCodes) return activeProviderOrderableCodes;

  const merged = new Set<string>();
  for (const domain of BUILD_ORDER) {
    setPriorCodesForDomain(domain, buildPriorSet(domain));
    const codes = LIST_ACTIVE_BY_DOMAIN[domain]();
    const domainSet = new Set<string>(codes);
    setActiveCodesForDomain(domain, domainSet);
    for (const code of codes) merged.add(code);
  }

  activeProviderOrderableCodes = merged;
  markProviderOrderablePrewarmComplete();
  return merged;
}

bindProviderOrderablePrewarm(prewarmProviderOrderableCatalogCodesRegistry);

/** Reset caches — test hook only. */
export function resetProviderOrderableCatalogCodesRegistryForTests(): void {
  activeProviderOrderableCodes = null;
  resetProviderOrderablePriorCodesStateForTests();
}

/**
 * Validate a medication order line against the owning domain gate (if any).
 * Returns null when validation passes or the catalog code is not domain-governed.
 */
export function validateProviderOrderPlacementForCatalogCode(
  catalogCode: string
): ProviderOrderPlacementValidation | null {
  for (const validator of DOMAIN_ORDER_VALIDATORS) {
    if (!validator.isActive(catalogCode)) continue;
    const result = validator.validate({ catalogCode });
    if (result.allowed) return null;
    return {
      allowed: false,
      blockers: result.blockers,
      errorCode: validator.errorCode,
      message: validator.message,
      logEvent: validator.logEvent,
    };
  }
  return null;
}
