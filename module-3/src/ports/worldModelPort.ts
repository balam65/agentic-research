import type { CapabilityService, PipelineEvent, PipelineInput } from "../types/contracts";

export type ResearchJobStatus = "pending" | "running" | "hitl_alert" | "completed" | "failed";

export interface ResearchJobRecord {
  id: string;
  title: string;
  status?: ResearchJobStatus;
  input_params: PipelineInput;
  priority?: number;
}

export interface ExtractedDataRecord {
  job_id: string;
  source_url?: string;
  content: unknown;
  confidence: number;
  is_validated?: boolean;
}

export interface WorldModelPort {
  initJob(record: ResearchJobRecord): Promise<void>;
  updateJobStatus(jobId: string, status: ResearchJobStatus): Promise<void>;
  updateJobFinalOutput(jobId: string, finalOutputUrl: string): Promise<void>;
  saveExtractedData(record: ExtractedDataRecord): Promise<void>;
  markLatestExtractedDataValidated(jobId: string): Promise<void>;
  registerCapabilities(capabilities: CapabilityService[]): Promise<void>;
  writeEvent(event: PipelineEvent): Promise<void>;
  readState<T = unknown>(key: string): Promise<T | undefined>;
  writeState(key: string, value: unknown): Promise<void>;
}

export class InMemoryWorldModelPort implements WorldModelPort {
  private readonly events: PipelineEvent[] = [];
  private readonly state = new Map<string, unknown>();
  private readonly jobs = new Map<string, ResearchJobRecord & { final_output_url?: string }>();
  private readonly extractedData: Array<ExtractedDataRecord & { id: string }> = [];
  private readonly capabilities = new Map<string, CapabilityService>();

  async initJob(record: ResearchJobRecord): Promise<void> {
    this.jobs.set(record.id, {
      ...record,
      status: record.status ?? "pending"
    });
  }

  async updateJobStatus(jobId: string, status: ResearchJobStatus): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    this.jobs.set(jobId, {
      ...job,
      status
    });
  }

  async updateJobFinalOutput(jobId: string, finalOutputUrl: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    this.jobs.set(jobId, {
      ...job,
      final_output_url: finalOutputUrl
    });
  }

  async saveExtractedData(record: ExtractedDataRecord): Promise<void> {
    this.extractedData.push({
      id: `${record.job_id}-${this.extractedData.length + 1}`,
      ...record,
      is_validated: record.is_validated ?? false
    });
  }

  async markLatestExtractedDataValidated(jobId: string): Promise<void> {
    for (let index = this.extractedData.length - 1; index >= 0; index -= 1) {
      const row = this.extractedData[index];
      if (row.job_id === jobId) {
        row.is_validated = true;
        break;
      }
    }
  }

  async registerCapabilities(capabilities: CapabilityService[]): Promise<void> {
    for (const capability of capabilities) {
      this.capabilities.set(capability.name, capability);
    }
  }

  async writeEvent(event: PipelineEvent): Promise<void> {
    this.events.push({
      ...event,
      payload: { ...event.payload }
    });
  }

  async readState<T = unknown>(key: string): Promise<T | undefined> {
    return this.state.get(key) as T | undefined;
  }

  async writeState(key: string, value: unknown): Promise<void> {
    this.state.set(key, value);
  }

  getEvents(): PipelineEvent[] {
    return this.events.map((event) => ({
      ...event,
      payload: { ...event.payload }
    }));
  }

  clear(): void {
    this.events.length = 0;
    this.state.clear();
    this.jobs.clear();
    this.extractedData.length = 0;
    this.capabilities.clear();
  }

  getJobs(): Array<ResearchJobRecord & { final_output_url?: string }> {
    return Array.from(this.jobs.values()).map((job) => ({
      ...job
    }));
  }

  getExtractedData(): Array<ExtractedDataRecord & { id: string }> {
    return this.extractedData.map((row) => ({
      ...row
    }));
  }

  getCapabilities(): CapabilityService[] {
    return Array.from(this.capabilities.values());
  }
}
