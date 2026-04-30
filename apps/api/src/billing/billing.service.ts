import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, BillingReviewDecisionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import type {
  BillingAutoBillDecisionDto,
  BillingExportRowDto,
  BillingManualReviewGateDto,
  BillingManualReviewGateItemDto,
  BillingManualReviewRowDto,
  BillingReviewDecisionDto,
  BillingReadinessCategory,
  BillingReadinessItemDto,
  BillingReadinessStatus,
} from "./dto/billing-readiness.dto";

export const MANUAL_BILLING_REVIEW_UNRESOLVED_MESSAGE = "Manual billing review unresolved for this encounter.";

export type BillingReadinessClassifierInput = {
  category: BillingReadinessCategory;
  medoraCode: string | null;
  billingCodeDefault: string | null;
  officialLabBillingCodeMatched?: boolean;
};

export function getBillingReadinessStatus(
  item: BillingReadinessClassifierInput
): BillingReadinessStatus {
  if (item.category === "LAB") {
    return item.billingCodeDefault?.trim() && item.officialLabBillingCodeMatched
      ? "official_validated"
      : "missing";
  }

  if (item.category === "IMAGING") {
    return "pending_license";
  }

  if (item.category === "MEDICATION") {
    return "candidate_only";
  }

  return item.medoraCode?.trim() ? "pending_license" : "missing";
}

export function getAutoBillDecision(row: BillingExportRowDto): BillingAutoBillDecisionDto {
  const medoraCode = row.medoraCode?.trim() ?? "";

  if (row.category === "LAB" && row.billingStatus === "official_validated" && row.billingCodeDefault?.trim()) {
    return {
      orderItemId: row.orderItemId,
      medoraCode,
      category: row.category,
      billingStatus: row.billingStatus,
      canAutoBill: true,
      requiredReview: false,
      reason: "Officially validated lab billing code is present.",
    };
  }

  if (row.category === "MEDICATION") {
    return {
      orderItemId: row.orderItemId,
      medoraCode,
      category: row.category,
      billingStatus: row.billingStatus,
      canAutoBill: false,
      requiredReview: true,
      reason: "Medication auto-billing is disabled until dose/unit conversion and payer policy are implemented.",
    };
  }

  if (row.category === "IMAGING") {
    return {
      orderItemId: row.orderItemId,
      medoraCode,
      category: row.category,
      billingStatus: row.billingStatus,
      canAutoBill: false,
      requiredReview: true,
      reason: "Imaging auto-billing is disabled until licensed CPT/facility chargemaster integration is complete.",
    };
  }

  if (row.category === "CARE") {
    return {
      orderItemId: row.orderItemId,
      medoraCode,
      category: row.category,
      billingStatus: row.billingStatus,
      canAutoBill: false,
      requiredReview: true,
      reason: "Care/procedure auto-billing is disabled until licensed CPT/facility chargemaster integration is complete.",
    };
  }

  return {
    orderItemId: row.orderItemId,
    medoraCode,
    category: row.category,
    billingStatus: row.billingStatus,
    canAutoBill: false,
    requiredReview: true,
    reason: reasonForNonAutoBillStatus(row.billingStatus),
  };
}

type BillingExportOrderItem = {
  id: string;
  catalogItemId: string | null;
  catalogItemType: string;
  manualLabel: string | null;
  quantity: number | null;
};

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async getEncounterOrderItemReadiness(
    facilityId: string,
    encounterId: string
  ): Promise<BillingReadinessItemDto[]> {
    const rows = await this.getEncounterBillingExportRows(facilityId, encounterId);
    return rows.map(({ displayName: _displayName, quantity: _quantity, unit: _unit, ...row }) => row);
  }

  async getEncounterBillingExportRows(
    facilityId: string,
    encounterId: string
  ): Promise<BillingExportRowDto[]> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: { encounterId, facilityId },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        catalogItemId: true,
        catalogItemType: true,
        manualLabel: true,
        quantity: true,
      },
    });

    return this.buildBillingExportRowsFromOrderItems(orderItems);
  }

  async getEncounterAutoBillDecisions(
    facilityId: string,
    encounterId: string
  ): Promise<BillingAutoBillDecisionDto[]> {
    const rows = await this.getEncounterBillingExportRows(facilityId, encounterId);
    return rows.map(getAutoBillDecision);
  }

  async getManualBillingReviewQueue(facilityId: string): Promise<BillingManualReviewRowDto[]> {
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          facilityId,
          encounter: {
            facilityId,
            status: "CLOSED",
          },
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        catalogItemId: true,
        catalogItemType: true,
        manualLabel: true,
        quantity: true,
        createdAt: true,
        order: {
          select: {
            encounterId: true,
            patientId: true,
            encounter: {
              select: {
                patient: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const exportRows = await this.buildBillingExportRowsFromOrderItems(orderItems);
    const itemById = new Map(orderItems.map((item) => [item.id, item]));
    const manualReviewStatuses: BillingReadinessStatus[] = ["candidate_only", "pending_license", "missing"];
    const decisions = orderItems.length
      ? await this.prisma.billingReviewDecision.findMany({
          where: { facilityId, orderItemId: { in: orderItems.map((item) => item.id) } },
        })
      : [];
    const decisionByOrderItemId = new Map(decisions.map((decision) => [decision.orderItemId, decision]));

    return exportRows
      .map((row) => {
        const source = itemById.get(row.orderItemId);
        const decision = getAutoBillDecision(row);
        if (!source || !decision.requiredReview || !manualReviewStatuses.includes(decision.billingStatus)) {
          return null;
        }

        const patientName = `${source.order.encounter.patient.firstName} ${source.order.encounter.patient.lastName}`.trim();
        return {
          encounterId: source.order.encounterId,
          patientId: source.order.patientId,
          patientName,
          orderItemId: row.orderItemId,
          medoraCode: decision.medoraCode,
          category: row.category,
          displayName: row.displayName,
          billingStatus: decision.billingStatus,
          reason: decision.reason,
          createdAt: source.createdAt.toISOString(),
          latestDecision: toBillingReviewDecisionDto(decisionByOrderItemId.get(row.orderItemId)),
        };
      })
      .filter((row): row is BillingManualReviewRowDto => row !== null);
  }

  async getEncounterManualReviewGate(facilityId: string, encounterId: string): Promise<BillingManualReviewGateDto> {
    const rows = await this.getEncounterBillingExportRows(facilityId, encounterId);
    const manualReviewStatuses: BillingReadinessStatus[] = ["candidate_only", "pending_license", "missing"];
    const decisions = rows.length
      ? await this.prisma.billingReviewDecision.findMany({
          where: { facilityId, encounterId, orderItemId: { in: rows.map((row) => row.orderItemId) } },
        })
      : [];
    const decisionByOrderItemId = new Map(decisions.map((decision) => [decision.orderItemId, decision]));
    const unresolvedItems: BillingManualReviewGateItemDto[] = [];
    const doNotBillOrderItemIds: string[] = [];

    for (const row of rows) {
      const autoBillDecision = getAutoBillDecision(row);
      if (!autoBillDecision.requiredReview || !manualReviewStatuses.includes(autoBillDecision.billingStatus)) continue;

      const latestDecision = decisionByOrderItemId.get(row.orderItemId);
      if (latestDecision?.decision === BillingReviewDecisionStatus.DO_NOT_BILL) {
        doNotBillOrderItemIds.push(row.orderItemId);
        continue;
      }
      if (latestDecision?.decision === BillingReviewDecisionStatus.APPROVED) continue;

      unresolvedItems.push({
        orderItemId: row.orderItemId,
        medoraCode: autoBillDecision.medoraCode,
        category: row.category,
        displayName: row.displayName,
        billingStatus: row.billingStatus,
        reason: autoBillDecision.reason,
        latestDecision: toBillingReviewDecisionDto(latestDecision),
      });
    }

    return {
      encounterId,
      unresolvedCount: unresolvedItems.length,
      unresolvedItems,
      doNotBillOrderItemIds,
    };
  }

  async assertEncounterManualReviewResolved(facilityId: string, encounterId: string): Promise<BillingManualReviewGateDto> {
    const gate = await this.getEncounterManualReviewGate(facilityId, encounterId);
    if (gate.unresolvedCount > 0) {
      throw new BadRequestException(MANUAL_BILLING_REVIEW_UNRESOLVED_MESSAGE);
    }
    return gate;
  }

  async getDoNotBillBillingEventIdsForEncounter(facilityId: string, encounterId: string): Promise<Set<string>> {
    const gate = await this.getEncounterManualReviewGate(facilityId, encounterId);
    if (gate.doNotBillOrderItemIds.length === 0) return new Set();

    const orderItemIds = gate.doNotBillOrderItemIds;
    const [results, medicationAdministrations, medicationDispenses] = await Promise.all([
      this.prisma.result.findMany({
        where: { facilityId, orderItemId: { in: orderItemIds } },
        select: { id: true },
      }),
      this.prisma.medicationAdministration.findMany({
        where: { facilityId, encounterId, orderItemId: { in: orderItemIds } },
        select: { id: true },
      }),
      this.prisma.medicationDispense.findMany({
        where: { facilityId, encounterId, orderItemId: { in: orderItemIds } },
        select: { id: true },
      }),
    ]);

    const sourceRecordIds = new Set<string>([
      ...orderItemIds,
      ...results.map((row) => row.id),
      ...medicationAdministrations.map((row) => row.id),
      ...medicationDispenses.map((row) => row.id),
    ]);
    const events = await this.prisma.billingEvent.findMany({
      where: { facilityId, encounterId, sourceRecordId: { in: [...sourceRecordIds] } },
      select: { id: true },
    });
    return new Set(events.map((event) => event.id));
  }

  async upsertManualBillingReviewDecision(
    facilityId: string,
    orderItemId: string,
    body: Record<string, unknown>,
    reviewerId?: string
  ): Promise<BillingReviewDecisionDto> {
    if (!reviewerId) {
      throw new ForbiddenException("Authentication required");
    }

    const decision = parseBillingReviewDecisionStatus(body?.decision);
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
    if ((decision === BillingReviewDecisionStatus.NEEDS_INFO || decision === BillingReviewDecisionStatus.DO_NOT_BILL) && !notes) {
      throw new BadRequestException("notes are required for this decision");
    }

    const orderItem = await this.prisma.orderItem.findFirst({
      where: { id: orderItemId, order: { facilityId } },
      select: {
        id: true,
        order: {
          select: {
            id: true,
            encounterId: true,
            patientId: true,
          },
        },
      },
    });
    if (!orderItem) {
      throw new NotFoundException("Order item not found");
    }

    let billingEventId: string | null = null;
    const billingEventIdRaw = typeof body?.billingEventId === "string" ? body.billingEventId.trim() : "";
    if (billingEventIdRaw) {
      const billingEvent = await this.prisma.billingEvent.findFirst({
        where: {
          id: billingEventIdRaw,
          facilityId,
          encounterId: orderItem.order.encounterId,
          patientId: orderItem.order.patientId,
        },
        select: { id: true },
      });
      if (!billingEvent) {
        throw new BadRequestException("billingEventId does not match this manual review item");
      }
      billingEventId = billingEvent.id;
    }

    const reviewedAt = new Date();
    const saved = await this.prisma.$transaction(async (tx) => {
      const row = await tx.billingReviewDecision.upsert({
        where: { facilityId_orderItemId: { facilityId, orderItemId } },
        create: {
          facilityId,
          encounterId: orderItem.order.encounterId,
          patientId: orderItem.order.patientId,
          orderItemId,
          billingEventId,
          decision,
          notes: notes || null,
          reviewerId,
          reviewedAt,
        },
        update: {
          encounterId: orderItem.order.encounterId,
          patientId: orderItem.order.patientId,
          billingEventId,
          decision,
          notes: notes || null,
          reviewerId,
          reviewedAt,
        },
      });

      await this.audit.log(AuditAction.UPDATE, "BILLING_REVIEW_DECISION", {
        tx,
        userId: reviewerId,
        facilityId,
        patientId: orderItem.order.patientId,
        encounterId: orderItem.order.encounterId,
        orderId: orderItem.order.id,
        entityId: row.id,
        metadata: {
          orderItemId,
          billingEventId,
          decision,
          hasNotes: Boolean(notes),
        },
        critical: true,
      });

      return row;
    });

    return toBillingReviewDecisionDto(saved)!;
  }

  private async buildBillingExportRowsFromOrderItems(
    orderItems: BillingExportOrderItem[]
  ): Promise<BillingExportRowDto[]> {
    const labIds = orderItems
      .filter((item) => item.catalogItemType === "LAB_TEST" && item.catalogItemId)
      .map((item) => item.catalogItemId!);
    const imagingIds = orderItems
      .filter((item) => item.catalogItemType === "IMAGING_STUDY" && item.catalogItemId)
      .map((item) => item.catalogItemId!);
    const medicationIds = orderItems
      .filter((item) => item.catalogItemType === "MEDICATION" && item.catalogItemId)
      .map((item) => item.catalogItemId!);

    const [labs, imagingStudies, medications] = await Promise.all([
      labIds.length
        ? this.prisma.catalogLabTest.findMany({
            where: { id: { in: labIds } },
            select: { id: true, code: true, displayNameEn: true, displayNameFr: true, name: true, billingCodeDefault: true },
          })
        : Promise.resolve([]),
      imagingIds.length
        ? this.prisma.catalogImagingStudy.findMany({
            where: { id: { in: imagingIds } },
            select: { id: true, code: true, displayNameEn: true, displayNameFr: true, name: true, billingCodeDefault: true },
          })
        : Promise.resolve([]),
      medicationIds.length
        ? this.prisma.catalogMedication.findMany({
            where: { id: { in: medicationIds } },
            select: { id: true, code: true, displayNameEn: true, displayNameFr: true, name: true, billingCodeDefault: true, billingUnitType: true },
          })
        : Promise.resolve([]),
    ]);

    const labById = new Map(labs.map((lab) => [lab.id, lab]));
    const imagingById = new Map(imagingStudies.map((study) => [study.id, study]));
    const medicationById = new Map(medications.map((medication) => [medication.id, medication]));

    const labMappings = labs.length
      ? await this.prisma.billingCatalog.findMany({
          where: {
            triggerSource: "LAB",
            externalCode: { in: labs.map((lab) => lab.code) },
          },
          select: { externalCode: true, code: true },
        })
      : [];
    const labBillingCodeByExternalCode = new Map(
      labMappings
        .filter((mapping) => mapping.externalCode?.trim())
        .map((mapping) => [mapping.externalCode!, mapping.code])
    );

    return orderItems.map((item) => {
      const category = categoryForCatalogItemType(item.catalogItemType);
      const catalog =
        category === "LAB"
          ? labById.get(item.catalogItemId ?? "")
          : category === "IMAGING"
            ? imagingById.get(item.catalogItemId ?? "")
            : category === "MEDICATION"
              ? medicationById.get(item.catalogItemId ?? "")
              : null;
      const medoraCode = catalog?.code ?? item.manualLabel?.trim() ?? null;
      const billingCodeDefault = catalog?.billingCodeDefault?.trim() || null;
      const displayName = displayNameForCatalog(catalog, item.manualLabel);
      const officialLabBillingCodeMatched =
        category === "LAB" &&
        Boolean(
          medoraCode &&
            billingCodeDefault &&
            labBillingCodeByExternalCode.get(medoraCode) === billingCodeDefault
        );
      const billingStatus = getBillingReadinessStatus({
        category,
        medoraCode,
        billingCodeDefault,
        officialLabBillingCodeMatched,
      });

      return {
        orderItemId: item.id,
        medoraCode,
        category,
        displayName,
        billingStatus,
        billingCodeDefault,
        quantity: item.quantity ?? null,
        unit: category === "MEDICATION" ? medicationById.get(item.catalogItemId ?? "")?.billingUnitType?.trim() || null : null,
        notes: notesForReadiness({
          category,
          billingStatus,
          displayName,
          officialLabBillingCodeMatched,
        }),
      };
    });
  }

  toBillingExportCsv(rows: BillingExportRowDto[]): string {
    const headers = [
      "orderItemId",
      "medoraCode",
      "category",
      "displayName",
      "billingStatus",
      "billingCodeDefault",
      "quantity",
      "unit",
      "notes",
    ];
    const lines = rows.map((row) =>
      [
        row.orderItemId,
        row.medoraCode,
        row.category,
        row.displayName,
        row.billingStatus,
        row.billingCodeDefault,
        row.quantity,
        row.unit,
        row.notes,
      ]
        .map(csvCell)
        .join(",")
    );
    return [headers.join(","), ...lines].join("\n");
  }
}

function parseBillingReviewDecisionStatus(value: unknown): BillingReviewDecisionStatus {
  if (typeof value === "string" && Object.values(BillingReviewDecisionStatus).includes(value as BillingReviewDecisionStatus)) {
    return value as BillingReviewDecisionStatus;
  }
  throw new BadRequestException("Invalid decision");
}

function toBillingReviewDecisionDto(
  row:
    | {
        id: string;
        decision: BillingReviewDecisionStatus;
        notes: string | null;
        reviewerId: string;
        reviewedAt: Date;
        billingEventId: string | null;
      }
    | null
    | undefined
): BillingReviewDecisionDto | null {
  if (!row) return null;
  return {
    id: row.id,
    decision: row.decision,
    notes: row.notes,
    reviewerId: row.reviewerId,
    reviewedAt: row.reviewedAt.toISOString(),
    billingEventId: row.billingEventId,
  };
}

function categoryForCatalogItemType(catalogItemType: string): BillingReadinessCategory {
  if (catalogItemType === "LAB_TEST") return "LAB";
  if (catalogItemType === "IMAGING_STUDY") return "IMAGING";
  if (catalogItemType === "MEDICATION") return "MEDICATION";
  return "CARE";
}

function displayNameForCatalog(
  catalog:
    | { displayNameEn: string | null; displayNameFr: string | null; name: string | null }
    | null
    | undefined,
  manualLabel: string | null
): string {
  return catalog?.displayNameEn?.trim() || catalog?.displayNameFr?.trim() || catalog?.name?.trim() || manualLabel?.trim() || "Order item";
}

function notesForReadiness(input: {
  category: BillingReadinessCategory;
  billingStatus: BillingReadinessStatus;
  displayName: string;
  officialLabBillingCodeMatched: boolean;
}): string {
  if (input.category === "LAB") {
    return input.officialLabBillingCodeMatched
      ? `${input.displayName}: lab billingCodeDefault matches an existing BillingCatalog LAB mapping.`
      : `${input.displayName}: no validated LAB BillingCatalog match for billingCodeDefault.`;
  }
  if (input.category === "IMAGING") {
    return `${input.displayName}: imaging billing requires licensed CPT/facility chargemaster review.`;
  }
  if (input.category === "MEDICATION") {
    return `${input.displayName}: medication billing requires manual review; HCPCS/NDC evidence is candidate-only.`;
  }
  return input.billingStatus === "pending_license"
    ? `${input.displayName}: care/procedure billing requires licensed CPT/facility chargemaster review.`
    : `${input.displayName}: no safe care/procedure billing mapping found.`;
}

function reasonForNonAutoBillStatus(status: BillingReadinessStatus): string {
  if (status === "candidate_only") return "Candidate-only billing evidence requires manual review.";
  if (status === "pending_license") return "Licensed billing source or facility chargemaster review is required.";
  if (status === "missing") return "No safe billing code is available for auto-billing.";
  return "Auto-billing requires a validated lab billing code.";
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}
