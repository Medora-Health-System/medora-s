import { Module } from "@nestjs/common";
import { RegistrationController } from "./registration.controller";
import { PatientsModule } from "../patients/patients.module";
import { EncountersModule } from "../encounters/encounters.module";

@Module({
  imports: [PatientsModule, EncountersModule],
  controllers: [RegistrationController]
})
export class RegistrationModule {}

