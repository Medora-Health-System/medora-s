import { Module } from "@nestjs/common";
import { MedicationBatchController } from "./medication-batch.controller";
import { MedicationBatchHttpService } from "./medication-batch.http-service";

@Module({
  controllers: [MedicationBatchController],
  providers: [MedicationBatchHttpService],
  exports: [MedicationBatchHttpService],
})
export class MedicationBatchModule {}
