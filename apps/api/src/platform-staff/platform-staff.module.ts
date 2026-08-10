import { Module } from "@nestjs/common";
import { AuditService } from "../common/services/audit.service";
import { PrismaModule } from "../prisma/prisma.module";
import { PlatformCapabilitiesGuard } from "./platform-capabilities.guard";
import { PlatformStaffController } from "./platform-staff.controller";
import { PlatformStaffService } from "./platform-staff.service";
@Module({ imports: [PrismaModule], controllers: [PlatformStaffController], providers: [PlatformStaffService, PlatformCapabilitiesGuard, AuditService], exports: [PlatformCapabilitiesGuard] })
export class PlatformStaffModule {}
