import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Flame,
  Layers,
  RefreshCw,
  Satellite,
  Thermometer,
  Wind,
} from "lucide-react";

import { ForecastChart } from "@/components/dashboard/ForecastChart";
import { CouplingChart } from "@/components/dashboard/CouplingChart";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { HourTable } from "@/components/dashboard/HourTable";
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
      { title: "Delhi NCR Coupled Air Quality Forecast — 72h PM2.5, PM10, O₃" },
      {
        name: "description",
        content:
          "72-hour coupled weather-chemistry forecast for Delhi NCR: PM2.5, PM10 and ozone with inversion-trapping feedback and stubble-burning plume alerts.",
      },
      { property: "og:title", content: "Delhi NCR Coupled Air Quality Forecast" },
      {
        property: "og:description",
        content:
          "72-hour PM2.5, PM10 and O₃ forecasts with boundary-layer inversion coupling and upwind fire-plume alerts for Delhi NCR stations.",
      },
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
          <p className="metric-value text-[11px] uppercase tracking-[0.22em] text-primary">
            SIH PS 26082 · Ministry of Earth Sciences / NCMRWF
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight lg:text-4xl">
            Delhi NCR Coupled Weather–Chemistry Forecast
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            72-hour autoregressive PM2.5 / PM10 / O₃ outlook with explicit inversion ⇄ pollutant
            trapping feedback and upwind stubble-burning plume signal.
          </p>
        </div>

        <div
          className={`metric-value flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
            usingSynthetic
              ? "border-aqi-moderate/40 bg-aqi-moderate/10 text-aqi-moderate"
              : "border-aqi-good/40 bg-aqi-good/10 text-aqi-good"
          }`}
        >
          <Satellite className="size-4" />
          {usingSynthetic ? "SYNTHETIC DEV DATA — not model output" : "LIVE /forecast RESPONSE"}
        </div>
      </header>

      {/* Controls */}
      <section className="panel mt-6 grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-end">
        <div>
          <label
            htmlFor="endpoint"
            className="metric-value block text-[11px] uppercase tracking-wider text-muted-foreground"
          >
            Forecast model endpoint
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="endpoint"
              value={endpointDraft}
              onChange={(e) => setEndpointDraft(e.target.value)}
              placeholder="https://api.example.org/forecast"
              className="metric-value h-9 w-full rounded-md border border-border bg-input px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-ring"
            />
            <button
              onClick={() => setEndpoint(endpointDraft)}
              className="h-9 shrink-0 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Connect
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="station"
            className="metric-value block text-[11px] uppercase tracking-wider text-muted-foreground"
          >
            CPCB station
          </label>
          <select
            id="station"
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="mt-1.5 h-9 rounded-md border border-border bg-input px-3 text-xs text-foreground outline-none focus:border-ring"
          >
            {STATIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.area}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="metric-value block text-[11px] uppercase tracking-wider text-muted-foreground">
            Horizon
          </span>
          <div className="mt-1.5 flex overflow-hidden rounded-md border border-border">
            {[24, 48, 72].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`metric-value px-3 py-2 text-xs transition-colors ${
                  horizon === h
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => query.refetch()}
          className="flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <RefreshCw className={`size-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </section>

      {query.isError && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {(query.error as Error).message} — showing synthetic dev data instead.
        </p>
      )}

      {/* Key metrics */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="metric-value text-[11px] uppercase tracking-wider text-muted-foreground">
              PM2.5 now · {station.name}
            </span>
            <Activity className="size-4 text-pm25" />
          </div>
          <p className={`metric-value mt-3 text-4xl font-semibold ${BAND_TEXT[nowBand.token]}`}>
            {Math.round(now.pm25)}
            <span className="ml-1 text-sm text-muted-foreground">µg/m³</span>
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <span className={BAND_TEXT[nowBand.token]}>{nowBand.label}</span>·
            {delta >= 0 ? (
              <ArrowUpRight className="size-3.5 text-aqi-poor" />
            ) : (
              <ArrowDownRight className="size-3.5 text-aqi-good" />
            )}
            {Math.abs(Math.round(delta))} µg/m³ over 24h
          </p>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="metric-value text-[11px] uppercase tracking-wider text-muted-foreground">
              Peak PM2.5 in window
            </span>
            <Thermometer className="size-4 text-inversion" />
          </div>
          <p className="metric-value mt-3 text-4xl font-semibold">
            {Math.round(peak.pm25)}
            <span className="ml-1 text-sm text-muted-foreground">µg/m³</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            at T+{peak.h}h · inversion {peak.inversion}
          </p>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="metric-value text-[11px] uppercase tracking-wider text-muted-foreground">
              Min PBL height
            </span>
            <Layers className="size-4 text-pbl" />
          </div>
          <p className="metric-value mt-3 text-4xl font-semibold">
            {minPbl.pbl}
            <span className="ml-1 text-sm text-muted-foreground">m</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            at T+{minPbl.h}h · wind {minPbl.wind} m/s
          </p>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="metric-value text-[11px] uppercase tracking-wider text-muted-foreground">
              Upwind fire pulse hours
            </span>
            <Flame className="size-4 text-fire" />
          </div>
          <p className="metric-value mt-3 text-4xl font-semibold">
            {fireHours}
            <span className="ml-1 text-sm text-muted-foreground">/ {hours.length} h</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            VIIRS/MODIS detections weighted toward {station.name}
          </p>
        </div>
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
              {POLLUTANTS.map((p) => {
                const on = active.includes(p.key);
                return (
                  <button
                    key={p.key}
                    onClick={() =>
                      setActive((cur) =>
                        cur.includes(p.key)
                          ? cur.filter((x) => x !== p.key)
                          : [...cur, p.key],
                      )
                    }
                    className={`metric-value rounded-md border px-2.5 py-1 text-xs transition-colors ${
                      on
                        ? "border-primary/50 bg-primary/15 text-foreground"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4">
            <ForecastChart hours={hours} active={active} />
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-base font-semibold">Derived alerts</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Inversion, plume and CPCB exceedance triggers
          </p>
          <AlertsPanel alerts={alerts} />
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="panel p-5">
          <h2 className="text-base font-semibold">Inversion ⇄ pollutant coupling</h2>
          <p className="text-xs text-muted-foreground">
            Boundary-layer compression, inversion index and the PM2.5 that feeds back into the next
            autoregressive step
          </p>
          <div className="mt-4">
            <CouplingChart hours={hours} />
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-base font-semibold">Meteorology now</h2>
          <p className="mb-4 text-xs text-muted-foreground">Reanalysis-driven surface state</p>
          <dl className="space-y-3">
            {[
              { label: "Temperature", value: `${now.temp} °C`, icon: Thermometer },
              { label: "Wind speed", value: `${now.wind} m/s`, icon: Wind },
              { label: "PBL height", value: `${now.pbl} m`, icon: Layers },
              { label: "Inversion index", value: `${now.inversion}`, icon: Activity },
              { label: "NOx", value: `${now.nox} µg/m³`, icon: Activity },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0"
              >
                <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                  <row.icon className="size-3.5" /> {row.label}
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
            Exact values returned by the inference API for each of the {hours.length} steps
          </p>
        </div>
        <HourTable hours={hours} />
      </section>

      <footer className="metric-value mt-8 pb-4 text-[11px] leading-relaxed text-muted-foreground">
        Sources: CPCB CAAQMS (ground truth) · ERA5 / GFS reanalysis (met fields) · NASA FIRMS
        VIIRS/MODIS (fire) · WAQI &amp; OpenWeatherMap (supplementary). All upstream keys stay
        server-side; this dashboard only reads the configured /forecast endpoint.
      </footer>
    </main>
  );
}
