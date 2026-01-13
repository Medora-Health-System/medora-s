import { Module } from "@nestjs/common";
import { QueuesController } from "./queues.controller";
import { QueuesService } from "./queues.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [QueuesController],
  providers: [QueuesService],
  exports: [QueuesService]
})
export class QueuesModule {}

