import { Module } from "@nestjs/common";
import { AuditService } from "../common/services/audit.service";
import { PrismaModule } from "../prisma/prisma.module";
import {
  FacilityConfigurationAdminController,
  FacilityRuntimeConfigurationController,
} from "./facility-configuration.controller";
import { FacilityConfigurationEvents } from "./facility-configuration.events";
import { FacilityConfigurationRuntimeCache } from "./facility-configuration.runtime-cache";
import { FacilityConfigurationService } from "./facility-configuration.service";

@Module({
  imports: [PrismaModule],
  controllers: [FacilityConfigurationAdminController, FacilityRuntimeConfigurationController],
  providers: [
    FacilityConfigurationService,
    FacilityConfigurationRuntimeCache,
    FacilityConfigurationEvents,
    AuditService,
  ],
  exports: [FacilityConfigurationService, FacilityConfigurationRuntimeCache, FacilityConfigurationEvents],
})
export class FacilityConfigurationModule {}
