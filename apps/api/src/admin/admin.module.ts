import { Module } from "@nestjs/common";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";
import { AdminFacilitiesController } from "./admin-facilities.controller";
import { AdminFacilitiesService } from "./admin-facilities.service";
import { AdminMsppAccessController } from "./admin-mspp-access.controller";
import { AdminMsppAccessService } from "./admin-mspp-access.service";
import { AdminAuditController } from "./admin-audit.controller";
import { AdminAuditService } from "./admin-audit.service";
import { AdminGoLiveController } from "./admin-go-live.controller";
import { AdminBackupReadinessController } from "./admin-backup-readiness.controller";
import { AdminSystemHealthController } from "./admin-system-health.controller";
import { AdminExportMonitoringController } from "./admin-export-monitoring.controller";
import { AdminExportMonitoringService } from "./admin-export-monitoring.service";
import { BackupReadinessService } from "./backup-readiness.service";
import { SystemHealthService } from "./system-health.service";
import { GoLiveReadinessService } from "./go-live-readiness.service";
import { PrismaModule } from "../prisma/prisma.module";
import { QueuesModule } from "../queues/queues.module";
import { ReportsModule } from "../reports/reports.module";

@Module({
  imports: [PrismaModule, QueuesModule, ReportsModule],
  controllers: [
    AdminUsersController,
    AdminFacilitiesController,
    AdminMsppAccessController,
    AdminAuditController,
    AdminGoLiveController,
    AdminExportMonitoringController,
    AdminBackupReadinessController,
    AdminSystemHealthController,
  ],
  providers: [
    AdminUsersService,
    AdminFacilitiesService,
    AdminMsppAccessService,
    AdminAuditService,
    GoLiveReadinessService,
    AdminExportMonitoringService,
    BackupReadinessService,
    SystemHealthService,
  ],
})
export class AdminModule {}
