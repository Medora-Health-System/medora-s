import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { RxNormReviewController } from "./rxnorm-review.controller";
import { RxNormReviewService } from "./rxnorm-review.service";

@Module({
  imports: [PrismaModule],
  controllers: [RxNormReviewController],
  providers: [RxNormReviewService],
  exports: [RxNormReviewService],
})
export class RxNormReviewModule {}
