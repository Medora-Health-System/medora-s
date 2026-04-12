import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { PublicHealthModule } from "../public-health/public-health.module";
import { MsppController } from "./mspp.controller";
import { MsppPublicHealthNationalController } from "./mspp-public-health-national.controller";
import { MsppService } from "./mspp.service";
import { MsppRolesGuard } from "./guards/mspp-roles.guard";

@Module({
  imports: [PrismaModule, PublicHealthModule],
  controllers: [MsppController, MsppPublicHealthNationalController],
  providers: [MsppService, AuditService, MsppRolesGuard],
})
export class MsppModule {}
