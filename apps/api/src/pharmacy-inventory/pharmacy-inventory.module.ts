import { Module } from "@nestjs/common";
import { PharmacyInventoryController } from "./pharmacy-inventory.controller";
import { PharmacyInventoryService } from "./pharmacy-inventory.service";
import { PrismaModule } from "../prisma/prisma.module";
import { MedicationCatalogModule } from "../medication-catalog/medication-catalog.module";
import { AuditService } from "../common/services/audit.service";

@Module({
  imports: [PrismaModule, MedicationCatalogModule],
  controllers: [PharmacyInventoryController],
  providers: [PharmacyInventoryService, AuditService],
})
export class PharmacyInventoryModule {}
