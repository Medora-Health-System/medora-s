import { Module } from "@nestjs/common";
import { ResultsController } from "./results.controller";
import { ResultsService } from "./results.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";

@Module({
  imports: [PrismaModule],
  controllers: [ResultsController],
  providers: [ResultsService, AuditService],
  exports: [ResultsService],
})
export class ResultsModule {}

