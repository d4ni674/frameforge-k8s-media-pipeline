import { Global, Module } from "@nestjs/common";

import { MqService } from "./mq.service";

@Global()
@Module({
  providers: [MqService],
  exports: [MqService],
})
export class MqModule {}