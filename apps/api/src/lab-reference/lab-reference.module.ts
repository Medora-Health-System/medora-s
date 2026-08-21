import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { LabReferenceIntervalService } from "./lab-reference-interval.service";
import { LabReferenceController } from "./lab-reference.controller";

@Module({
  imports: [PrismaModule],
  controllers: [LabReferenceController],
  providers: [LabReferenceIntervalService],
  exports: [LabReferenceIntervalService],
})
export class LabReferenceModule {}
