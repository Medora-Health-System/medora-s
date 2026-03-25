import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MedicationAdministrationController } from "./medication-administration.controller";
import { MedicationAdministrationService } from "./medication-administration.service";

@Module({
  imports: [PrismaModule],
  controllers: [MedicationAdministrationController],
  providers: [MedicationAdministrationService],
})
export class MedicationAdministrationModule {}
