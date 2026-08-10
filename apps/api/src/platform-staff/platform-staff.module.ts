import { Module } from "@nestjs/common";
import { AuditService } from "../common/services/audit.service";
import { PrismaModule } from "../prisma/prisma.module";
import { PlatformCapabilitiesGuard } from "./platform-capabilities.guard";
import { PlatformStaffController } from "./platform-staff.controller";
import { PlatformStaffService } from "./platform-staff.service";
import { PrivilegedActionController } from "./privileged-action.controller";
import { PrivilegedActionService } from "./privileged-action.service";
import { PlatformOperationsController } from "./platform-operations.controller";
import { AdminModule } from "../admin/admin.module";
@Module({ imports: [PrismaModule, AdminModule], controllers: [PlatformStaffController, PrivilegedActionController, PlatformOperationsController], providers: [PlatformStaffService, PrivilegedActionService, PlatformCapabilitiesGuard, AuditService], exports: [PlatformCapabilitiesGuard] })
export class PlatformStaffModule {}
