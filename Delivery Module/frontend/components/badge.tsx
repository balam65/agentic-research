import { DeliveryStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BadgeProps {
  status: DeliveryStatus;
}

export function Badge({ status }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        status === "success"
          ? "bg-successSoft text-success"
          : "bg-dangerSoft text-danger",
      )}
    >
      {status}
    </span>
  );
}
