import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { MedicationRemediationController } from "./medication-remediation.controller";
import { MedicationRemediationHttpService } from "./medication-remediation.http-service";

/**
 * Phase 15 Part 2B — remediation operational API.
 * Certification deferred to Part 2C.
 */
@Module({
  imports: [PrismaModule],
  controllers: [MedicationRemediationController],
  providers: [MedicationRemediationHttpService],
  exports: [MedicationRemediationHttpService],
})
export class MedicationRemediationModule {}
