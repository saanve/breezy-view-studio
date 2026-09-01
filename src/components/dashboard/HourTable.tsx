import { Flame } from "lucide-react";
import { bandFor, type ForecastHour } from "@/lib/forecast";

const BAND_TEXT = {
  good: "text-aqi-good",
  satisfactory: "text-aqi-satisfactory",
  moderate: "text-aqi-moderate",
  poor: "text-aqi-poor",
  verypoor: "text-aqi-verypoor",
  severe: "text-aqi-severe",
} as const;

export function HourTable({ hours }: { hours: ForecastHour[] }) {
  return (
    <div className="max-h-[420px] overflow-auto">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-surface/95 backdrop-blur">
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2 font-medium">Hour</th>
            <th className="px-3 py-2 font-medium">PM2.5</th>
            <th className="px-3 py-2 font-medium">PM10</th>
            <th className="px-3 py-2 font-medium">O₃</th>
            <th className="px-3 py-2 font-medium">NOx</th>
            <th className="px-3 py-2 font-medium">PBL</th>
            <th className="px-3 py-2 font-medium">Inv.</th>
            <th className="px-3 py-2 font-medium">Temp</th>
            <th className="px-3 py-2 font-medium">Wind</th>
            <th className="px-3 py-2 font-medium">Fire</th>
          </tr>
        </thead>
        <tbody className="metric-value">
          {hours.map((r) => (
            <tr key={r.h} className="border-t border-border/60 hover:bg-accent/40">
              <td className="px-3 py-1.5 text-muted-foreground">T+{r.h}h</td>
              <td className={`px-3 py-1.5 font-medium ${BAND_TEXT[bandFor("pm25", r.pm25).token]}`}>
                {r.pm25}
              </td>
              <td className={`px-3 py-1.5 ${BAND_TEXT[bandFor("pm10", r.pm10).token]}`}>{r.pm10}</td>
              <td className={`px-3 py-1.5 ${BAND_TEXT[bandFor("o3", r.o3).token]}`}>{r.o3}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{r.nox}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{r.pbl} m</td>
              <td className="px-3 py-1.5 text-muted-foreground">{r.inversion}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{r.temp}°C</td>
              <td className="px-3 py-1.5 text-muted-foreground">{r.wind} m/s</td>
              <td className="px-3 py-1.5">
                {r.firePulse ? (
                  <Flame className="size-3.5 text-fire" aria-label="Upwind fire pulse" />
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
