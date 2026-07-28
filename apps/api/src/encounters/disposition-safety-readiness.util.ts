import { EncounterStatus, EncounterType } from "@prisma/client";
import {
  erHandoffV1SatisfiesInpatientTransferConfirm,
  resolveMedicationMarActionFromStorage,
  hasClosureAdequateDischargeInstructions,
  hasClosureFollowUpDocumented,
  hasClosurePatientInstructionsExplained,
  hasClosureReturnPrecautionsDocumented,
  projectEdDispositionState,
  resolveEdDispositionPath,
  isHomeDischargeInstructionsPath,
  evaluateDispositionPathwayReadinessBlockers,
  isActiveInfusionFromAdministrations,
  EMPTY_D4C7F_PENDING_ITEM_COUNTS,
  totalD4c7fPendingItems,
  type D4c7fPendingItemCounts,
  type MarClinicalAction,
} from "@medora/shared";

/** Canonical French values stored in `dischargeSummaryJson.dischargeMode` — keep aligned with `DISCHARGE_MODE_OPTIONS_FR` (web). */
export const DISCHARGE_MODE_FR_ADMISSION = "Admission / hospitalisation";
export const DISCHARGE_MODE_FR_TRANSFER = "Transfert vers un autre établissement";
const VITALS_RECENT_MS = 4 * 60 * 60 * 1000;

const TERMINAL_ORDER_ITEM_STATUSES = new Set([
  "COMPLETED",
  "CANCELLED",
  "RESULTED",
  "VERIFIED",
  "SIGNED",
]);

export type DispositionSafetyIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
};

export type DispositionSafetyActiveOrderCounts = {
  lab: number;
  imaging: number;
  medication: number;
  care: number;
};

export type DispositionSafetyReadinessResult = {
  canClose: boolean;
  blockers: DispositionSafetyIssue[];
  warnings: DispositionSafetyIssue[];
  lastVitalsAt?: string;
  activeOrderCounts: DispositionSafetyActiveOrderCounts;
  /** D1 server-owned disposition state projection (non-authoritative for close). */
  dispositionState?: import("@medora/shared").EdDispositionStateProjection;
  /**
   * MEDUI.D4C.7F — overridable pending clinical items (not hard blockers).
   * Active infusion is excluded here and surfaced as ACTIVE_INFUSION_RUNNING.
   */
  pendingItems: D4c7fPendingItemCounts;
  pendingItemIds: string[];
  /** True safety blockers that must never be overridden via pending-item ack. */
  nonOverridableBlockers: DispositionSafetyIssue[];
};

type OrderItemForSafety = {
  id?: string;
  status: string;
  catalogItemType: string | null;
  medicationFulfillmentIntent: string | null;
  result: { verifiedAt: Date | null } | null;
  pharmacyDispenseRecord: { id: string } | null;
  medicationAdministrations: Array<{
    marAction: string | null;
    notes: string | null;
    infusionPhase?: string | null;
  }>;
};

type OrderForSafety = {
  status: string;
  type: string;
  items: OrderItemForSafety[];
};

function admissionSummaryHasContentJson(data: unknown): boolean {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  return Object.values(data as Record<string, unknown>).some((v) => typeof v === "string" && v.trim().length > 0);
}

function hasPhysicianEvalV1Content(nursingAssessment: unknown): boolean {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) {
    return false;
  }
  const pe = (nursingAssessment as Record<string, unknown>).physicianEvalV1;
  if (!pe || typeof pe !== "object" || Array.isArray(pe)) return false;
  const o = pe as Record<string, unknown>;
  for (const k of ["hpi", "ros", "physicalExam", "mdm"]) {
    const v = o[k];
    if (typeof v === "string" && v.trim().length > 0) return true;
  }
  return false;
}

function encounterHasSignableProviderContent(args: {
  providerNote: string | null;
  treatmentPlan: string | null;
  nursingAssessment: unknown;
}): boolean {
  if (args.providerNote?.trim()) return true;
  if (args.treatmentPlan?.trim()) return true;
  return hasPhysicianEvalV1Content(args.nursingAssessment);
}

function dischargeModeFromEffectiveSummary(summary: Record<string, unknown> | undefined): string {
  const m = summary?.dischargeMode;
  return typeof m === "string" ? m.trim() : "";
}

function encounterHasMedicationOrders(orders: OrderForSafety[]): boolean {
  return orders.some((o) => o.type === "MEDICATION");
}

function patientInstructionsMarkedGiven(summary: Record<string, unknown> | undefined): boolean {
  return hasClosurePatientInstructionsExplained(summary);
}

function latestMarAction(
  admins: Array<{ marAction: string | null; notes: string | null }>
): MarClinicalAction | null {
  const latest = admins[0];
  if (!latest) return null;
  return resolveMedicationMarActionFromStorage({
    marAction: latest.marAction ?? null,
    notes: latest.notes,
  });
}

function isOrderItemClinicallyUnresolved(item: OrderItemForSafety, parentOrderCancelled: boolean): boolean {
  if (parentOrderCancelled) return false;
  if (item.status === "CANCELLED") return false;

  if (item.catalogItemType === "MEDICATION") {
    const intent = item.medicationFulfillmentIntent ?? "ADMINISTER_CHART";
    if (intent === "PHARMACY_DISPENSE") {
      if (item.pharmacyDispenseRecord) return false;
      if (TERMINAL_ORDER_ITEM_STATUSES.has(item.status)) return false;
      return true;
    }
    if (TERMINAL_ORDER_ITEM_STATUSES.has(item.status)) return false;
    const act = latestMarAction(item.medicationAdministrations ?? []);
    if (
      act &&
      (act === "administered" || act === "refused" || act === "not_available" || act === "md_changed")
    )
      return false;
    return true;
  }

  if (item.catalogItemType === "LAB_TEST" || item.catalogItemType === "IMAGING_STUDY") {
    if (item.result?.verifiedAt) return false;
    if (TERMINAL_ORDER_ITEM_STATUSES.has(item.status)) return false;
    return true;
  }

  if (item.catalogItemType === "CARE") {
    return !TERMINAL_ORDER_ITEM_STATUSES.has(item.status);
  }

  return !TERMINAL_ORDER_ITEM_STATUSES.has(item.status);
}

function countBucketForType(orderType: string): keyof DispositionSafetyActiveOrderCounts | null {
  if (orderType === "LAB") return "lab";
  if (orderType === "IMAGING") return "imaging";
  if (orderType === "MEDICATION") return "medication";
  if (orderType === "CARE") return "care";
  return null;
}

export function computeDispositionSafetyReadiness(input: {
  encounter: {
    type: EncounterType;
    status: EncounterStatus;
    nursingAssessment: unknown;
    dischargeSummaryJson: unknown;
    admissionSummaryJson: unknown;
    providerDocumentationStatus: string;
    providerDocumentationSignedAt: Date | null;
    providerNote: string | null;
    treatmentPlan: string | null;
  };
  /** Merged discharge summary keys for inferring disposition path at close (optional on GET). */
  effectiveDischargeSummary: Record<string, unknown> | undefined;
  patientLatestVitalsAt: Date | null;
  latestTriageVitalsRecordedAt: Date | null;
  latestVitalsClinicalEventAt: Date | null;
  orders: OrderForSafety[];
  now?: Date;
}): DispositionSafetyReadinessResult {
  const now = input.now ?? new Date();
  const blockers: DispositionSafetyIssue[] = [];
  const warnings: DispositionSafetyIssue[] = [];
  const nonOverridableBlockers: DispositionSafetyIssue[] = [];
  const counts: DispositionSafetyActiveOrderCounts = { lab: 0, imaging: 0, medication: 0, care: 0 };
  const pendingItems: D4c7fPendingItemCounts = { ...EMPTY_D4C7F_PENDING_ITEM_COUNTS };
  const pendingItemIds: string[] = [];

  const { encounter } = input;
  const dispositionStateBase = {
    status: encounter.status,
    dischargeSummaryJson: input.effectiveDischargeSummary ?? encounter.dischargeSummaryJson,
    admissionSummaryJson: encounter.admissionSummaryJson,
    nursingAssessment: encounter.nursingAssessment,
  };
  if (encounter.status !== EncounterStatus.OPEN) {
    return {
      canClose: true,
      blockers: [],
      warnings: [],
      activeOrderCounts: counts,
      pendingItems,
      pendingItemIds: [],
      nonOverridableBlockers: [],
      dispositionState: projectEdDispositionState({
        ...dispositionStateBase,
        dispositionSafetyCanClose: true,
      }),
    };
  }

  const effectiveSummary = input.effectiveDischargeSummary;
  const dischargeMode = dischargeModeFromEffectiveSummary(effectiveSummary);
  const isErUc = encounter.type === EncounterType.EMERGENCY || encounter.type === EncounterType.URGENT_CARE;
  const isAdmissionPath = dischargeMode === DISCHARGE_MODE_FR_ADMISSION;
  const isTransferPath = dischargeMode === DISCHARGE_MODE_FR_TRANSFER;

  let lastVitalsMs = 0;
  if (input.patientLatestVitalsAt) {
    lastVitalsMs = Math.max(lastVitalsMs, input.patientLatestVitalsAt.getTime());
  }
  if (input.latestTriageVitalsRecordedAt) {
    lastVitalsMs = Math.max(lastVitalsMs, input.latestTriageVitalsRecordedAt.getTime());
  }
  if (input.latestVitalsClinicalEventAt) {
    lastVitalsMs = Math.max(lastVitalsMs, input.latestVitalsClinicalEventAt.getTime());
  }
  const lastVitalsAt = lastVitalsMs > 0 ? new Date(lastVitalsMs).toISOString() : undefined;

  if (isErUc) {
    if (!lastVitalsAt) {
      blockers.push({
        code: "VITALS_MISSING",
        severity: "error",
        message:
          "Aucun signe vital récent n’est documenté pour cette consultation (dossier patient, triage ou dossier consultation).",
      });
    } else if (now.getTime() - lastVitalsMs > VITALS_RECENT_MS) {
      blockers.push({
        code: "VITALS_STALE",
        severity: "error",
        message:
          "Les derniers signes vitaux datent de plus de 4 heures. Actualisez un relevé ou confirmez explicitement la clôture malgré ce risque.",
      });
    }
  } else if (!lastVitalsAt) {
    warnings.push({
      code: "VITALS_NOT_DOCUMENTED",
      severity: "warning",
      message: "Aucun signe vital structuré retrouvé — vérifiez qu’un relevé récent n’est pas nécessaire avant la clôture.",
    });
  }

  const providerSigned =
    encounter.providerDocumentationStatus === "SIGNED" || encounter.providerDocumentationSignedAt != null;
  if (!providerSigned) {
    blockers.push({
      code: "PROVIDER_DOCUMENTATION_UNSIGNED",
      severity: "error",
      message: "La documentation médicale doit être signée avant la clôture définitive de la consultation.",
    });
  }

  let hasUnresolvedOrder = false;
  let hasActiveInfusion = false;
  for (const order of input.orders) {
    const parentCancelled = order.status === "CANCELLED";
    if (parentCancelled) continue;
    const bucket = countBucketForType(order.type);
    for (const item of order.items) {
      if (
        item.catalogItemType === "MEDICATION" &&
        isActiveInfusionFromAdministrations(item.medicationAdministrations ?? [])
      ) {
        hasActiveInfusion = true;
        continue;
      }
      if (isOrderItemClinicallyUnresolved(item, parentCancelled)) {
        hasUnresolvedOrder = true;
        if (bucket) counts[bucket] += 1;
        if (item.id) pendingItemIds.push(item.id);
        if (bucket === "lab") {
          if (item.result && !item.result.verifiedAt) pendingItems.results += 1;
          else pendingItems.laboratory += 1;
        } else if (bucket === "imaging") {
          if (item.result && !item.result.verifiedAt) pendingItems.results += 1;
          else pendingItems.imaging += 1;
        } else if (bucket === "medication") {
          pendingItems.medications += 1;
        } else if (bucket === "care") {
          pendingItems.procedures += 1;
        }
      }
    }
  }

  if (hasActiveInfusion) {
    const infusionBlocker: DispositionSafetyIssue = {
      code: "ACTIVE_INFUSION_RUNNING",
      severity: "error",
      message: "Une perfusion est toujours en cours. Arrêtez la perfusion avant la clôture.",
    };
    nonOverridableBlockers.push(infusionBlocker);
    blockers.push(infusionBlocker);
  }

  // MEDUI.D4C.7F — unresolved orders:
  // - Always counted in pendingItems (typed ambulatory override path).
  // - ER/UC keep ACTIVE_ORDERS_UNRESOLVED as disposition blockers (existing ED cert/UI).
  // - Ambulatory: overridable pending warning only (not an unconditional hard blocker).
  if (hasUnresolvedOrder) {
    const orderMsg = `Des ordres actifs ne sont pas résolus (labo: ${counts.lab}, imagerie: ${counts.imaging}, médicaments: ${counts.medication}, soins: ${counts.care}).`;
    if (isErUc) {
      blockers.push({
        code: "ACTIVE_ORDERS_UNRESOLVED",
        severity: "error",
        message: `${orderMsg} Terminez ou annulez les lignes concernées, ou confirmez la clôture explicitement.`,
      });
    } else {
      warnings.push({
        code: "ACTIVE_ORDERS_UNRESOLVED",
        severity: "warning",
        message: `${orderMsg} Vous pouvez clôturer après acknowledgement explicite — les éléments resteront en file.`,
      });
    }
  }

  if (isErUc && (isAdmissionPath || isTransferPath)) {
    if (!erHandoffV1SatisfiesInpatientTransferConfirm(encounter.nursingAssessment)) {
      blockers.push({
        code: "NURSING_HANDOFF_INCOMPLETE",
        severity: "error",
        message:
          "Passation infirmière / transfert des soins non confirmée (compte rendu ou confirmation « prêt pour transfert » requis).",
      });
    }

    if (isAdmissionPath) {
      const adm = encounter.admissionSummaryJson;
      if (!admissionSummaryHasContentJson(adm)) {
        blockers.push({
          code: "ADMISSION_DOCUMENTATION_INCOMPLETE",
          severity: "error",
          message: "L’admission / hospitalisation exige un dossier d’admission structuré complété.",
        });
      }
    }

    if (isTransferPath) {
      if (!encounterHasSignableProviderContent(encounter)) {
        blockers.push({
          code: "PROVIDER_DISPOSITION_INCOMPLETE",
          severity: "error",
          message:
            "Le transfert exige une documentation médicale de disposition (impression, plan ou évaluation structurée).",
        });
      }
    }
  }

  const dispositionPath = resolveEdDispositionPath({
    dischargeSummaryJson: effectiveSummary ?? encounter.dischargeSummaryJson,
    admissionSummaryJson: encounter.admissionSummaryJson,
    nursingAssessment: encounter.nursingAssessment,
  });

  // D2.5 — Home discharge instruction blockers apply to HOME only (not AMA).
  if (isErUc && isHomeDischargeInstructionsPath(dispositionPath)) {
    const hasMeds = encounterHasMedicationOrders(input.orders);
    if (!hasClosureAdequateDischargeInstructions(effectiveSummary, hasMeds)) {
      blockers.push({
        code: "DISCHARGE_INSTRUCTIONS_MISSING",
        severity: "error",
        message:
          "Le contenu des consignes de sortie est incomplet (diagnostic, consignes cliniques, précautions ou activité) — au moins deux sections doivent être renseignées.",
      });
    }
    if (!hasClosureReturnPrecautionsDocumented(effectiveSummary)) {
      blockers.push({
        code: "DISCHARGE_RETURN_PRECAUTIONS_MISSING",
        severity: "error",
        message:
          "Les précautions et signes d’alarme (retour aux urgences) doivent être documentés dans les instructions de sortie.",
      });
    }
    if (!hasClosureFollowUpDocumented(effectiveSummary)) {
      blockers.push({
        code: "DISCHARGE_FOLLOW_UP_MISSING",
        severity: "error",
        message:
          "Le suivi structuré (type/destination, échéance et contact le cas échéant) doit être documenté dans la planification de sortie.",
      });
    }
    if (!patientInstructionsMarkedGiven(effectiveSummary)) {
      blockers.push({
        code: "DISCHARGE_INSTRUCTIONS_NOT_GIVEN",
        severity: "error",
        message:
          "Les consignes de sortie sont présentes ou en cours, mais la documentation indiquant qu’elles ont été expliquées ou remises au patient (ou représentant) est incomplète — cochez « consignes expliquées ».",
      });
    }
  }

  if (isErUc) {
    for (const b of evaluateDispositionPathwayReadinessBlockers({
      path: dispositionPath,
      nursingAssessment: encounter.nursingAssessment,
      dischargeSummaryJson: effectiveSummary ?? encounter.dischargeSummaryJson,
    })) {
      blockers.push({ code: b.code, severity: "error", message: b.message });
    }
  }

  const pendingTotal = totalD4c7fPendingItems(pendingItems);
  // ER/UC: blockers (incl. ACTIVE_ORDERS) drive canClose. Ambulatory: pending items also block until ack.
  const canClose = blockers.length === 0 && (isErUc || pendingTotal === 0);
  return {
    canClose,
    blockers,
    warnings,
    ...(lastVitalsAt ? { lastVitalsAt } : {}),
    activeOrderCounts: counts,
    pendingItems,
    pendingItemIds,
    nonOverridableBlockers,
    dispositionState: projectEdDispositionState({
      ...dispositionStateBase,
      dispositionSafetyCanClose: canClose,
    }),
  };
}

