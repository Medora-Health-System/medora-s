import { Module } from "@nestjs/common";
import { DiagnosesController } from "./diagnoses.controller";
import { DiagnosesService } from "./diagnoses.service";
import { Icd10CatalogService } from "./icd10-catalog.service";
import { Icd10TerminologyService } from "./icd10-terminology.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";

@Module({
  imports: [PrismaModule],
  controllers: [DiagnosesController],
  providers: [DiagnosesService, Icd10CatalogService, Icd10TerminologyService, AuditService],
  exports: [DiagnosesService, Icd10CatalogService, Icd10TerminologyService],
})
export class DiagnosesModule {}
