import { Activity, AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";

import { Card } from "@/components/card";
import { Stats } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface StatsStripProps {
  stats: Stats;
}

const statCards = [
  {
    key: "total_logs",
    label: "Total Deliveries",
    icon: Activity,
  },
  {
    key: "success_count",
    label: "Success Count",
    icon: CheckCircle2,
  },
  {
    key: "failure_count",
    label: "Failure Count",
    icon: AlertTriangle,
  },
] as const;

export function StatsStrip({ stats }: StatsStripProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {statCards.map((item) => {
        const Icon = item.icon;
        const value = stats[item.key];
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
      <Card className="bg-white/90">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Last Delivery</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {formatDate(stats.last_delivery_at)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
            <Clock3 className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </div>
  );
}
