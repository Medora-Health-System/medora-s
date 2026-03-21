import { Module } from "@nestjs/common";
import { PublicHealthController } from "./public-health.controller";
import { PublicHealthService } from "./public-health.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";

@Module({
  imports: [PrismaModule],
  controllers: [PublicHealthController],
  providers: [PublicHealthService, AuditService],
  exports: [PublicHealthService],
})
export class PublicHealthModule {}
