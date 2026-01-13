import { Module } from "@nestjs/common";
import { TrackboardController } from "./trackboard.controller";
import { TrackboardService } from "./trackboard.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [TrackboardController],
  providers: [TrackboardService],
  exports: [TrackboardService],
})
export class TrackboardModule {}

