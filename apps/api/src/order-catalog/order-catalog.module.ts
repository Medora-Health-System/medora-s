import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MedicationCatalogModule } from "../medication-catalog/medication-catalog.module";
import { OrderCatalogController } from "./order-catalog.controller";
import { LabCatalogService } from "./lab-catalog.service";
import { ImagingCatalogService } from "./imaging-catalog.service";
import { ProcedureCatalogService } from "./procedure-catalog.service";

@Module({
  imports: [PrismaModule, MedicationCatalogModule],
  controllers: [OrderCatalogController],
  providers: [LabCatalogService, ImagingCatalogService, ProcedureCatalogService],
  exports: [LabCatalogService, ImagingCatalogService, ProcedureCatalogService],
})
export class OrderCatalogModule {}
