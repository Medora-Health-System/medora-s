import { Controller, Get, Patch, Param, Body, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { QueuesService } from "./queues.service";
import { RoleCode, OrderStatus } from "@prisma/client";

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Get("radiology/queue")
  @RequireRoles(RoleCode.RADIOLOGY, RoleCode.ADMIN)
  async getRadiologyQueue(@Req() req: any) {
    const facilityId = req.facilityId;
    return this.queuesService.getRadiologyQueue(facilityId);
  }

  @Get("lab/queue")
  @RequireRoles(RoleCode.LAB, RoleCode.ADMIN)
  async getLabQueue(@Req() req: any) {
    const facilityId = req.facilityId;
    return this.queuesService.getLabQueue(facilityId);
  }

  @Get("pharmacy/queue")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN)
  async getPharmacyQueue(@Req() req: any) {
    const facilityId = req.facilityId;
    return this.queuesService.getPharmacyQueue(facilityId);
  }

  @Get("billing/queue")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getBillingQueue(@Req() req: any) {
    const facilityId = req.facilityId;
    return this.queuesService.getBillingQueue(facilityId);
  }

  @Patch("orders/items/:id/status")
  @RequireRoles(RoleCode.RADIOLOGY, RoleCode.LAB, RoleCode.PHARMACY, RoleCode.ADMIN)
  async updateOrderItemStatus(
    @Param("id") id: string,
    @Body() body: { status: OrderStatus },
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    return this.queuesService.updateOrderItemStatus(facilityId, id, body.status, req.user?.userId);
  }
}

