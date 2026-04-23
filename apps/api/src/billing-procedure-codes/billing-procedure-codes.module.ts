import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { BillingProcedureCodesController } from "./billing-procedure-codes.controller";
import { ProcedureCatalogService } from "./procedure-catalog.service";

@Module({
  imports: [PrismaModule],
  controllers: [BillingProcedureCodesController],
  providers: [ProcedureCatalogService],
  exports: [ProcedureCatalogService],
})
export class BillingProcedureCodesModule {}
