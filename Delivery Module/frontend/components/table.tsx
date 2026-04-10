import { ReactNode } from "react";

interface TableProps {
  headers: string[];
  rows: ReactNode[][];
}

export function Table({ headers, rows }: TableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <div className="max-h-[420px] overflow-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {headers.map((header) => (
                <th key={header} className="border-b border-line px-4 py-3 font-semibold text-slate-700">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="bg-white even:bg-slate-50/60">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${rowIndex}-${cellIndex}`}
                    className="max-w-[280px] border-b border-line px-4 py-3 align-top text-slate-700"
                  >
                    <div className="whitespace-pre-wrap break-words">{cell}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
