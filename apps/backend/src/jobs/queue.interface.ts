/** Job queue abstraction — start in-process, swap for BullMQ later */
export interface JobQueue<TPayload> {
  enqueue(payload: TPayload): Promise<string>;
  /** Optional: poll status for a job ID */
  getStatus(jobId: string): Promise<"pending" | "running" | "completed" | "failed">;
}
