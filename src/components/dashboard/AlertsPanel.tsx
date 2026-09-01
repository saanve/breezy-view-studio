import { AlertTriangle, Flame, Layers, Waves } from "lucide-react";
import type { Alert } from "@/lib/forecast";

const ICON = {
  inversion: Layers,
  plume: Flame,
  exceedance: Waves,
} as const;

const SEVERITY: Record<Alert["severity"], string> = {
  watch: "text-aqi-moderate border-aqi-moderate/40 bg-aqi-moderate/10",
  warning: "text-aqi-poor border-aqi-poor/40 bg-aqi-poor/10",
  critical: "text-aqi-severe border-aqi-severe/50 bg-aqi-severe/10",
};

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No inversion, plume, or exceedance triggers in the current 72-hour window.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {alerts.map((a) => {
        const Icon = ICON[a.kind] ?? AlertTriangle;
        return (
          <li key={a.id} className={`rounded-md border p-3 ${SEVERITY[a.severity]}`}>
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{a.title}</span>
                  <span className="metric-value rounded border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {a.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.detail}</p>
                <p className="metric-value mt-1.5 text-[11px] text-muted-foreground">{a.window}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
