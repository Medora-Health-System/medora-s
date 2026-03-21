import { Module } from "@nestjs/common";
import { DiagnosesController } from "./diagnoses.controller";
import { DiagnosesService } from "./diagnoses.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";

@Module({
  imports: [PrismaModule],
  controllers: [DiagnosesController],
  providers: [DiagnosesService, AuditService],
  exports: [DiagnosesService],
})
export class DiagnosesModule {}
