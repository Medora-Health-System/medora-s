import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { DentalCareController } from "./dental-care.controller";
import { DentalCareReadAccessGuard } from "./dental-care-read-access.guard";
import { DentalCareWorklistService } from "./dental-care-worklist.service";
import { DentalCareOdontogramService } from "./dental-care-odontogram.service";

@Module({
  imports: [PrismaModule],
  controllers: [DentalCareController],
  providers: [DentalCareReadAccessGuard, DentalCareWorklistService, DentalCareOdontogramService],
})
export class DentalCareModule {}
