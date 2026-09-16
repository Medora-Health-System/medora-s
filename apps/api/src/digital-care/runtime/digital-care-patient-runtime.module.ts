import { Module } from "@nestjs/common";
import { FacilityConfigurationModule } from "../../facility-configuration/facility-configuration.module";
import { PatientPortalModule } from "../../patient-portal/public";
import { DigitalCareMessagesController } from "./patient-self/digital-care-messages.controller";
import { DigitalCarePortalStatusController } from "./patient-self/digital-care-portal-status.controller";

@Module({
  imports: [PatientPortalModule, FacilityConfigurationModule],
  controllers: [DigitalCarePortalStatusController, DigitalCareMessagesController],
})
export class DigitalCarePatientRuntimeModule {}