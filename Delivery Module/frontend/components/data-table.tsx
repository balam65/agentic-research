import { ProcessedDataItem } from "@/lib/types";
import { flattenPayload, formatDate } from "@/lib/utils";
import { Table } from "@/components/table";

interface DataTableProps {
  items: ProcessedDataItem[];
}

export function DataTable({ items }: DataTableProps) {
  const rows = items.map((item) => ({
    id: item.id,
    client_id: item.client_id,
    client_name: item.client?.name ?? "—",
    status: item.status ?? "—",
    created_at: formatDate(item.created_at),
    ...flattenPayload(item.payload),
  }));

  const columns = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white/50 p-10 text-center text-sm text-slate-500">
        No processed data found for the current filter.
      </div>
    );
  }

  const tableRows = rows.map((row) =>
    columns.map((column) => row[column as keyof typeof row] ?? "—"),
  );

  return (
    <Table headers={columns} rows={tableRows} />
  );
}
