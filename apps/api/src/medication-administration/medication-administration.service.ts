import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AuditAction,
  MedicationAdministrationInfusionPhase,
  MedicationMarAction,
  OrderEventOrderType,
  OrderEventType,
  OrderStatus,
  RoleCode,
  type OrderItem,
  type Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import type {
  MarClinicalAction,
  MedicationAdministrationCreateDto,
  MedicationAdministrationEffectiveTimeDto,
} from "@medora/shared";
import {
  buildMedicationAdministrationCandidate,
  buildMedicationOrderLabelSnapshot,
  deltaMinutesBetween,
  deriveMarClinicalActionFromNotes,
  getEncounterAllergyDocumentationSummary,
  INFUSION_START_MAR_NOTE_PREFIX,
  medicationAdministrationRowIsInfusionStart,
  medicationAdministrationRowIsInfusionStop,
  medicationAdministrationRowIsInfusionTerminal,
  normalizeNdc,
  parseMedicationAdministrationEffectiveTimeIso,
  resolveMedicationMarActionFromStorage,
  suggestInfusionBilling,
  toMedicationAdministrationEffectiveTimeIsoUtc,
  validateMedicationAdministrationEffectiveTime,
  validateImInjectionSiteForMarCreate,
  mergeInjectionSiteIntoMarNotes,
  isMedicationInfusionCandidate,
  type MedicationAdminEffectiveTimeValidationCode,
} from "@medora/shared";
import { assertMedicationAdminEffectiveTimeActor } from "../common/workflow/order-item-action-guards.util";
import {
  loadOrderMedicationCatalogMaps,
  resolveOrderMedicationCatalogRow,
} from "../orders/order-medication-catalog-resolve.util";
import { appendBillingCaptureCandidate } from "../billing/billing-capture.append.util";
import { tryAutoMedicationAdministrationBilling } from "../billing/billing-auto-append.util";
import {
  buildMedicationInfusionCandidateInputFromOrderItem,
  loadMedicationInfusionClassificationContext,
  shouldBlockDirectMarAdministeredForInfusionLine,
} from "../common/medication/medication-infusion-candidate-from-order-item.util";
import { assertParentOrderNotCancelled } from "../common/workflow/order-cancelled.guard";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";
import { applyLifecycleWithStatus } from "../common/workflow/order-item-lifecycle.machine";
import { logInfo } from "../common/logging/medoraLogger";
import {
  validateMedicationAdministrationGovernance,
  type MedicationAdministrationRequirements,
} from "@medora/shared";
import {
  persistControlledSubstanceMarGovernance,
} from "../medication-safety/controlled-substance-mar-governance.util";
import {
  persistHighAlertMarGovernance,
} from "../medication-safety/high-alert-mar-governance.util";
import {
  persistLasaMarGovernance,
} from "../medication-safety/lasa-mar-governance.util";
import {
  persistPharmacyMarGovernance,
} from "../medication-safety/pharmacy-mar-governance.util";
import { resolveMedicationAdministrationRequirementsForMar } from "../medication-safety/medication-governance-resolve.util";
import {
  badRequestExceptionMessage,
  badRequestExceptionCode,
  governanceBlockerCodeFromMessage,
  logMarCreateValidationBlocked,
  marValidationBadRequest,
} from "./mar-create-validation-log.util";

/** MAR may close a medication line from these statuses (bedside chart path; avoids strict PLACED→COMPLETED graph gap). */
const MAR_MEDICATION_LINE_PRE_CLOSE_STATUSES: OrderStatus[] = [
  OrderStatus.PLACED,
  OrderStatus.PENDING,
  OrderStatus.ACKNOWLEDGED,
  OrderStatus.IN_PROGRESS,
];

/** Blocks accidental double-submit of the same MAR within this window (same user + line). */
const MAR_REPEAT_ADMINISTER_WINDOW_MS = 120_000;

function utcDayBoundsForMar(at: Date): { start: Date; end: Date } {
  const y = at.getUTCFullYear();
  const m = at.getUTCMonth();
  const day = at.getUTCDate();
  return {
    start: new Date(Date.UTC(y, m, day, 0, 0, 0, 0)),
    end: new Date(Date.UTC(y, m, day + 1, 0, 0, 0, 0)),
  };
}

const MAR_AUDIT_DOSE_MAX_LEN = 80;
const MAR_AUDIT_ROUTE_MAX_LEN = 64;

/** Internal callers only (infusion START/STOP). HTTP API must not set these. */
export type MedicationAdministrationCreateServiceOptions = {
  allowAdministeredForInfusionTerminal?: boolean;
  /** Phase 15F-B.1: real MAR row at infusion START (no line completion, no billing). */
  allowAdministeredForInfusionStart?: boolean;
  /** When true, skip `tryAutoMedicationAdministrationBilling` (catalog HCPCS / route CPT companion) — infusion time coding is manual. */
  skipAutoMedicationCatalogBilling?: boolean;
  /** When true, do not close the medication order line on administered (infusion START). */
  skipMedicationLineCompletion?: boolean;
  /** When true, skip duplicate-administration window (infusion START then STOP within minutes). */
  skipDuplicateAdministeredWindowCheck?: boolean;
  /** When true, skip billing capture candidate append (infusion START). */
  skipBillingCaptureCandidate?: boolean;
  /** Links MAR row to OrderEvent `infusionSessionKey`. */
  infusionMar?: {
    infusionSessionKey: string;
    infusionPhase: "INFUSION_START" | "INFUSION_STOP";
  };
  /** Structured billing evidence for infusion STOP terminal MAR (not persisted on MAR row). */
  infusionBillingEvidence?: {
    infusionSessionKey: string;
    infusionStartedAtIso: string;
    infusionStoppedAtIso: string;
    infusionDurationMinutes: number;
    orderItemId: string;
  };
};

/** PHI-safe dose string for `AuditLog.metadata` (numeric + unit only; no drug names). */
function normalizedDoseForAudit(input: {
  doseValue: number | null;
  doseUnit: string | null;
  administeredQuantity: number | null;
  quantityUnit: string | null;
}): string | null {
  const dv = input.doseValue;
  const du = input.doseUnit?.trim();
  if (dv != null && Number.isFinite(Number(dv))) {
    const s = du && du.length > 0 ? `${String(dv)} ${du}` : String(dv);
    return s.length > MAR_AUDIT_DOSE_MAX_LEN ? `${s.slice(0, MAR_AUDIT_DOSE_MAX_LEN - 3)}...` : s;
  }
  const aq = input.administeredQuantity;
  const qu = input.quantityUnit?.trim();
  if (aq != null && Number.isFinite(Number(aq))) {
    const s = qu && qu.length > 0 ? `${String(aq)} ${qu}` : String(aq);
    return s.length > MAR_AUDIT_DOSE_MAX_LEN ? `${s.slice(0, MAR_AUDIT_DOSE_MAX_LEN - 3)}...` : s;
  }
  return null;
}

function safeRouteForAudit(route: string | null | undefined): string | null {
  const t = route?.trim();
  if (!t) return null;
  return t.length > MAR_AUDIT_ROUTE_MAX_LEN ? `${t.slice(0, MAR_AUDIT_ROUTE_MAX_LEN - 3)}...` : t;
}

@Injectable()
export class MedicationAdministrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private mapOrderTypeToOrderEventType(orderType: string): OrderEventOrderType {
    if (orderType === "LAB") return OrderEventOrderType.LAB;
    if (orderType === "IMAGING") return OrderEventOrderType.IMAGING;
    if (orderType === "MEDICATION") return OrderEventOrderType.MEDICATION;
    if (orderType === "CARE") return OrderEventOrderType.PROCEDURE;
    throw new BadRequestException("Type de commande invalide pour audit.");
  }

  private assertMedicationLineCloseableViaMar(status: OrderStatus) {
    if (!MAR_MEDICATION_LINE_PRE_CLOSE_STATUSES.includes(status)) {
      throw new BadRequestException(
        "Statut de ligne médicamenteuse incompatible avec l'enregistrement MAR (déjà terminée ou annulée)."
      );
    }
  }

  private async writeMarOrderEventIfNeeded(
    tx: Prisma.TransactionClient,
    input: {
      facilityId: string;
      orderId: string;
      encounterId: string;
      orderType: string;
      orderItemId: string;
      medicationAdministrationId: string;
      marAction: MarClinicalAction;
      performedByUserId: string;
    }
  ): Promise<void> {
    const dedupeKey = `mar-lifecycle:${input.medicationAdministrationId}`;
    const clinicallyAdministered = input.marAction === "administered";
    const eventType = clinicallyAdministered ? OrderEventType.COMPLETED : OrderEventType.STARTED;
    const existingByDedupe = await tx.orderEvent.findFirst({
      where: {
        orderId: input.orderId,
        metadata: {
          path: ["dedupeKey"],
          equals: dedupeKey,
        } as Prisma.JsonFilter,
      },
    });
    if (existingByDedupe) return;
    const existingByAdminId = await tx.orderEvent.findFirst({
      where: {
        orderId: input.orderId,
        metadata: {
          path: ["medicationAdministrationId"],
          equals: input.medicationAdministrationId,
        } as Prisma.JsonFilter,
      },
    });
    if (existingByAdminId) return;
    const roleSnapshot = await this.buildRoleSnapshotTx(
      tx,
      input.facilityId,
      input.performedByUserId
    );
    await tx.orderEvent.create({
      data: {
        facilityId: input.facilityId,
        encounterId: input.encounterId,
        orderId: input.orderId,
        orderType: this.mapOrderTypeToOrderEventType(input.orderType),
        eventType,
        performedByUserId: input.performedByUserId,
        performedAt: new Date(),
        roleSnapshot,
        metadata: {
          dedupeKey,
          orderItemId: input.orderItemId,
          medicationAdministrationId: input.medicationAdministrationId,
          marAction: input.marAction,
          lifecycleOutcome: clinicallyAdministered ? "ADMINISTERED" : "NON_ADMINISTERED",
          source: "MEDICATION_ADMINISTRATION_SERVICE",
        } as Prisma.InputJsonValue,
      },
    });
  }

  private toPrismaMarAction(action: MarClinicalAction): MedicationMarAction {
    switch (action) {
      case "administered":
        return MedicationMarAction.administered;
      case "refused":
        return MedicationMarAction.refused;
      case "not_available":
        return MedicationMarAction.not_available;
      case "md_changed":
        return MedicationMarAction.md_changed;
      default:
        return MedicationMarAction.administered;
    }
  }

  private async buildRoleSnapshotTx(
    tx: Prisma.TransactionClient,
    facilityId: string,
    userId: string
  ): Promise<string> {
    const roles = await tx.userRole.findMany({
      where: { facilityId, userId, isActive: true },
      include: { role: { select: { code: true } } },
    });
    const unique = [...new Set(roles.map((r) => r.role.code))];
    if (unique.length === 0) return "UNKNOWN";
    return unique.join("|");
  }

  private medicationLabelSnapshotFromMedicationOrderItem(
    item: OrderItem,
    catalogMedication: {
      displayNameEn: string | null;
      displayNameFr: string | null;
      name: string | null;
      genericName?: string | null;
      strength: string | null;
      code: string | null;
    } | null
  ): string {
    return buildMedicationOrderLabelSnapshot(
      {
        catalogItemType: "MEDICATION",
        manualLabel: item.manualLabel,
        manualSecondaryText: item.manualSecondaryText,
        strength: item.strength,
        notes: item.notes,
      },
      catalogMedication
    );
  }

  private logAndThrowMarCreateBlocked(
    context: {
      encounterId: string;
      orderItemId?: string | null;
      medicationProductId?: string | null;
      catalogMedicationId?: string | null;
      marAction?: string | null;
    },
    message: string,
    code?: string | null
  ): never {
    const blockerCode = code ?? governanceBlockerCodeFromMessage(message);
    logMarCreateValidationBlocked({
      ...context,
      governanceBlockerCode: blockerCode,
      message,
    });
    if (blockerCode) {
      throw marValidationBadRequest(blockerCode, message);
    }
    throw new BadRequestException(message);
  }

  async findByEncounter(encounterId: string, facilityId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const rows = await this.prisma.medicationAdministration.findMany({
      where: { encounterId, facilityId },
      orderBy: { administeredAt: "desc" },
      include: {
        administeredBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return rows.map((r) => ({
      ...r,
      marAction: resolveMedicationMarActionFromStorage({
        marAction: r.marAction ?? null,
        notes: r.notes,
      }),
    }));
  }

  async create(
    encounterId: string,
    facilityId: string,
    administeredByUserId: string,
    data: MedicationAdministrationCreateDto,
    serviceOptions?: MedicationAdministrationCreateServiceOptions
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      include: { triage: { select: { vitalsJson: true } } },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }
    assertEncounterNotSigned(encounter);
    if (encounter.status !== "OPEN" && !serviceOptions?.allowAdministeredForInfusionTerminal) {
      throw new BadRequestException("La consultation doit être ouverte pour enregistrer une administration.");
    }

    let orderItemId: string | null = data.orderItemId ?? null;
    let medicationLabelSnapshot: string | null = null;
    let orderIdForAudit: string | undefined;
    let linkedMedicationLine: (OrderItem & { order: { id: string; encounterId: string; type: string; status: string } }) | null =
      null;
    let catalogMedication: {
      id: string;
      displayNameEn: string | null;
      displayNameFr: string | null;
      name: string | null;
      genericName: string | null;
      code: string | null;
      strength: string | null;
      ndc11: string | null;
      ndcDisplay: string | null;
      billingUnitType: string | null;
      isControlled: boolean;
      controlledSchedule: string | null;
      requiresWitness: boolean;
      requiresDoubleSign: boolean;
    } | null = null;
    if (orderItemId) {
      const item = await this.prisma.orderItem.findFirst({
        where: { id: orderItemId },
        include: {
          order: {
            select: {
              id: true,
              encounterId: true,
              facilityId: true,
              type: true,
              status: true,
              createdAt: true,
              cancelledAt: true,
            },
          },
        },
      });
      if (!item) {
        throw new BadRequestException("Ligne d'ordre introuvable.");
      }
      if (item.order.encounterId !== encounterId) {
        throw new BadRequestException("La ligne n'appartient pas à cette consultation.");
      }
      if (item.order.facilityId !== facilityId) {
        throw new BadRequestException("Établissement invalide pour cette ligne.");
      }
      if (item.catalogItemType !== "MEDICATION") {
        throw new BadRequestException("La ligne doit être un médicament.");
      }
      assertParentOrderNotCancelled(item.order.status);
      linkedMedicationLine = item as OrderItem & {
        order: { id: string; encounterId: string; facilityId: string; type: string; status: string };
      };
      const resolvedCatalog = resolveOrderMedicationCatalogRow(
        item,
        await loadOrderMedicationCatalogMaps(this.prisma, [item])
      );
      if (resolvedCatalog) {
        catalogMedication = {
          id: resolvedCatalog.id,
          displayNameEn: resolvedCatalog.displayNameEn,
          displayNameFr: resolvedCatalog.displayNameFr,
          name: resolvedCatalog.name,
          genericName: resolvedCatalog.genericName,
          code: resolvedCatalog.code,
          strength: resolvedCatalog.strength,
          ndc11: resolvedCatalog.ndc11,
          ndcDisplay: resolvedCatalog.ndcDisplay,
          billingUnitType: resolvedCatalog.billingUnitType,
          isControlled: resolvedCatalog.isControlled,
          controlledSchedule: resolvedCatalog.controlledSchedule,
          requiresWitness: resolvedCatalog.requiresWitness,
          requiresDoubleSign: resolvedCatalog.requiresDoubleSign,
        };
      }
      medicationLabelSnapshot = this.medicationLabelSnapshotFromMedicationOrderItem(item, catalogMedication);
      orderIdForAudit = item.order.id;
    }

    const normalizedInputNdc = data.ndc?.trim() ? normalizeNdc(data.ndc) : null;
    if (normalizedInputNdc && !normalizedInputNdc.ok) {
      throw new BadRequestException("INVALID_NDC_FORMAT");
    }

    const doseValue = data.doseValue ?? null;
    const doseUnit = data.doseUnit?.trim() || null;
    const administeredQuantity = data.administeredQuantity ?? null;
    const billingQuantity = data.billingQuantity ?? administeredQuantity ?? null;
    const quantityUnit = data.quantityUnit?.trim() || null;
    const ndc11Snapshot = normalizedInputNdc?.ok
      ? normalizedInputNdc.ndc11
      : catalogMedication?.ndc11?.trim() || null;
    const ndcDisplaySnapshot = normalizedInputNdc?.ok
      ? normalizedInputNdc.ndcDisplay
      : catalogMedication?.ndcDisplay?.trim() || null;
    const candidateQuantityUnit = quantityUnit || catalogMedication?.billingUnitType?.trim() || null;

    const marActionResolved: MarClinicalAction =
      data.marAction ?? deriveMarClinicalActionFromNotes(data.notes);

    let marInfusionContinuous = false;
    if (linkedMedicationLine && catalogMedication) {
      const infusionCtx = await loadMedicationInfusionClassificationContext(
        this.prisma,
        linkedMedicationLine
      );
      if (infusionCtx.catalog) {
        marInfusionContinuous = isMedicationInfusionCandidate(
          buildMedicationInfusionCandidateInputFromOrderItem(
            linkedMedicationLine,
            infusionCtx.catalog,
            infusionCtx.resolvedRoute
          )
        );
      }
    }

    const marRequirements: MedicationAdministrationRequirements | null = catalogMedication
      ? await resolveMedicationAdministrationRequirementsForMar(this.prisma, {
          catalogRow: catalogMedication,
          orderItemId,
          marContext: {
            marAction: marActionResolved,
            route: linkedMedicationLine?.route ?? data.route ?? null,
            isContinuousInfusion: marInfusionContinuous,
          },
        })
      : null;

    const controlledGovernance = marRequirements?.workflows.controlled.context ?? null;
    const highAlertGovernance = marRequirements?.workflows.highAlert.context ?? null;
    const lasaGovernance = marRequirements?.workflows.lasa.context ?? null;
    const pharmacyGovernance = marRequirements?.workflows.pharmacy.context ?? null;

    const marValidationLogContext = {
      encounterId,
      orderItemId: data.orderItemId ?? null,
      medicationProductId: linkedMedicationLine?.medicationProductId ?? null,
      catalogMedicationId: catalogMedication?.id ?? null,
      marAction: marActionResolved,
    };

    const runMarGovernanceAssert = (fn: () => void) => {
      try {
        fn();
      } catch (err) {
        if (err instanceof BadRequestException) {
          const message = badRequestExceptionMessage(err);
          logMarCreateValidationBlocked({
            ...marValidationLogContext,
            governanceBlockerCode: badRequestExceptionCode(err),
            message,
          });
        }
        throw err;
      }
    };

    if (
      !serviceOptions?.allowAdministeredForInfusionTerminal &&
      !serviceOptions?.allowAdministeredForInfusionStart &&
      marRequirements
    ) {
      runMarGovernanceAssert(() => {
        const result = validateMedicationAdministrationGovernance(marRequirements, {
          marAction: marActionResolved,
          witnessUserId: data.witnessUserId,
          witnessDisplayName: data.witnessDisplayName,
          administeredByUserId,
          wasteAmount: data.wasteAmount ?? null,
          wasteUnit: data.wasteUnit,
          wasteReason: data.wasteReason,
          overrideReason: data.overrideReason,
          controlledOverrideAcknowledged: data.controlledOverrideAcknowledged,
          orderedQuantity: linkedMedicationLine?.quantity ?? null,
          administeredQuantity: data.administeredQuantity ?? null,
          highAlertVerifierUserId: data.highAlertVerifierUserId,
          highAlertVerifierDisplayName: data.highAlertVerifierDisplayName,
          highAlertOverrideReason: data.highAlertOverrideReason,
          highAlertOverrideAcknowledged: data.highAlertOverrideAcknowledged,
          highAlertVerificationType: data.highAlertVerificationType ?? null,
          lasaAcknowledged: data.lasaAcknowledged,
          lasaMedicationSelectionConfirmed: data.lasaMedicationSelectionConfirmed,
          lasaSecondReadUserId: data.lasaSecondReadUserId,
          lasaSecondReadDisplayName: data.lasaSecondReadDisplayName,
          lasaOverrideReason: data.lasaOverrideReason,
          lasaOverrideAcknowledged: data.lasaOverrideAcknowledged,
          pharmacyVerificationOverrideReason: data.pharmacyVerificationOverrideReason,
          pharmacyVerificationOverrideAcknowledged: data.pharmacyVerificationOverrideAcknowledged,
        });
        if (!result.ok) {
          throw marValidationBadRequest(result.code, result.message);
        }
      });
    }

    const imSiteValidation = validateImInjectionSiteForMarCreate({
      marAction: marActionResolved,
      route: data.route,
      injectionSite: data.injectionSite,
      notes: data.notes,
    });
    if (imSiteValidation) {
      this.logAndThrowMarCreateBlocked(marValidationLogContext, imSiteValidation.message);
    }

    if (
      orderItemId &&
      linkedMedicationLine &&
      marActionResolved === "administered" &&
      !serviceOptions?.allowAdministeredForInfusionTerminal &&
      !serviceOptions?.allowAdministeredForInfusionStart
    ) {
      const { resolvedRoute, catalog } = await loadMedicationInfusionClassificationContext(
        this.prisma,
        linkedMedicationLine
      );
      if (shouldBlockDirectMarAdministeredForInfusionLine(linkedMedicationLine, catalog, resolvedRoute)) {
        this.logAndThrowMarCreateBlocked(
          marValidationLogContext,
          "This medication requires infusion start/stop documentation."
        );
      }
    }

    const administeredAtEffective = data.administeredAt ?? new Date();
    const allergySummaryForGate = getEncounterAllergyDocumentationSummary({
      vitals: encounter.vitals,
      nursingAssessment: encounter.nursingAssessment,
      triageVitalsJson: encounter.triage?.vitalsJson ?? null,
    });
    if (
      marActionResolved === "administered" &&
      allergySummaryForGate &&
      data.safetyAcknowledgedMedicationAllergies !== true &&
      !serviceOptions?.allowAdministeredForInfusionTerminal &&
      !serviceOptions?.allowAdministeredForInfusionStart
    ) {
      this.logAndThrowMarCreateBlocked(
        marValidationLogContext,
        "Des allergies ou intolérances sont documentées pour cette visite. Confirmez avant d’enregistrer l’administration."
      );
    }

    if (
      orderItemId &&
      marActionResolved === "administered" &&
      !serviceOptions?.skipDuplicateAdministeredWindowCheck
    ) {
      const winStart = new Date(Date.now() - MAR_REPEAT_ADMINISTER_WINDOW_MS);
      const dup = await this.prisma.medicationAdministration.findFirst({
        where: {
          facilityId,
          encounterId,
          orderItemId,
          administeredByUserId,
          marAction: MedicationMarAction.administered,
          administeredAt: { gte: winStart },
        },
        select: { id: true },
      });
      if (dup) {
        throw new BadRequestException(
          "Une administration vient d’être enregistrée pour cette ligne. Vérifiez qu’il ne s’agit pas d’un doublon."
        );
      }
    }

    if (
      orderItemId &&
      marActionResolved === "administered" &&
      linkedMedicationLine &&
      linkedMedicationLine.quantity != null &&
      linkedMedicationLine.quantity >= 1 &&
      !serviceOptions?.skipMedicationLineCompletion
    ) {
      const prescribed = Number(linkedMedicationLine.quantity);
      const increment =
        administeredQuantity != null
          ? Number(administeredQuantity)
          : doseValue != null
            ? Number(doseValue)
            : NaN;
      if (Number.isFinite(increment) && increment > 0) {
        const at = administeredAtEffective instanceof Date ? administeredAtEffective : new Date(administeredAtEffective);
        const { start, end } = utcDayBoundsForMar(at);
        const agg = await this.prisma.medicationAdministration.aggregate({
          where: {
            orderItemId,
            facilityId,
            encounterId,
            marAction: MedicationMarAction.administered,
            administeredAt: { gte: start, lt: end },
            infusionPhase: { notIn: [MedicationAdministrationInfusionPhase.INFUSION_START] },
          },
          _sum: { administeredQuantity: true },
        });
        const prev = Number(agg._sum.administeredQuantity ?? 0);
        const allowed = Math.max(prescribed, Math.ceil(prescribed * 1.5));
        if (prev + increment > allowed + 1e-9) {
          throw new BadRequestException(
            `Quantité cumulée élevée par rapport à l’ordonnance (${linkedMedicationLine.quantity} prescrite). Vérifiez la dose ou complétez la quantité administrée.`
          );
        }
      }
    }

    const systemNowForCreate = new Date();
    const effectiveCreate = await this.resolveCreateEffectiveAdministeredFields({
      data,
      marActionResolved,
      administeredAtDocumented: administeredAtEffective,
      systemNow: systemNowForCreate,
      encounter,
      linkedMedicationLine: linkedMedicationLine as {
        catalogItemType?: string;
        catalogItemId?: string | null;
        createdAt?: Date;
        order?: { createdAt: Date; status: string; cancelledAt: Date | null };
      } | null,
      administeredByUserId,
    });

    const doseStr = normalizedDoseForAudit({
      doseValue: doseValue != null ? Number(doseValue) : null,
      doseUnit,
      administeredQuantity: administeredQuantity != null ? Number(administeredQuantity) : null,
      quantityUnit: candidateQuantityUnit,
    });
    const safeRoute = safeRouteForAudit(data.route);
    const administeredAtIso =
      administeredAtEffective instanceof Date
        ? administeredAtEffective.toISOString()
        : new Date(administeredAtEffective).toISOString();

    const persistedNotes =
      marActionResolved === "administered" && data.injectionSite
        ? mergeInjectionSiteIntoMarNotes(data.notes, data.injectionSite, "fr")
        : data.notes?.trim()
          ? data.notes.trim()
          : null;

    const marAuditMetadata: Record<string, unknown> = {
      marOutcome: marActionResolved,
      administeredBy: administeredByUserId,
      timestamp: administeredAtIso,
    };
    if (doseStr) marAuditMetadata.dose = doseStr;
    if (safeRoute) marAuditMetadata.route = safeRoute;
    if (data.injectionSite) marAuditMetadata.injectionSite = data.injectionSite;
    if (data.safetyAcknowledgedMedicationAllergies === true) {
      marAuditMetadata.safetyAcknowledgedMedicationAllergies = true;
    }
    Object.assign(marAuditMetadata, effectiveCreate.auditExtras);

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.medicationAdministration.create({
        data: {
          facilityId,
          patientId: encounter.patientId,
          encounterId,
          orderItemId,
          medicationLabelSnapshot,
          route: data.route?.trim() ? data.route.trim() : null,
          doseValue,
          doseUnit,
          administeredQuantity,
          billingQuantity,
          quantityUnit: candidateQuantityUnit,
          ndc11Snapshot,
          ndcDisplaySnapshot,
          administeredAt: data.administeredAt ?? new Date(),
          administeredByUserId,
          marAction: this.toPrismaMarAction(marActionResolved),
          infusionPhase: serviceOptions?.infusionMar
            ? serviceOptions.infusionMar.infusionPhase === "INFUSION_START"
              ? MedicationAdministrationInfusionPhase.INFUSION_START
              : MedicationAdministrationInfusionPhase.INFUSION_STOP
            : null,
          infusionSessionKey: serviceOptions?.infusionMar?.infusionSessionKey?.trim() || null,
          notes: persistedNotes,
          ...effectiveCreate.prismaFields,
        },
        include: {
          administeredBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      await this.audit.log(AuditAction.CREATE, "MEDICATION_ADMINISTRATION", {
        userId: administeredByUserId,
        facilityId,
        patientId: encounter.patientId,
        encounterId,
        entityId: row.id,
        ...(orderIdForAudit ? { orderId: orderIdForAudit } : {}),
        critical: true,
        tx,
        metadata: marAuditMetadata,
      });

      if (
        controlledGovernance &&
        !serviceOptions?.allowAdministeredForInfusionTerminal &&
        !serviceOptions?.allowAdministeredForInfusionStart
      ) {
        await persistControlledSubstanceMarGovernance({
          tx,
          audit: this.audit,
          facilityId,
          encounterId,
          patientId: encounter.patientId,
          orderId: orderIdForAudit,
          medicationAdministrationId: row.id,
          orderItemId,
          catalogMedicationId: catalogMedication?.id ?? null,
          administeredByUserId,
          data,
          governance: controlledGovernance,
          orderedQuantity: linkedMedicationLine?.quantity ?? null,
        });
      }

      if (
        highAlertGovernance &&
        !serviceOptions?.allowAdministeredForInfusionTerminal &&
        !serviceOptions?.allowAdministeredForInfusionStart
      ) {
        await persistHighAlertMarGovernance({
          tx,
          audit: this.audit,
          facilityId,
          encounterId,
          patientId: encounter.patientId,
          orderId: orderIdForAudit,
          medicationAdministrationId: row.id,
          orderItemId,
          catalogMedicationId: catalogMedication?.id ?? null,
          administeredByUserId,
          data,
          governance: highAlertGovernance,
        });
      }

      if (
        lasaGovernance &&
        !serviceOptions?.allowAdministeredForInfusionTerminal &&
        !serviceOptions?.allowAdministeredForInfusionStart
      ) {
        await persistLasaMarGovernance({
          tx,
          audit: this.audit,
          facilityId,
          encounterId,
          patientId: encounter.patientId,
          orderId: orderIdForAudit,
          medicationAdministrationId: row.id,
          orderItemId,
          catalogMedicationId: catalogMedication?.id ?? null,
          administeredByUserId,
          data,
          governance: lasaGovernance,
        });
      }

      if (
        pharmacyGovernance &&
        !serviceOptions?.allowAdministeredForInfusionTerminal &&
        !serviceOptions?.allowAdministeredForInfusionStart
      ) {
        await persistPharmacyMarGovernance({
          tx,
          audit: this.audit,
          facilityId,
          encounterId,
          patientId: encounter.patientId,
          orderId: orderIdForAudit,
          medicationAdministrationId: row.id,
          orderItemId,
          catalogMedicationId: catalogMedication?.id ?? null,
          administeredByUserId,
          data,
          governance: pharmacyGovernance,
        });
      }

      const line = linkedMedicationLine;
      if (line && line.catalogItemType === "MEDICATION") {
        const isTerminalMarAction =
          marActionResolved === "administered" ||
          marActionResolved === "refused" ||
          marActionResolved === "not_available" ||
          marActionResolved === "md_changed";
        if (
          isTerminalMarAction &&
          !serviceOptions?.skipMedicationLineCompletion &&
          line.status !== OrderStatus.COMPLETED &&
          line.status !== OrderStatus.CANCELLED
        ) {
          this.assertMedicationLineCloseableViaMar(line.status);
          const lifecycleState = applyLifecycleWithStatus(line.lifecycleState, OrderStatus.COMPLETED);
          await tx.orderItem.update({
            where: { id: line.id },
            data: {
              status: OrderStatus.COMPLETED,
              lifecycleState,
              completedAt: new Date(),
              completedByUserId: administeredByUserId,
            },
          });
        }
        if (!serviceOptions?.skipMedicationLineCompletion) {
          await this.writeMarOrderEventIfNeeded(tx, {
            facilityId,
            orderId: line.orderId,
            encounterId: line.order.encounterId,
            orderType: line.order.type,
            orderItemId: line.id,
            medicationAdministrationId: row.id,
            marAction: marActionResolved,
            performedByUserId: administeredByUserId,
          });
        }
      }

      return row;
    });

    logInfo("mar_action_recorded", {
      userId: administeredByUserId,
      encounterId,
      facilityId,
      action: "mar.record",
      marAction: marActionResolved,
      ...(orderItemId ? { orderItemId } : {}),
      medicationAdministrationId: created.id,
    });

    // Effective clinical time is operational/audit metadata only.
    // Billing and completion calculations must use documented timestamps (administeredAt).
    const atIso =
      created.administeredAt instanceof Date
        ? created.administeredAt.toISOString()
        : new Date().toISOString();
    const medLabel = created.medicationLabelSnapshot?.trim() || "Medication";
    if (marActionResolved === "administered" && !serviceOptions?.skipBillingCaptureCandidate) {
      const ev = serviceOptions?.infusionBillingEvidence;
      const infusionManualReview = Boolean(ev);
      let infusionRoute: string | undefined;
      let catalogTherapeuticClass: string | null = null;
      let catalogCodeForBilling: string | null = null;
      let catalogMedicationBillingClass: string | null = null;
      if (linkedMedicationLine) {
        const ctx = await loadMedicationInfusionClassificationContext(this.prisma, linkedMedicationLine);
        infusionRoute = ctx.resolvedRoute ?? undefined;
        catalogTherapeuticClass = ctx.catalog?.therapeuticClass?.trim() ?? null;
        catalogCodeForBilling = ctx.catalog?.code ?? null;
        catalogMedicationBillingClass = ctx.catalog?.billingClass?.trim() ?? null;
      }
      const infusionBillingSuggestion = ev
        ? suggestInfusionBilling({
            infusionDurationMinutes: ev.infusionDurationMinutes,
            medicationLabel: medLabel,
            route: infusionRoute ?? created.route ?? undefined,
            catalogMedicationBillingClass,
            catalogTherapeuticClass,
            catalogCode: catalogCodeForBilling,
          })
        : undefined;
      await appendBillingCaptureCandidate(
        this.prisma,
        encounterId,
        facilityId,
        buildMedicationAdministrationCandidate({
          administrationId: created.id,
          encounterId,
          patientId: encounter.patientId,
          facilityId,
          medicationLabel: medLabel,
          atIso,
          ndc11: created.ndc11Snapshot,
          ndcDisplay: created.ndcDisplaySnapshot,
          doseValue: created.doseValue != null ? Number(created.doseValue) : null,
          doseUnit: created.doseUnit,
          administeredQuantity:
            created.administeredQuantity != null ? Number(created.administeredQuantity) : null,
          billingQuantity: created.billingQuantity != null ? Number(created.billingQuantity) : null,
          quantityUnit: created.quantityUnit,
          createdByUserId: administeredByUserId,
          billingOrderItemId: created.orderItemId?.trim() || orderItemId?.trim() || null,
          infusionSessionKey: ev?.infusionSessionKey ?? null,
          infusionStartedAt: ev?.infusionStartedAtIso ?? null,
          infusionStoppedAt: ev?.infusionStoppedAtIso ?? null,
          infusionDurationMinutes: ev?.infusionDurationMinutes ?? null,
          infusionDurationBillingManualReview: infusionManualReview ? true : undefined,
          infusionBillingSuggestion: infusionBillingSuggestion ?? undefined,
        })
      );

      if (!serviceOptions?.skipAutoMedicationCatalogBilling) {
        void tryAutoMedicationAdministrationBilling(this.prisma, {
          facilityId,
          medicationAdministrationId: created.id,
        });
      }
    }

    return created;
  }

  /**
   * Phase 15F-B.1: in-progress infusion MAR at START (OrderEvent remains source for active session).
   * No billing, no order-line completion, no duplicate-window conflict with imminent STOP row.
   */
  async createInfusionStartMar(
    encounterId: string,
    facilityId: string,
    administeredByUserId: string,
    input: {
      orderItemId: string;
      infusionSessionKey: string;
      startedAt: Date;
      route?: string;
      notes?: string;
    }
  ) {
    const sessionKey = input.infusionSessionKey.trim();
    if (!sessionKey) {
      throw new BadRequestException("Clé de session de perfusion invalide.");
    }
    const existing = await this.prisma.medicationAdministration.findFirst({
      where: {
        facilityId,
        encounterId,
        orderItemId: input.orderItemId,
        infusionSessionKey: sessionKey,
        infusionPhase: MedicationAdministrationInfusionPhase.INFUSION_START,
      },
      select: { id: true },
    });
    if (existing) {
      return this.prisma.medicationAdministration.findFirstOrThrow({
        where: { id: existing.id },
        include: {
          administeredBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    }

    const notesCombined = [INFUSION_START_MAR_NOTE_PREFIX, input.notes?.trim()].filter(Boolean).join("\n\n");

    return this.create(
      encounterId,
      facilityId,
      administeredByUserId,
      {
        orderItemId: input.orderItemId,
        marAction: "administered",
        administeredAt: input.startedAt,
        ...(input.route?.trim() ? { route: input.route.trim() } : {}),
        notes: notesCombined,
      },
      {
        allowAdministeredForInfusionStart: true,
        skipAutoMedicationCatalogBilling: true,
        skipMedicationLineCompletion: true,
        skipDuplicateAdministeredWindowCheck: true,
        skipBillingCaptureCandidate: true,
        infusionMar: {
          infusionSessionKey: sessionKey,
          infusionPhase: "INFUSION_START",
        },
      }
    );
  }

  private encounterAnchorAt(encounter: { createdAt: Date; admittedAt: Date | null }): Date {
    return encounter.admittedAt ?? encounter.createdAt;
  }

  /** Optional effective clinical time on MAR create (Record administration modal). */
  private async resolveCreateEffectiveAdministeredFields(input: {
    data: MedicationAdministrationCreateDto;
    marActionResolved: MarClinicalAction;
    administeredAtDocumented: Date;
    systemNow: Date;
    encounter: { createdAt: Date; admittedAt: Date | null };
    linkedMedicationLine: {
      catalogItemType?: string;
      catalogItemId?: string | null;
      createdAt?: Date;
      order?: { createdAt: Date; status: string; cancelledAt: Date | null };
    } | null;
    administeredByUserId: string;
  }): Promise<{
    prismaFields: {
      effectiveAdministeredAt?: Date;
      effectiveAdministeredAtSetAt?: Date;
      effectiveAdministeredAtSetByUserId?: string;
      effectiveAdministeredAtReason?: string | null;
      effectiveAdministeredAtVersion?: number;
    };
    auditExtras: Record<string, unknown>;
  }> {
    const effectiveRaw = input.data.effectiveAdministeredAt?.trim();
    const reasonTrim = input.data.effectiveAdministeredAtReason?.trim() || null;
    if (!effectiveRaw && !reasonTrim) {
      return { prismaFields: {}, auditExtras: {} };
    }
    if (input.marActionResolved !== "administered") {
      throw new BadRequestException(this.marEffectiveTimeValidationMessage("NOT_ADMINISTERED"));
    }
    if (!effectiveRaw) {
      throw new BadRequestException(this.marEffectiveTimeValidationMessage("INVALID_TIME"));
    }
    const effectiveAt = parseMedicationAdministrationEffectiveTimeIso(effectiveRaw);
    if (!effectiveAt) {
      throw new BadRequestException(this.marEffectiveTimeValidationMessage("INVALID_TIME"));
    }

    const originalAdministeredAt =
      input.administeredAtDocumented instanceof Date
        ? input.administeredAtDocumented
        : new Date(input.administeredAtDocumented);
    const systemDocumentedAt = input.systemNow;

    const order = input.linkedMedicationLine?.order;
    const orderCreatedAt = order?.createdAt ?? input.encounter.createdAt;
    const orderItemCreatedAt = input.linkedMedicationLine?.createdAt ?? null;
    const orderCancelledAt =
      order?.status === OrderStatus.CANCELLED && order.cancelledAt ? order.cancelledAt : null;

    let controlledMedication = false;
    if (input.linkedMedicationLine?.catalogItemType === "MEDICATION" && input.linkedMedicationLine.catalogItemId) {
      const cat = await this.prisma.catalogMedication.findUnique({
        where: { id: input.linkedMedicationLine.catalogItemId },
        select: { isControlled: true },
      });
      controlledMedication = Boolean(cat?.isControlled);
    }

    const validation = validateMedicationAdministrationEffectiveTime({
      effectiveAdministeredTime: effectiveAt,
      now: input.systemNow,
      encounterAnchorAt: this.encounterAnchorAt(input.encounter),
      originalAdministeredAt,
      systemDocumentedAt,
      orderCreatedAt,
      orderItemCreatedAt,
      orderCancelledAt,
      adjustmentVersion: 0,
      reason: reasonTrim,
      controlledMedication,
      marActionAdministered: true,
    });
    if (!validation.ok) {
      throw new BadRequestException(this.marEffectiveTimeValidationMessage(validation.code));
    }

    const effectiveAtUtc = new Date(toMedicationAdministrationEffectiveTimeIsoUtc(effectiveAt));
    return {
      prismaFields: {
        effectiveAdministeredAt: effectiveAtUtc,
        effectiveAdministeredAtSetAt: input.systemNow,
        effectiveAdministeredAtSetByUserId: input.administeredByUserId,
        effectiveAdministeredAtReason: reasonTrim,
        effectiveAdministeredAtVersion: 1,
      },
      auditExtras: {
        effectiveAdministeredAtProvided: true,
        deltaMinutes: deltaMinutesBetween(effectiveAtUtc, originalAdministeredAt),
        reasonProvided: Boolean(reasonTrim),
        controlledMedication,
        source: "MAR_CREATE_MODAL",
      },
    };
  }

  private marEffectiveTimeValidationMessage(code: MedicationAdminEffectiveTimeValidationCode): string {
    switch (code) {
      case "FUTURE_TIME":
        return "L'heure d'administration ne peut pas être dans le futur.";
      case "BEFORE_ENCOUNTER":
        return "L'heure d'administration ne peut pas précéder le début de la consultation.";
      case "REASON_REQUIRED":
        return "Un motif est requis pour cet ajustement d'heure.";
      case "REASON_TOO_SHORT_FOR_LARGE_BACKDATE":
        return "Un motif détaillé est requis pour les corrections d'heure importantes.";
      case "NOT_ADMINISTERED":
        return "Seules les administrations documentées (administré) peuvent être ajustées.";
      case "INFUSION_DEFERRED":
        return "L'ajustement d'heure pour les perfusions IV n'est pas disponible pour l'instant.";
      case "INVALID_TIME":
        return "Horodatage invalide.";
      default:
        return "Ajustement d'heure refusé.";
    }
  }

  private async roleCodesForFacility(userId: string, facilityId: string): Promise<RoleCode[]> {
    const urs = await this.prisma.userRole.findMany({
      where: { facilityId, userId, isActive: true },
      include: { role: { select: { code: true } } },
    });
    return urs.map((r) => r.role.code);
  }

  /**
   * Post-hoc correction of effective clinical administration time for an existing MAR row.
   * Never mutates `administeredAt`, `createdAt`, billing, or OrderEvent timestamps.
   *
   * Phase 15F-B visibility: MAR tab history only. ClinicalTimeline / chart export deferred (15F-D / 15G).
   * INFUSION_START / INFUSION_STOP rows: effectiveAdministeredAt only — OrderEvent duration metadata unchanged.
   */
  async setEffectiveAdministeredAt(
    encounterId: string,
    facilityId: string,
    medicationAdministrationId: string,
    dto: MedicationAdministrationEffectiveTimeDto,
    userId: string,
    ip?: string,
    userAgent?: string
  ) {
    const roleCodes = await this.roleCodesForFacility(userId, facilityId);
    assertMedicationAdminEffectiveTimeActor(roleCodes);

    const row = await this.prisma.medicationAdministration.findFirst({
      where: { id: medicationAdministrationId, encounterId, facilityId },
      include: {
        encounter: true,
        orderItem: {
          include: {
            order: true,
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException("Administration introuvable.");
    }

    assertEncounterNotSigned(row.encounter);
    if (row.encounter.status !== "OPEN") {
      throw new BadRequestException("La consultation doit être ouverte pour ajuster une administration.");
    }

    const marActionResolved = resolveMedicationMarActionFromStorage({
      marAction: row.marAction ?? null,
      notes: row.notes,
    });
    if (marActionResolved !== "administered") {
      throw new BadRequestException(this.marEffectiveTimeValidationMessage("NOT_ADMINISTERED"));
    }

    const infusionStopTerminal = medicationAdministrationRowIsInfusionStop(
      row.notes,
      row.infusionPhase
    );
    const infusionStartRow = medicationAdministrationRowIsInfusionStart(row.notes, row.infusionPhase);

    const effectiveAt = parseMedicationAdministrationEffectiveTimeIso(dto.effectiveAdministeredTime);
    if (!effectiveAt) {
      throw new BadRequestException(this.marEffectiveTimeValidationMessage("INVALID_TIME"));
    }

    const systemNow = new Date();
    const originalAdministeredAt = row.administeredAt;
    const systemDocumentedAt = row.createdAt;
    const reasonTrim = dto.reason?.trim() || null;

    const order = row.orderItem?.order;
    const orderCreatedAt = order?.createdAt ?? row.encounter.createdAt;
    const orderItemCreatedAt = row.orderItem?.createdAt ?? null;
    const orderCancelledAt =
      order?.status === OrderStatus.CANCELLED && order.cancelledAt ? order.cancelledAt : null;

    let controlledMedication = false;
    if (row.orderItem?.catalogItemType === "MEDICATION" && row.orderItem.catalogItemId) {
      const cat = await this.prisma.catalogMedication.findUnique({
        where: { id: row.orderItem.catalogItemId },
        select: { isControlled: true },
      });
      controlledMedication = Boolean(cat?.isControlled);
    }

    const validation = validateMedicationAdministrationEffectiveTime({
      effectiveAdministeredTime: effectiveAt,
      now: systemNow,
      encounterAnchorAt: this.encounterAnchorAt(row.encounter),
      originalAdministeredAt,
      systemDocumentedAt,
      orderCreatedAt,
      orderItemCreatedAt,
      orderCancelledAt,
      adjustmentVersion: row.effectiveAdministeredAtVersion,
      reason: reasonTrim,
      controlledMedication,
      marActionAdministered: true,
    });
    if (!validation.ok) {
      throw new BadRequestException(this.marEffectiveTimeValidationMessage(validation.code));
    }

    const previousEffective = row.effectiveAdministeredAt;
    const effectiveAtUtc = new Date(toMedicationAdministrationEffectiveTimeIsoUtc(effectiveAt));

    const updated = await this.prisma.$transaction(async (tx) => {
      return tx.medicationAdministration.update({
        where: { id: medicationAdministrationId },
        data: {
          effectiveAdministeredAt: effectiveAtUtc,
          effectiveAdministeredAtSetAt: systemNow,
          effectiveAdministeredAtSetByUserId: userId,
          effectiveAdministeredAtReason: reasonTrim,
          effectiveAdministeredAtVersion: { increment: 1 },
        },
        include: {
          administeredBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    });

    await this.audit.log(AuditAction.MEDICATION_ADMIN_TIME_ADJUSTED, "MEDICATION_ADMINISTRATION", {
      userId,
      facilityId,
      patientId: row.patientId,
      encounterId: row.encounterId,
      ...(row.orderItem?.orderId ? { orderId: row.orderItem.orderId } : {}),
      entityId: medicationAdministrationId,
      ip,
      userAgent,
      critical: true,
      metadata: {
        medicationAdministrationId,
        orderId: row.orderItem?.orderId ?? null,
        encounterId: row.encounterId,
        previousEffectiveAdministeredAt: previousEffective
          ? toMedicationAdministrationEffectiveTimeIsoUtc(previousEffective)
          : null,
        newEffectiveAdministeredAt: toMedicationAdministrationEffectiveTimeIsoUtc(effectiveAtUtc),
        originalSystemTime: toMedicationAdministrationEffectiveTimeIsoUtc(systemDocumentedAt),
        deltaMinutes: deltaMinutesBetween(effectiveAtUtc, originalAdministeredAt),
        controlledMedication,
        infusionEvent: infusionStopTerminal || infusionStartRow,
        infusionPhase: row.infusionPhase ?? null,
        reasonProvided: Boolean(reasonTrim),
        source: "MAR",
      },
    });

    return {
      ...updated,
      marAction: resolveMedicationMarActionFromStorage({
        marAction: updated.marAction ?? null,
        notes: updated.notes,
      }),
    };
  }
}
