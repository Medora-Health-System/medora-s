import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction, OrderStatus, RoleCode } from "@prisma/client";
import { assertCanTransition } from "../common/workflow/status.transitions";
import { applyLifecycleWithStatus } from "../common/workflow/order-item-lifecycle.machine";
import { assertParentOrderNotCancelled } from "../common/workflow/order-cancelled.guard";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";
import {
  tryAutoImagingResultBillingAfterVerify,
  tryAutoLabResultBillingAfterVerify,
} from "../billing/billing-auto-append.util";
import {
  writeOrderEventForResultAcknowledgment,
  writeOrderEventForResultLineOutcome,
} from "../orders/order-lifecycle-event.util";
import { ORDER_ITEM_RESULT_LIST_SELECT } from "../orders/order-item-result.select";

/** Alignés avec la pré-validation client : `apps/web/src/lib/resultUploadLimits.ts` */
const MAX_TOTAL_RESULT_CHARS = 2_500_000;
const MAX_SINGLE_BASE64_CHARS = 2_400_000;

function mergeResultData(existing: unknown, incoming: unknown): unknown {
  if (incoming === undefined) return existing;
  if (incoming === null) return null;
  if (typeof incoming !== "object" || incoming === null || Array.isArray(incoming)) {
    return incoming;
  }
  const ex =
    typeof existing === "object" && existing !== null && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  const inc = incoming as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...ex };
  for (const key of Object.keys(inc)) {
    if (key === "attachments" && Array.isArray(ex["attachments"]) && Array.isArray(inc["attachments"])) {
      merged["attachments"] = [...(ex["attachments"] as unknown[]), ...(inc["attachments"] as unknown[])];
    } else {
      merged[key] = inc[key];
    }
  }
  return merged;
}

function hasReportableContent(resultText?: string | null, resultData?: unknown): boolean {
  if (resultText?.trim()) return true;
  if (!resultData || typeof resultData !== "object" || Array.isArray(resultData)) return false;
  const att = (resultData as Record<string, unknown>)["attachments"];
  return Array.isArray(att) && att.length > 0;
}

function assertPayloadSize(resultText: string | undefined | null, resultData: unknown) {
  const t = resultText ?? "";
  const d = resultData === undefined || resultData === null ? "" : JSON.stringify(resultData);
  if (t.length + d.length > MAX_TOTAL_RESULT_CHARS) {
    throw new BadRequestException(
      "Données de résultat trop volumineuses. Réduisez la taille des fichiers ou du texte."
    );
  }
  if (resultData && typeof resultData === "object" && !Array.isArray(resultData)) {
    const att = (resultData as Record<string, unknown>)["attachments"];
    if (Array.isArray(att)) {
      for (const a of att) {
        if (a && typeof a === "object" && "dataBase64" in (a as object)) {
          const b64 = String((a as Record<string, unknown>)["dataBase64"] ?? "");
          if (b64.length > MAX_SINGLE_BASE64_CHARS) {
            throw new BadRequestException(
              "Fichier joint trop volumineux (limite d’environ 1,5 Mo par fichier)."
            );
          }
        }
      }
    }
  }
}

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async updateResult(
    orderItemId: string,
    facilityId: string,
    data: {
      resultData?: any;
      resultText?: string;
      criticalValue?: boolean;
    },
    userId?: string,
    ip?: string,
    userAgent?: string,
    /**
     * Phase 1 — RN-only callers are gated by `Facility.allowRnLabResultSubmission` AND
     * `OrderItem.catalogItemType === "LAB_TEST"`. Empty/undefined falls back to legacy
     * behavior (decorator-trusted) so internal callers remain compatible.
     */
    actorRoles?: RoleCode[]
  ) {
    const hasIncomingPayload =
      data.resultText !== undefined ||
      data.resultData !== undefined ||
      data.criticalValue !== undefined;

    if (!hasIncomingPayload) {
      throw new BadRequestException(
        "Aucune donnée à enregistrer. Saisissez un texte de résultat, joignez un fichier ou modifiez un champ (ex. valeur critique)."
      );
    }

    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: {
          facilityId,
        },
      },
      include: {
        order: {
          include: {
            encounter: {
              include: {
                patient: true,
              },
            },
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException("Ligne de commande introuvable.");
    }

    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);

    /**
     * Phase 1 facility-scoped RN policy.
     *
     * Apply ONLY when caller has RN and lacks LAB / RADIOLOGY / ADMIN. Users with both RN
     * and a department role keep the existing department-based path (no policy gate),
     * which is consistent with how `OrdersController.create` discriminates roles.
     *
     * RN-only callers are restricted to `LAB_TEST` and require the facility opt-in.
     * No imaging submission. No verification. No order creation. No MAR.
     */
    const rolesList = actorRoles ?? [];
    const callerIsRnOnly =
      rolesList.includes(RoleCode.RN) &&
      !rolesList.includes(RoleCode.LAB) &&
      !rolesList.includes(RoleCode.RADIOLOGY) &&
      !rolesList.includes(RoleCode.ADMIN);

    let rnFacilityPolicySubmission = false;
    if (callerIsRnOnly) {
      if (orderItem.catalogItemType !== "LAB_TEST") {
        throw new ForbiddenException(
          "Saisie de résultat non autorisée pour ce rôle. Seuls les résultats de laboratoire peuvent être saisis dans le cadre de la politique infirmière."
        );
      }
      const facility = await this.prisma.facility.findUnique({
        where: { id: facilityId },
        select: { allowRnLabResultSubmission: true },
      });
      if (!facility?.allowRnLabResultSubmission) {
        throw new ForbiddenException(
          "Cet établissement n'autorise pas la saisie de résultats de laboratoire par les infirmiers."
        );
      }
      rnFacilityPolicySubmission = true;
    }

    const existingResult = await this.prisma.result.findUnique({
      where: { orderItemId },
      select: ORDER_ITEM_RESULT_LIST_SELECT,
    });

    const mergedResultData =
      data.resultData !== undefined
        ? mergeResultData(existingResult?.resultData ?? null, data.resultData)
        : undefined;

    const nextText = data.resultText !== undefined ? data.resultText : existingResult?.resultText;
    const nextData =
      mergedResultData !== undefined ? mergedResultData : existingResult?.resultData ?? undefined;

    assertPayloadSize(nextText, nextData ?? null);

    const substantive = hasReportableContent(nextText, nextData);
    const shouldStampVerification =
      substantive && (data.resultText !== undefined || data.resultData !== undefined);

    const initialJson =
      mergedResultData !== undefined ? mergedResultData : data.resultData ?? undefined;

    const updateFields: Prisma.ResultUpdateInput = {};
    if (data.resultText !== undefined) updateFields.resultText = data.resultText;
    if (data.criticalValue !== undefined) updateFields.criticalValue = data.criticalValue;
    if (mergedResultData !== undefined) updateFields.resultData = mergedResultData as Prisma.InputJsonValue;
    if (shouldStampVerification) {
      updateFields.verifiedByUserId = userId ?? undefined;
      updateFields.verifiedAt = new Date();
    }

    if (Object.keys(updateFields).length === 0) {
      throw new BadRequestException(
        "Mise à jour impossible : aucun champ de résultat à enregistrer. Vérifiez le texte ou les pièces jointes."
      );
    }

    const createData: Prisma.ResultCreateInput = {
      orderItem: { connect: { id: orderItemId } },
      facility: { connect: { id: facilityId } },
      resultText: data.resultText ?? null,
      criticalValue: data.criticalValue ?? false,
      verifiedByUserId: shouldStampVerification ? userId : undefined,
      verifiedAt: shouldStampVerification ? new Date() : undefined,
      ...(initialJson !== undefined && initialJson !== null
        ? { resultData: initialJson as Prisma.InputJsonValue }
        : {}),
    };

    const result = await this.prisma.$transaction(async (tx) => {
      const row = await tx.result.upsert({
        where: { orderItemId },
        update: updateFields,
        create: createData,
      });

      if (shouldStampVerification) {
        let st = orderItem.status;
        let life = orderItem.lifecycleState;
        if (st !== OrderStatus.RESULTED && st !== OrderStatus.VERIFIED) {
          if (st === OrderStatus.IN_PROGRESS) {
            life = applyLifecycleWithStatus(life, OrderStatus.COMPLETED);
            await tx.orderItem.update({
              where: { id: orderItemId },
              data: { status: OrderStatus.COMPLETED, lifecycleState: life },
            });
            st = OrderStatus.COMPLETED;
          }
          try {
            assertCanTransition(st, OrderStatus.RESULTED);
          } catch {
            throw new BadRequestException(
              "Impossible d’enregistrer le résultat : la ligne doit être au statut « Terminé » (bouton « Terminer » après accusé réception et démarrage), ou en cours si vous enregistrez depuis une ligne déjà démarrée."
            );
          }
          life = applyLifecycleWithStatus(life, OrderStatus.RESULTED);
          await tx.orderItem.update({
            where: { id: orderItemId },
            data: { status: OrderStatus.RESULTED, lifecycleState: life },
          });
        }
      }

      if (shouldStampVerification && userId) {
        const fresh = await tx.orderItem.findUnique({
          where: { id: orderItemId },
          select: { status: true, catalogItemType: true },
        });
        if (
          fresh &&
          (fresh.status === OrderStatus.RESULTED || fresh.status === OrderStatus.VERIFIED) &&
          (fresh.catalogItemType === "LAB_TEST" || fresh.catalogItemType === "IMAGING_STUDY")
        ) {
          await writeOrderEventForResultLineOutcome(tx, {
            facilityId,
            encounterId: orderItem.order.encounterId,
            orderId: orderItem.orderId,
            orderType: orderItem.order.type,
            orderItemId,
            resultId: row.id,
            lineStatus: fresh.status,
            performedByUserId: userId,
          });
        }
      }

      return row;
    });

    await this.audit.log(AuditAction.RESULT_VERIFY, "RESULT", {
      userId,
      facilityId,
      patientId: orderItem.order.encounter.patientId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      entityId: result.id,
      ip,
      userAgent,
      metadata: {
        criticalValue: data.criticalValue,
        orderItemId,
        /**
         * Phase 1 traceability for RN submissions under the facility policy. `actorRole` is
         * already injected by the audit ALS context (RolesGuard sets `request.userRole`),
         * so we add only the policy/result-type fields here. No PHI in metadata.
         */
        ...(rnFacilityPolicySubmission
          ? {
              facilityPolicy: "allowRnLabResultSubmission",
              resultType: "LAB_TEST",
            }
          : {}),
      },
    });

    if (shouldStampVerification && orderItem.catalogItemType === "LAB_TEST") {
      void tryAutoLabResultBillingAfterVerify(this.prisma, {
        facilityId,
        resultId: result.id,
        orderItemId,
      });
    }

    if (shouldStampVerification && orderItem.catalogItemType === "IMAGING_STUDY") {
      void tryAutoImagingResultBillingAfterVerify(this.prisma, {
        facilityId,
        orderItemId,
      });
    }

    return result;
  }

  /**
   * Receiving clinician acknowledges an existing lab/imaging result (does not change `OrderItem.status`).
   */
  async acknowledgeResultByClinician(
    orderItemId: string,
    facilityId: string,
    userId: string | undefined,
    ip?: string,
    userAgent?: string
  ) {
    if (!userId) {
      throw new UnauthorizedException("Authentification requise.");
    }

    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: { facilityId },
        catalogItemType: { in: ["LAB_TEST", "IMAGING_STUDY"] },
      },
      include: {
        order: {
          include: {
            encounter: true,
          },
        },
        result: { select: ORDER_ITEM_RESULT_LIST_SELECT },
      },
    });

    if (!orderItem || !orderItem.result) {
      throw new NotFoundException("Résultat introuvable pour cette ligne.");
    }

    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);

    if (orderItem.status !== OrderStatus.RESULTED) {
      throw new BadRequestException(
        "Seules les lignes en statut « Résultat disponible » peuvent être accusées réception côté clinicien."
      );
    }

    if (!hasReportableContent(orderItem.result.resultText, orderItem.result.resultData)) {
      throw new BadRequestException("Aucun résultat saisi à accuser réception.");
    }

    if (orderItem.result.acknowledgedByProviderAt) {
      return orderItem.result;
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.result.update({
        where: { orderItemId },
        data: {
          acknowledgedByProviderAt: now,
          acknowledgedByUserId: userId,
        },
      });
      await writeOrderEventForResultAcknowledgment(tx, {
        facilityId,
        encounterId: orderItem.order.encounterId,
        orderId: orderItem.orderId,
        orderType: orderItem.order.type,
        orderItemId,
        resultId: row.id,
        performedByUserId: userId,
      });
    });

    await this.audit.log(AuditAction.ORDER_UPDATE, "RESULT", {
      userId,
      facilityId,
      patientId: orderItem.order.encounter.patientId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      entityId: orderItem.result.id,
      ip,
      userAgent,
      metadata: { orderItemId, action: "RESULT_CLINICIAN_ACK" },
    });

    return this.prisma.result.findUnique({
      where: { orderItemId },
      select: ORDER_ITEM_RESULT_LIST_SELECT,
    });
  }

  /**
   * Physician / authorized clinician final verification: `RESULTED` → `VERIFIED` (billing is unchanged).
   */
  async verifyResultByClinician(
    orderItemId: string,
    facilityId: string,
    userId: string | undefined,
    ip?: string,
    userAgent?: string
  ) {
    if (!userId) {
      throw new UnauthorizedException("Authentification requise.");
    }

    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: { facilityId },
        catalogItemType: { in: ["LAB_TEST", "IMAGING_STUDY"] },
      },
      include: {
        order: {
          include: {
            encounter: true,
          },
        },
        result: { select: ORDER_ITEM_RESULT_LIST_SELECT },
      },
    });

    if (!orderItem || !orderItem.result) {
      throw new NotFoundException("Résultat introuvable pour cette ligne.");
    }

    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);

    if (orderItem.status === OrderStatus.VERIFIED) {
      return this.prisma.orderItem.findFirst({
        where: { id: orderItemId },
        include: { result: { select: ORDER_ITEM_RESULT_LIST_SELECT } },
      });
    }

    if (orderItem.status !== OrderStatus.RESULTED) {
      throw new BadRequestException(
        "La ligne doit être en statut « Résultat disponible » avant vérification finale."
      );
    }

    const resultRow = orderItem.result;

    if (!hasReportableContent(resultRow.resultText, resultRow.resultData)) {
      throw new BadRequestException("Aucun résultat à vérifier.");
    }

    assertCanTransition(orderItem.status, OrderStatus.VERIFIED);
    const nextLife = applyLifecycleWithStatus(orderItem.lifecycleState, OrderStatus.VERIFIED);
    const resultIdForEvent = resultRow.id;

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { status: OrderStatus.VERIFIED, lifecycleState: nextLife },
      });
      await writeOrderEventForResultLineOutcome(tx, {
        facilityId,
        encounterId: orderItem.order.encounterId,
        orderId: orderItem.orderId,
        orderType: orderItem.order.type,
        orderItemId,
        resultId: resultIdForEvent,
        lineStatus: OrderStatus.VERIFIED,
        performedByUserId: userId,
      });
    });

    await this.audit.log(AuditAction.ORDER_UPDATE, "RESULT", {
      userId,
      facilityId,
      patientId: orderItem.order.encounter.patientId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      entityId: resultIdForEvent,
      ip,
      userAgent,
      metadata: { orderItemId, action: "RESULT_CLINICIAN_VERIFY" },
    });

    return this.prisma.orderItem.findFirst({
      where: { id: orderItemId },
      include: { result: { select: ORDER_ITEM_RESULT_LIST_SELECT } },
    });
  }

  async setCriticalFlag(
    orderItemId: string,
    facilityId: string,
    critical: boolean,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: {
          facilityId,
        },
        catalogItemType: "LAB_TEST",
      },
      include: {
        order: {
          include: {
            encounter: {
              include: {
                patient: true,
              },
            },
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException("Analyse introuvable ou non laboratoire.");
    }

    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);

    const result = await this.prisma.result.upsert({
      where: { orderItemId },
      update: {
        criticalValue: critical,
      },
      create: {
        orderItemId,
        facilityId,
        criticalValue: critical,
      },
    });

    await this.audit.log(AuditAction.CRITICAL_FLAG, "RESULT", {
      userId,
      facilityId,
      patientId: orderItem.order.encounter.patientId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      entityId: result.id,
      ip,
      userAgent,
      metadata: { criticalValue: critical, orderItemId },
    });

    return result;
  }
}
