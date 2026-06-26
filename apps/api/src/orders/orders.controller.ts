import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { Roles } from "../common/auth/roles.decorator";
import { OrdersService } from "./orders.service";
import { OrdersContinuousFluidService } from "./orders-continuous-fluid.service";
import { OrdersFluidBolusService } from "./orders-fluid-bolus.service";
import {
  ENCOUNTER_ORDER_EVENTS_LIST_DEFAULT_LIMIT,
  ENCOUNTER_ORDER_EVENTS_LIST_MAX_LIMIT,
  parseOptionalPositiveInt,
  resolveBoundedListLimit,
} from "../common/encounter-clinical-read-limits";
import { PharmacyVerificationService } from "../medication-safety/pharmacy-verification.service";
import { OrdersLabRadiologyEffectiveTimeService } from "./orders-lab-radiology-effective-time.service";
import { ProcedureBillingReadinessService } from "./procedure-billing-readiness.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  careProcedureEffectiveClinicalTimeDtoSchema,
  labRadiologyEffectiveClinicalTimeDtoSchema,
  medicationInfusionStartDtoSchema,
  medicationInfusionStopDtoSchema,
  medicationInfusionRateChangeDtoSchema,
  medicationInfusionPauseRestartDtoSchema,
  continuousFluidStartDtoSchema,
  continuousFluidPauseResumeDtoSchema,
  continuousFluidStopDtoSchema,
  fluidBolusStartDtoSchema,
  fluidBolusCompleteDtoSchema,
  orderCancelDtoSchema,
  orderCreateDtoSchema,
  orderItemCompleteWithClinicalTimeDtoSchema,
  orderUpdateDtoSchema,
} from "@medora/shared";
import { RoleCode } from "@prisma/client";
import { assertZodBody } from "../common/http/zod-parse";
import { logOrderCreateZodFailure } from "./order-create-validation.util";

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly continuousFluid: OrdersContinuousFluidService,
    private readonly fluidBolus: OrdersFluidBolusService,
    private readonly labRadEffectiveTime: OrdersLabRadiologyEffectiveTimeService,
    private readonly procedureBillingReadiness: ProcedureBillingReadinessService,
    private readonly pharmacyVerification: PharmacyVerificationService,
    private readonly prisma: PrismaService,
  ) {}

  private async roleCodesForFacility(userId: string | undefined, facilityId: string): Promise<RoleCode[]> {
    if (!userId) return [];
    const urs = await this.prisma.userRole.findMany({
      where: { userId, facilityId, isActive: true },
      include: { role: true },
    });
    return urs.flatMap((u) => (u.role ? [u.role.code] : []));
  }

  @Post("encounters/:encounterId/orders")
  @Roles("RN", "PROVIDER", "PHARMACY", "ADMIN")
  async create(@Param("encounterId") encounterId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    const userId = req.user?.userId;
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    if (!userId) {
      throw new ForbiddenException("Authentification requise");
    }

    const parsedOrderBody = orderCreateDtoSchema.safeParse(body);
    if (!parsedOrderBody.success) {
      logOrderCreateZodFailure({
        error: parsedOrderBody.error,
        requestId: typeof req.requestId === "string" ? req.requestId : undefined,
        encounterId,
        facilityId,
        body,
      });
    }
    const data = assertZodBody(parsedOrderBody);
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, facilityId, isActive: true },
      include: { role: true },
    });
    const codes = userRoles.flatMap((ur) => (ur.role ? [ur.role.code] : []));

    const orderType = data.type as string;
    if (orderType === "MEDICATION" || orderType === "CARE") {
      if (!codes.includes(RoleCode.PROVIDER) && !codes.includes(RoleCode.ADMIN)) {
        if (!codes.includes(RoleCode.RN)) {
          throw new ForbiddenException(
            orderType === "MEDICATION"
              ? "Seuls les médecins peuvent prescrire des médicaments."
              : "Seuls les médecins peuvent créer des ordres de soins.",
          );
        }
        if (!data.orderSource) {
          throw new BadRequestException("Mode d'autorité requis pour un ordre infirmier.");
        }
        if (data.orderSource === "VERBAL_ORDER") {
          if (!data.prescriberName?.trim()) {
            throw new BadRequestException("Le médecin prescripteur est requis pour un ordre verbal.");
          }
          if (data.readbackConfirmed !== true) {
            throw new BadRequestException("La relecture de l'ordre verbal doit être confirmée.");
          }
        } else if (data.orderSource === "NURSING_PROTOCOL") {
          if (!data.protocolName?.trim()) {
            throw new BadRequestException("Le protocole infirmier est requis.");
          }
        } else {
          throw new ForbiddenException(
            orderType === "MEDICATION"
              ? "Seuls les médecins peuvent prescrire des médicaments."
              : "Seuls les médecins peuvent créer des ordres de soins.",
          );
        }
      }
    }

    return this.ordersService.create(
      encounterId,
      facilityId,
      data,
      userId,
      req.ip,
      req.headers["user-agent"],
      {
        facilityId,
        userId,
        providerGroupId: req.user?.providerGroupId || req.headers["x-provider-group-id"],
        roleCodes: codes,
      }
    );
  }

  @Get("encounters/:encounterId/orders")
  @Roles("RN", "PROVIDER", "LAB", "RADIOLOGY", "ADMIN")
  async findByEncounter(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    return this.ordersService.findByEncounter(
      encounterId,
      facilityId,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get("encounters/:encounterId/order-events")
  @Roles("RN", "PROVIDER", "LAB", "RADIOLOGY", "PHARMACY", "ADMIN")
  async findOrderEventsByEncounter(
    @Param("encounterId") encounterId: string,
    @Query("limit") limitRaw: string | undefined,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    const limit = resolveBoundedListLimit(
      parseOptionalPositiveInt(limitRaw),
      ENCOUNTER_ORDER_EVENTS_LIST_DEFAULT_LIMIT,
      ENCOUNTER_ORDER_EVENTS_LIST_MAX_LIMIT
    );
    return this.ordersService.findOrderEventsByEncounter(encounterId, facilityId, { limit });
  }

  @Get("orders/provider-directory")
  @Roles("RN", "PROVIDER", "ADMIN")
  async providerDirectory(@Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    return this.ordersService.listProviderDirectory(facilityId);
  }

  @Get("orders/:id")
  @Roles("RN", "PROVIDER", "LAB", "RADIOLOGY", "PHARMACY", "ADMIN")
  async findOne(@Param("id") orderId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    return this.ordersService.findOne(orderId, facilityId, req.user?.userId, req.ip, req.headers["user-agent"]);
  }

  @Patch("orders/:id")
  @Roles("RN", "PROVIDER", "LAB", "RADIOLOGY", "PHARMACY", "ADMIN")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    const updateData = assertZodBody(orderUpdateDtoSchema.safeParse(body));

    return this.ordersService.update(
      facilityId,
      id,
      updateData,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("orders/:id/cancel")
  @Roles("RN", "PROVIDER", "LAB", "RADIOLOGY", "PHARMACY", "ADMIN", "MEDORA_SUPER_ADMIN")
  async cancel(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    const dto = assertZodBody(orderCancelDtoSchema.safeParse(body));
    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);

    return this.ordersService.cancelOrder(
      facilityId,
      id,
      dto,
      codes,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get("orders/items/:id/procedure-billing-readiness")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.PROVIDER)
  async getProcedureBillingReadiness(@Param("id") orderItemId: string, @Req() req: any) {
    const facilityId = req.facilityId ?? req.user?.facilityId ?? req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    return this.procedureBillingReadiness.getForOrderItem(facilityId, orderItemId);
  }

  @Post("orders/items/:id/acknowledge")
  @RequireRoles(
    RoleCode.LAB,
    RoleCode.RADIOLOGY,
    RoleCode.PHARMACY,
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN
  )
  async acknowledgeOrderItem(@Param("id") orderItemId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);
    return this.ordersService.acknowledgeOrderItem(
      facilityId,
      orderItemId,
      codes,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("orders/items/:id/start")
  @RequireRoles(
    RoleCode.LAB,
    RoleCode.RADIOLOGY,
    RoleCode.PHARMACY,
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN
  )
  async startOrderItem(@Param("id") orderItemId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);
    return this.ordersService.startOrderItem(
      facilityId,
      orderItemId,
      codes,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("orders/items/:id/complete")
  @RequireRoles(
    RoleCode.LAB,
    RoleCode.RADIOLOGY,
    RoleCode.PHARMACY,
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN
  )
  async completeOrderItem(@Param("id") orderItemId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);
    const completeOptions =
      body != null && typeof body === "object" && Object.keys(body as object).length > 0
        ? assertZodBody(orderItemCompleteWithClinicalTimeDtoSchema.safeParse(body))
        : undefined;
    return this.ordersService.completeOrderItem(
      facilityId,
      orderItemId,
      codes,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
      completeOptions
    );
  }

  @Patch("orders/items/:itemId/effective-lab-collected-time")
  @RequireRoles(RoleCode.LAB, RoleCode.ADMIN)
  async setLabCollectedEffectiveTime(
    @Param("itemId") orderItemId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    if (!facilityId) throw new BadRequestException("Établissement requis");
    const userId = req.user?.userId;
    if (!userId) throw new ForbiddenException("Authentification requise");
    const dto = assertZodBody(labRadiologyEffectiveClinicalTimeDtoSchema.safeParse(body));
    const codes = await this.roleCodesForFacility(userId, facilityId);
    return this.labRadEffectiveTime.setLabCollectedEffectiveTime(
      facilityId,
      orderItemId,
      dto,
      userId,
      codes,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Patch("orders/items/:itemId/effective-lab-received-time")
  @RequireRoles(RoleCode.LAB, RoleCode.ADMIN)
  async setLabReceivedEffectiveTime(
    @Param("itemId") orderItemId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    if (!facilityId) throw new BadRequestException("Établissement requis");
    const userId = req.user?.userId;
    if (!userId) throw new ForbiddenException("Authentification requise");
    const dto = assertZodBody(labRadiologyEffectiveClinicalTimeDtoSchema.safeParse(body));
    const codes = await this.roleCodesForFacility(userId, facilityId);
    return this.labRadEffectiveTime.setLabReceivedEffectiveTime(
      facilityId,
      orderItemId,
      dto,
      userId,
      codes,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Patch("orders/items/:itemId/effective-imaging-performed-time")
  @RequireRoles(RoleCode.RADIOLOGY, RoleCode.ADMIN)
  async setImagingPerformedEffectiveTime(
    @Param("itemId") orderItemId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    if (!facilityId) throw new BadRequestException("Établissement requis");
    const userId = req.user?.userId;
    if (!userId) throw new ForbiddenException("Authentification requise");
    const dto = assertZodBody(labRadiologyEffectiveClinicalTimeDtoSchema.safeParse(body));
    const codes = await this.roleCodesForFacility(userId, facilityId);
    return this.labRadEffectiveTime.setImagingPerformedEffectiveTime(
      facilityId,
      orderItemId,
      dto,
      userId,
      codes,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Patch("orders/items/:itemId/effective-clinical-time")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async setCareProcedureEffectiveClinicalTime(
    @Param("itemId") orderItemId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    const userId = req.user?.userId;
    if (!userId) {
      throw new ForbiddenException("Authentification requise");
    }
    const dto = assertZodBody(careProcedureEffectiveClinicalTimeDtoSchema.safeParse(body));
    const orderId =
      body != null &&
      typeof body === "object" &&
      typeof (body as { orderId?: unknown }).orderId === "string"
        ? (body as { orderId: string }).orderId.trim()
        : undefined;
    const codes = await this.roleCodesForFacility(userId, facilityId);
    return this.ordersService.setCareProcedureEffectiveClinicalTime(
      facilityId,
      orderItemId,
      orderId,
      dto,
      codes,
      userId,
      req.ip,
      req.headers["user-agent"],
      "ORDERS_TAB"
    );
  }

  @Post("orders/items/:id/cancel")
  @Roles("RN", "PROVIDER", "LAB", "RADIOLOGY", "PHARMACY", "ADMIN", "MEDORA_SUPER_ADMIN")
  async cancelOrderItem(@Param("id") orderItemId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    const dto = assertZodBody(orderCancelDtoSchema.safeParse(body));
    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);

    return this.ordersService.cancelOrderItem(
      facilityId,
      orderItemId,
      dto,
      codes,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("orders/items/:id/nurse-complete")
  @RequireRoles(RoleCode.RN, RoleCode.ADMIN)
  async nurseCompleteOrderItem(@Param("id") orderItemId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    const userId = req.user?.userId;
    if (!userId) {
      throw new ForbiddenException("Authentification requise");
    }
    return this.ordersService.nurseCompleteOrderItem(
      facilityId,
      orderItemId,
      userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /** IVPB / infusion — Phase 1: start (no MAR row, no billing). */
  @Post("orders/items/:id/infusion/start")
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.RN, RoleCode.ADMIN)
  async startMedicationInfusion(@Param("id") orderItemId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    const dto = assertZodBody(medicationInfusionStartDtoSchema.safeParse(body ?? {}));
    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);
    return this.ordersService.startMedicationInfusion(
      facilityId,
      orderItemId,
      dto,
      codes,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("orders/items/:id/infusion/rate-change")
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.RN, RoleCode.ADMIN)
  async changeMedicationInfusionRate(@Param("id") orderItemId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) throw new BadRequestException("Établissement requis");
    const dto = assertZodBody(medicationInfusionRateChangeDtoSchema.safeParse(body ?? {}));
    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);
    return this.ordersService.changeMedicationInfusionRate(
      facilityId,
      orderItemId,
      dto,
      codes,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("orders/items/:id/infusion/pause")
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.RN, RoleCode.ADMIN)
  async pauseMedicationInfusion(@Param("id") orderItemId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) throw new BadRequestException("Établissement requis");
    const dto = assertZodBody(medicationInfusionPauseRestartDtoSchema.safeParse(body ?? {}));
    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);
    return this.ordersService.pauseMedicationInfusion(
      facilityId,
      orderItemId,
      dto,
      codes,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("orders/items/:id/infusion/restart")
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.RN, RoleCode.ADMIN)
  async restartMedicationInfusion(@Param("id") orderItemId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) throw new BadRequestException("Établissement requis");
    const dto = assertZodBody(medicationInfusionPauseRestartDtoSchema.safeParse(body ?? {}));
    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);
    return this.ordersService.restartMedicationInfusion(
      facilityId,
      orderItemId,
      dto,
      codes,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /** M1.3F.7 — pharmacist completes pharmacy verification for a medication order line. */
  @Post("orders/items/:orderItemId/pharmacy-verification/complete")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN)
  async completePharmacyVerification(
    @Param("orderItemId") orderItemId: string,
    @Body() body: unknown,
    @Req() req: { facilityId?: string; user?: { userId?: string } }
  ) {
    const facilityId = req.facilityId;
    const userId = req.user?.userId;
    if (!facilityId || !userId) {
      throw new BadRequestException("Établissement et authentification requis.");
    }
    const note =
      body && typeof body === "object" && "verificationNote" in body
        ? String((body as { verificationNote?: string }).verificationNote ?? "")
        : undefined;
    return this.pharmacyVerification.completeVerification(
      orderItemId,
      facilityId,
      userId,
      note
    );
  }

  /** M1.3F.7 — pharmacist rejects pharmacy verification for a medication order line. */
  @Post("orders/items/:orderItemId/pharmacy-verification/reject")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN)
  async rejectPharmacyVerification(
    @Param("orderItemId") orderItemId: string,
    @Body() body: unknown,
    @Req() req: { facilityId?: string; user?: { userId?: string } }
  ) {
    const facilityId = req.facilityId;
    const userId = req.user?.userId;
    if (!facilityId || !userId) {
      throw new BadRequestException("Établissement et authentification requis.");
    }
    const note =
      body && typeof body === "object" && "verificationNote" in body
        ? String((body as { verificationNote?: string }).verificationNote ?? "")
        : undefined;
    return this.pharmacyVerification.rejectVerification(orderItemId, facilityId, userId, note);
  }

  /** IVPB / infusion — Phase 1: stop (terminal MAR + billing once via MAR create). */
  @Post("orders/items/:id/infusion/stop")
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.RN, RoleCode.ADMIN)
  async stopMedicationInfusion(@Param("id") orderItemId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    const dto = assertZodBody(medicationInfusionStopDtoSchema.safeParse(body ?? {}));
    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);
    return this.ordersService.stopMedicationInfusion(
      facilityId,
      orderItemId,
      dto,
      codes,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /** Continuous IV fluid — start (K.10B.8). */
  @Post("orders/items/:id/fluid/start")
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.RN, RoleCode.ADMIN)
  async startContinuousFluid(@Param("id") orderItemId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) throw new BadRequestException("Établissement requis");
    const dto = assertZodBody(continuousFluidStartDtoSchema.safeParse(body ?? {}));
    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);
    return this.continuousFluid.startContinuousFluid(
      facilityId,
      orderItemId,
      dto,
      codes,
      req.user?.userId
    );
  }

  @Post("orders/items/:id/fluid/pause")
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.RN, RoleCode.ADMIN)
  async pauseContinuousFluid(@Param("id") orderItemId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) throw new BadRequestException("Établissement requis");
    const dto = assertZodBody(continuousFluidPauseResumeDtoSchema.safeParse(body ?? {}));
    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);
    return this.continuousFluid.pauseContinuousFluid(
      facilityId,
      orderItemId,
      dto,
      codes,
      req.user?.userId
    );
  }

  @Post("orders/items/:id/fluid/resume")
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.RN, RoleCode.ADMIN)
  async resumeContinuousFluid(@Param("id") orderItemId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) throw new BadRequestException("Établissement requis");
    const dto = assertZodBody(continuousFluidPauseResumeDtoSchema.safeParse(body ?? {}));
    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);
    return this.continuousFluid.resumeContinuousFluid(
      facilityId,
      orderItemId,
      dto,
      codes,
      req.user?.userId
    );
  }

  @Post("orders/items/:id/fluid/stop")
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.RN, RoleCode.ADMIN)
  async stopContinuousFluid(@Param("id") orderItemId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) throw new BadRequestException("Établissement requis");
    const dto = assertZodBody(continuousFluidStopDtoSchema.safeParse(body ?? {}));
    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);
    return this.continuousFluid.stopContinuousFluid(
      facilityId,
      orderItemId,
      dto,
      codes,
      req.user?.userId
    );
  }

  @Post("orders/items/:id/fluid/bolus/start")
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.RN, RoleCode.ADMIN)
  async startFluidBolus(@Param("id") orderItemId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) throw new BadRequestException("Établissement requis");
    const dto = assertZodBody(fluidBolusStartDtoSchema.safeParse(body ?? {}));
    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);
    return this.fluidBolus.startFluidBolus(
      facilityId,
      orderItemId,
      dto,
      codes,
      req.user?.userId
    );
  }

  @Post("orders/items/:id/fluid/bolus/complete")
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.RN, RoleCode.ADMIN)
  async completeFluidBolus(@Param("id") orderItemId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) throw new BadRequestException("Établissement requis");
    const dto = assertZodBody(fluidBolusCompleteDtoSchema.safeParse(body ?? {}));
    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);
    return this.fluidBolus.completeFluidBolus(
      facilityId,
      orderItemId,
      dto,
      codes,
      req.user?.userId
    );
  }
}

