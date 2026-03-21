import { Module } from "@nestjs/common";
import { WorklistsController } from "./worklists.controller";
import { WorklistsService } from "./worklists.service";
import { PrismaModule } from "../prisma/prisma.module";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [PrismaModule, OrdersModule],
  controllers: [WorklistsController],
  providers: [WorklistsService],
  exports: [WorklistsService],
})
export class WorklistsModule {}

