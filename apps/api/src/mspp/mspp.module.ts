import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { MsppController } from "./mspp.controller";
import { MsppService } from "./mspp.service";
import { MsppRolesGuard } from "./guards/mspp-roles.guard";

@Module({
  imports: [PrismaModule],
  controllers: [MsppController],
  providers: [MsppService, AuditService, MsppRolesGuard],
})
export class MsppModule {}
