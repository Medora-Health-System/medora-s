import { Module } from "@nestjs/common";
import { TrackboardController } from "./trackboard.controller";
import { TrackboardService } from "./trackboard.service";
import { TrackboardReadAccessGuard } from "./trackboard-read-access.guard";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [TrackboardController],
  providers: [TrackboardService, TrackboardReadAccessGuard],
  exports: [TrackboardService],
})
export class TrackboardModule {}

