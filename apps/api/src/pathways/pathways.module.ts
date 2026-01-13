import { Module } from "@nestjs/common";
import { PathwaysController } from "./pathways.controller";
import { PathwaysService } from "./pathways.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";

@Module({
  imports: [PrismaModule],
  controllers: [PathwaysController],
  providers: [PathwaysService, AuditService],
  exports: [PathwaysService],
})
export class PathwaysModule {}

