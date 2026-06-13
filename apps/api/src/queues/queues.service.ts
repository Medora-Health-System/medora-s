import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  AuditAction,
  BillingCodeType,
  BillingReviewStatus,
  BillingSide,
  BillingSourceModule,
  EncounterBillingFinalizationStatus,
  OrderStatus,
  Prisma,
  RoleCode,
} from "@prisma/client";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";
import { assertParentOrderNotCancelled } from "../common/workflow/order-cancelled.guard";
import { assertCanTransition } from "../common/workflow/status.transitions";
import { applyLifecycleWithStatus } from "../common/workflow/order-item-lifecycle.machine";
import {
  assertAckOrStartActor,
  assertCompleteActorForItem,
  assertDepartmentRoleForItem,
  isMedicationAdministerChart,
  orderItemProcedureGuardContext,
} from "../common/workflow/order-item-action-guards.util";
import { AuditService } from "../common/services/audit.service";
import {
  billingLedgerRowMissingBillableCodeBlocksReadiness,
  buildOrderItemCandidate,
  computeClaimPackageSummaries,
  computeObservationStaySummaryForExport,
} from "@medora/shared";
import {
  computeEncounterBillingReadiness,
  evaluateEncounterBillingReadinessFromData,
} from "../billing/billing-encounter-readiness.util";
import { appendBillingCaptureCandidate } from "../billing/billing-capture.append.util";
import {
  tryAutoImagingOrderItemCompleted,
  tryAutoProcedureCareOrderItemCompleted,
  tryAutoSupplyOrderItemCompleted,
} from "../billing/billing-auto-append.util";
import { syncBillingCaptureItemFromLedgerRow } from "../billing/billing-capture-sync-from-ledger.util";
import { mergeBillingEventPatch } from "../billing/billing-event-patch.helper";
import { BillingService } from "../billing/billing.service";

@Injectable()
export class QueuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly billingService: BillingService
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
        status: { in: [OrderStatus.PLACED, OrderStatus.PENDING, OrderStatus.IN_PROGRESS] },
        items: {
          some: {
            catalogItemType: "IMAGING_STUDY",
            status: { in: [OrderStatus.PLACED, OrderStatus.PENDING, OrderStatus.IN_PROGRESS] }
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
        status: { in: [OrderStatus.PLACED, OrderStatus.PENDING, OrderStatus.IN_PROGRESS] },
        items: {
          some: {
            catalogItemType: "LAB_TEST",
            status: { in: [OrderStatus.PLACED, OrderStatus.PENDING, OrderStatus.IN_PROGRESS] }
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
  ): Promise<
    Map<string, { total: number; needsReview: number; missingCode: number; unmappedLinesCount: number }>
  > {
    const map = new Map<
      string,
      { total: number; needsReview: number; missingCode: number; unmappedLinesCount: number }
    >();
    for (const id of encounterIds) {
      map.set(id, { total: 0, needsReview: 0, missingCode: 0, unmappedLinesCount: 0 });
    }
    if (encounterIds.length === 0) return map;
    const rows = await this.prisma.billingEvent.findMany({
      where: { facilityId, encounterId: { in: encounterIds } },
      select: {
        encounterId: true,
        reviewStatus: true,
        sourceModule: true,
        procedureCode: true,
        hcpcsCode: true,
        code: true,
        diagnosisCodes: true,
      },
    });
    for (const r of rows) {
      const cur = map.get(r.encounterId);
      if (!cur) continue;
      cur.total++;
      if (r.reviewStatus === BillingReviewStatus.CAPTURED) cur.needsReview++;
      if (billingLedgerRowMissingBillableCodeBlocksReadiness(r)) cur.missingCode++;
      if (r.procedureCode?.trim() === "UNMAPPED" || r.code?.trim() === "UNMAPPED") {
        cur.unmappedLinesCount++;
      }
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
    const [diagGroup, ledgerRows] = await Promise.all([
      ids.length
        ? this.prisma.diagnosis.groupBy({
            by: ["encounterId"],
            where: { facilityId, encounterId: { in: ids }, status: "ACTIVE" },
            _count: { _all: true },
          })
        : Promise.resolve([] as { encounterId: string; _count: { _all: number } }[]),
      ids.length
        ? this.prisma.billingEvent.findMany({
            where: { facilityId, encounterId: { in: ids } },
            select: {
              encounterId: true,
              reviewStatus: true,
              sourceModule: true,
              billingSide: true,
              procedureCode: true,
              hcpcsCode: true,
              code: true,
              diagnosisCodes: true,
            },
          })
        : Promise.resolve([]),
    ]);
    const diagMap = new Map(diagGroup.map((g) => [g.encounterId, g._count._all]));
    const eventsByEncounter = new Map<
      string,
      Array<{
        reviewStatus: BillingReviewStatus;
        sourceModule: BillingSourceModule;
        billingSide: BillingSide;
        procedureCode: string | null;
        hcpcsCode: string | null;
        code: string | null;
        diagnosisCodes: string | null;
      }>
    >();
    for (const row of ledgerRows) {
      const { encounterId: eid, ...ev } = row;
      const cur = eventsByEncounter.get(eid) ?? [];
      cur.push(ev);
      eventsByEncounter.set(eid, cur);
    }
    return list.map((e) => {
      const bl = rollup.get(e.id) ?? {
        total: 0,
        needsReview: 0,
        missingCode: 0,
        unmappedLinesCount: 0,
      };
      const evRows = eventsByEncounter.get(e.id) ?? [];
      const readiness = evaluateEncounterBillingReadinessFromData(
        {
          status: e.status,
          dischargeStatus: e.dischargeStatus,
          physicianAssignedUserId: e.physicianAssignedUserId,
        },
        evRows,
        diagMap.get(e.id) ?? 0
      );
      const claimPackages = computeClaimPackageSummaries(
        evRows.map((r) => ({
          billingSide: r.billingSide,
          reviewStatus: r.reviewStatus,
          sourceModule: r.sourceModule,
          procedureCode: r.procedureCode,
          hcpcsCode: r.hcpcsCode,
          code: r.code,
          diagnosisCodes: r.diagnosisCodes,
        }))
      );
      return {
        ...e,
        billingLedger: bl,
        billingReadiness: readiness,
        claimPackages,
      };
    });
  }

  async getBillingEncounterSummary(facilityId: string, encounterId: string) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        admittedAt: true,
        dischargedAt: true,
        dischargeStatus: true,
        physicianAssignedUserId: true,
        billingFinalizationStatus: true,
        billingFinalizedAt: true,
        billingFinalizedByUserId: true,
        billingReopenedAt: true,
        billingReopenedByUserId: true,
        billingReadinessSnapshotJson: true,
        billingCaptureJson: true,
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }
    const events = await this.prisma.billingEvent.findMany({
      where: { facilityId, encounterId },
      orderBy: [{ sourceModule: "asc" }, { serviceDate: "desc" }, { createdAt: "desc" }],
    });
    const byReviewStatus: Record<string, number> = {};
    const bySourceModule: Partial<Record<BillingSourceModule, number>> = {};
    let needsReview = 0;
    let missingCode = 0;
    for (const e of events) {
      const rs = e.reviewStatus;
      byReviewStatus[rs] = (byReviewStatus[rs] ?? 0) + 1;
      if (e.reviewStatus === BillingReviewStatus.CAPTURED) needsReview++;
      if (billingLedgerRowMissingBillableCodeBlocksReadiness(e)) missingCode++;
      bySourceModule[e.sourceModule] = (bySourceModule[e.sourceModule] ?? 0) + 1;
    }
    const readiness = await computeEncounterBillingReadiness(this.prisma, facilityId, encounterId);
    const claimPackages = computeClaimPackageSummaries(
      events.map((ev) => ({
        billingSide: ev.billingSide,
        reviewStatus: ev.reviewStatus,
        sourceModule: ev.sourceModule,
        procedureCode: ev.procedureCode,
        hcpcsCode: ev.hcpcsCode,
        code: ev.code,
        diagnosisCodes: ev.diagnosisCodes,
      }))
    );
    const observationStay = computeObservationStaySummaryForExport({
      encounterType: enc.type,
      admittedAt: enc.admittedAt,
      createdAt: enc.createdAt,
      dischargedAt: enc.dischargedAt,
    });
    return {
      encounter: enc,
      observationStay,
      events,
      readiness,
      claimPackages,
      summary: {
        totalEvents: events.length,
        needsReview,
        missingCode,
        byReviewStatus,
        bySourceModule,
      },
    };
  }

  async getEncounterBillingReadiness(facilityId: string, encounterId: string) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        billingFinalizationStatus: true,
        billingFinalizedAt: true,
        billingFinalizedByUserId: true,
        billingReopenedAt: true,
        billingReopenedByUserId: true,
        billingReadinessSnapshotJson: true,
      },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }
    const readiness = await computeEncounterBillingReadiness(this.prisma, facilityId, encounterId);
    return { encounter: enc, readiness };
  }

  async finalizeEncounterBilling(facilityId: string, encounterId: string, userId?: string) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }
    if (enc.billingFinalizationStatus === EncounterBillingFinalizationStatus.FINALIZED) {
      const readiness = await computeEncounterBillingReadiness(this.prisma, facilityId, encounterId);
      return { encounter: enc, readiness, alreadyFinalized: true as const };
    }
    const readiness = await computeEncounterBillingReadiness(this.prisma, facilityId, encounterId);
    if (!readiness.isReady) {
      const codes = readiness.blockers.map((b) => b.code).join(", ");
      throw new BadRequestException(
        `Encounter is not ready for billing finalization${codes ? `: ${codes}` : ""}`
      );
    }
    await this.billingService.assertEncounterManualReviewResolved(facilityId, encounterId);
    const snapshot = { ...readiness, at: new Date().toISOString(), action: "finalize" as const };
    const updated = await this.prisma.encounter.update({
      where: { id: encounterId },
      data: {
        billingFinalizationStatus: EncounterBillingFinalizationStatus.FINALIZED,
        billingFinalizedAt: new Date(),
        billingFinalizedByUserId: userId ?? null,
        billingReadinessSnapshotJson: snapshot as unknown as Prisma.InputJsonValue,
        billingReopenedAt: null,
        billingReopenedByUserId: null,
      },
    });
    await this.audit.log(AuditAction.BILLING_FINALIZED, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: enc.patientId,
      encounterId,
      entityId: encounterId,
      metadata: {
        blockersAtFinalize: readiness.blockers,
        warningsAtFinalize: readiness.warnings,
        previousBillingStatus: enc.billingFinalizationStatus,
      },
      critical: true,
    });
    return { encounter: updated, readiness, finalized: true as const };
  }

  async reopenEncounterBilling(facilityId: string, encounterId: string, userId?: string) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }
    if (enc.billingFinalizationStatus !== EncounterBillingFinalizationStatus.FINALIZED) {
      throw new BadRequestException({
        message: "Only encounters finalized for billing can be reopened",
        currentStatus: enc.billingFinalizationStatus,
      });
    }
    const readiness = await computeEncounterBillingReadiness(this.prisma, facilityId, encounterId);
    const snapshot = {
      ...readiness,
      at: new Date().toISOString(),
      action: "reopen" as const,
    };
    const updated = await this.prisma.encounter.update({
      where: { id: encounterId },
      data: {
        billingFinalizationStatus: EncounterBillingFinalizationStatus.REOPENED,
        billingReopenedAt: new Date(),
        billingReopenedByUserId: userId ?? null,
        billingReadinessSnapshotJson: snapshot as unknown as Prisma.InputJsonValue,
      },
    });
    await this.audit.log(AuditAction.BILLING_REOPENED, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: enc.patientId,
      encounterId,
      entityId: encounterId,
      metadata: {
        blockersAtReopen: readiness.blockers,
        warningsAtReopen: readiness.warnings,
      },
      critical: true,
    });
    return { encounter: updated, readiness, reopened: true as const };
  }

  async patchBillingEvent(
    facilityId: string,
    billingEventId: string,
    body: Record<string, unknown>,
    userId?: string
  ) {
    const row = await this.prisma.billingEvent.findFirst({
      where: { id: billingEventId, facilityId },
    });
    if (!row) {
      throw new NotFoundException("Billing event not found");
    }
    const enc = await this.prisma.encounter.findFirst({
      where: { id: row.encounterId, facilityId },
      select: { billingFinalizationStatus: true },
    });
    if (enc?.billingFinalizationStatus === EncounterBillingFinalizationStatus.FINALIZED) {
      throw new BadRequestException(
        "Billing events cannot be edited while the encounter is finalized for billing. Reopen billing first."
      );
    }
    const { data, auditDelta } = mergeBillingEventPatch(row, body);
    if (Object.keys(auditDelta).length === 0) {
      return row;
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.billingEvent.update({
        where: { id: billingEventId },
        data,
      });
      await syncBillingCaptureItemFromLedgerRow(tx, u);
      return u;
    });
    await this.audit.log(AuditAction.UPDATE, "BILLING_EVENT", {
      userId,
      facilityId,
      patientId: row.patientId,
      encounterId: row.encounterId,
      entityId: row.id,
      metadata: {
        structuredLineEdit: true,
        delta: auditDelta,
      },
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
            facility: { select: { facilityType: true } },
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
    const procedureGuardContext = orderItemProcedureGuardContext(orderItem);

    assertCanTransition(orderItem.status, status);

    if (status === OrderStatus.ACKNOWLEDGED || status === OrderStatus.IN_PROGRESS) {
      assertAckOrStartActor(orderItem, roleCodes, procedureGuardContext);
    } else if (status === OrderStatus.COMPLETED) {
      if (isMedicationAdministerChart(orderItem)) {
        throw new BadRequestException(
          "Cette ligne est destinée à l'administration infirmière ; utilisez la fin d'administration au lit."
        );
      }
      assertCompleteActorForItem(orderItem, roleCodes, procedureGuardContext);
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

    // Billing capture runs on COMPLETED only — never on ACKNOWLEDGED / IN_PROGRESS (see orderAcknowledgementBillingSafety).
    if (status === OrderStatus.COMPLETED) {
      const completedAt =
        updated.completedAt instanceof Date && !Number.isNaN(updated.completedAt.getTime())
          ? updated.completedAt.toISOString()
          : new Date().toISOString();
      // LAB billing handled on RESULT verification only
      if (orderItem.catalogItemType !== "LAB_TEST") {
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
      if (orderItem.catalogItemType === "IMAGING_STUDY") {
        void tryAutoImagingOrderItemCompleted(this.prisma, {
          facilityId,
          orderItemId: orderItem.id,
        });
      }
      if (orderItem.catalogItemType === "SUPPLY") {
        void tryAutoSupplyOrderItemCompleted(this.prisma, {
          facilityId,
          orderItemId: orderItem.id,
        });
      }
      if (orderItem.catalogItemType === "CARE") {
        void tryAutoProcedureCareOrderItemCompleted(this.prisma, {
          facilityId,
          orderItemId: orderItem.id,
        });
      }
    }

    return updated;
  }
}

