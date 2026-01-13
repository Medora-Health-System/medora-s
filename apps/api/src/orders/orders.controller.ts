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
import { OrdersService } from "./orders.service";
import { orderCreateDtoSchema, orderUpdateDtoSchema } from "@medora/shared";

@Controller()
@UseGuards(AuthGuard("jwt"))
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("encounters/:encounterId/orders")
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
}

