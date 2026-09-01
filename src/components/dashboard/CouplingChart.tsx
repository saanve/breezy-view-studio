import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastHour } from "@/lib/forecast";

/**
 * Visualises the two-way coupling: PBL compression drives the inversion index,
 * the inversion index traps PM2.5, and the trapped PM2.5 is fed back into the
 * next autoregressive step of the sequence model.
 */
export function CouplingChart({ hours }: { hours: ForecastHour[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={hours} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="var(--grid)" strokeDasharray="2 4" vertical={false} />
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
          yAxisId="left"
          stroke="var(--muted-foreground)"
          tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="var(--muted-foreground)"
          tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
          width={44}
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
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(v) => <span style={{ color: "var(--muted-foreground)" }}>{v}</span>}
        />
        <Bar
          yAxisId="left"
          dataKey="pbl"
          name="PBL height (m)"
          fill="var(--pbl)"
          fillOpacity={0.28}
          radius={[2, 2, 0, 0]}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="inversion"
          name="Inversion index"
          stroke="var(--inversion)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="pm25"
          name="PM2.5 (µg/m³)"
          stroke="var(--pm25)"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
