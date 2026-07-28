import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TrackboardModule } from "../trackboard/trackboard.module";
import { ClinicCareController } from "./clinic-care.controller";
import { ClinicCareService } from "./clinic-care.service";
import { ClinicCareReadAccessGuard } from "./clinic-care-read-access.guard";

@Module({
  imports: [PrismaModule, TrackboardModule],
  controllers: [ClinicCareController],
  providers: [ClinicCareService, ClinicCareReadAccessGuard],
  exports: [ClinicCareService],
})
export class ClinicCareModule {}
