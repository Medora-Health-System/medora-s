import { Module } from "@nestjs/common";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";
import { AdminFacilitiesController } from "./admin-facilities.controller";
import { AdminFacilitiesService } from "./admin-facilities.service";
import { AdminMsppAccessController } from "./admin-mspp-access.controller";
import { AdminMsppAccessService } from "./admin-mspp-access.service";
import { PrismaModule } from "../prisma/prisma.module";
import { QueuesModule } from "../queues/queues.module";

@Module({
  imports: [PrismaModule, QueuesModule],
  controllers: [AdminUsersController, AdminFacilitiesController, AdminMsppAccessController],
  providers: [AdminUsersService, AdminFacilitiesService, AdminMsppAccessService],
})
export class AdminModule {}
