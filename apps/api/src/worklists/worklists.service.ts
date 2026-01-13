import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OrderStatus } from "@prisma/client";

@Injectable()
export class WorklistsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLabWorklist(facilityId: string) {
    return this.prisma.order.findMany({
      where: {
        facilityId,
        type: "LAB",
        status: { in: [OrderStatus.PLACED, OrderStatus.ACKNOWLEDGED, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED] },
        items: {
          some: {
            catalogItemType: "LAB_TEST",
            status: { in: [OrderStatus.PLACED, OrderStatus.ACKNOWLEDGED, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED] },
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
            result: true,
          },
        },
      },
      orderBy: [
        { priority: "asc" },
        { createdAt: "asc" },
      ],
    });
  }

  async getRadiologyWorklist(facilityId: string) {
    return this.prisma.order.findMany({
      where: {
        facilityId,
        type: "IMAGING",
        status: { in: [OrderStatus.PLACED, OrderStatus.ACKNOWLEDGED, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED] },
        items: {
          some: {
            catalogItemType: "IMAGING_STUDY",
            status: { in: [OrderStatus.PLACED, OrderStatus.ACKNOWLEDGED, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED] },
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
            result: true,
          },
        },
      },
      orderBy: [
        { priority: "asc" },
        { createdAt: "asc" },
      ],
    });
  }

  async getPharmacyWorklist(facilityId: string) {
    return this.prisma.order.findMany({
      where: {
        facilityId,
        type: "MEDICATION",
        status: { in: [OrderStatus.PLACED, OrderStatus.ACKNOWLEDGED, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED] },
        items: {
          some: {
            catalogItemType: "MEDICATION",
            status: { in: [OrderStatus.PLACED, OrderStatus.ACKNOWLEDGED, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED] },
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
          },
        },
      },
      orderBy: [
        { priority: "asc" },
        { createdAt: "asc" },
      ],
    });
  }

  async getBillingWorklist(facilityId: string) {
    // Return closed encounters that need billing
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

