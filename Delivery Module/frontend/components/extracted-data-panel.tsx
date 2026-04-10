import { ExtractedData } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface ExtractedDataPanelProps {
  items: ExtractedData[];
}

export function ExtractedDataPanel({ items }: ExtractedDataPanelProps) {
  if (!items.length) {
    return <div className="text-sm text-slate-500">No extracted data rows found.</div>;
  }

  return (
    <div className="space-y-3">
      {items.slice(0, 8).map((item) => (
        <article key={item.id} className="rounded-2xl border border-line bg-white px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-ink">{item.source_url ?? "Unknown source"}</p>
              <p className="text-sm text-slate-600">
                Confidence {item.confidence ?? 0} • {item.is_validated ? "Validated" : "Pending validation"}
              </p>
            </div>
            <p className="text-sm text-slate-500">{formatDate(item.created_at)}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
