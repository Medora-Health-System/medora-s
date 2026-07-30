import { Module } from "@nestjs/common";
import { DentalCareController } from "./dental-care.controller";
import { DentalCareReadAccessGuard } from "./dental-care-read-access.guard";

@Module({
  controllers: [DentalCareController],
  providers: [DentalCareReadAccessGuard],
})
export class DentalCareModule {}
