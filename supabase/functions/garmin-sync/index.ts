const GARMIN_BASE = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function dateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

function recentRange(days = 7) {
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  return { start: dateKey(start), end: dateKey(end) };
}

async function garminGet(token: string, path: string) {
  const response = await fetch(`${GARMIN_BASE}${path}`, {
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Garmin ${response.status} bij ${path}`);
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function safeGarminGet(token: string, path: string) {
  try { return await garminGet(token, path); }
  catch (error) { console.warn(String(error)); return null; }
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of ['data', 'items', 'activities', 'activityList', 'summaries']) {
    if (Array.isArray(value[key])) return value[key];
  }
  return [];
}

function findValue(value: any, keys: string[]): any {
  if (!value || typeof value !== 'object') return undefined;
  for (const key of keys) {
    if (value[key] !== undefined && value[key] !== null) return value[key];
  }
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') {
      const found = findValue(child, keys);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function itemDate(item: any): string | undefined {
  return findValue(item, ['calendarDate', 'date', 'summaryDate']);
}

function mapByDate(value: any) {
  const map = new Map<string, any>();
  for (const item of asArray(value)) {
    const date = itemDate(item);
    if (date) map.set(String(date).slice(0, 10), item);
  }
  return map;
}

function numberOrNull(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function bodyBatteryValue(item: any): number | null {
  const direct = numberOrNull(findValue(item, ['bodyBatteryMostRecentValue', 'bodyBatteryValue', 'bodyBattery']));
  if (direct !== null) return direct;
  const rows = findValue(item, ['bodyBatteryValuesArray']);
  if (Array.isArray(rows)) {
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      for (let j = row.length - 1; j >= 0; j--) {
        const n = numberOrNull(row[j]);
        if (n !== null && n >= 0 && n <= 100) return n;
      }
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return Response.json({ error: 'Use POST' }, { status: 405, headers: corsHeaders });

  try {
    if (!req.headers.get('Authorization')) {
      return Response.json({ error: 'Log eerst in bij Romy Health.' }, { status: 401, headers: corsHeaders });
    }

    const apiKey = Deno.env.get('GARMIN_API_KEY');
    if (!apiKey) throw new Error('GARMIN_API_KEY ontbreekt in Supabase Secrets.');

    const tokenResponse = await fetch(`${GARMIN_BASE}${TOKEN_PATH}`, {
      method: 'POST',
      headers: { 'Accept': '*/*', 'Authorization': `ApiKey ${apiKey}` },
    });
    if (!tokenResponse.ok) throw new Error(`Garmin-token mislukt (${tokenResponse.status}).`);
    const token = (await tokenResponse.text()).trim();
    if (!token) throw new Error('Garmin gaf geen access token terug.');

    let days = 7;
    try {
      const body = await req.json();
      if (Number.isFinite(Number(body?.days))) days = Math.max(1, Math.min(28, Number(body.days)));
    } catch { /* body is optional */ }

    const { start, end } = recentRange(days);
    const q = (s: string) => encodeURIComponent(s);

    const [dailyRaw, sleepRaw, hrvRaw, batteryRaw, stepsRaw, activitiesRaw] = await Promise.all([
      safeGarminGet(token, `/usersummary-service/v2/dailysummaries?startDate=${q(start)}&endDate=${q(end)}`),
      safeGarminGet(token, `/sleep-service/sleep/dailySleepSummariesByDate?startDate=${q(start)}&endDate=${q(end)}`),
      safeGarminGet(token, `/hrv-service/hrv/daily/${q(start)}/${q(end)}`),
      safeGarminGet(token, `/wellness-service/wellness/bodyBattery/reports/daily?startDate=${q(start)}&endDate=${q(end)}`),
      safeGarminGet(token, `/usersummary-service/stats/steps/daily/${q(start)}/${q(end)}`),
      safeGarminGet(token, `/activitylist-service/activities/search/activities?start=0&limit=50&startDate=${q(start)}&endDate=${q(end)}`),
    ]);

    const dailyMap = mapByDate(dailyRaw);
    const sleepMap = mapByDate(sleepRaw);
    const hrvMap = mapByDate(hrvRaw);
    const batteryMap = mapByDate(batteryRaw);
    const stepsMap = mapByDate(stepsRaw);

    const daily: Record<string, any> = {};
    for (let cursor = new Date(`${start}T12:00:00Z`); dateKey(cursor) <= end; cursor = new Date(cursor.getTime() + 86400000)) {
      const date = dateKey(cursor);
      const d = dailyMap.get(date) || {};
      const s = sleepMap.get(date) || {};
      const h = hrvMap.get(date) || {};
      const b = batteryMap.get(date) || {};
      const st = stepsMap.get(date) || {};

      const sleepSeconds = numberOrNull(findValue(s, ['sleepTimeSeconds', 'totalSleepSeconds']));
      const totalCalories = numberOrNull(findValue(d, ['totalKilocalories', 'totalCalories', 'caloriesTotal']));
      const activeCalories = numberOrNull(findValue(d, ['activeKilocalories', 'activeCalories']));
      const restingHeartRate = numberOrNull(findValue(d, ['restingHeartRate', 'restingHeartRateValue']));
      const hrv = numberOrNull(findValue(h, ['lastNightAvg', 'weeklyAvg', 'hrvValue', 'average']));
      const steps = numberOrNull(findValue(st, ['totalSteps', 'steps', 'stepCount'])) ?? numberOrNull(findValue(d, ['totalSteps', 'steps']));

      if ([sleepSeconds,totalCalories,activeCalories,restingHeartRate,hrv,steps].some(v => v !== null) || Object.keys(b).length) {
        daily[date] = {
          sleepHours: sleepSeconds === null ? null : Math.round((sleepSeconds / 3600) * 10) / 10,
          totalCalories,
          activeCalories,
          restingHeartRate,
          hrv,
          bodyBattery: bodyBatteryValue(b),
          steps,
          raw: { daily: d, sleep: s, hrv: h, bodyBattery: b, steps: st },
        };
      }
    }

    const activities = asArray(activitiesRaw).map((a: any) => {
      const typeValue = a?.activityType?.typeKey ?? a?.activityType?.typeName ?? a?.activityType ?? a?.typeKey ?? a?.type;
      const distanceMeters = numberOrNull(a?.distance ?? a?.distanceMeters);
      return {
        id: String(a?.activityId ?? a?.id ?? `${a?.startTimeLocal ?? a?.startTimeGMT ?? ''}-${a?.activityName ?? 'activity'}`),
        date: String(a?.startTimeLocal ?? a?.startTimeGMT ?? a?.startTime ?? '').slice(0, 10),
        name: a?.activityName ?? a?.name ?? String(typeValue ?? 'Garmin-activiteit'),
        type: typeValue == null ? null : String(typeValue),
        durationSeconds: numberOrNull(a?.duration ?? a?.durationSeconds),
        distanceKm: distanceMeters === null ? null : Math.round((distanceMeters / 1000) * 100) / 100,
        calories: numberOrNull(a?.calories),
        averageHr: numberOrNull(a?.averageHR ?? a?.averageHr ?? a?.averageHeartRate),
        maxHr: numberOrNull(a?.maxHR ?? a?.maxHr ?? a?.maxHeartRate),
        raw: a,
      };
    });

    return Response.json({ ok: true, start, end, daily, activities }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
