import { addDays, format } from "date-fns";

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

export type Activity = {
  id: string;
  categoryId: string;
  name: string;
  color: SwatchId;
};

export type Entry = {
  id: string;
  activityId: string;
  date: string;
  count: number;
};

export function amount(entry: { count?: number }): number {
  const value = entry.count ?? 1;
  return value > 0 ? value : 0;
}

export function isSwatch(value: string): value is SwatchId {
  return SWATCHES.some((swatch) => swatch.id === value);
}

export function isoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

const SPORT = "cat-sport";
const TENNIS = "act-tennis";
const EGYM = "act-egym";

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
    { id: TENNIS, categoryId: SPORT, name: "Tennis", color: "copper" },
    { id: EGYM, categoryId: SPORT, name: "eGym", color: "tide" },
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
  }));
}
