import { Module } from "@nestjs/common";
import { DentalCareController } from "./dental-care.controller";
import { DentalCareReadAccessGuard } from "./dental-care-read-access.guard";
import { DentalCareWorklistService } from "./dental-care-worklist.service";

@Module({
  controllers: [DentalCareController],
  providers: [DentalCareReadAccessGuard, DentalCareWorklistService],
})
export class DentalCareModule {}
