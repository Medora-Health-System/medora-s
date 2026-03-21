import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { FollowUpsService } from "./follow-ups.service";
import { FollowUpsController } from "./follow-ups.controller";

@Module({
  imports: [PrismaModule],
  controllers: [FollowUpsController],
  providers: [FollowUpsService, AuditService],
  exports: [FollowUpsService],
})
export class FollowUpsModule {}
