import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction, OrderStatus } from "@prisma/client";
import { assertCanTransition } from "../common/workflow/status.transitions";
import { assertParentOrderNotCancelled } from "../common/workflow/order-cancelled.guard";

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
    userAgent?: string
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

    assertParentOrderNotCancelled(orderItem.order.status);

    const existingResult = await this.prisma.result.findUnique({ where: { orderItemId } });

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
        if (st !== OrderStatus.RESULTED && st !== OrderStatus.VERIFIED) {
          if (st === OrderStatus.IN_PROGRESS) {
            await tx.orderItem.update({
              where: { id: orderItemId },
              data: { status: OrderStatus.COMPLETED },
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
          await tx.orderItem.update({
            where: { id: orderItemId },
            data: { status: OrderStatus.RESULTED },
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
      metadata: { criticalValue: data.criticalValue, orderItemId },
    });

    return result;
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
