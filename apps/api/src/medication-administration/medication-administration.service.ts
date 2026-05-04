import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AuditAction,
  MedicationMarAction,
  OrderEventOrderType,
  OrderEventType,
  OrderStatus,
  type OrderItem,
  type Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import type { MarClinicalAction, MedicationAdministrationCreateDto } from "@medora/shared";
import {
  acceptableManualOrderLine,
  buildMedicationAdministrationCandidate,
  deriveMarClinicalActionFromNotes,
  getEncounterAllergyDocumentationSummary,
  isInvalidTechnicalOrderDisplayLabel,
  normalizeNdc,
  resolveMedicationMarActionFromStorage,
  suggestInfusionBilling,
} from "@medora/shared";
import { appendBillingCaptureCandidate } from "../billing/billing-capture.append.util";
import { tryAutoMedicationAdministrationBilling } from "../billing/billing-auto-append.util";
import {
  loadMedicationInfusionClassificationContext,
  shouldBlockDirectMarAdministeredForInfusionLine,
} from "../common/medication/medication-infusion-candidate-from-order-item.util";
import { assertParentOrderNotCancelled } from "../common/workflow/order-cancelled.guard";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";
import { applyLifecycleWithStatus } from "../common/workflow/order-item-lifecycle.machine";
import { logInfo } from "../common/logging/medoraLogger";

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

/** Internal callers only (e.g. infusion STOP terminal MAR). HTTP API must not set this. */
export type MedicationAdministrationCreateServiceOptions = {
  allowAdministeredForInfusionTerminal?: boolean;
  /** When true, skip `tryAutoMedicationAdministrationBilling` (catalog HCPCS / route CPT companion) — infusion time coding is manual. */
  skipAutoMedicationCatalogBilling?: boolean;
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

  /**
   * Stable medication label for MAR / audit — Phase C strict EN-neutral: `displayNameEn` → acceptable manual → `code`
   * → strength/notes → typed EN fallback (never legacy `name` / `displayNameFr` as clinical display).
   */
  private medicationLabelSnapshotFromMedicationOrderItem(
    item: OrderItem,
    catalogMedication: {
      displayNameEn: string | null;
      displayNameFr: string | null;
      name: string | null;
      strength: string | null;
      code: string | null;
    } | null
  ): string {
    const manualLine = acceptableManualOrderLine({
      catalogItemType: "MEDICATION",
      manualLabel: item.manualLabel,
      manualSecondaryText: item.manualSecondaryText,
      strength: item.strength,
    });

    const den = catalogMedication?.displayNameEn?.trim();
    const denOk =
      den && !isInvalidTechnicalOrderDisplayLabel(den, "MEDICATION") ? den : null;
    const code = catalogMedication?.code?.trim();
    const codeOk =
      code && !isInvalidTechnicalOrderDisplayLabel(code, "MEDICATION") ? code : null;
    const catPrimary = denOk || manualLine || codeOk || null;
    if (catPrimary) {
      const str = (item.strength ?? catalogMedication?.strength)?.trim();
      return str ? `${catPrimary} ${str}` : catPrimary;
    }
    const fromRow = [item.strength, item.notes]
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .find((s) => s.length > 0);
    if (fromRow) return fromRow;
    return "Medication (label unavailable)";
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
    if (encounter.status !== "OPEN") {
      throw new BadRequestException("La consultation doit être ouverte pour enregistrer une administration.");
    }

    let orderItemId: string | null = data.orderItemId ?? null;
    let medicationLabelSnapshot: string | null = null;
    let orderIdForAudit: string | undefined;
    let linkedMedicationLine: (OrderItem & { order: { id: string; encounterId: string; type: string; status: string } }) | null =
      null;
    let catalogMedication: {
      displayNameEn: string | null;
      displayNameFr: string | null;
      name: string | null;
      code: string | null;
      strength: string | null;
      ndc11: string | null;
      ndcDisplay: string | null;
      billingUnitType: string | null;
    } | null = null;
    if (orderItemId) {
      const item = await this.prisma.orderItem.findFirst({
        where: { id: orderItemId },
        include: { order: { select: { id: true, encounterId: true, facilityId: true, type: true, status: true } } },
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
      if (item.catalogItemId) {
        catalogMedication = await this.prisma.catalogMedication.findUnique({
          where: { id: item.catalogItemId },
          select: {
            displayNameEn: true,
            displayNameFr: true,
            name: true,
            code: true,
            strength: true,
            ndc11: true,
            ndcDisplay: true,
            billingUnitType: true,
          },
        });
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

    if (
      orderItemId &&
      linkedMedicationLine &&
      marActionResolved === "administered" &&
      !serviceOptions?.allowAdministeredForInfusionTerminal
    ) {
      const { resolvedRoute, catalog } = await loadMedicationInfusionClassificationContext(
        this.prisma,
        linkedMedicationLine
      );
      if (shouldBlockDirectMarAdministeredForInfusionLine(linkedMedicationLine, catalog, resolvedRoute)) {
        throw new BadRequestException(
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
      data.safetyAcknowledgedMedicationAllergies !== true
    ) {
      throw new BadRequestException(
        "Des allergies ou intolérances sont documentées pour cette visite. Confirmez avant d’enregistrer l’administration."
      );
    }

    if (orderItemId && marActionResolved === "administered") {
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
      linkedMedicationLine.quantity >= 1
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

    const marAuditMetadata: Record<string, unknown> = {
      marOutcome: marActionResolved,
      administeredBy: administeredByUserId,
      timestamp: administeredAtIso,
    };
    if (doseStr) marAuditMetadata.dose = doseStr;
    if (safeRoute) marAuditMetadata.route = safeRoute;
    if (data.safetyAcknowledgedMedicationAllergies === true) {
      marAuditMetadata.safetyAcknowledgedMedicationAllergies = true;
    }

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
          notes: data.notes?.trim() ? data.notes.trim() : null,
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

      const line = linkedMedicationLine;
      if (line && line.catalogItemType === "MEDICATION") {
        const isTerminalMarAction =
          marActionResolved === "administered" ||
          marActionResolved === "refused" ||
          marActionResolved === "not_available" ||
          marActionResolved === "md_changed";
        if (isTerminalMarAction && line.status !== OrderStatus.COMPLETED && line.status !== OrderStatus.CANCELLED) {
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

    const atIso =
      created.administeredAt instanceof Date
        ? created.administeredAt.toISOString()
        : new Date().toISOString();
    const medLabel = created.medicationLabelSnapshot?.trim() || "Medication";
    if (marActionResolved === "administered") {
      const ev = serviceOptions?.infusionBillingEvidence;
      const infusionManualReview = Boolean(ev);
      let infusionRoute: string | undefined;
      let catalogTherapeuticClass: string | null = null;
      let catalogCodeForBilling: string | null = null;
      if (linkedMedicationLine) {
        const ctx = await loadMedicationInfusionClassificationContext(this.prisma, linkedMedicationLine);
        infusionRoute = ctx.resolvedRoute ?? undefined;
        catalogTherapeuticClass = ctx.catalog?.therapeuticClass?.trim() ?? null;
        catalogCodeForBilling = ctx.catalog?.code ?? null;
      }
      const infusionBillingSuggestion = ev
        ? suggestInfusionBilling({
            infusionDurationMinutes: ev.infusionDurationMinutes,
            medicationLabel: medLabel,
            route: infusionRoute ?? created.route ?? undefined,
            catalogBillingClass: catalogTherapeuticClass,
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
}
