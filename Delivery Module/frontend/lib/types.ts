export type DeliveryFormat = "json" | "csv";
export type DeliveryType = "api" | "s3" | "webhook" | "email";
export type DeliveryStatus = "success" | "failed";

export interface ClientOption {
  id: string;
  name: string;
  email?: string | null;
  webhook_url?: string | null;
  s3_bucket?: string | null;
  created_at?: string | null;
}

export interface DeliveryJob {
  id?: string;
  client_id: string;
  data_id?: string | null;
  format: DeliveryFormat;
  delivery_type: DeliveryType;
  status: "pending" | "running" | "completed" | "failed";
  retry_count: number;
  scheduled_at?: string | null;
  created_at?: string | null;
  client?: ClientOption | null;
}

export interface ProcessedDataItem {
  id: string;
  client_id: string;
  status?: string | null;
  client?: ClientOption | null;
  payload: Record<string, unknown> | unknown[] | string | number | boolean | null;
  created_at: string;
}

export interface DeliveryLog {
  id?: string;
  client_id: string;
  data_id?: string | null;
  status: DeliveryStatus;
  format: DeliveryFormat;
  delivery_type: DeliveryType;
  response?: string | null;
  created_at: string;
  client?: ClientOption | null;
}

export interface ResearchJob {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  status?: string | null;
  input_params?: Record<string, unknown> | null;
  final_output_url?: string | null;
  priority?: number | null;
}

export interface WorldEvent {
  id: string;
  job_id?: string | null;
  timestamp: string;
  event_type: string;
  source: string;
  message?: string | null;
  payload?: unknown;
  research_job?: ResearchJob | null;
}

export interface ExtractedData {
  id: string;
  job_id?: string | null;
  created_at: string;
  source_url?: string | null;
  content?: unknown;
  confidence?: number | null;
  is_validated?: boolean | null;
  research_job?: ResearchJob | null;
}

export interface Capability {
  id: string;
  name: string;
  version?: string | null;
  is_active?: boolean | null;
  description?: string | null;
  config?: unknown;
}

export interface Stats {
  total_logs: number;
  success_count: number;
  failure_count: number;
  last_delivery_at: string | null;
}

export interface DataResponse {
  items: ProcessedDataItem[];
  count: number;
  clients: ClientOption[];
}

export interface LogsResponse {
  items: DeliveryLog[];
  count: number;
}

export interface DeliveryJobsResponse {
  items: DeliveryJob[];
  count: number;
}

export interface ResearchJobsResponse {
  items: ResearchJob[];
  count: number;
}

export interface WorldEventsResponse {
  items: WorldEvent[];
  count: number;
}

export interface ExtractedDataResponse {
  items: ExtractedData[];
  count: number;
}

export interface CapabilitiesResponse {
  items: Capability[];
  count: number;
}

export interface DashboardOverview {
  clients_count: number;
  processed_count: number;
  delivery_jobs_count: number;
  research_jobs_count: number;
  events_count: number;
  extracted_count: number;
  active_capabilities_count: number;
}

export interface DeliveryResult {
  success: boolean;
  client_id: string;
  client_name?: string | null;
  format: DeliveryFormat;
  delivery_type: DeliveryType;
  status: DeliveryStatus;
  message: string;
  record_count: number;
  job_id?: string | null;
  filename?: string | null;
  download_url?: string | null;
  s3_key?: string | null;
  webhook_status_code?: number | null;
  recipient_email?: string | null;
  provider_message_id?: string | null;
  delivered_at: string;
  preview?: unknown;
}

export interface DeliveryRequest {
  client_id: string;
  format: DeliveryFormat;
  delivery_type: DeliveryType;
  webhook_url?: string;
  recipient_email?: string;
  email_subject?: string;
}
