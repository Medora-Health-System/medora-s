import { Global, Module } from "@nestjs/common";
import { RecentHttpErrorMetricsService } from "./recent-http-error-metrics.service";

@Global()
@Module({
  providers: [RecentHttpErrorMetricsService],
  exports: [RecentHttpErrorMetricsService],
})
export class RecentHttpErrorMetricsModule {}
