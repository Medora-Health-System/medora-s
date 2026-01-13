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
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { Roles } from "../common/auth/roles.decorator";
import { OrdersService } from "./orders.service";
import { orderCreateDtoSchema, orderUpdateDtoSchema } from "@medora/shared";
import { RoleCode } from "@prisma/client";

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("encounters/:encounterId/orders")
  @Roles("RN", "PROVIDER", "LAB", "RADIOLOGY", "PHARMACY", "ADMIN")
  async create(@Param("encounterId") encounterId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const parsed = orderCreateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    return this.ordersService.create(
      encounterId,
      facilityId,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get("encounters/:encounterId/orders")
  @Roles("RN", "PROVIDER", "LAB", "RADIOLOGY", "PHARMACY", "ADMIN")
  async findByEncounter(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.ordersService.findByEncounter(
      encounterId,
      facilityId,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Patch("orders/:id")
  @Roles("RN", "PROVIDER", "LAB", "RADIOLOGY", "PHARMACY", "ADMIN")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const parsed = orderUpdateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    return this.ordersService.update(
      facilityId,
      id,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("orders/:id/cancel")
  @Roles("RN", "PROVIDER", "LAB", "RADIOLOGY", "PHARMACY", "ADMIN")
  async cancel(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.ordersService.cancel(
      facilityId,
      id,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("orders/items/:id/acknowledge")
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.ADMIN)
  async acknowledgeOrderItem(@Param("id") orderItemId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.ordersService.acknowledgeOrderItem(
      facilityId,
      orderItemId,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("orders/items/:id/start")
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.ADMIN)
  async startOrderItem(@Param("id") orderItemId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.ordersService.startOrderItem(
      facilityId,
      orderItemId,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("orders/items/:id/complete")
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY, RoleCode.ADMIN)
  async completeOrderItem(@Param("id") orderItemId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.ordersService.completeOrderItem(
      facilityId,
      orderItemId,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }
}

