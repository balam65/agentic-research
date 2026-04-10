import { ResearchJob } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface ResearchJobsPanelProps {
  jobs: ResearchJob[];
}

export function ResearchJobsPanel({ jobs }: ResearchJobsPanelProps) {
  if (!jobs.length) {
    return <div className="text-sm text-slate-500">No research jobs found.</div>;
  }

  return (
    <div className="space-y-3">
      {jobs.slice(0, 8).map((job) => (
        <article key={job.id} className="rounded-2xl border border-line bg-white px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-ink">{job.title}</p>
              <p className="text-sm text-slate-600">{job.status ?? "unknown"} • Priority {job.priority ?? 0}</p>
            </div>
            <p className="text-sm text-slate-500">{formatDate(job.updated_at)}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
