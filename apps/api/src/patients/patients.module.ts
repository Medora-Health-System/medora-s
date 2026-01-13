import { Module } from "@nestjs/common";
import { PatientsController } from "./patients.controller";
import { PatientsService } from "./patients.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { EncountersModule } from "../encounters/encounters.module";

@Module({
  imports: [PrismaModule, EncountersModule],
  controllers: [PatientsController],
  providers: [PatientsService, AuditService],
})
export class PatientsModule {}

