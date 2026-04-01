import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditAction, OrderStatus, RoleCode } from "@prisma/client";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";
import { assertParentOrderNotCancelled } from "../common/workflow/order-cancelled.guard";
import { assertCanTransition } from "../common/workflow/status.transitions";
import {
  assertAckOrStartActor,
  assertDepartmentRoleForItem,
  isMedicationAdministerChart,
} from "../common/workflow/order-item-action-guards.util";
import { AuditService } from "../common/services/audit.service";

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

  async getBillingQueue(facilityId: string) {
    return this.prisma.encounter.findMany({
      where: {
        facilityId,
        status: "CLOSED",
        dischargeStatus: { not: null }
      },
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
        },
        orders: {
          where: {
            status: { in: [OrderStatus.COMPLETED, OrderStatus.IN_PROGRESS] }
          },
          include: {
            items: true
          }
        }
      },
      orderBy: {
        dischargedAt: "desc"
      }
    });
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

    const updated = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status },
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

    return updated;
  }
}

