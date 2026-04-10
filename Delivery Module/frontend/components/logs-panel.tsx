import { Badge } from "@/components/badge";
import { DeliveryLog } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface LogsPanelProps {
  logs: DeliveryLog[];
}

export function LogsPanel({ logs }: LogsPanelProps) {
  if (!logs.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white/50 p-10 text-center text-sm text-slate-500">
        Delivery activity will appear here after the first run.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <article
          key={`${log.id ?? log.created_at}-${log.client_id}`}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <p className="font-semibold text-ink">{log.client?.name ?? log.client_id}</p>
              <Badge status={log.status} />
            </div>
            <p className="text-sm text-slate-600">
              {log.delivery_type.toUpperCase()} • {log.format.toUpperCase()}
            </p>
            {log.response ? (
              <p className="text-xs text-slate-500">{log.response}</p>
            ) : null}
          </div>
          <p className="text-sm text-slate-500">{formatDate(log.created_at)}</p>
        </article>
      ))}
    </div>
  );
}
