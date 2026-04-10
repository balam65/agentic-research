import { DeliveryJob } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface DeliveryJobsPanelProps {
  jobs: DeliveryJob[];
}

export function DeliveryJobsPanel({ jobs }: DeliveryJobsPanelProps) {
  if (!jobs.length) {
    return <div className="text-sm text-slate-500">No delivery jobs found.</div>;
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <article key={job.id} className="rounded-2xl border border-line bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-ink">{job.client?.name ?? job.client_id}</p>
              <p className="text-sm text-slate-600">
                {job.delivery_type.toUpperCase()} • {job.format.toUpperCase()} • {job.status.toUpperCase()}
              </p>
            </div>
            <p className="text-sm text-slate-500">{formatDate(job.created_at ?? null)}</p>
          </div>
          <p className="mt-2 text-xs text-slate-500">Retries: {job.retry_count}</p>
        </article>
      ))}
    </div>
  );
}
