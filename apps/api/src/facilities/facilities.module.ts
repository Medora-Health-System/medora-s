import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { FacilityBedBoardController } from "./facility-bed-board.controller";
import { FacilityBedBoardService } from "./facility-bed-board.service";

@Module({
  imports: [PrismaModule],
  controllers: [FacilityBedBoardController],
  providers: [FacilityBedBoardService, AuditService],
  exports: [FacilityBedBoardService],
})
export class FacilitiesModule {}
