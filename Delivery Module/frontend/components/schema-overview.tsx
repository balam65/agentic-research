import { Database, Layers3, Radar, ShieldCheck, Truck, Users } from "lucide-react";

import { Card } from "@/components/card";
import { DashboardOverview } from "@/lib/types";

interface SchemaOverviewProps {
  overview: DashboardOverview;
}

const items = [
  { key: "clients_count", label: "Clients", icon: Users },
  { key: "processed_count", label: "Processed Rows", icon: Database },
  { key: "delivery_jobs_count", label: "Delivery Jobs", icon: Truck },
  { key: "research_jobs_count", label: "Research Jobs", icon: Layers3 },
  { key: "events_count", label: "World Events", icon: Radar },
  { key: "active_capabilities_count", label: "Active Capabilities", icon: ShieldCheck },
] as const;

export function SchemaOverview({ overview }: SchemaOverviewProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        const value = overview[item.key];
        return (
          <Card key={item.key} className="bg-white/90">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
              </div>
              <div className="rounded-2xl bg-accentSoft p-3 text-accent">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
