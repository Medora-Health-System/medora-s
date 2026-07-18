import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { MedicationEvidenceGovernanceController } from "./medication-evidence-governance.controller";
import { MedicationEvidenceGovernanceHttpService } from "./medication-evidence-governance.http-service";

@Module({
  imports: [PrismaModule],
  controllers: [MedicationEvidenceGovernanceController],
  providers: [MedicationEvidenceGovernanceHttpService],
  exports: [MedicationEvidenceGovernanceHttpService],
})
export class MedicationEvidenceGovernanceModule {}
