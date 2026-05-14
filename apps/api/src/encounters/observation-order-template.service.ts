import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, RoleCode } from "@prisma/client";
import {
  OBSERVATION_ORDER_TEMPLATE_ID,
  buildObservationTemplateCareOrderDto,
  findUnknownObservationTemplateIds,
  orderObservationTemplateSelection,
  type ObservationOrderTemplateApplyDto,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";
import { AuditService } from "../common/services/audit.service";
import {
  assertEncounterNotSigned,
  assertEncounterOpenForClinicalMutation,
} from "./encounter-sign-lock.util";

const UNKNOWN_TEMPLATE_IDS_FR =
  "Identifiants de modèle inconnus ou non pris en charge pour ce lot d’ordres.";
const NO_VALID_LINES_FR = "Sélectionnez au moins une ligne valide du modèle.";
const NOT_INPATIENT_FR = "Ce modèle d’ordres s’applique uniquement aux hospitalisations (consultation ouverte).";
const ROLE_BLOCKED_FR = "Seuls les médecins ou administrateurs peuvent appliquer ce modèle d’ordres.";

@Injectable()
export class ObservationOrderTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly audit: AuditService
  ) {}

  private async assertProviderOrAdmin(userId: string | undefined, facilityId: string): Promise<void> {
    if (!userId) {
      throw new ForbiddenException("Authentification requise");
    }
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, facilityId, isActive: true },
      include: { role: true },
    });
    const codes = userRoles.flatMap((ur) => (ur.role ? [ur.role.code] : []));
    if (!codes.includes(RoleCode.PROVIDER) && !codes.includes(RoleCode.ADMIN)) {
      throw new ForbiddenException(ROLE_BLOCKED_FR);
    }
  }

  async apply(
    encounterId: string,
    facilityId: string,
    dto: ObservationOrderTemplateApplyDto,
    userId: string | undefined,
    ip?: string,
    userAgent?: string
  ) {
    await this.assertProviderOrAdmin(userId, facilityId);

    const unknown = findUnknownObservationTemplateIds(dto.selectedItemIds);
    if (unknown.length > 0) {
      throw new BadRequestException(UNKNOWN_TEMPLATE_IDS_FR);
    }

    const ordered = orderObservationTemplateSelection(dto.selectedItemIds);
    if (ordered.length === 0) {
      throw new BadRequestException(NO_VALID_LINES_FR);
    }

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        facilityId: true,
        patientId: true,
        type: true,
        status: true,
        workflowState: true,
        providerDocumentationStatus: true,
      },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    if (encounter.type !== "INPATIENT") {
      throw new BadRequestException(NOT_INPATIENT_FR);
    }

    assertEncounterOpenForClinicalMutation(encounter);
    assertEncounterNotSigned(encounter);

    const user = userId
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            firstName: true,
            lastName: true,
            billingNameOverride: true,
            billingNpi: true,
          },
        })
      : null;

    const prescriberName =
      user?.billingNameOverride?.trim() ||
      `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
      "Prescripteur";

    let orderDto;
    try {
      orderDto = buildObservationTemplateCareOrderDto({
        selectedItemIds: ordered,
        prescriberName,
        prescriberLicense: user?.billingNpi?.trim() || undefined,
        prescriberContact: undefined,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "observation_template_no_valid_items") {
        throw new BadRequestException(NO_VALID_LINES_FR);
      }
      throw e;
    }

    const created = await this.ordersService.create(
      encounterId,
      facilityId,
      orderDto,
      userId,
      ip,
      userAgent
    );

    const skippedMedicationItems: string[] = [];

    await this.audit.log(AuditAction.ORDERS_CREATED, "ORDER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId,
      entityId: created.id,
      orderId: created.id,
      ip,
      userAgent,
      metadata: {
        encounterId,
        templateId: OBSERVATION_ORDER_TEMPLATE_ID,
        selectedItemIds: ordered,
        selectedCount: ordered.length,
        skippedMedicationItems,
        source: "OBSERVATION_ORDER_SET",
      },
    });

    return created;
  }
}
