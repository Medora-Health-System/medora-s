import { Module } from "@nestjs/common";
import { TrackboardController } from "./trackboard.controller";
import { EmergencyEncountersArchiveController } from "./emergency-encounters-archive.controller";
import { TrackboardService } from "./trackboard.service";
import { EmergencyEncountersArchiveService } from "./emergency-encounters-archive.service";
import { TrackboardReadAccessGuard } from "./trackboard-read-access.guard";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [TrackboardController, EmergencyEncountersArchiveController],
  providers: [TrackboardService, EmergencyEncountersArchiveService, TrackboardReadAccessGuard],
  exports: [TrackboardService, EmergencyEncountersArchiveService],
})
export class TrackboardModule {}

