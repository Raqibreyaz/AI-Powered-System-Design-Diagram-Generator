/**
 * In-process job queue — executes jobs immediately (async) in the same process.
 * Structured for easy replacement with BullMQ: just swap out enqueue() and
 * getStatus() implementations, keeping the handler logic in generation.job.ts.
 */

import { generateId } from "../utils/id.js";
import { logger } from "../utils/logger.js";
import type { JobQueue } from "./queue.interface.js";

type JobStatus = "pending" | "running" | "completed" | "failed";

interface JobRecord {
  id: string;
  status: JobStatus;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export class InProcessQueue<TPayload> implements JobQueue<TPayload> {
  private readonly jobs = new Map<string, JobRecord>();

  constructor(
    private readonly handler: (jobId: string, payload: TPayload) => Promise<void>
  ) {}

  async enqueue(payload: TPayload): Promise<string> {
    const jobId = generateId("job");
    const record: JobRecord = { id: jobId, status: "pending", createdAt: new Date() };
    this.jobs.set(jobId, record);

    // Fire and forget — caller gets the jobId to poll
    void this.run(jobId, record, payload);

    return jobId;
  }

  async getStatus(jobId: string): Promise<JobStatus> {
    return this.jobs.get(jobId)?.status ?? "failed";
  }

  private async run(jobId: string, record: JobRecord, payload: TPayload): Promise<void> {
    record.status = "running";
    try {
      await this.handler(jobId, payload);
      record.status = "completed";
      record.completedAt = new Date();
    } catch (err) {
      record.status = "failed";
      record.completedAt = new Date();
      record.error = err instanceof Error ? err.message : String(err);
      logger.error({ jobId, error: record.error }, "generation job failed");
    }
  }
}
