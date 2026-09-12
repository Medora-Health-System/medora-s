import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuditService } from "../../common/services/audit.service";
import { AiAuditService } from "./ai-audit.service";

@Module({
  imports: [PrismaModule],
  providers: [AiAuditService, AuditService],
  exports: [AiAuditService],
})
export class AiAuditModule {}
