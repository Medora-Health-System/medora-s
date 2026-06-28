import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MedicationCatalogModule } from "../medication-catalog/medication-catalog.module";
import { OrderCatalogController } from "./order-catalog.controller";
import { LabCatalogService } from "./lab-catalog.service";
import { ImagingCatalogService } from "./imaging-catalog.service";
import { ProcedureCatalogService } from "./procedure-catalog.service";
import { OrderSetCatalogResolveService } from "./order-set-catalog-resolve.service";

@Module({
  imports: [PrismaModule, MedicationCatalogModule],
  controllers: [OrderCatalogController],
  providers: [LabCatalogService, ImagingCatalogService, ProcedureCatalogService, OrderSetCatalogResolveService],
  exports: [LabCatalogService, ImagingCatalogService, ProcedureCatalogService, OrderSetCatalogResolveService],
})
export class OrderCatalogModule {}
