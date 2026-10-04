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
};

export function isSwatch(value: string): value is SwatchId {
  return SWATCHES.some((swatch) => swatch.id === value);
}

export function isoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

const SPORT = "cat-sport";
const TENNIS = "act-tennis";
const EGYM = "act-egym";

const TENNIS_DAYS = [0, -2, -6, -13, -27, -55, -90, -140, -190, -250];
const EGYM_DAYS = [-1, -3, -5, -11, -20, -40, -75, -110, -170, -230, -300];

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
    ...TENNIS_DAYS.map((offset) => ({ activityId: TENNIS, offset })),
    ...EGYM_DAYS.map((offset) => ({ activityId: EGYM, offset })),
  ];
  return rows.map((row) => ({
    id: `${row.activityId}${row.offset}`,
    activityId: row.activityId,
    date: isoDate(addDays(today, row.offset)),
  }));
}
