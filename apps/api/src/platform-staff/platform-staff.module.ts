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
import { WorkforceAccessPackageService } from "./workforce-access-package.service";
import { WorkforceAccessPackageController } from "./workforce-access-package.controller";
import { PlatformOwnerControlService } from "./platform-owner-control.service";
import { PlatformCountryScopeService } from "./platform-country-scope.service";
@Module({ imports: [PrismaModule, AdminModule, QueuesModule], controllers: [PlatformStaffController, PrivilegedActionController, PlatformOperationsController, FacilityLifecyclePreflightController, PlatformStaffAccountController, CorporateWorkforceController, WorkforceAccessPackageController], providers: [PlatformStaffService, PrivilegedActionService, GovernanceBootstrapService, FacilityLifecyclePreflightService, PlatformStaffAccountService, CorporateWorkforceService, WorkforceAccessPackageService, PlatformOwnerControlService, PlatformCountryScopeService, PlatformCapabilitiesGuard, AuditService], exports: [PlatformCapabilitiesGuard, PlatformOwnerControlService, PlatformCountryScopeService] })
export class PlatformStaffModule {}
