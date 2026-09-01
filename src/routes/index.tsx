import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Flame,
  Gauge,
  Layers,
  Link2,
  RefreshCw,
  Radar,
  Thermometer,
  Wind,
} from "lucide-react";

import { ForecastChart } from "@/components/dashboard/ForecastChart";
import { CouplingChart } from "@/components/dashboard/CouplingChart";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { HourTable } from "@/components/dashboard/HourTable";
import { LivePanel } from "@/components/dashboard/LivePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  POLLUTANTS,
  STATIONS,
  bandFor,
  deriveAlerts,
  fetchForecast,
  syntheticForecast,
  type Pollutant,
} from "@/lib/forecast";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Delhi NCR Air Quality Forecast — 72h PM2.5, PM10 & Ozone" },
      {
        name: "description",
        content:
          "Live and 72-hour forecast air quality for Delhi NCR: PM2.5, PM10 and ozone with boundary-layer inversion coupling and upwind stubble-burning plume alerts.",
      },
      { property: "og:title", content: "Delhi NCR Air Quality Forecast" },
      {
        property: "og:description",
        content:
          "72-hour PM2.5, PM10 and O₃ forecasts with inversion coupling and upwind fire-plume alerts across Delhi NCR stations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const BAND_TEXT = {
  good: "text-aqi-good",
  satisfactory: "text-aqi-satisfactory",
  moderate: "text-aqi-moderate",
  poor: "text-aqi-poor",
  verypoor: "text-aqi-verypoor",
  severe: "text-aqi-severe",
} as const;

function MetricCard({
  label,
  icon: Icon,
  tone,
  value,
  unit,
  sub,
  valueClass,
}: {
  label: string;
  icon: typeof Activity;
  tone: string;
  value: string | number;
  unit?: string;
  sub: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="panel panel-glow p-4">
      <div className="relative flex items-start justify-between gap-3">
        <span className="metric-value text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`icon-tile ${tone}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className={`metric-value relative mt-3 text-4xl font-semibold ${valueClass ?? ""}`}>
        {value}
        {unit && <span className="ml-1 text-sm text-muted-foreground">{unit}</span>}
      </p>
      <div className="relative mt-1.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Dashboard() {
  const [endpointDraft, setEndpointDraft] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [stationId, setStationId] = useState(STATIONS[0]!.id);
  const [horizon, setHorizon] = useState(72);
  const [active, setActive] = useState<Pollutant[]>(["pm25", "pm10", "o3"]);

  const query = useQuery({
    queryKey: ["forecast", endpoint, stationId, horizon],
    queryFn: () => fetchForecast(endpoint, stationId, horizon),
    retry: false,
  });

  const fallback = useMemo(() => syntheticForecast(stationId, horizon), [stationId, horizon]);
  const data = query.data ?? fallback;
  const usingSynthetic = data.synthetic !== false;
  const hours = data.hours.slice(0, horizon);
  const now = hours[0]!;
  const alerts = useMemo(() => deriveAlerts(hours), [hours]);

  const peak = hours.reduce((m, x) => (x.pm25 > m.pm25 ? x : m), hours[0]!);
  const minPbl = hours.reduce((m, x) => (x.pbl < m.pbl ? x : m), hours[0]!);
  const fireHours = hours.filter((x) => x.firePulse).length;
  const delta = hours[Math.min(23, hours.length - 1)]!.pm25 - now.pm25;
  const station = STATIONS.find((s) => s.id === stationId)!;
  const nowBand = bandFor("pm25", now.pm25);

  return (
    <main className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="icon-tile text-primary size-10">
              <Radar className="size-5" />
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
                Delhi NCR Air Quality Intelligence
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Live observations and a 72-hour PM2.5 · PM10 · O₃ outlook for the capital region.
              </p>
            </div>
          </div>
        </div>

        <Badge
          variant="outline"
          className={`metric-value gap-2 px-3 py-2 text-xs ${
            usingSynthetic
              ? "border-aqi-moderate/40 bg-aqi-moderate/10 text-aqi-moderate"
              : "border-aqi-good/40 bg-aqi-good/10 text-aqi-good"
          }`}
        >
          <Gauge className="size-3.5" />
          {usingSynthetic ? "Simulated forecast preview" : "Live forecast endpoint"}
        </Badge>
      </header>

      {/* Controls */}
      <section className="panel mt-6 grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-end">
        <div>
          <Label htmlFor="endpoint" className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Forecast model endpoint
          </Label>
          <div className="mt-1.5 flex gap-2">
            <Input
              id="endpoint"
              value={endpointDraft}
              onChange={(e) => setEndpointDraft(e.target.value)}
              placeholder="https://api.example.org/forecast"
              className="metric-value h-9 text-xs"
            />
            <Button size="sm" className="h-9 gap-1.5" onClick={() => setEndpoint(endpointDraft)}>
              <Link2 className="size-3.5" />
              Connect
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Monitoring station
          </Label>
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger className="mt-1.5 h-9 w-[240px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATIONS.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name} — {s.area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Horizon
          </Label>
          <Tabs
            value={String(horizon)}
            onValueChange={(v) => setHorizon(Number(v))}
            className="mt-1.5"
          >
            <TabsList className="h-9">
              {[24, 48, 72].map((h) => (
                <TabsTrigger key={h} value={String(h)} className="metric-value text-xs">
                  {h}h
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2"
          onClick={() => query.refetch()}
        >
          <RefreshCw className={`size-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </section>

      {query.isError && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {(query.error as Error).message} — showing the simulated preview instead.
        </p>
      )}

      {/* Key metrics */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={`PM2.5 now · ${station.name}`}
          icon={Activity}
          tone="text-pm25"
          value={Math.round(now.pm25)}
          unit="µg/m³"
          valueClass={BAND_TEXT[nowBand.token]}
          sub={
            <span className="flex items-center gap-1">
              <span className={BAND_TEXT[nowBand.token]}>{nowBand.label}</span>·
              {delta >= 0 ? (
                <ArrowUpRight className="size-3.5 text-aqi-poor" />
              ) : (
                <ArrowDownRight className="size-3.5 text-aqi-good" />
              )}
              {Math.abs(Math.round(delta))} µg/m³ over 24h
            </span>
          }
        />
        <MetricCard
          label="Peak PM2.5 in window"
          icon={Thermometer}
          tone="text-inversion"
          value={Math.round(peak.pm25)}
          unit="µg/m³"
          sub={`at T+${peak.h}h · inversion ${peak.inversion}`}
        />
        <MetricCard
          label="Min mixing height"
          icon={Layers}
          tone="text-pbl"
          value={minPbl.pbl}
          unit="m"
          sub={`at T+${minPbl.h}h · wind ${minPbl.wind} m/s`}
        />
        <MetricCard
          label="Upwind fire pulse hours"
          icon={Flame}
          tone="text-fire"
          value={fireHours}
          unit={`/ ${hours.length} h`}
          sub={`Satellite fire detections weighted toward ${station.name}`}
        />
      </section>

      {/* Charts */}
      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Pollutant trajectory</h2>
              <p className="text-xs text-muted-foreground">
                Hourly steps, shaded bands mark upwind fire-plume hours
              </p>
            </div>
            <div className="flex gap-1.5">
              {POLLUTANTS.map((p) => (
                <Toggle
                  key={p.key}
                  size="sm"
                  pressed={active.includes(p.key)}
                  onPressedChange={() =>
                    setActive((cur) =>
                      cur.includes(p.key) ? cur.filter((x) => x !== p.key) : [...cur, p.key],
                    )
                  }
                  className="metric-value h-8 border border-border text-xs data-[state=on]:border-primary/50 data-[state=on]:bg-primary/15"
                >
                  {p.label}
                </Toggle>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <ForecastChart hours={hours} active={active} />
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-base font-semibold">Live ground truth</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Nearest reference monitor and upwind satellite fire activity
          </p>
          <LivePanel station={station} />
          <Separator className="my-4" />
          <h3 className="text-sm font-semibold">Active alerts</h3>
          <div className="mt-3">
            <AlertsPanel alerts={alerts} />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="panel p-5">
          <h2 className="text-base font-semibold">Inversion ⇄ pollutant coupling</h2>
          <p className="text-xs text-muted-foreground">
            Mixing-height compression, inversion strength and the PM2.5 that feeds the next hourly
            step
          </p>
          <div className="mt-4">
            <CouplingChart hours={hours} />
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-base font-semibold">Meteorology now</h2>
          <p className="mb-4 text-xs text-muted-foreground">Surface state driving the forecast</p>
          <dl className="space-y-2">
            {[
              { label: "Temperature", value: `${now.temp} °C`, icon: Thermometer, tone: "text-inversion" },
              { label: "Wind speed", value: `${now.wind} m/s`, icon: Wind, tone: "text-o3" },
              { label: "Mixing height", value: `${now.pbl} m`, icon: Layers, tone: "text-pbl" },
              { label: "Inversion index", value: `${now.inversion}`, icon: Gauge, tone: "text-fire" },
              { label: "NOx", value: `${now.nox} µg/m³`, icon: Activity, tone: "text-nox" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 px-3 py-2"
              >
                <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                  <row.icon className={`size-3.5 ${row.tone}`} /> {row.label}
                </dt>
                <dd className="metric-value text-sm font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="panel mt-6 overflow-hidden">
        <div className="border-b border-border p-5">
          <h2 className="text-base font-semibold">Hourly forecast table</h2>
          <p className="text-xs text-muted-foreground">
            Values for each of the {hours.length} forecast steps
          </p>
        </div>
        <HourTable hours={hours} />
      </section>

      <footer className="metric-value mt-8 pb-4 text-[11px] leading-relaxed text-muted-foreground">
        Sources: CPCB CAAQMS (historical ground truth) · ERA5 / GFS reanalysis · NASA FIRMS
        VIIRS/MODIS active fire · WAQI (aqicn.org) live observations · OpenAQ (held for the next
        integration phase). All upstream keys stay server-side.
      </footer>
    </main>
  );
}
