/**
 * Live observation server functions.
 *
 * All upstream API keys (WAQI, NASA FIRMS, OpenAQ) stay server-side; the
 * browser only ever sees the normalised payloads returned below.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const stationInput = z.object({
  lat: z.number(),
  lon: z.number(),
});

export type LiveObservation = {
  source: "WAQI" | "unavailable";
  stationName?: string;
  aqi?: number;
  pm25?: number;
  pm10?: number;
  o3?: number;
  no2?: number;
  temp?: number;
  wind?: number;
  humidity?: number;
  updatedAt?: string;
  error?: string;
};

export const getLiveObservation = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => stationInput.parse(d))
  .handler(async ({ data }): Promise<LiveObservation> => {
    const token = process.env["WAQI_TOKEN"];
    if (!token) return { source: "unavailable", error: "WAQI token not configured" };
    try {
      const res = await fetch(
        `https://api.waqi.info/feed/geo:${data.lat};${data.lon}/?token=${token}`,
      );
      const json = (await res.json()) as any;
      if (json?.status !== "ok") {
        return { source: "unavailable", error: String(json?.data ?? "WAQI error") };
      }
      const iaqi = json.data?.iaqi ?? {};
      const num = (k: string) => (typeof iaqi[k]?.v === "number" ? iaqi[k].v : undefined);
      return {
        source: "WAQI",
        stationName: json.data?.city?.name,
        aqi: typeof json.data?.aqi === "number" ? json.data.aqi : undefined,
        pm25: num("pm25"),
        pm10: num("pm10"),
        o3: num("o3"),
        no2: num("no2"),
        temp: num("t"),
        wind: num("w"),
        humidity: num("h"),
        updatedAt: json.data?.time?.iso,
      };
    } catch (e) {
      return { source: "unavailable", error: (e as Error).message };
    }
  });

export type FireSummary = {
  source: "FIRMS" | "unavailable";
  /** Active fire detections in the upwind Punjab / Haryana box, last 24h. */
  count?: number;
  meanFrp?: number;
  maxFrp?: number;
  error?: string;
};

/** Upwind stubble-burning box: Punjab + Haryana (west,south,east,north). */
const FIRE_BBOX = "73.8,28.6,77.6,32.6";

export const getUpwindFires = createServerFn({ method: "GET" }).handler(
  async (): Promise<FireSummary> => {
    const key = process.env["NASA_FIRMS_API_KEY"];
    if (!key) return { source: "unavailable", error: "FIRMS key not configured" };
    try {
      const res = await fetch(
        `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/${FIRE_BBOX}/1`,
      );
      const csv = await res.text();
      const lines = csv.trim().split("\n");
      if (!lines[0]!.includes("latitude")) {
        return { source: "unavailable", error: "FIRMS returned no tabular data" };
      }

      const header = lines[0]!.split(",");
      const frpIdx = header.indexOf("frp");
      const rows = lines.slice(1).filter(Boolean);
      const frps = rows
        .map((r) => Number(r.split(",")[frpIdx]))
        .filter((n) => Number.isFinite(n));
      return {
        source: "FIRMS",
        count: rows.length,
        meanFrp: frps.length ? +(frps.reduce((a, b) => a + b, 0) / frps.length).toFixed(1) : 0,
        maxFrp: frps.length ? +Math.max(...frps).toFixed(1) : 0,
      };
    } catch (e) {
      return { source: "unavailable", error: (e as Error).message };
    }
  },
);
