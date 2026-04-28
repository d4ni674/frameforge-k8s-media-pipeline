import { DataSource } from "typeorm";

import { Job } from "@frameforge/shared";

export function createDataSource(config: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}): DataSource {
  return new DataSource({
    type: "postgres",
    host: config.host,
    port: config.port,
    username: config.user,
    password: config.password,
    database: config.database,
    entities: [Job],
    synchronize: false,
  });
}
