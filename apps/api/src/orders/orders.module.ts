import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";

@Module({
  imports: [PrismaModule],
  controllers: [OrdersController],
  providers: [OrdersService, AuditService],
})
export class OrdersModule {}

