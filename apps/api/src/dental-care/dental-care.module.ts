import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { EncountersModule } from "../encounters/encounters.module";
import { AuditService } from "../common/services/audit.service";
import { DentalCareController } from "./dental-care.controller";
import { DentalCareReadAccessGuard } from "./dental-care-read-access.guard";
import { DentalCareWorklistService } from "./dental-care-worklist.service";
import { DentalCareOdontogramService } from "./dental-care-odontogram.service";
import { DentalCareVisitRoutingService } from "./dental-care-visit-routing.service";
import { DentalCareClinicalBoardService } from "./dental-care-clinical-board.service";

@Module({
  imports: [PrismaModule, EncountersModule],
  controllers: [DentalCareController],
  providers: [
    DentalCareReadAccessGuard,
    DentalCareWorklistService,
    DentalCareOdontogramService,
    DentalCareVisitRoutingService,
    DentalCareClinicalBoardService,
    AuditService,
  ],
})
export class DentalCareModule {}
