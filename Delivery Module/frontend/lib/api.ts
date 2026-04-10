import {
  CapabilitiesResponse,
  DataResponse,
  DashboardOverview,
  DeliveryRequest,
  DeliveryJobsResponse,
  DeliveryResult,
  ExtractedDataResponse,
  LogsResponse,
  ResearchJobsResponse,
  Stats,
  WorldEventsResponse,
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://192.168.1.250:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const fallbackMessage = `Request failed with status ${response.status}`;
    try {
      const errorPayload = await response.json();
      const message = errorPayload?.detail?.detail ?? errorPayload?.detail ?? fallbackMessage;
      throw new Error(typeof message === "string" ? message : fallbackMessage);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(fallbackMessage);
    }
  }

  return response.json() as Promise<T>;
}

export function getData(clientId?: string): Promise<DataResponse> {
  const search = clientId ? `?client_id=${encodeURIComponent(clientId)}` : "";
  return request<DataResponse>(`/data${search}`);
}

export function getLogs(clientId?: string): Promise<LogsResponse> {
  const search = clientId ? `?client_id=${encodeURIComponent(clientId)}` : "";
  return request<LogsResponse>(`/logs${search}`);
}

export function getStats(clientId?: string): Promise<Stats> {
  const search = clientId ? `?client_id=${encodeURIComponent(clientId)}` : "";
  return request<Stats>(`/stats${search}`);
}

export function deliverData(payload: DeliveryRequest): Promise<DeliveryResult> {
  return request<DeliveryResult>("/deliver", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getDeliveryJobs(clientId?: string): Promise<DeliveryJobsResponse> {
  const search = clientId ? `?client_id=${encodeURIComponent(clientId)}` : "";
  return request<DeliveryJobsResponse>(`/delivery-jobs${search}`);
}

export function getResearchJobs(): Promise<ResearchJobsResponse> {
  return request<ResearchJobsResponse>("/research-jobs");
}

export function getWorldEvents(): Promise<WorldEventsResponse> {
  return request<WorldEventsResponse>("/world-events");
}

export function getExtractedData(): Promise<ExtractedDataResponse> {
  return request<ExtractedDataResponse>("/extracted-data");
}

export function getCapabilities(): Promise<CapabilitiesResponse> {
  return request<CapabilitiesResponse>("/capabilities");
}

export function getOverview(clientId?: string): Promise<DashboardOverview> {
  const search = clientId ? `?client_id=${encodeURIComponent(clientId)}` : "";
  return request<DashboardOverview>(`/overview${search}`);
}
