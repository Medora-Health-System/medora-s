import { Injectable } from "@nestjs/common";
import { projectEnterpriseOrderOrigin } from "@medora/shared";
import { ENCOUNTER_NESTED_CORE_SELECT } from "../encounters/encounter-query-contracts";
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

/** MEDUI.RES.2 — Lab/Rad technician Cancelled tab requires cancelled rows in the fetch. */
const LAB_RAD_WORKLIST_ORDER_STATUSES: OrderStatus[] = [
  ...WORKLIST_ORDER_STATUSES,
  OrderStatus.CANCELLED,
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

  /**
   * D3DA / D3E.5 / D4C.7C / MEDUI.RES.2 — annotate departmental worklist rows with
   * legacy clinicalEncounterContext plus enterpriseOrderOrigin (ED | INPATIENT |
   * CLINIC | DENTAL | UNKNOWN). Origin uses Encounter.serviceLine / dental
   * projection — never free-text inference.
   */
  private annotateClinicalEncounterContext<T>(
    orders: T[]
  ): Array<
    T & {
      clinicalEncounterContext: string;
      enterpriseOrderOrigin: string;
      enterpriseOrderLocationLabel: string | null;
    }
  > {
    return orders.map((order) => {
      const enc = (order as { encounter?: unknown }).encounter as
        | {
            type?: string | null;
            status?: string | null;
            billingClassification?: string | null;
            admissionSummaryJson?: unknown;
            admittedAt?: unknown;
            serviceLine?: string | null;
            nursingAssessment?: unknown;
            roomLabel?: string | null;
          }
        | null
        | undefined;
      const origin = projectEnterpriseOrderOrigin({
        type: enc?.type,
        status: enc?.status,
        billingClassification: enc?.billingClassification,
        admissionSummaryJson: enc?.admissionSummaryJson,
        admittedAt: enc?.admittedAt,
        serviceLine: enc?.serviceLine,
        nursingAssessment: enc?.nursingAssessment,
        roomLabel: enc?.roomLabel,
      });
      return {
        ...order,
        clinicalEncounterContext: origin.departmentalContext,
        enterpriseOrderOrigin: origin.origin,
        enterpriseOrderLocationLabel: origin.locationLabel,
      };
    });
  }

  async getLabWorklist(facilityId: string) {
    let orders;
    try {
      orders = await this.prisma.order.findMany({
        where: {
          facilityId,
          type: "LAB",
          status: { in: LAB_RAD_WORKLIST_ORDER_STATUSES },
          items: {
            some: {
              catalogItemType: "LAB_TEST",
              status: { in: LAB_RAD_WORKLIST_ORDER_STATUSES },
            },
          },
        },
        include: {
          encounter: {
            select: {
              ...ENCOUNTER_NESTED_CORE_SELECT,
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
          status: { in: LAB_RAD_WORKLIST_ORDER_STATUSES },
          items: {
            some: {
              catalogItemType: "LAB_TEST",
              status: { in: LAB_RAD_WORKLIST_ORDER_STATUSES },
            },
          },
        },
        include: {
          encounter: {
            select: {
              ...ENCOUNTER_NESTED_CORE_SELECT,
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
    const enriched = await this.ordersService.enrichOrderItemsForDisplaySafe(orders as unknown as OrderWithItems[]);
    const withAuthority = await this.ordersService.attachAuthorityToOrders(enriched);
    const withAttribution = await this.ordersService.attachAttributionToOrders(withAuthority);
    return this.annotateClinicalEncounterContext(withAttribution);
  }

  async getRadiologyWorklist(facilityId: string) {
    let orders;
    try {
      orders = await this.prisma.order.findMany({
        where: {
          facilityId,
          type: "IMAGING",
          status: { in: LAB_RAD_WORKLIST_ORDER_STATUSES },
          items: {
            some: {
              catalogItemType: "IMAGING_STUDY",
              status: { in: LAB_RAD_WORKLIST_ORDER_STATUSES },
            },
          },
        },
        include: {
          encounter: {
            select: {
              ...ENCOUNTER_NESTED_CORE_SELECT,
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
          status: { in: LAB_RAD_WORKLIST_ORDER_STATUSES },
          items: {
            some: {
              catalogItemType: "IMAGING_STUDY",
              status: { in: LAB_RAD_WORKLIST_ORDER_STATUSES },
            },
          },
        },
        include: {
          encounter: {
            select: {
              ...ENCOUNTER_NESTED_CORE_SELECT,
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
    const enriched = await this.ordersService.enrichOrderItemsForDisplaySafe(orders as unknown as OrderWithItems[]);
    const withAuthority = await this.ordersService.attachAuthorityToOrders(enriched);
    const withAttribution = await this.ordersService.attachAttributionToOrders(withAuthority);
    return this.annotateClinicalEncounterContext(withAttribution);
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
            select: {
              ...ENCOUNTER_NESTED_CORE_SELECT,
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
    const enriched = await this.ordersService.enrichOrderItemsForDisplaySafe(orders as unknown as OrderWithItems[]);
    const withAuthority = await this.ordersService.attachAuthorityToOrders(enriched);
    const withAttribution = await this.ordersService.attachAttributionToOrders(withAuthority);
    const withLifecycleDisplay = await this.ordersService.attachMedicationLifecycleDisplayOnOrders(withAttribution);
    const chartAdminLifecycleAlerts = await this.getPharmacyChartAdminLifecycleAlerts(facilityId);
    return {
      dispenseOrders: this.annotateClinicalEncounterContext(withLifecycleDisplay),
      chartAdminLifecycleAlerts,
    };
  }

  async getPharmacyChartAdminLifecycleAlerts(facilityId: string) {
    const items = await this.prisma.orderItem.findMany({
      where: {
        catalogItemType: "MEDICATION",
        medicationFulfillmentIntent: MedicationFulfillmentIntent.ADMINISTER_CHART,
        OR: [
          {
            medicationLifecycleStatus: {
              not: null,
              notIn: ["ACTIVE"],
            },
          },
          { replacesOrderItemId: { not: null } },
        ],
        order: {
          facilityId,
          type: "MEDICATION",
          status: { in: WORKLIST_ORDER_STATUSES },
        },
      },
      include: {
        order: {
          include: {
            encounter: {
            select: {
              ...ENCOUNTER_NESTED_CORE_SELECT,
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
          },
        },
      },
      orderBy: [{ medicationLifecycleAt: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });

    const replacementByPriorId = new Map<string, string>();
    for (const item of items) {
      if (item.replacesOrderItemId) {
        replacementByPriorId.set(item.replacesOrderItemId, item.id);
      }
    }

    const userIds = [
      ...new Set(items.map((item) => item.medicationLifecycleByUserId).filter((id): id is string => Boolean(id))),
    ];
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const userDisplayById = new Map(
      users.map((user) => [user.id, `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()])
    );

    return items.map((item) => ({
      orderId: item.orderId,
      orderItemId: item.id,
      encounterId: item.order.encounterId,
      patient: item.order.encounter?.patient ?? null,
      medicationLabel: item.manualLabel ?? item.strength ?? "—",
      lifecycleStatus: item.medicationLifecycleStatus ?? "ACTIVE",
      lifecycleAt: item.medicationLifecycleAt?.toISOString() ?? null,
      lifecycleReason: item.medicationLifecycleReason ?? null,
      lifecycleNote: item.medicationLifecycleNote ?? null,
      lifecycleByDisplay: item.medicationLifecycleByUserId
        ? userDisplayById.get(item.medicationLifecycleByUserId) ?? null
        : null,
      replacesOrderItemId: item.replacesOrderItemId ?? null,
      replacementOrderItemId: replacementByPriorId.get(item.id) ?? null,
      route: item.route ?? null,
      strength: item.strength ?? null,
      frequencyCode: item.frequencyCode ?? null,
    }));
  }

  async getBillingWorklist(facilityId: string) {
    const rows = await this.prisma.encounter.findMany({
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
    const flatOrders = rows.flatMap((row) => row.orders);
    const withAuthority = await this.ordersService.attachAuthorityToOrders(flatOrders);
    const withAttribution = await this.ordersService.attachAttributionToOrders(withAuthority);
    const authorityByOrderId = new Map(withAuthority.map((order) => [order.id, order.authority]));
    const createdByDisplayByOrderId = new Map(withAttribution.map((order) => [order.id, order.createdByDisplay]));
    const lastActionDisplayByOrderId = new Map(withAttribution.map((order) => [order.id, order.lastActionDisplay]));
    return rows.map((row) => ({
      ...row,
      orders: row.orders.map((order) => ({
        ...order,
        authority: authorityByOrderId.get(order.id) ?? { source: order.source ?? null },
        createdByDisplay: createdByDisplayByOrderId.get(order.id) ?? null,
        lastActionDisplay: lastActionDisplayByOrderId.get(order.id) ?? null,
      })),
    }));
  }
}
