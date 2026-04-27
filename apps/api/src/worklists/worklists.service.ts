import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MedicationFulfillmentIntent, OrderStatus, Prisma } from "@prisma/client";
import { OrdersService } from "../orders/orders.service";
import { ORDER_ITEM_RESULT_LIST_SELECT } from "../orders/order-item-result.select";
import type { OrderWithItems } from "../orders/orders.types";
import { createStructuredLogger } from "../common/logging/structured-logger";

const worklistsLog = createStructuredLogger("WorklistsService");

function prismaErrorCode(err: unknown): string | undefined {
  return err && typeof err === "object" && "code" in err && typeof (err as { code?: unknown }).code === "string"
    ? (err as { code: string }).code
    : undefined;
}

/** Inclut SIGNED / RESULTED pour ne pas masquer des ordres médecin encore hors flux « traité » par le labo. */
const WORKLIST_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PLACED,
  OrderStatus.SIGNED,
  OrderStatus.ACKNOWLEDGED,
  OrderStatus.IN_PROGRESS,
  OrderStatus.COMPLETED,
  OrderStatus.RESULTED,
];

const PHARMACY_ITEM_INTENT_FILTER: Pick<Prisma.OrderItemWhereInput, "OR"> = {
  OR: [
    { medicationFulfillmentIntent: null },
    { medicationFulfillmentIntent: MedicationFulfillmentIntent.PHARMACY_DISPENSE },
  ],
};

@Injectable()
export class WorklistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService
  ) {}

  async getLabWorklist(facilityId: string) {
    let orders;
    try {
      orders = await this.prisma.order.findMany({
        where: {
          facilityId,
          type: "LAB",
          status: { in: WORKLIST_ORDER_STATUSES },
          items: {
            some: {
              catalogItemType: "LAB_TEST",
              status: { in: WORKLIST_ORDER_STATUSES },
            },
          },
        },
        include: {
          encounter: {
            include: {
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  mrn: true,
                  dob: true,
                  sexAtBirth: true,
                },
              },
            },
          },
          pathwaySession: {
            select: {
              id: true,
              type: true,
              status: true,
            },
          },
          items: {
            where: {
              catalogItemType: "LAB_TEST",
            },
            include: {
              result: { select: ORDER_ITEM_RESULT_LIST_SELECT },
            },
          },
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      });
    } catch (err) {
      worklistsLog.warn("lab_worklist_result_include_failed_fallback", {
        facilityId,
        errorName: err instanceof Error ? err.name : typeof err,
        errorCode: prismaErrorCode(err),
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      orders = await this.prisma.order.findMany({
        where: {
          facilityId,
          type: "LAB",
          status: { in: WORKLIST_ORDER_STATUSES },
          items: {
            some: {
              catalogItemType: "LAB_TEST",
              status: { in: WORKLIST_ORDER_STATUSES },
            },
          },
        },
        include: {
          encounter: {
            include: {
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  mrn: true,
                  dob: true,
                  sexAtBirth: true,
                },
              },
            },
          },
          pathwaySession: {
            select: {
              id: true,
              type: true,
              status: true,
            },
          },
          items: {
            where: {
              catalogItemType: "LAB_TEST",
            },
          },
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      });
    }
    return this.ordersService.enrichOrderItemsForDisplaySafe(orders as unknown as OrderWithItems[]);
  }

  async getRadiologyWorklist(facilityId: string) {
    let orders;
    try {
      orders = await this.prisma.order.findMany({
        where: {
          facilityId,
          type: "IMAGING",
          status: { in: WORKLIST_ORDER_STATUSES },
          items: {
            some: {
              catalogItemType: "IMAGING_STUDY",
              status: { in: WORKLIST_ORDER_STATUSES },
            },
          },
        },
        include: {
          encounter: {
            include: {
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  mrn: true,
                  dob: true,
                  sexAtBirth: true,
                },
              },
            },
          },
          pathwaySession: {
            select: {
              id: true,
              type: true,
              status: true,
            },
          },
          items: {
            where: {
              catalogItemType: "IMAGING_STUDY",
            },
            include: {
              result: { select: ORDER_ITEM_RESULT_LIST_SELECT },
            },
          },
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      });
    } catch (err) {
      worklistsLog.warn("radiology_worklist_result_include_failed_fallback", {
        facilityId,
        errorName: err instanceof Error ? err.name : typeof err,
        errorCode: prismaErrorCode(err),
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      orders = await this.prisma.order.findMany({
        where: {
          facilityId,
          type: "IMAGING",
          status: { in: WORKLIST_ORDER_STATUSES },
          items: {
            some: {
              catalogItemType: "IMAGING_STUDY",
              status: { in: WORKLIST_ORDER_STATUSES },
            },
          },
        },
        include: {
          encounter: {
            include: {
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  mrn: true,
                  dob: true,
                  sexAtBirth: true,
                },
              },
            },
          },
          pathwaySession: {
            select: {
              id: true,
              type: true,
              status: true,
            },
          },
          items: {
            where: {
              catalogItemType: "IMAGING_STUDY",
            },
          },
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      });
    }
    return this.ordersService.enrichOrderItemsForDisplaySafe(orders as unknown as OrderWithItems[]);
  }

  async getPharmacyWorklist(facilityId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        facilityId,
        type: "MEDICATION",
        status: { in: WORKLIST_ORDER_STATUSES },
        items: {
          some: {
            catalogItemType: "MEDICATION",
            status: { in: WORKLIST_ORDER_STATUSES },
            ...PHARMACY_ITEM_INTENT_FILTER,
          },
        },
      },
      include: {
        encounter: {
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                mrn: true,
                dob: true,
                sexAtBirth: true,
              },
            },
          },
        },
        pathwaySession: {
          select: {
            id: true,
            type: true,
            status: true,
          },
        },
        items: {
          where: {
            catalogItemType: "MEDICATION",
            ...PHARMACY_ITEM_INTENT_FILTER,
          },
        },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
    return this.ordersService.enrichOrderItemsForDisplaySafe(orders as unknown as OrderWithItems[]);
  }

  async getBillingWorklist(facilityId: string) {
    return this.prisma.encounter.findMany({
      where: {
        facilityId,
        status: "CLOSED",
        dischargeStatus: { not: null },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mrn: true,
            dob: true,
            sexAtBirth: true,
          },
        },
        orders: {
          where: {
            status: { in: [OrderStatus.COMPLETED, OrderStatus.RESULTED, OrderStatus.VERIFIED] },
          },
          include: {
            items: true,
          },
        },
      },
      orderBy: {
        dischargedAt: "desc",
      },
    });
  }
}
