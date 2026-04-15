import type { PipelineEvent } from '../utils/contracts.js';

/**
 * Lightweight world model port used by the pipeline/tools layer.
 * This is distinct from the full WorldModelStore used by the orchestrator.
 */
export interface WorldModelPort {
  initJob(job: { id: string; title: string; status: string; input_params: unknown; priority: number }): Promise<void>;
  updateJobStatus(jobId: string, status: string): Promise<void>;
  updateJobFinalOutput(jobId: string, outputRef: string): Promise<void>;
  registerCapabilities(capabilities: Array<{ name: string; consumes: string[]; produces: string[] }>): Promise<void>;
  writeEvent(event: PipelineEvent): Promise<void>;
  saveExtractedData(data: {
    job_id: string;
    source_url?: string;
    content: unknown;
    confidence: number;
    is_validated: boolean;
  }): Promise<void>;
  markLatestExtractedDataValidated(jobId: string): Promise<void>;
}

export class InMemoryWorldModelPort implements WorldModelPort {
  private readonly jobs = new Map<string, unknown>();
  private readonly eventLog: PipelineEvent[] = [];
  private readonly extractedData: Array<Record<string, unknown>> = [];

  async initJob(job: { id: string; title: string; status: string; input_params: unknown; priority: number }): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async updateJobStatus(jobId: string, status: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job && typeof job === 'object') {
      (job as Record<string, unknown>).status = status;
    }
  }

  async updateJobFinalOutput(jobId: string, outputRef: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job && typeof job === 'object') {
      (job as Record<string, unknown>).final_output = outputRef;
    }
  }

  async registerCapabilities(_capabilities: Array<{ name: string; consumes: string[]; produces: string[] }>): Promise<void> {
    // In-memory implementation: no-op
  }

  async writeEvent(event: PipelineEvent): Promise<void> {
    this.eventLog.push(event);
  }

  async saveExtractedData(data: { job_id: string; source_url?: string; content: unknown; confidence: number; is_validated: boolean }): Promise<void> {
    this.extractedData.push(data);
  }

  async markLatestExtractedDataValidated(jobId: string): Promise<void> {
    for (let i = this.extractedData.length - 1; i >= 0; i--) {
      if (this.extractedData[i]?.job_id === jobId) {
        (this.extractedData[i] as Record<string, unknown>).is_validated = true;
        break;
      }
    }
  }
}
