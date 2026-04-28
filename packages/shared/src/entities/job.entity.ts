import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

export type JobStatus = "queued" | "processing" | "done" | "failed";
export type MediaType = "image" | "video";
export type ProcessingProfile =
  | "thumbnail"
  | "resized-800"
  | "webp";

export const PROCESSING_VERSION = 1;

@Entity("jobs")
export class Job {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 20 })
  status!: JobStatus;

  @Column({ type: "varchar", length: 10 })
  mediaType!: MediaType;

  @Column({ type: "varchar", length: 50 })
  processingProfile!: ProcessingProfile;

  @Column({ type: "integer", default: PROCESSING_VERSION })
  processingVersion: number = PROCESSING_VERSION;

  @Column({ type: "varchar" })
  sourceObjectKey!: string;

  @Column({ type: "varchar", nullable: true })
  sourceHash: string | null = null;

  @Column({ type: "jsonb", nullable: true })
  outputManifest: Record<string, string> | null = null;

  @Column({ type: "integer", default: 0 })
  attemptCount: number = 0;

  @Column({ type: "text", nullable: true })
  lastError: string | null = null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  startedAt: Date | null = null;

  @Column({ type: "timestamptz", nullable: true })
  finishedAt: Date | null = null;
}