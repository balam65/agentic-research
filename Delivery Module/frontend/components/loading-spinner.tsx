import { LoaderCircle } from "lucide-react";

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-600">
      <LoaderCircle className="h-5 w-5 animate-spin" />
      Loading dashboard data...
    </div>
  );
}
