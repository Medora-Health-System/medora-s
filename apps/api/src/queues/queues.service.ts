import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditAction, BillingReviewStatus, BillingSourceModule, OrderStatus, RoleCode } from "@prisma/client";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";
import { assertParentOrderNotCancelled } from "../common/workflow/order-cancelled.guard";
import { assertCanTransition } from "../common/workflow/status.transitions";
import { applyLifecycleWithStatus } from "../common/workflow/order-item-lifecycle.machine";
import {
  assertAckOrStartActor,
  assertDepartmentRoleForItem,
  isMedicationAdministerChart,
} from "../common/workflow/order-item-action-guards.util";
import { AuditService } from "../common/services/audit.service";
import { buildOrderItemCandidate } from "@medora/shared";
import { appendBillingCaptureCandidate } from "../billing/billing-capture.append.util";

@Injectable()
export class QueuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private async roleCodesForFacility(userId: string | undefined, facilityId: string): Promise<RoleCode[]> {
    if (!userId) return [];
    const urs = await this.prisma.userRole.findMany({
      where: { userId, facilityId, isActive: true },
      include: { role: true },
    });
    return urs.map((u) => u.role.code);
  }

  async getRadiologyQueue(facilityId: string) {
    return this.prisma.order.findMany({
      where: {
        facilityId,
        type: "IMAGING",
        status: { in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS] },
        items: {
          some: {
            catalogItemType: "IMAGING_STUDY",
            status: { in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS] }
          }
        }
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
                sexAtBirth: true
              }
            }
          }
        },
        items: {
          where: {
            catalogItemType: "IMAGING_STUDY"
          },
          include: {
            order: {
              select: {
                id: true,
                priority: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: [
        { priority: "asc" },
        { createdAt: "asc" }
      ]
    });
  }

  async getLabQueue(facilityId: string) {
    return this.prisma.order.findMany({
      where: {
        facilityId,
        type: "LAB",
        status: { in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS] },
        items: {
          some: {
            catalogItemType: "LAB_TEST",
            status: { in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS] }
          }
        }
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
                sexAtBirth: true
              }
            }
          }
        },
        items: {
          where: {
            catalogItemType: "LAB_TEST"
          },
          include: {
            order: {
              select: {
                id: true,
                priority: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: [
        { priority: "asc" },
        { createdAt: "asc" }
      ]
    });
  }

  async getPharmacyQueue(facilityId: string) {
    return this.prisma.order.findMany({
      where: {
        facilityId,
        type: "MEDICATION",
        status: { in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS] },
        items: {
          some: {
            catalogItemType: "MEDICATION",
            status: { in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS] }
          }
        }
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
                sexAtBirth: true
              }
            }
          }
        },
        items: {
          where: {
            catalogItemType: "MEDICATION"
          },
          include: {
            order: {
              select: {
                id: true,
                priority: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: [
        { priority: "asc" },
        { createdAt: "asc" }
      ]
    });
  }

  private async billingLedgerRollup(
    facilityId: string,
    encounterIds: string[]
  ): Promise<Map<string, { total: number; needsReview: number; missingCode: number }>> {
    const map = new Map<string, { total: number; needsReview: number; missingCode: number }>();
    for (const id of encounterIds) {
      map.set(id, { total: 0, needsReview: 0, missingCode: 0 });
    }
    if (encounterIds.length === 0) return map;
    const rows = await this.prisma.billingEvent.findMany({
      where: { facilityId, encounterId: { in: encounterIds } },
      select: {
        encounterId: true,
        reviewStatus: true,
        procedureCode: true,
        hcpcsCode: true,
        code: true,
      },
    });
    for (const r of rows) {
      const cur = map.get(r.encounterId);
      if (!cur) continue;
      cur.total++;
      if (r.reviewStatus === BillingReviewStatus.CAPTURED) cur.needsReview++;
      const hasCode = Boolean(r.procedureCode?.trim() || r.hcpcsCode?.trim() || r.code?.trim());
      if (!hasCode) cur.missingCode++;
    }
    return map;
  }

  async getBillingQueue(facilityId: string) {
    const list = await this.prisma.encounter.findMany({
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
            status: { in: [OrderStatus.COMPLETED, OrderStatus.IN_PROGRESS] },
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
    const ids = list.map((e) => e.id);
    const rollup = await this.billingLedgerRollup(facilityId, ids);
    return list.map((e) => ({
      ...e,
      billingLedger: rollup.get(e.id) ?? { total: 0, needsReview: 0, missingCode: 0 },
    }));
  }

  async getBillingEncounterSummary(facilityId: string, encounterId: string) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        type: true,
        dischargedAt: true,
        dischargeStatus: true,
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }
    const events = await this.prisma.billingEvent.findMany({
      where: { facilityId, encounterId },
      orderBy: [{ serviceDate: "desc" }, { createdAt: "desc" }],
    });
    const byReviewStatus: Record<string, number> = {};
    const bySourceModule: Partial<Record<BillingSourceModule, number>> = {};
    let needsReview = 0;
    let missingCode = 0;
    for (const e of events) {
      const rs = e.reviewStatus;
      byReviewStatus[rs] = (byReviewStatus[rs] ?? 0) + 1;
      if (e.reviewStatus === BillingReviewStatus.CAPTURED) needsReview++;
      const hasCode = Boolean(e.procedureCode?.trim() || e.hcpcsCode?.trim() || e.code?.trim());
      if (!hasCode) missingCode++;
      bySourceModule[e.sourceModule] = (bySourceModule[e.sourceModule] ?? 0) + 1;
    }
    return {
      encounter: enc,
      events,
      summary: {
        totalEvents: events.length,
        needsReview,
        missingCode,
        byReviewStatus,
        bySourceModule,
      },
    };
  }

  async patchBillingEventReview(
    facilityId: string,
    billingEventId: string,
    reviewStatus: BillingReviewStatus,
    userId?: string
  ) {
    const row = await this.prisma.billingEvent.findFirst({
      where: { id: billingEventId, facilityId },
    });
    if (!row) {
      throw new NotFoundException("Billing event not found");
    }
    const updated = await this.prisma.billingEvent.update({
      where: { id: billingEventId },
      data: { reviewStatus },
    });
    await this.audit.log(AuditAction.UPDATE, "BILLING_EVENT", {
      userId,
      facilityId,
      patientId: row.patientId,
      encounterId: row.encounterId,
      entityId: row.id,
      metadata: { reviewStatus, previousStatus: row.reviewStatus },
    });
    return updated;
  }

  async updateOrderItemStatus(
    facilityId: string,
    orderItemId: string,
    status: OrderStatus,
    userId?: string
  ) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: {
          facilityId
        }
      },
      include: {
        order: {
          include: {
            encounter: true,
          },
        },
      },
    });

    if (!orderItem) {
      throw new BadRequestException("Order item not found");
    }

    if (status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        "L'annulation d'une ligne d'ordre doit passer par le flux d'annulation dédié."
      );
    }

    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);

    const roleCodes = await this.roleCodesForFacility(userId, facilityId);

    assertCanTransition(orderItem.status, status);

    if (status === OrderStatus.ACKNOWLEDGED || status === OrderStatus.IN_PROGRESS) {
      assertAckOrStartActor(orderItem, roleCodes);
    } else if (status === OrderStatus.COMPLETED) {
      if (isMedicationAdministerChart(orderItem)) {
        throw new BadRequestException(
          "Cette ligne est destinée à l'administration infirmière ; utilisez la fin d'administration au lit."
        );
      }
      assertDepartmentRoleForItem(orderItem.catalogItemType, roleCodes);
    } else {
      assertDepartmentRoleForItem(orderItem.catalogItemType, roleCodes);
    }

    const fromStatus = orderItem.status;

    const lifecycleState = applyLifecycleWithStatus(orderItem.lifecycleState, status);

    const updated = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status, lifecycleState },
      include: {
        order: {
          include: {
            encounter: {
              include: {
                patient: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    mrn: true
                  }
                }
              }
            }
          }
        }
      }
    });

    let action: AuditAction;
    if (status === OrderStatus.ACKNOWLEDGED) {
      action = AuditAction.ORDER_ACK;
    } else if (status === OrderStatus.IN_PROGRESS) {
      action = AuditAction.ORDER_START;
    } else if (status === OrderStatus.COMPLETED) {
      action = AuditAction.ORDER_COMPLETE;
    } else {
      action = AuditAction.UPDATE;
    }

    await this.audit.log(action, "ORDER_ITEM", {
      userId,
      facilityId,
      patientId: orderItem.order.patientId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      entityId: orderItem.id,
      metadata: {
        fromStatus,
        toStatus: status,
      },
    });

    if (status === OrderStatus.COMPLETED) {
      const completedAt =
        updated.completedAt instanceof Date && !Number.isNaN(updated.completedAt.getTime())
          ? updated.completedAt.toISOString()
          : new Date().toISOString();
      await appendBillingCaptureCandidate(
        this.prisma,
        orderItem.order.encounterId,
        facilityId,
        buildOrderItemCandidate({
          orderItemId: orderItem.id,
          orderId: orderItem.orderId,
          encounterId: orderItem.order.encounterId,
          patientId: orderItem.order.patientId,
          facilityId,
          orderType: orderItem.order.type,
          catalogItemType: orderItem.catalogItemType,
          manualLabel: orderItem.manualLabel,
          quantity: orderItem.quantity,
          completedAtIso: completedAt,
          createdByUserId: userId ?? null,
        })
      );
    }

    return updated;
  }
}

