import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, description, children, className }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-xl2 border border-line bg-panel p-5 shadow-soft",
        className,
      )}
    >
      {title ? <h2 className="text-lg font-semibold text-ink">{title}</h2> : null}
      {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      <div className={title || description ? "mt-5" : ""}>{children}</div>
    </section>
  );
}
