import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MedicationCatalogController } from "./medication-catalog.controller";
import { MedicationCatalogService } from "./medication-catalog.service";

@Module({
  imports: [PrismaModule],
  controllers: [MedicationCatalogController],
  providers: [MedicationCatalogService],
  exports: [MedicationCatalogService],
})
export class MedicationCatalogModule {}
