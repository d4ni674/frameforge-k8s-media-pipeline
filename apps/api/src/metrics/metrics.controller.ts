import { Controller, Get, Res } from "@nestjs/common";
import { Response } from "express";

import { Public } from "../auth";
import { METRICS_REGISTRY } from "../metrics";

@Controller("metrics")
export class MetricsController {
  @Get()
  @Public()
  async getMetrics(@Res() res: Response): Promise<void> {
    res.set("Content-Type", METRICS_REGISTRY.contentType);
    res.end(await METRICS_REGISTRY.metrics());
  }
}
