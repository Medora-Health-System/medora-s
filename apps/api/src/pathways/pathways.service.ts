import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";
import {
  AuditAction,
  PathwayType,
  PathwayStatus,
  PathwayMilestoneStatus,
  OrderStatus,
  OrderPriority,
  MedicationFulfillmentIntent,
} from "@prisma/client";

@Injectable()
export class PathwaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  // Default milestones per pathway type (in minutes from activation)
  private readonly DEFAULT_MILESTONES: Record<PathwayType, Array<{ name: string; description?: string; targetMinutes: number }>> = {
    STROKE: [
      { name: "Door to CT", description: "CT scan completed", targetMinutes: 25 },
      { name: "Door to Needle", description: "tPA administered", targetMinutes: 60 },
      { name: "Door to Groin Puncture", description: "Thrombectomy started", targetMinutes: 90 },
    ],
    SEPSIS: [
      { name: "Lactate Drawn", description: "Initial lactate level", targetMinutes: 15 },
      { name: "Antibiotics Started", description: "First dose administered", targetMinutes: 60 },
      { name: "Fluid Resuscitation", description: "30ml/kg fluids given", targetMinutes: 180 },
    ],
    STEMI: [
      { name: "First Medical Contact", description: "ECG obtained", targetMinutes: 10 },
      { name: "Door to Balloon", description: "PCI started", targetMinutes: 90 },
      { name: "Fibrinolytics", description: "If PCI unavailable", targetMinutes: 30 },
    ],
    TRAUMA: [
      { name: "Primary Survey Complete", description: "ABCDE assessment", targetMinutes: 5 },
      { name: "CT Scan", description: "Trauma imaging", targetMinutes: 30 },
      { name: "OR Ready", description: "Surgical intervention", targetMinutes: 60 },
    ],
  };

  async activatePathway(
    encounterId: string,
    facilityId: string,
    type: PathwayType,
    contextJson?: any,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    // Validate encounter is OPEN
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId, status: "OPEN" },
      include: { patient: true },
    });

    if (!encounter) {
      throw new NotFoundException("Open encounter not found");
    }

    // Check if pathway already exists
    const existing = await this.prisma.pathwaySession.findUnique({
      where: { encounterId },
    });

    if (existing) {
      throw new BadRequestException("Pathway already activated for this encounter");
    }

    // Create pathway session
    const pathwaySession = await this.prisma.pathwaySession.create({
      data: {
        encounterId,
        facilityId,
        type,
        status: PathwayStatus.ACTIVE,
        contextJson: contextJson || {},
        activatedBy: userId,
      },
    });

    // Create default milestones
    const milestones = this.DEFAULT_MILESTONES[type];
    await Promise.all(
      milestones.map((m) =>
        this.prisma.pathwayMilestone.create({
          data: {
            pathwaySessionId: pathwaySession.id,
            name: m.name,
            description: m.description,
            targetMinutes: m.targetMinutes,
            status: PathwayMilestoneStatus.PENDING,
          },
        })
      )
    );

    // Load active protocol order set for facility + pathway type
    const orderSet = await this.prisma.protocolOrderSet.findFirst({
      where: {
        facilityId,
        pathwayType: type,
        isActive: true,
      },
      include: {
        items: {
          orderBy: { sequence: "asc" },
        },
      },
    });

    let ordersCreated = 0;

    if (orderSet && orderSet.items.length > 0) {
      assertEncounterNotSigned(encounter);
      // Group items by type (LAB, IMAGING, MEDICATION)
      const itemsByType: Record<string, typeof orderSet.items> = {};
      for (const item of orderSet.items) {
        let orderType = "";
        if (item.catalogLabTestId) orderType = "LAB";
        else if (item.catalogImagingStudyId) orderType = "IMAGING";
        else if (item.catalogMedicationId) orderType = "MEDICATION";
        else continue;

        if (!itemsByType[orderType]) itemsByType[orderType] = [];
        itemsByType[orderType].push(item);
      }

      // Create orders grouped by type
      for (const [orderType, items] of Object.entries(itemsByType)) {
        const order = await this.prisma.order.create({
          data: {
            encounterId,
            facilityId,
            patientId: encounter.patientId,
            type: orderType,
            status: OrderStatus.PLACED,
            priority: items[0]?.priority || OrderPriority.STAT,
            source: "PROTOCOL",
            pathwaySessionId: pathwaySession.id,
            orderedBy: userId,
            items: {
              create: items.map((item) => {
                const catalogItemType = item.catalogLabTestId
                  ? "LAB_TEST"
                  : item.catalogImagingStudyId
                  ? "IMAGING_STUDY"
                  : "MEDICATION";
                return {
                  catalogItemId:
                    item.catalogLabTestId || item.catalogImagingStudyId || item.catalogMedicationId || "",
                  catalogItemType,
                  quantity: 1,
                  status: OrderStatus.PLACED,
                  notes: item.notes,
                  medicationFulfillmentIntent:
                    catalogItemType === "MEDICATION"
                      ? MedicationFulfillmentIntent.PHARMACY_DISPENSE
                      : undefined,
                };
              }),
            },
          },
        });
        ordersCreated++;
      }
    }

    // Audit logs
    await this.audit.log(AuditAction.PATHWAY_ACTIVATED, "PATHWAY", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId,
      entityId: pathwaySession.id,
      ip,
      userAgent,
      metadata: { type, contextJson },
    });

    if (ordersCreated > 0) {
      await this.audit.log(AuditAction.ORDERS_CREATED, "ORDER", {
        userId,
        facilityId,
        patientId: encounter.patientId,
        encounterId,
        entityId: pathwaySession.id,
        ip,
        userAgent,
        metadata: { count: ordersCreated, source: "PROTOCOL", pathwayType: type },
      });
    }

    return this.getByEncounter(encounterId, facilityId);
  }

  async pause(pathwayId: string, facilityId: string, userId?: string, ip?: string, userAgent?: string) {
    const pathway = await this.prisma.pathwaySession.findFirst({
      where: { id: pathwayId, facilityId },
      include: { encounter: true },
    });

    if (!pathway) {
      throw new NotFoundException("Pathway not found");
    }

    if (pathway.status !== PathwayStatus.ACTIVE) {
      throw new BadRequestException("Only active pathways can be paused");
    }

    return this.prisma.pathwaySession.update({
      where: { id: pathwayId },
      data: {
        status: PathwayStatus.PAUSED,
        pausedAt: new Date(),
      },
      include: {
        milestones: true,
        encounter: {
          include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } } },
        },
      },
    });
  }

  async complete(pathwayId: string, facilityId: string, userId?: string, ip?: string, userAgent?: string) {
    const pathway = await this.prisma.pathwaySession.findFirst({
      where: { id: pathwayId, facilityId },
      include: { encounter: true },
    });

    if (!pathway) {
      throw new NotFoundException("Pathway not found");
    }

    return this.prisma.pathwaySession.update({
      where: { id: pathwayId },
      data: {
        status: PathwayStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        milestones: true,
        encounter: {
          include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } } },
        },
      },
    });
  }

  async getByEncounter(encounterId: string, facilityId: string) {
    const pathway = await this.prisma.pathwaySession.findFirst({
      where: { encounterId, facilityId },
      include: {
        milestones: {
          orderBy: { targetMinutes: "asc" },
        },
        encounter: {
          include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } } },
        },
      },
    });

    if (!pathway) {
      return null;
    }

    return pathway;
  }

  async getTimers(pathwayId: string, facilityId: string) {
    const pathway = await this.prisma.pathwaySession.findFirst({
      where: { id: pathwayId, facilityId },
      include: {
        milestones: {
          orderBy: { targetMinutes: "asc" },
        },
      },
    });

    if (!pathway) {
      throw new NotFoundException("Pathway not found");
    }

    const now = new Date();
    const activatedAt = pathway.activatedAt;
    const elapsedMinutes = Math.floor((now.getTime() - activatedAt.getTime()) / (1000 * 60));

    const timers = pathway.milestones.map((milestone) => {
      const isOverdue = elapsedMinutes > milestone.targetMinutes && milestone.status === PathwayMilestoneStatus.PENDING;
      return {
        ...milestone,
        elapsedMinutes,
        isOverdue,
        remainingMinutes: Math.max(0, milestone.targetMinutes - elapsedMinutes),
      };
    });

    return {
      pathway: {
        id: pathway.id,
        type: pathway.type,
        status: pathway.status,
        activatedAt: pathway.activatedAt,
        elapsedMinutes,
      },
      timers,
    };
  }

  async updateMilestone(
    pathwayId: string,
    milestoneId: string,
    facilityId: string,
    status: PathwayMilestoneStatus,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const pathway = await this.prisma.pathwaySession.findFirst({
      where: { id: pathwayId, facilityId },
      include: { encounter: true },
    });

    if (!pathway) {
      throw new NotFoundException("Pathway not found");
    }

    const milestone = await this.prisma.pathwayMilestone.findFirst({
      where: { id: milestoneId, pathwaySessionId: pathwayId },
    });

    if (!milestone) {
      throw new NotFoundException("Milestone not found");
    }

    return this.prisma.pathwayMilestone.update({
      where: { id: milestoneId },
      data: {
        status,
        metAt: status === PathwayMilestoneStatus.MET ? new Date() : null,
      },
    });
  }
}

