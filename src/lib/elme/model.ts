import { addDays, addMonths, format, parseISO } from "date-fns";

export const SWATCHES = [
  { id: "pine", label: "Dennen" },
  { id: "copper", label: "Koper" },
  { id: "moss", label: "Mos" },
  { id: "clay", label: "Klei" },
  { id: "gold", label: "Goud" },
  { id: "tide", label: "Diepzee" },
  { id: "berry", label: "Bes" },
  { id: "dusk", label: "Schemer" },
] as const;

export type SwatchId = (typeof SWATCHES)[number]["id"];

export type Category = {
  id: string;
  name: string;
  color: SwatchId;
};

export type Label = {
  id: string;
  categoryId: string;
  name: string;
};

export type TargetPeriod = "day" | "week" | "month";

export type Activity = {
  id: string;
  categoryId: string;
  name: string;
  color: SwatchId;
  targetCount?: number;
  targetPeriod?: TargetPeriod;
  remindAfter?: number;
  remindPeriod?: TargetPeriod;
};

export type Entry = {
  id: string;
  activityId: string;
  date: string;
  count: number;
  labelIds?: string[];
};

export function amount(entry: { count?: number }): number {
  const value = entry.count ?? 1;
  return value > 0 ? value : 0;
}

export function isSwatch(value: string): value is SwatchId {
  return SWATCHES.some((swatch) => swatch.id === value);
}

export function isTargetPeriod(value: string): value is TargetPeriod {
  return value === "day" || value === "week" || value === "month";
}

/** Doel omgerekend naar de staaf: een dag in week/maand, een maand in het jaar. */
export function targetForBucket(activity: Activity, iso: string, grain: "day" | "month"): number | null {
  const count = activity.targetCount;
  const period = activity.targetPeriod;
  if (!count || count <= 0 || !period) return null;
  const [year, month] = iso.split("-").map(Number);
  const days = new Date(year, month, 0).getDate();
  if (grain === "day") {
    if (period === "day") return count;
    if (period === "week") return Math.round((count / 7) * 10) / 10;
    return Math.round((count / days) * 10) / 10;
  }
  if (period === "month") return count;
  if (period === "day") return count * days;
  return Math.round(((count * days) / 7) * 10) / 10;
}

export function isoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Rode herinnering zodra de termijn sinds de laatste telling voorbij is. */
export function reminderDue(activity: Activity, entries: { activityId: string; date: string }[], today: string): boolean {
  const after = activity.remindAfter;
  const period = activity.remindPeriod;
  if (!after || after < 1 || !period || !isTargetPeriod(period)) return false;
  let last = "";
  for (const entry of entries) {
    if (entry.activityId !== activity.id || entry.date > today) continue;
    if (entry.date > last) last = entry.date;
  }
  if (!last) return false;
  const start = parseISO(last);
  const due = period === "month" ? addMonths(start, after) : addDays(start, period === "week" ? after * 7 : after);
  return isoDate(due) <= today;
}

const SPORT = "cat-sport";
const TENNIS = "act-tennis";
const EGYM = "act-egym";
const BUITEN = "lab-buiten";
const WEDSTRIJD = "lab-wedstrijd";

const TENNIS_DAYS: [number, number][] = [
  [0, 2],
  [-2, 1],
  [-6, 1],
  [-13, 2],
  [-27, 1],
  [-55, 1],
  [-90, 2],
  [-140, 1],
  [-190, 1],
  [-250, 1],
];
const EGYM_DAYS: [number, number][] = [
  [0, 1],
  [-1, 2],
  [-3, 1],
  [-5, 1],
  [-11, 1],
  [-20, 2],
  [-40, 1],
  [-75, 1],
  [-110, 2],
  [-170, 1],
  [-230, 1],
  [-300, 1],
];

export function seedCategories(): Category[] {
  return [{ id: SPORT, name: "Sporten", color: "moss" }];
}

export function seedActivities(): Activity[] {
  return [
    { id: TENNIS, categoryId: SPORT, name: "Tennis", color: "copper", targetCount: 2, targetPeriod: "week", remindAfter: 7, remindPeriod: "day" },
    { id: EGYM, categoryId: SPORT, name: "eGym", color: "tide", targetCount: 4, targetPeriod: "week" },
  ];
}

export function seedLabels(): Label[] {
  return [
    { id: BUITEN, categoryId: SPORT, name: "Buiten" },
    { id: WEDSTRIJD, categoryId: SPORT, name: "Wedstrijd" },
  ];
}

export function seedEntries(today = new Date()): Entry[] {
  const rows = [
    ...TENNIS_DAYS.map(([offset, count]) => ({ activityId: TENNIS, offset, count })),
    ...EGYM_DAYS.map(([offset, count]) => ({ activityId: EGYM, offset, count })),
  ];
  return rows.map((row) => ({
    id: `${row.activityId}${row.offset}`,
    activityId: row.activityId,
    date: isoDate(addDays(today, row.offset)),
    count: row.count,
    ...(row.activityId === TENNIS && row.offset === 0 ? { labelIds: [BUITEN] } : {}),
  }));
}
