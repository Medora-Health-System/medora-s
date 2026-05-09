import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { Roles } from "../common/auth/roles.decorator";
import { OrdersService } from "./orders.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  medicationInfusionStopDtoSchema,
  orderCancelDtoSchema,
  orderCreateDtoSchema,
  orderUpdateDtoSchema,
} from "@medora/shared";
import { RoleCode } from "@prisma/client";
import { assertZodBody } from "../common/http/zod-parse";

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
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

    const data = assertZodBody(orderCreateDtoSchema.safeParse(body));

    const orderType = data.type as string;
    if (orderType === "MEDICATION" || orderType === "CARE") {
      const userRoles = await this.prisma.userRole.findMany({
        where: { userId, facilityId, isActive: true },
        include: { role: true },
      });
      const codes = userRoles.flatMap((ur) => (ur.role ? [ur.role.code] : []));
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
      req.headers["user-agent"]
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
  async findOrderEventsByEncounter(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    return this.ordersService.findOrderEventsByEncounter(encounterId, facilityId);
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
  @Roles("RN", "PROVIDER", "LAB", "RADIOLOGY", "PHARMACY", "ADMIN")
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

  @Post("orders/items/:id/acknowledge")
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.RN, RoleCode.ADMIN)
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
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.RN, RoleCode.ADMIN)
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
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.RN, RoleCode.ADMIN)
  async completeOrderItem(@Param("id") orderItemId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);
    return this.ordersService.completeOrderItem(
      facilityId,
      orderItemId,
      codes,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("orders/items/:id/cancel")
  @Roles("RN", "PROVIDER", "LAB", "RADIOLOGY", "PHARMACY", "ADMIN")
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
  async startMedicationInfusion(@Param("id") orderItemId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    const codes = await this.roleCodesForFacility(req.user?.userId, facilityId);
    return this.ordersService.startMedicationInfusion(
      facilityId,
      orderItemId,
      codes,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
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
}

