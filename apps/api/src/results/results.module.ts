import { Module } from "@nestjs/common";
import { ResultsController } from "./results.controller";
import { ResultsService } from "./results.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { OrdersModule } from "../orders/orders.module";
import { LabReferenceModule } from "../lab-reference/lab-reference.module";

@Module({
  imports: [PrismaModule, OrdersModule, LabReferenceModule],
  controllers: [ResultsController],
  providers: [ResultsService, AuditService],
  exports: [ResultsService],
})
export class ResultsModule {}

