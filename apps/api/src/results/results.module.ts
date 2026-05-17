import { Module } from "@nestjs/common";
import { ResultsController } from "./results.controller";
import { ResultsService } from "./results.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [PrismaModule, OrdersModule],
  controllers: [ResultsController],
  providers: [ResultsService, AuditService],
  exports: [ResultsService],
})
export class ResultsModule {}

