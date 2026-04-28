import { DataSource, Repository } from "typeorm";

import { Job, type JobStatus } from "@frameforge/shared";

export class JobRepository {
  private repo: Repository<Job>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(Job);
  }

  async findById(id: string): Promise<Job | null> {
    return this.repo.findOne({ where: { id } });
  }

  async updateStatus(id: string, status: JobStatus, updates?: Partial<Job>): Promise<void> {
    await this.repo.update(id, {
      status,
      updatedAt: new Date(),
      ...updates,
    });
  }

  async save(job: Job): Promise<void> {
    await this.repo.save(job);
  }
}
