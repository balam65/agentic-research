"use client";

import { Download, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/button";
import { CapabilitiesPanel } from "@/components/capabilities-panel";
import { Card } from "@/components/card";
import { DataTable } from "@/components/data-table";
import { DeliveryControls } from "@/components/delivery-controls";
import { DeliveryJobsPanel } from "@/components/delivery-jobs-panel";
import { ExtractedDataPanel } from "@/components/extracted-data-panel";
import { LoadingSpinner } from "@/components/loading-spinner";
import { LogsPanel } from "@/components/logs-panel";
import { ResearchJobsPanel } from "@/components/research-jobs-panel";
import { SchemaOverview } from "@/components/schema-overview";
import { StatsStrip } from "@/components/stats-strip";
import { Toast, ToastState } from "@/components/toast";
import { WorldEventsPanel } from "@/components/world-events-panel";
import {
  deliverData,
  getCapabilities,
  getData,
  getDeliveryJobs,
  getExtractedData,
  getLogs,
  getOverview,
  getResearchJobs,
  getStats,
  getWorldEvents,
} from "@/lib/api";
import {
  CapabilitiesResponse,
  Capability,
  ClientOption,
  DataResponse,
  DashboardOverview,
  DeliveryJob,
  DeliveryJobsResponse,
  DeliveryFormat,
  DeliveryType,
  DeliveryResult,
  ExtractedData,
  ExtractedDataResponse,
  LogsResponse,
  ProcessedDataItem,
  ResearchJob,
  ResearchJobsResponse,
  Stats,
  WorldEvent,
  WorldEventsResponse,
} from "@/lib/types";

const EMPTY_STATS: Stats = {
  total_logs: 0,
  success_count: 0,
  failure_count: 0,
  last_delivery_at: null,
};

export default function Page() {
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedFormat, setSelectedFormat] = useState<DeliveryFormat>("json");
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<DeliveryType>("api");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [data, setData] = useState<ProcessedDataItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [logs, setLogs] = useState<LogsResponse["items"]>([]);
  const [deliveryJobs, setDeliveryJobs] = useState<DeliveryJob[]>([]);
  const [researchJobs, setResearchJobs] = useState<ResearchJob[]>([]);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [overview, setOverview] = useState<DashboardOverview>({
    clients_count: 0,
    processed_count: 0,
    delivery_jobs_count: 0,
    research_jobs_count: 0,
    events_count: 0,
    extracted_count: 0,
    active_capabilities_count: 0,
  });
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [isDelivering, startDelivery] = useTransition();
  const [isRefreshing, startRefreshing] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const effectiveClient = selectedClient === "all" ? undefined : selectedClient;

  const loadDashboard = async (clientId?: string) => {
    const [
      dataResponse,
      logsResponse,
      statsResponse,
      deliveryJobsResponse,
      researchJobsResponse,
      worldEventsResponse,
      extractedDataResponse,
      capabilitiesResponse,
      overviewResponse,
    ] = await Promise.all([
      getData(clientId),
      getLogs(clientId),
      getStats(clientId),
      getDeliveryJobs(clientId),
      getResearchJobs(),
      getWorldEvents(),
      getExtractedData(),
      getCapabilities(),
      getOverview(clientId),
    ]);

    setDashboardState(
      dataResponse,
      logsResponse,
      statsResponse,
      deliveryJobsResponse,
      researchJobsResponse,
      worldEventsResponse,
      extractedDataResponse,
      capabilitiesResponse,
      overviewResponse,
    );
  };

  const setDashboardState = (
    dataResponse: DataResponse,
    logsResponse: LogsResponse,
    statsResponse: Stats,
    deliveryJobsResponse: DeliveryJobsResponse,
    researchJobsResponse: ResearchJobsResponse,
    worldEventsResponse: WorldEventsResponse,
    extractedDataResponse: ExtractedDataResponse,
    capabilitiesResponse: CapabilitiesResponse,
    overviewResponse: DashboardOverview,
  ) => {
    setData(dataResponse.items);
    setClients(dataResponse.clients);
    setLogs(logsResponse.items);
    setDeliveryJobs(deliveryJobsResponse.items);
    setResearchJobs(researchJobsResponse.items);
    setWorldEvents(worldEventsResponse.items);
    setExtractedData(extractedDataResponse.items);
    setCapabilities(capabilitiesResponse.items);
    setOverview(overviewResponse);
    setStats(statsResponse);
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const [
          dataResponse,
          logsResponse,
          statsResponse,
          deliveryJobsResponse,
          researchJobsResponse,
          worldEventsResponse,
          extractedDataResponse,
          capabilitiesResponse,
          overviewResponse,
        ] = await Promise.all([
          getData(),
          getLogs(),
          getStats(),
          getDeliveryJobs(),
          getResearchJobs(),
          getWorldEvents(),
          getExtractedData(),
          getCapabilities(),
          getOverview(),
        ]);
        if (!active) {
          return;
        }
        setDashboardState(
          dataResponse,
          logsResponse,
          statsResponse,
          deliveryJobsResponse,
          researchJobsResponse,
          worldEventsResponse,
          extractedDataResponse,
          capabilitiesResponse,
          overviewResponse,
        );
      } catch (error) {
        if (!active) {
          return;
        }
        setToast({
          message: error instanceof Error ? error.message : "Failed to load dashboard data.",
          variant: "error",
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    startRefreshing(() => {
      loadDashboard(effectiveClient).catch((error) => {
        setToast({
          message: error instanceof Error ? error.message : "Failed to refresh dashboard data.",
          variant: "error",
        });
      });
    });
  }, [effectiveClient, loading]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const interval = window.setInterval(() => {
      loadDashboard(effectiveClient).catch((error) => {
        setToast({
          message: error instanceof Error ? error.message : "Live refresh failed.",
          variant: "error",
        });
      });
    }, 15000);

    return () => window.clearInterval(interval);
  }, [effectiveClient, loading]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const clientOptions = useMemo(
    () => [
      { label: "All clients", value: "all" },
      ...clients.map((client) => ({
        label: client.name,
        value: client.id,
      })),
    ],
    [clients],
  );

  const selectedClientName = useMemo(
    () => clients.find((client) => client.id === effectiveClient)?.name ?? effectiveClient ?? "",
    [clients, effectiveClient],
  );

  useEffect(() => {
    const clientEmail = clients.find((client) => client.id === effectiveClient)?.email ?? "";
    setRecipientEmail(clientEmail);
  }, [clients, effectiveClient]);

  const handleDeliver = () => {
    if (!effectiveClient) {
      setToast({ message: "Select a specific client before delivering.", variant: "error" });
      return;
    }

    const trimmedRecipientEmail = recipientEmail.trim();
    if (selectedDeliveryType === "email" && !trimmedRecipientEmail) {
      setToast({ message: "Enter a recipient email address before sending.", variant: "error" });
      return;
    }

    startDelivery(async () => {
      try {
        const result: DeliveryResult = await deliverData({
          client_id: effectiveClient,
          format: selectedFormat,
          delivery_type: selectedDeliveryType,
          recipient_email: trimmedRecipientEmail || undefined,
        });

        setToast({
          message:
            result.delivery_type === "api" && result.download_url
              ? `Delivery completed. Download available for ${result.client_name ?? result.client_id}.`
              : result.delivery_type === "email" && result.recipient_email
              ? `Delivery email sent to ${result.recipient_email}.`
              : result.message ?? "Delivery completed successfully.",
          variant: "success",
        });
      } catch (error) {
        setToast({
          message: error instanceof Error ? error.message : "Delivery failed.",
          variant: "error",
        });
      }
    });
  };

  const handleDownloadCsv = async () => {
    if (!effectiveClient) {
      setToast({ message: "Select a client first.", variant: "error" });
      return;
    }

    setIsDownloading(true);
    try {
      const result = await deliverData({
        client_id: effectiveClient,
        format: "csv",
        delivery_type: "api",
      });

      const downloadUrl =
        result.download_url ??
        `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://192.168.1.250:8000"}/download?client_id=${encodeURIComponent(effectiveClient)}&format=csv`;
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = result.filename ?? `${effectiveClient}-delivery.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      await loadDashboard(effectiveClient);
      setToast({
        message: `CSV generated and downloaded for ${selectedClientName}.`,
        variant: "success",
      });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "CSV download failed.",
        variant: "error",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-20">
        <Card className="w-full bg-white/90">
          <LoadingSpinner />
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">
            Output & Delivery Module
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">
            Delivery Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Review validated records, trigger downstream delivery, and watch the audit trail in one place.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            className="bg-white text-ink hover:bg-slate-100"
            loading={isRefreshing}
            onClick={() => {
              startRefreshing(() => {
                loadDashboard(effectiveClient).catch((error) => {
                  setToast({
                    message:
                      error instanceof Error ? error.message : "Refresh request failed.",
                    variant: "error",
                  });
                });
              });
            }}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            type="button"
            className="bg-accent text-white hover:bg-teal-700"
            loading={isDownloading}
            onClick={handleDownloadCsv}
            disabled={!effectiveClient}
          >
            <Download className="h-4 w-4" />
            Quick CSV
          </Button>
        </div>
      </div>

      <SchemaOverview overview={overview} />

      <div className="mt-6">
        <StatsStrip stats={stats} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-6">
          <DeliveryControls
            clientId={selectedClient}
            format={selectedFormat}
            deliveryType={selectedDeliveryType}
            recipientEmail={recipientEmail}
            clientOptions={clientOptions}
            onClientChange={setSelectedClient}
            onFormatChange={setSelectedFormat}
            onDeliveryTypeChange={setSelectedDeliveryType}
            onRecipientEmailChange={setRecipientEmail}
            onDeliver={handleDeliver}
            onDownloadCsv={handleDownloadCsv}
            isDelivering={isDelivering}
            isDownloading={isDownloading}
          />
          <Card
            title="Processed Data"
            description={`${data.length} record${data.length === 1 ? "" : "s"} ready for delivery${selectedClientName ? ` for ${selectedClientName}` : ""}.`}
            className="bg-white/90"
          >
            <DataTable items={data} />
          </Card>
        </div>

        <Card
          title="Delivery Logs"
          description="Recent attempts are logged with format, destination, and outcome."
          className="bg-white/90"
        >
          <LogsPanel logs={logs} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card
          title="Delivery Jobs"
          description="Queue and retry tracking for delivery execution."
          className="bg-white/90"
        >
          <DeliveryJobsPanel jobs={deliveryJobs} />
        </Card>
        <Card
          title="Research Jobs"
          description="Top-level research pipeline execution state."
          className="bg-white/90"
        >
          <ResearchJobsPanel jobs={researchJobs} />
        </Card>
        <Card
          title="World Events"
          description="Recent event stream from the orchestration layer."
          className="bg-white/90"
        >
          <WorldEventsPanel events={worldEvents} />
        </Card>
        <Card
          title="Extracted Data"
          description="Latest extracted rows and validation confidence."
          className="bg-white/90"
        >
          <ExtractedDataPanel items={extractedData} />
        </Card>
      </div>

      <div className="mt-6">
        <Card
          title="Capability Registry"
          description="Registered capabilities available to the research pipeline."
          className="bg-white/90"
        >
          <CapabilitiesPanel capabilities={capabilities} />
        </Card>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}
