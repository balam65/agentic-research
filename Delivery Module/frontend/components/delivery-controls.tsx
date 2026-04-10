"use client";

import { DeliveryFormat, DeliveryType } from "@/lib/types";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { SelectField } from "@/components/select-field";

interface DeliveryControlsProps {
  clientId: string;
  format: DeliveryFormat;
  deliveryType: DeliveryType;
  recipientEmail: string;
  clientOptions: Array<{ label: string; value: string }>;
  onClientChange: (value: string) => void;
  onFormatChange: (value: DeliveryFormat) => void;
  onDeliveryTypeChange: (value: DeliveryType) => void;
  onRecipientEmailChange: (value: string) => void;
  onDeliver: () => void;
  onDownloadCsv: () => void;
  isDelivering: boolean;
  isDownloading: boolean;
}

export function DeliveryControls({
  clientId,
  format,
  deliveryType,
  recipientEmail,
  clientOptions,
  onClientChange,
  onFormatChange,
  onDeliveryTypeChange,
  onRecipientEmailChange,
  onDeliver,
  onDownloadCsv,
  isDelivering,
  isDownloading,
}: DeliveryControlsProps) {
  return (
    <Card
      title="Delivery Controls"
      description="Filter a client, select the output format, and trigger secure delivery."
      className="bg-white/90"
    >
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-3">
        <SelectField
          label="Client"
          value={clientId}
          onChange={onClientChange}
          options={clientOptions}
        />
        </div>
        <div className="md:grid md:grid-cols-2 md:gap-4 xl:col-span-4 xl:grid-cols-2">
          <div>
        <SelectField
          label="Format"
          value={format}
          onChange={(value) => onFormatChange(value as DeliveryFormat)}
          options={[
            { label: "JSON", value: "json" },
            { label: "CSV", value: "csv" },
          ]}
        />
          </div>
          <div className="mt-4 md:mt-0">
        <SelectField
          label="Delivery Type"
          value={deliveryType}
          onChange={(value) => onDeliveryTypeChange(value as DeliveryType)}
          options={[
            { label: "API", value: "api" },
            { label: "S3", value: "s3" },
            { label: "Webhook", value: "webhook" },
            { label: "Email", value: "email" },
          ]}
        />
          </div>
        </div>
        <label className="block xl:col-span-3">
          <span className="mb-2 block text-sm font-medium text-slate-700">Client Email</span>
          <input
            type="email"
            value={recipientEmail}
            onChange={(event) => onRecipientEmailChange(event.target.value)}
            placeholder="Enter the client email address, for example client.operations@example.com"
            className="w-full min-w-0 rounded-xl border border-line bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <p className="mt-2 text-xs text-slate-500">
            Used for email delivery and for notification emails when other delivery types are selected.
          </p>
        </label>
        <div className="flex items-end gap-3 xl:col-span-2">
          <Button
            type="button"
            className="flex-1"
            loading={isDelivering}
            disabled={!clientId || clientId === "all" || (deliveryType === "email" && !recipientEmail)}
            onClick={onDeliver}
          >
            Deliver Data
          </Button>
          <Button
            type="button"
            className="bg-accent text-white hover:bg-teal-700"
            loading={isDownloading}
            disabled={!clientId || clientId === "all"}
            onClick={onDownloadCsv}
          >
            Download CSV
          </Button>
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Secrets stay in the backend. The dashboard only calls the FastAPI service.
      </p>
    </Card>
  );
}
