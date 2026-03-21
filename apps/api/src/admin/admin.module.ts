import { Module } from "@nestjs/common";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
})
export class AdminModule {}
