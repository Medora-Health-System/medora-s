import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { PharmacyDispenseController } from "./pharmacy-dispense.controller";
import { PharmacyDispenseService } from "./pharmacy-dispense.service";
import { FacilityConfigurationModule } from "../facility-configuration/facility-configuration.module";

@Module({
  imports: [PrismaModule, FacilityConfigurationModule],
  controllers: [PharmacyDispenseController],
  providers: [PharmacyDispenseService],
})
export class PharmacyDispenseModule {}
