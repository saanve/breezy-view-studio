import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastHour, Pollutant } from "@/lib/forecast";

const SERIES: Record<Pollutant, { label: string; color: string }> = {
  pm25: { label: "PM2.5", color: "var(--pm25)" },
  pm10: { label: "PM10", color: "var(--pm10)" },
  o3: { label: "O₃", color: "var(--o3)" },
};

function firePulseBands(hours: ForecastHour[]) {
  const bands: { from: number; to: number }[] = [];
  let start: number | null = null;
  hours.forEach((row, i) => {
    if (row.firePulse && start === null) start = row.h;
    const ends = !row.firePulse || i === hours.length - 1;
    if (start !== null && ends) {
      bands.push({ from: start, to: row.h });
      start = null;
    }
  });
  return bands;
}

export function ForecastChart({
  hours,
  active,
}: {
  hours: ForecastHour[];
  active: Pollutant[];
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={hours} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {(Object.keys(SERIES) as Pollutant[]).map((k) => (
            <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES[k].color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={SERIES[k].color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="var(--grid)" strokeDasharray="2 4" vertical={false} />
        {firePulseBands(hours).map((b, i) => (
          <ReferenceArea
            key={i}
            x1={b.from}
            x2={b.to}
            fill="var(--fire)"
            fillOpacity={0.1}
            stroke="var(--fire)"
            strokeOpacity={0.25}
          />
        ))}
        <XAxis
          dataKey="h"
          tickFormatter={(v) => `+${v}h`}
          stroke="var(--muted-foreground)"
          tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
          interval={5}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
          width={52}
          label={undefined}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            fontFamily: "var(--font-mono)",
          }}
          labelFormatter={(v) => `T+${v}h`}
          formatter={(value: number, name: string) => [`${value} µg/m³`, name]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(v) => <span style={{ color: "var(--muted-foreground)" }}>{v}</span>}
        />
        {active.map((k) => (
          <Area
            key={k}
            type="monotone"
            dataKey={k}
            name={SERIES[k].label}
            stroke={SERIES[k].color}
            fill={`url(#grad-${k})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
        <Line type="monotone" dataKey="__none" stroke="none" legendType="none" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
