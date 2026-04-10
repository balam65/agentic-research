import { Capability } from "@/lib/types";

interface CapabilitiesPanelProps {
  capabilities: Capability[];
}

export function CapabilitiesPanel({ capabilities }: CapabilitiesPanelProps) {
  if (!capabilities.length) {
    return <div className="text-sm text-slate-500">No capabilities registered.</div>;
  }

  return (
    <div className="space-y-3">
      {capabilities.map((capability) => (
        <article key={capability.id} className="rounded-2xl border border-line bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-ink">{capability.name}</p>
              <p className="text-sm text-slate-600">
                {capability.version ?? "1.0.0"} • {capability.is_active ? "Active" : "Inactive"}
              </p>
              {capability.description ? (
                <p className="mt-1 text-xs text-slate-500">{capability.description}</p>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
