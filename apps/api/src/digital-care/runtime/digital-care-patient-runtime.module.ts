import { Module } from "@nestjs/common";
import { PatientPortalModule } from "../../patient-portal/public";
import { DigitalCarePortalStatusController } from "./patient-self/digital-care-portal-status.controller";

@Module({
  imports: [PatientPortalModule],
  controllers: [DigitalCarePortalStatusController],
})
export class DigitalCarePatientRuntimeModule {}
