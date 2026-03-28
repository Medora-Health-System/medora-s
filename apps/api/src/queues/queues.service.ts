import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OrderStatus, RoleCode } from "@prisma/client";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";

@Injectable()
export class QueuesService {
  constructor(private readonly prisma: PrismaService) {}

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

    assertEncounterNotSigned(orderItem.order.encounter);

    return this.prisma.orderItem.update({
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
  }
}

