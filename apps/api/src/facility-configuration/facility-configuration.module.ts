import { Module } from "@nestjs/common";
import { AuditService } from "../common/services/audit.service";
import { PrismaModule } from "../prisma/prisma.module";
import {
  FacilityConfigurationAdminController,
  FacilityRuntimeConfigurationController,
} from "./facility-configuration.controller";
import { FacilityConfigurationService } from "./facility-configuration.service";

@Module({
  imports: [PrismaModule],
  controllers: [FacilityConfigurationAdminController, FacilityRuntimeConfigurationController],
  providers: [FacilityConfigurationService, AuditService],
  exports: [FacilityConfigurationService],
})
export class FacilityConfigurationModule {}
