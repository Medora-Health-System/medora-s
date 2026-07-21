import { Injectable, NotFoundException } from "@nestjs/common";
import { EncounterClinicalEventType } from "@prisma/client";
import {
  evaluateFacilityBillingIdentityComplete,
  readCanonicalProcedureTypeFromPayload,
  resolveProcedureBillingReadiness,
  type ResolveProcedureBillingReadinessOutput,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ENCOUNTER_NESTED_CORE_SELECT } from "../encounters/encounter-query-contracts";

export type ProcedureBillingReadinessApiPayload = ResolveProcedureBillingReadinessOutput & {
  orderItemId: string;
  enterpriseProcedureId: string | null;
};

@Injectable()
export class ProcedureBillingReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async getForOrderItem(
    facilityId: string,
    orderItemId: string
  ): Promise<ProcedureBillingReadinessApiPayload> {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: { encounter: { facilityId } },
      },
      include: {
        order: {
          include: {
            encounter: {
              select: {
                ...ENCOUNTER_NESTED_CORE_SELECT,
                facility: {
                  select: {
                    id: true,
                    name: true,
                    billingLegalName: true,
                    billingAddressLine1: true,
                    billingCity: true,
                    billingStateProvince: true,
                    billingPostalCode: true,
                    billingCountry: true,
                    billingNpi: true,
                    taxIdEin: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException("Ordre introuvable");
    }

    const enterpriseProcedureId = orderItem.enterpriseProcedureId?.trim() || null;

    const clinicalEvents = await this.prisma.encounterClinicalEvent.findMany({
      where: {
        encounterId: orderItem.order.encounterId,
        eventType: EncounterClinicalEventType.PROCEDURE_DOCUMENTED,
      },
      select: { payloadJson: true },
    });

    const documentedProcedureTypes = clinicalEvents
      .map((event) => readCanonicalProcedureTypeFromPayload(event.payloadJson))
      .filter((value): value is string => Boolean(value));

    let facilityChargeMasterLinked = false;
    if (enterpriseProcedureId) {
      const catalogRow = await this.prisma.billingCatalog.findFirst({
        where: {
          triggerSource: "PROCEDURE",
          externalCode: enterpriseProcedureId,
        },
        select: { id: true },
      });
      facilityChargeMasterLinked = Boolean(catalogRow);
    }

    const facility = orderItem.order.encounter.facility;
    const readiness = resolveProcedureBillingReadiness({
      enterpriseProcedureId,
      orderItemStatus: orderItem.status,
      documentedProcedureTypes,
      facilityChargeMasterLinked,
      facilityBillingIdentityComplete: evaluateFacilityBillingIdentityComplete(facility),
      billingClassification: orderItem.order.encounter.billingClassification,
    });

    return {
      orderItemId,
      enterpriseProcedureId,
      ...readiness,
    };
  }
}
