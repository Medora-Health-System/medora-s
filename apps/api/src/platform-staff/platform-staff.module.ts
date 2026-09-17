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
import { QueuesModule } from "../queues/queues.module";
import { GovernanceBootstrapService } from "./governance-bootstrap.service";
import { FacilityLifecyclePreflightService } from "./facility-lifecycle-preflight.service";
import { FacilityLifecyclePreflightController } from "./facility-lifecycle-preflight.controller";
import { PlatformStaffAccountService } from "./platform-staff-account.service";
import { PlatformStaffAccountController } from "./platform-staff-account.controller";
import { CorporateWorkforceService } from "./corporate-workforce.service";
import { CorporateWorkforceController } from "./corporate-workforce.controller";
@Module({ imports: [PrismaModule, AdminModule, QueuesModule], controllers: [PlatformStaffController, PrivilegedActionController, PlatformOperationsController, FacilityLifecyclePreflightController, PlatformStaffAccountController, CorporateWorkforceController], providers: [PlatformStaffService, PrivilegedActionService, GovernanceBootstrapService, FacilityLifecyclePreflightService, PlatformStaffAccountService, CorporateWorkforceService, PlatformCapabilitiesGuard, AuditService], exports: [PlatformCapabilitiesGuard] })
export class PlatformStaffModule {}
