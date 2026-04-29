import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type {
  BillingExportRowDto,
  BillingReadinessCategory,
  BillingReadinessItemDto,
  BillingReadinessStatus,
} from "./dto/billing-readiness.dto";

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

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

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

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}
