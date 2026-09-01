/**
 * Forecast data contract shared with the coupled weather-chemistry inference API.
 *
 * The backend (/forecast?station_id=&hours=72) returns 72 autoregressive hourly
 * steps where each step's predicted PM2.5 feeds back into the next step's
 * inversion behaviour — the two-way coupling required by PS 26082.
 */

export type ForecastHour = {
  h: number;
  pm25: number;
  pm10: number;
  o3: number;
  nox: number;
  pbl: number;
  inversion: number;
  temp: number;
  wind: number;
  firePulse: boolean;
};

export type ForecastResponse = {
  station_id: string;
  hours: ForecastHour[];
  /** true when values come from the local synthetic generator, not a live API */
  synthetic?: boolean;
};

export type Station = { id: string; name: string; area: string; lat: number; lon: number };

export const STATIONS: Station[] = [
  { id: "ito", name: "ITO", area: "Central Delhi", lat: 28.6285, lon: 77.2411 },
  { id: "anand-vihar", name: "Anand Vihar", area: "East Delhi", lat: 28.6469, lon: 77.3162 },
  { id: "rk-puram", name: "R.K. Puram", area: "South West Delhi", lat: 28.5645, lon: 77.1668 },
  { id: "punjabi-bagh", name: "Punjabi Bagh", area: "West Delhi", lat: 28.6742, lon: 77.1310 },
  { id: "noida-62", name: "Noida Sector 62", area: "Gautam Buddh Nagar", lat: 28.6245, lon: 77.3565 },
  { id: "gurugram-vikas", name: "Gurugram Vikas Sadan", area: "Gurugram", lat: 28.4595, lon: 77.0266 },
];


export type Pollutant = "pm25" | "pm10" | "o3";

export const POLLUTANTS: { key: Pollutant; label: string; unit: string }[] = [
  { key: "pm25", label: "PM2.5", unit: "µg/m³" },
  { key: "pm10", label: "PM10", unit: "µg/m³" },
  { key: "o3", label: "O₃", unit: "µg/m³" },
];

/** CPCB National AQI breakpoints (24h averaging, sub-index per pollutant). */
const BREAKPOINTS: Record<Pollutant, [number, number, number, number, number, number]> = {
  pm25: [30, 60, 90, 120, 250, 380],
  pm10: [50, 100, 250, 350, 430, 510],
  o3: [50, 100, 168, 208, 748, 1000],
};

export type AqiBand = {
  label: string;
  token: "good" | "satisfactory" | "moderate" | "poor" | "verypoor" | "severe";
};

export function bandFor(pollutant: Pollutant, value: number): AqiBand {
  const bp = BREAKPOINTS[pollutant];
  if (value <= bp[0]) return { label: "Good", token: "good" };
  if (value <= bp[1]) return { label: "Satisfactory", token: "satisfactory" };
  if (value <= bp[2]) return { label: "Moderate", token: "moderate" };
  if (value <= bp[3]) return { label: "Poor", token: "poor" };
  if (value <= bp[4]) return { label: "Very Poor", token: "verypoor" };
  return { label: "Severe", token: "severe" };
}

export type Alert = {
  id: string;
  kind: "inversion" | "plume" | "exceedance";
  severity: "watch" | "warning" | "critical";
  title: string;
  detail: string;
  window: string;
};

/** Derived client-side when /alerts is unavailable; mirrors the API rule set. */
export function deriveAlerts(hours: ForecastHour[]): Alert[] {
  const alerts: Alert[] = [];
  const win = (a: number, b: number) => `T+${a}h → T+${b}h`;

  const inv = hours.filter((x) => x.inversion >= 65);
  if (inv.length) {
    const peak = inv.reduce((m, x) => (x.inversion > m.inversion ? x : m));
    alerts.push({
      id: "inversion",
      kind: "inversion",
      severity: peak.inversion >= 80 ? "critical" : "warning",
      title: "Strong nocturnal inversion",
      detail: `Inversion index peaks at ${Math.round(peak.inversion)} with PBL compressed to ${Math.round(peak.pbl)} m — pollutant trapping likely.`,
      window: win(inv[0]!.h, inv[inv.length - 1]!.h),
    });
  }

  const fire = hours.filter((x) => x.firePulse);
  if (fire.length) {
    alerts.push({
      id: "plume",
      kind: "plume",
      severity: fire.length > 8 ? "critical" : "warning",
      title: "Upwind stubble-burning plume",
      detail: `Wind-weighted fire signal from Punjab/Haryana intersects this station across ${fire.length} forecast hours.`,
      window: win(fire[0]!.h, fire[fire.length - 1]!.h),
    });
  }

  const exceed = hours.filter((x) => x.pm25 > 120);
  if (exceed.length) {
    const peak = exceed.reduce((m, x) => (x.pm25 > m.pm25 ? x : m));
    alerts.push({
      id: "exceedance",
      kind: "exceedance",
      severity: peak.pm25 > 250 ? "critical" : "warning",
      title: "PM2.5 exceedance forecast",
      detail: `Predicted PM2.5 peaks at ${Math.round(peak.pm25)} µg/m³ at T+${peak.h}h, above the CPCB 'Poor' threshold.`,
      window: win(exceed[0]!.h, exceed[exceed.length - 1]!.h),
    });
  }

  return alerts;
}

/* ------------------------------------------------------------------ */
/* Local synthetic generator — DEV ONLY. Clearly labelled in the UI as  */
/* synthetic; never presented as a traceable model output.              */
/* ------------------------------------------------------------------ */

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function syntheticForecast(stationId: string, hours = 72): ForecastResponse {
  const rand = seeded(
    [...stationId].reduce((a, c) => a + c.charCodeAt(0), 7) * 977 + 13,
  );
  const startHour = new Date().getUTCHours() + 5; // IST-ish local hour
  const out: ForecastHour[] = [];
  let pm25 = 90 + rand() * 70;

  for (let h = 0; h < hours; h++) {
    const localHour = (startHour + h) % 24;
    // Nocturnal boundary-layer collapse: deep by afternoon, shallow before dawn
    const diurnal = Math.cos(((localHour - 15) / 24) * 2 * Math.PI);
    const pbl = 900 - 520 * diurnal + (rand() - 0.5) * 90;
    const inversion = Math.max(5, Math.min(96, 52 + 34 * diurnal + (rand() - 0.5) * 12));
    const firePulse = localHour >= 17 && localHour <= 23 && rand() > 0.55;

    // Feedback: previous PM2.5 damps daytime heating -> reinforces trapping
    const trapping = (inversion / 60) * (620 / Math.max(220, pbl));
    const emission = 34 + (firePulse ? 46 : 0);
    pm25 = Math.max(18, pm25 * 0.72 + emission * trapping + (rand() - 0.5) * 14);

    out.push({
      h,
      pm25: +pm25.toFixed(1),
      pm10: +(pm25 * (1.5 + rand() * 0.35)).toFixed(1),
      o3: +Math.max(6, 44 - inversion * 0.32 + Math.max(0, -diurnal) * 26 + rand() * 8).toFixed(1),
      nox: +(28 + inversion * 0.42 + rand() * 12).toFixed(1),
      pbl: Math.round(pbl),
      inversion: +inversion.toFixed(0),
      temp: +(20 - 7 * diurnal + rand() * 1.5).toFixed(1),
      wind: +(1 + Math.max(0, -diurnal) * 2.4 + rand()).toFixed(1),
      firePulse,
    });
  }

  return { station_id: stationId, hours: out, synthetic: true };
}

export async function fetchForecast(
  endpoint: string,
  stationId: string,
  hours = 72,
): Promise<ForecastResponse> {
  const base = endpoint.trim();
  if (!base) return syntheticForecast(stationId, hours);

  const url = new URL(base, typeof window === "undefined" ? "http://localhost" : window.location.origin);
  url.searchParams.set("station_id", stationId);
  url.searchParams.set("hours", String(hours));

  const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Forecast endpoint returned ${res.status}`);
  const json = (await res.json()) as ForecastResponse;
  if (!json?.hours?.length) throw new Error("Forecast response contained no hours");
  return { ...json, synthetic: false };
}
