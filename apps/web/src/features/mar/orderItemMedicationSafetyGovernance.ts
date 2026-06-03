import type {
  MedicationAdministrationRequirements,
  MedicationGovernanceProductInput,
  MedicationGovernanceResolveInput,
  MedicationSafetyGovernanceDisplayInput,
} from "@medora/shared";
import {
  lasaMarHasGovernanceSignal,
  resolveMedicationAdministrationRequirements,
} from "@medora/shared";

export type OrderItemMedicationGovernanceSource = {
  medicationSafetyGovernance?: MedicationSafetyGovernanceDisplayInput | null;
  medicationGovernanceResolveInput?: MedicationGovernanceResolveInput | null;
  catalogMedication?: {
    isControlled?: boolean | null;
    controlledSchedule?: string | null;
    requiresWitness?: boolean | null;
    requiresDoubleSign?: boolean | null;
    code?: string | null;
    genericName?: string | null;
    therapeuticClass?: string | null;
    id?: string | null;
  } | null;
  route?: string | null;
};

export type OrderItemMedicationGovernanceDisplayOptions = {
  highRiskNameMatch?: boolean;
  route?: string | null;
  isContinuousInfusion?: boolean;
  marAction?: string;
};

/** Hydrate product governance from enriched snapshot when resolve input lacks product (M1.7B.2). */
export function hydrateProductFromGovernanceSnapshot(
  gov: MedicationSafetyGovernanceDisplayInput | null | undefined,
  catalog?: OrderItemMedicationGovernanceSource["catalogMedication"]
): MedicationGovernanceProductInput | null {
  if (!gov) return null;

  const hasLasa = lasaMarHasGovernanceSignal({
    lasaGroupId: gov.lasaGroupId,
    lasaSeverity: gov.lasaSeverity,
  });
  const hasHighAlert =
    gov.isHighAlert === true ||
    Boolean(gov.highAlertClass && gov.highAlertClass !== "HIGH_ALERT_NONE");
  const hasControlled = gov.isControlled === true || catalog?.isControlled === true;
  const hasWaste = gov.wasteDocumentationRecommended === true;

  if (!hasLasa && !hasHighAlert && !hasControlled && !hasWaste) {
    return null;
  }

  const highAlertCategories =
    hasLasa || hasHighAlert
      ? {
          highAlertClass: gov.highAlertClass ?? null,
          ...(hasLasa
            ? {
                lasa: {
                  lasaGroupCode: gov.lasaGroupId ?? null,
                  lasaGroupLabel: gov.lasaGroupLabel ?? null,
                  lasaSeverity: gov.lasaSeverity ?? null,
                },
              }
            : {}),
        }
      : null;

  return {
    isHighAlert: hasHighAlert,
    highAlertCategories,
    lasaGroupId: gov.lasaGroupId ?? null,
    isControlled: gov.isControlled ?? catalog?.isControlled === true,
    controlledSchedule: gov.controlledSchedule ?? catalog?.controlledSchedule ?? null,
    requiresWitness: gov.requiresWitness ?? catalog?.requiresWitness === true,
    requiresDoubleSign: gov.requiresDoubleSign ?? catalog?.requiresDoubleSign === true,
    allowsWasteDocumentation: hasWaste,
  };
}

function ensureResolveInputProduct(
  resolveInput: MedicationGovernanceResolveInput,
  item: OrderItemMedicationGovernanceSource
): MedicationGovernanceResolveInput {
  if (resolveInput.product) return resolveInput;
  const hydrated = hydrateProductFromGovernanceSnapshot(
    item.medicationSafetyGovernance,
    item.catalogMedication
  );
  if (!hydrated) return resolveInput;
  return { ...resolveInput, product: hydrated };
}

function fallbackResolveInputFromOrderItem(
  item: OrderItemMedicationGovernanceSource
): MedicationGovernanceResolveInput | null {
  if (item.medicationGovernanceResolveInput) {
    return ensureResolveInputProduct(item.medicationGovernanceResolveInput, item);
  }
  const cm = item.catalogMedication;
  const gov = item.medicationSafetyGovernance;
  if (!cm?.id && !gov) return null;

  const base: MedicationGovernanceResolveInput = {
    catalog: cm?.id
      ? {
          id: cm.id,
          code: cm.code ?? null,
          genericName: cm.genericName ?? null,
          therapeuticClass: cm.therapeuticClass ?? null,
          isControlled: cm.isControlled === true,
          controlledSchedule: cm.controlledSchedule ?? null,
          requiresWitness: cm.requiresWitness === true,
          requiresDoubleSign: cm.requiresDoubleSign === true,
        }
      : null,
    product: null,
    pharmacy: gov?.pharmacyVerificationStatus
      ? {
          verificationStatus: gov.pharmacyVerificationStatus,
          verifiedAt: gov.pharmacyVerifiedAt ?? null,
          verifiedByDisplay: gov.pharmacyVerifiedByDisplay ?? null,
        }
      : null,
  };

  return ensureResolveInputProduct(base, item);
}

/**
 * M1.7B.1 — resolve governance from enriched order item via shared resolver.
 */
export function resolveOrderItemMedicationAdministrationRequirements(
  item: OrderItemMedicationGovernanceSource,
  options?: OrderItemMedicationGovernanceDisplayOptions
): MedicationAdministrationRequirements | null {
  const resolveInput = fallbackResolveInputFromOrderItem(item);
  if (!resolveInput) return null;

  const marAction = (options?.marAction ?? "administered") as "administered";
  const gov = item.medicationSafetyGovernance;

  return resolveMedicationAdministrationRequirements({
    ...resolveInput,
    pharmacy: resolveInput.pharmacy ?? (gov?.pharmacyVerificationStatus
      ? {
          verificationStatus: gov.pharmacyVerificationStatus,
          verifiedAt: gov.pharmacyVerifiedAt ?? null,
          verifiedByDisplay: gov.pharmacyVerifiedByDisplay ?? null,
        }
      : null),
    marContext: {
      marAction,
      route: options?.route ?? item.route ?? null,
      isContinuousInfusion: options?.isContinuousInfusion === true,
    },
    displayHints: {
      highRiskNameMatch: options?.highRiskNameMatch,
    },
  });
}

/** @deprecated Use requirements.display.displayInput */
export function orderItemToMedicationSafetyGovernanceDisplay(
  item: OrderItemMedicationGovernanceSource,
  options?: OrderItemMedicationGovernanceDisplayOptions
): MedicationSafetyGovernanceDisplayInput {
  const requirements = resolveOrderItemMedicationAdministrationRequirements(item, options);
  if (requirements) {
    return requirements.display.displayInput;
  }
  return {
    isControlled: item.catalogMedication?.isControlled === true,
    controlledSchedule: item.catalogMedication?.controlledSchedule ?? null,
    requiresWitness: item.catalogMedication?.requiresWitness === true,
    highRiskNameMatch: options?.highRiskNameMatch,
  };
}

/** True when MAR modal must show blocking governance workflow sections. */
export function marBlockingGovernanceWorkflowVisible(
  requirements: MedicationAdministrationRequirements,
  marAction: string
): boolean {
  if (marAction !== "administered") return false;
  return requirements.blockingWorkflowVisible;
}

export function marControlledWorkflowVisible(
  requirements: MedicationAdministrationRequirements,
  marAction: string
): boolean {
  return marAction === "administered" && requirements.workflows.controlled.workflowVisible;
}

export function marHighAlertWorkflowVisible(
  requirements: MedicationAdministrationRequirements,
  marAction: string
): boolean {
  return marAction === "administered" && requirements.workflows.highAlert.workflowVisible;
}

export function marLasaWorkflowVisible(
  requirements: MedicationAdministrationRequirements,
  marAction: string
): boolean {
  return marAction === "administered" && requirements.workflows.lasa.workflowVisible;
}

export function marPharmacyWorkflowVisible(
  requirements: MedicationAdministrationRequirements,
  marAction: string
): boolean {
  return marAction === "administered" && requirements.workflows.pharmacy.workflowVisible;
}

/** True when LASA acknowledgement or documented override is complete (M1.7B.2). */
export function marLasaAcknowledgementComplete(state: {
  lasaAcknowledged: boolean;
  lasaMedicationSelectionConfirmed: boolean;
  useOverride: boolean;
  lasaOverrideAcknowledged: boolean;
  lasaOverrideReason: string;
}): boolean {
  const overrideUsed =
    state.useOverride &&
    state.lasaOverrideAcknowledged &&
    state.lasaOverrideReason.trim().length >= 8;
  return (
    (state.lasaAcknowledged && state.lasaMedicationSelectionConfirmed) || overrideUsed
  );
}
