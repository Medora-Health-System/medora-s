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
  ],
  providers: [AdminUsersService, AdminFacilitiesService, AdminMsppAccessService, AdminAuditService, GoLiveReadinessService],
})
export class AdminModule {}
