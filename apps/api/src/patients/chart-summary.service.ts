import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction } from "@prisma/client";
import { OrdersService } from "../orders/orders.service";
import type {
  OrderItemWithCatalogMedication,
  OrderWithEnrichedItems,
  OrderWithItems,
} from "../orders/orders.types";

const RECENT_ENCOUNTERS = 10;
const RECENT_DISPENSES = 20;
const RECENT_VACCINATIONS = 20;
/** Cap per-patient dispenses tied to the listed encounters (timeline). */
const DISPENSES_PER_TIMELINE = 80;

function frCatalogLabel(
  row: { displayNameFr?: string | null; name: string } | null | undefined
): string | null {
  if (!row) return null;
  const fr = row.displayNameFr?.trim();
  if (fr) return fr;
  const n = row.name?.trim();
  return n || null;
}

function attachmentSummaryFr(resultData: unknown): string | null {
  if (!resultData || typeof resultData !== "object" || Array.isArray(resultData)) return null;
  const att = (resultData as Record<string, unknown>).attachments;
  if (!Array.isArray(att) || att.length === 0) return null;
  return `${att.length} pièce(s) jointe(s)`;
}

/** Pièces jointes pour l’UI dossier — toutes les entrées (avec ou sans base64) pour message FR si indisponible. */
function attachmentsForChartUi(resultData: unknown): Array<{
  fileName?: string | null;
  mimeType?: string | null;
  dataBase64?: string | null;
}> {
  if (!resultData || typeof resultData !== "object" || Array.isArray(resultData)) return [];
  const att = (resultData as Record<string, unknown>).attachments;
  if (!Array.isArray(att)) return [];
  return att
    .filter((a) => a && typeof a === "object")
    .map((a) => {
      const o = a as Record<string, unknown>;
      return {
        fileName: typeof o.fileName === "string" ? o.fileName : null,
        mimeType: typeof o.mimeType === "string" ? o.mimeType : null,
        dataBase64: typeof o.dataBase64 === "string" ? o.dataBase64 : null,
      };
    });
}

function orderItemDisplayLabel(item: OrderItemWithCatalogMedication): string {
  /** Libellé enrichi (inclut saisie manuelle). */
  if (item.displayLabelFr?.trim()) return item.displayLabelFr.trim();
  if (item.catalogItemType === "LAB_TEST") {
    const fr = item.catalogLabTest?.displayNameFr?.trim();
    if (fr) return fr;
  }
  const lab = frCatalogLabel(item.catalogLabTest ?? null);
  if (lab) return lab;
  const img = frCatalogLabel(item.catalogImagingStudy ?? null);
  if (img) return img;
  const med = frCatalogLabel(item.catalogMedication ?? null);
  if (med) return med;
  const fallback: Record<string, string> = {
    LAB_TEST: "Analyse (libellé indisponible)",
    IMAGING_STUDY: "Imagerie (libellé indisponible)",
    MEDICATION: "Médicament (libellé indisponible)",
  };
  return fallback[item.catalogItemType] ?? "Article prescrit";
}

function toChartOrderItems(order: OrderWithEnrichedItems) {
  return (order.items || []).map((it) => {
    const label = orderItemDisplayLabel(it);
    const res = it.result ?? null;
    return {
      id: it.id,
      catalogItemType: it.catalogItemType,
      status: it.status,
      displayLabel: label,
      medicationFulfillmentIntent: it.medicationFulfillmentIntent ?? null,
      completedAt: it.completedAt,
      completedBy:
        it.completedByNurse != null
          ? {
              firstName: it.completedByNurse.firstName,
              lastName: it.completedByNurse.lastName,
            }
          : null,
      result: res
        ? {
            resultText: res.resultText,
            verifiedAt: res.verifiedAt,
            criticalValue: res.criticalValue,
            enteredByDisplayFr: res.enteredByDisplayFr ?? null,
            attachmentSummaryFr: attachmentSummaryFr(res.resultData),
            attachments: attachmentsForChartUi(res.resultData),
          }
        : null,
    };
  });
}

@Injectable()
export class ChartSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ordersService: OrdersService
  ) {}

  async getChartSummary(
    patientId: string,
    facilityId: string,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId },
      select: {
        id: true,
        mrn: true,
        globalMrn: true,
        firstName: true,
        lastName: true,
        dob: true,
        phone: true,
        email: true,
        sexAtBirth: true,
        sex: true,
        latestVitalsJson: true,
        latestVitalsAt: true,
        address: true,
        city: true,
        country: true,
        language: true,
        createdAt: true,
      },
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    await this.audit.log(AuditAction.CHART_ACCESS, "PATIENT", {
      userId,
      facilityId,
      patientId,
      entityId: patientId,
      ip,
      userAgent,
    });

    const [encounters, activeDiagnoses, recentDispenses, recentVaccinations] =
      await Promise.all([
        this.prisma.encounter.findMany({
          where: { patientId, facilityId },
          orderBy: { createdAt: "desc" },
          take: RECENT_ENCOUNTERS,
          select: {
            id: true,
            type: true,
            status: true,
            chiefComplaint: true,
            providerNote: true,
            treatmentPlan: true,
            followUpDate: true,
            createdAt: true,
            dischargedAt: true,
            dischargeStatus: true,
            roomLabel: true,
            nursingAssessment: true,
            dischargeSummaryJson: true,
            physicianAssigned: {
              select: { id: true, firstName: true, lastName: true },
            },
            triage: {
              select: {
                vitalsJson: true,
                triageCompleteAt: true,
                chiefComplaint: true,
                esi: true,
              },
            },
          },
        }),
        this.prisma.diagnosis.findMany({
          where: { patientId, facilityId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            code: true,
            description: true,
            onsetDate: true,
            notes: true,
            createdAt: true,
            encounter: { select: { id: true, type: true, createdAt: true } },
          },
        }),
        this.prisma.medicationDispense.findMany({
          where: { patientId, facilityId },
          orderBy: { dispensedAt: "desc" },
          take: RECENT_DISPENSES,
          select: {
            id: true,
            encounterId: true,
            quantityDispensed: true,
            dosageInstructions: true,
            dispensedAt: true,
            catalogMedication: {
              select: { code: true, name: true, displayNameFr: true },
            },
            inventoryItem: { select: { sku: true, lotNumber: true } },
            dispensedBy: { select: { firstName: true, lastName: true } },
          },
        }),
        this.prisma.vaccineAdministration.findMany({
          where: { patientId, facilityId },
          orderBy: { administeredAt: "desc" },
          take: RECENT_VACCINATIONS,
          select: {
            id: true,
            doseNumber: true,
            lotNumber: true,
            administeredAt: true,
            nextDueAt: true,
            vaccineCatalog: { select: { code: true, name: true } },
          },
        }),
      ]);

    const encounterIds = encounters.map((e) => e.id);

    const [ordersRaw, encounterDiagnosesRows, encounterDispensesRows] =
      encounterIds.length === 0
        ? [[], [], []]
        : await Promise.all([
            this.prisma.order.findMany({
              where: { patientId, facilityId, encounterId: { in: encounterIds } },
              orderBy: { createdAt: "asc" },
              include: {
                items: {
                  include: {
                    completedByNurse: { select: { firstName: true, lastName: true } },
                    result: {
                      select: {
                        resultText: true,
                        verifiedAt: true,
                        criticalValue: true,
                        resultData: true,
                        verifiedByUserId: true,
                      },
                    },
                  },
                },
              },
            }),
            this.prisma.diagnosis.findMany({
              where: { patientId, facilityId, encounterId: { in: encounterIds } },
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                code: true,
                description: true,
                status: true,
                encounterId: true,
                createdAt: true,
              },
            }),
            this.prisma.medicationDispense.findMany({
              where: { patientId, facilityId, encounterId: { in: encounterIds } },
              orderBy: { dispensedAt: "desc" },
              take: DISPENSES_PER_TIMELINE,
              select: {
                id: true,
                encounterId: true,
                quantityDispensed: true,
                dosageInstructions: true,
                dispensedAt: true,
                catalogMedication: {
                  select: { code: true, name: true, displayNameFr: true },
                },
                dispensedBy: { select: { firstName: true, lastName: true } },
              },
            }),
          ]);

    const ordersEnriched = await this.ordersService.enrichOrderItemsForDisplay(
      ordersRaw as unknown as OrderWithItems[]
    );
    const ordersWithVerifierNames = await this.ordersService.attachEnteredByDisplayOnOrders(ordersEnriched);

    const ordersByEncounter = new Map<string, OrderWithEnrichedItems[]>();
    for (const o of ordersWithVerifierNames) {
      const list = ordersByEncounter.get(o.encounterId) ?? [];
      list.push(o);
      ordersByEncounter.set(o.encounterId, list);
    }

    const diagnosesByEncounter = new Map<string, typeof encounterDiagnosesRows>();
    for (const d of encounterDiagnosesRows) {
      const list = diagnosesByEncounter.get(d.encounterId) ?? [];
      list.push(d);
      diagnosesByEncounter.set(d.encounterId, list);
    }

    const dispensesByEncounter = new Map<string, typeof encounterDispensesRows>();
    for (const d of encounterDispensesRows) {
      const list = dispensesByEncounter.get(d.encounterId) ?? [];
      list.push(d);
      dispensesByEncounter.set(d.encounterId, list);
    }

    const recentEncounters = encounters.map((e) => {
      const tp = e.treatmentPlan?.trim();
      const treatmentPlanPreview =
        tp && tp.length > 120 ? `${tp.slice(0, 120).trim()}…` : tp || null;
      const imp = e.providerNote?.trim();
      const clinicianImpressionPreview =
        imp && imp.length > 100 ? `${imp.slice(0, 100).trim()}…` : imp || null;

      const encOrders = ordersByEncounter.get(e.id) ?? [];
      const compactOrders = encOrders.map((o) => ({
        id: o.id,
        type: o.type,
        status: o.status,
        createdAt: o.createdAt,
        items: toChartOrderItems(o),
      }));

      return {
        id: e.id,
        type: e.type,
        status: e.status,
        visitReason: e.chiefComplaint,
        chiefComplaint: e.chiefComplaint,
        treatmentPlanPreview,
        clinicianImpressionPreview,
        followUpDate: e.followUpDate,
        createdAt: e.createdAt,
        dischargedAt: e.dischargedAt,
        dischargeStatus: e.dischargeStatus,
        roomLabel: e.roomLabel,
        nursingAssessment: e.nursingAssessment,
        dischargeSummaryJson: e.dischargeSummaryJson,
        physicianAssigned: e.physicianAssigned,
        encounterDiagnoses: diagnosesByEncounter.get(e.id) ?? [],
        orders: compactOrders,
        encounterMedicationDispenses: dispensesByEncounter.get(e.id) ?? [],
        triage: e.triage
          ? {
              vitalsJson: e.triage.vitalsJson,
              triageCompleteAt: e.triage.triageCompleteAt,
              chiefComplaint: e.triage.chiefComplaint,
              esi: e.triage.esi,
            }
          : null,
      };
    });

    return {
      patient,
      recentEncounters,
      activeDiagnoses,
      recentMedicationDispenses: recentDispenses,
      recentVaccinations,
    };
  }
}
