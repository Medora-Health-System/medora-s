import { Module } from "@nestjs/common";
import { EncountersController } from "./encounters.controller";
import { EncountersService } from "./encounters.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { DiagnosesModule } from "../diagnoses/diagnoses.module";

@Module({
  imports: [PrismaModule, DiagnosesModule],
  controllers: [EncountersController],
  providers: [EncountersService, AuditService],
  exports: [EncountersService],
})
export class EncountersModule {}

