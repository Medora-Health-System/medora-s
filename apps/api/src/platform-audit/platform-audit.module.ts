import { Module } from "@nestjs/common";
import { AuditService } from "../common/services/audit.service";
import { PrismaModule } from "../prisma/prisma.module";
import { PlatformAuditController } from "./platform-audit.controller";
import { PlatformAuditService } from "./platform-audit.service";

@Module({
  imports: [PrismaModule],
  controllers: [PlatformAuditController],
  providers: [PlatformAuditService, AuditService],
})
export class PlatformAuditModule {}
