import { Module } from "@nestjs/common";
import { ChartRoiController } from "./chart-roi.controller";
import { ChartRoiService } from "./chart-roi.service";
import { PrismaModule } from "../prisma/prisma.module";
import { EncountersModule } from "../encounters/encounters.module";
import { AuditService } from "../common/services/audit.service";

@Module({
  imports: [PrismaModule, EncountersModule],
  controllers: [ChartRoiController],
  providers: [ChartRoiService, AuditService],
})
export class RoiModule {}
