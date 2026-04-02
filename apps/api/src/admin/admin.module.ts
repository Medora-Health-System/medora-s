import { Module } from "@nestjs/common";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";
import { AdminFacilitiesController } from "./admin-facilities.controller";
import { AdminFacilitiesService } from "./admin-facilities.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [AdminUsersController, AdminFacilitiesController],
  providers: [AdminUsersService, AdminFacilitiesService],
})
export class AdminModule {}
