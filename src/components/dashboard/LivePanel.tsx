import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CircleDot, Droplets, Flame, Gauge, Thermometer, Wind } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getLiveObservation, getUpwindFires } from "@/lib/live.functions";
import type { Station } from "@/lib/forecast";

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wind;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 px-3 py-2">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </span>
      <span className="metric-value text-sm font-medium">{value}</span>
    </div>
  );
}

export function LivePanel({ station }: { station: Station }) {
  const obsFn = useServerFn(getLiveObservation);
  const fireFn = useServerFn(getUpwindFires);

  const obs = useQuery({
    queryKey: ["waqi", station.id],
    queryFn: () => obsFn({ data: { lat: station.lat, lon: station.lon } }),
    staleTime: 5 * 60_000,
  });
  const fires = useQuery({
    queryKey: ["firms"],
    queryFn: () => fireFn({ data: undefined }),
    staleTime: 15 * 60_000,
  });

  const o = obs.data;
  const f = fires.data;
  const n = (v?: number, unit = "") => (v == null ? "—" : `${v}${unit}`);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className="border-aqi-good/40 bg-aqi-good/10 text-aqi-good"
        >
          <CircleDot className="mr-1 size-3 animate-pulse" />
          {o?.source === "WAQI" ? "WAQI live" : "WAQI offline"}
        </Badge>
        <Badge variant="outline" className="border-fire/40 bg-fire/10 text-fire">
          <Flame className="mr-1 size-3" />
          {f?.source === "FIRMS" ? `FIRMS ${f.count ?? 0} fires / 24h` : "FIRMS offline"}
        </Badge>
      </div>

      {obs.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-2">
          <Row icon={Gauge} label="Observed AQI" value={n(o?.aqi)} />
          <Row icon={CircleDot} label="PM2.5 (obs)" value={n(o?.pm25)} />
          <Row icon={CircleDot} label="PM10 (obs)" value={n(o?.pm10)} />
          <Row icon={Thermometer} label="Temperature" value={n(o?.temp, " °C")} />
          <Row icon={Wind} label="Wind" value={n(o?.wind, " m/s")} />
          <Row icon={Droplets} label="Humidity" value={n(o?.humidity, " %")} />
          <Row icon={Flame} label="Upwind mean FRP" value={n(f?.meanFrp, " MW")} />
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {o?.stationName ? `Nearest reference: ${o.stationName}. ` : ""}
        {o?.updatedAt ? `Updated ${new Date(o.updatedAt).toLocaleString()}.` : ""}
        {o?.error ? `WAQI: ${o.error}. ` : ""}
        {f?.error ? `FIRMS: ${f.error}.` : ""}
      </p>
    </div>
  );
}
