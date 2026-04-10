import { WorldEvent } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface WorldEventsPanelProps {
  events: WorldEvent[];
}

export function WorldEventsPanel({ events }: WorldEventsPanelProps) {
  if (!events.length) {
    return <div className="text-sm text-slate-500">No world events found.</div>;
  }

  return (
    <div className="space-y-3">
      {events.slice(0, 8).map((event) => (
        <article key={event.id} className="rounded-2xl border border-line bg-white px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-ink">{event.event_type}</p>
              <p className="text-sm text-slate-600">{event.source}</p>
              {event.message ? <p className="mt-1 text-xs text-slate-500">{event.message}</p> : null}
            </div>
            <p className="text-sm text-slate-500">{formatDate(event.timestamp)}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
