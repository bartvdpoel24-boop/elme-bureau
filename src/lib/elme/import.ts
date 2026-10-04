import { SWATCHES, type Activity, type Category, type Entry, type SwatchId } from "@/lib/elme/model";

export type MonthRow = { name: string; months: number[] };

export type ImportPlan = {
  year: number;
  categoryName: string;
  activities: MonthRow[];
};

const LINE = /^(.+?):\s*((?:\d+\s*,\s*){0,11}\d+)(?:\s*:\s*\d+)?\s*$/;

export function parseImport(text: string): ImportPlan {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 3) {
    throw new Error("Zet het jaar op de eerste regel, de categorie op de tweede, en daarna de activiteiten.");
  }
  const year = Number(lines[0]);
  if (!Number.isInteger(year) || year < 1970 || year > 2100) {
    throw new Error("De eerste regel moet een jaar zijn, bijvoorbeeld 2025.");
  }
  const categoryName = lines[1].replace(/:$/, "").trim().slice(0, 40);
  if (!categoryName) throw new Error("De tweede regel moet de categorienaam zijn.");
  const activities = lines.slice(2).map((line) => {
    const match = LINE.exec(line);
    if (!match) throw new Error(`Kan deze regel niet lezen: ${line}`);
    const name = match[1].trim().slice(0, 40);
    if (!name) throw new Error(`Een activiteit mist een naam: ${line}`);
    const months = match[2].split(",").map((part) => Number(part.trim()));
    if (months.some((value) => !Number.isInteger(value) || value < 0 || value > 400)) {
      throw new Error(`Ongeldig aantal bij ${name}. Gebruik hele getallen van 0 tot 400.`);
    }
    while (months.length < 12) months.push(0);
    return { name, months: months.slice(0, 12) };
  });
  return { year, categoryName, activities };
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Spread a monthly total across the month. Counts above the day count stack on random days. */
export function spreadMonth(year: number, monthIndex: number, count: number, seedKey: string): { day: number; count: number }[] {
  if (count <= 0) return [];
  const days = daysInMonth(year, monthIndex);
  const random = mulberry32(hashSeed(`${seedKey}:${year}:${monthIndex}`));
  const order = Array.from({ length: days }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = order[index];
    order[index] = order[swap];
    order[swap] = current;
  }
  const base = Math.floor(count / days);
  const extra = new Set(order.slice(0, count % days));
  const pieces: { day: number; count: number }[] = [];
  for (let index = 0; index < days; index += 1) {
    const amount = base + (extra.has(index) ? 1 : 0);
    if (amount > 0) pieces.push({ day: index + 1, count: amount });
  }
  return pieces;
}

function swatchAt(index: number): SwatchId {
  return SWATCHES[index % SWATCHES.length].id;
}

export function mergeImport(
  state: { categories: Category[]; activities: Activity[]; entries: Entry[] },
  plan: ImportPlan,
): { categories: Category[]; activities: Activity[]; entries: Entry[]; total: number } {
  const categories = [...state.categories];
  const activities = [...state.activities];
  let entries = [...state.entries];
  let category = categories.find((item) => item.name.toLowerCase() === plan.categoryName.toLowerCase());
  if (!category) {
    category = { id: crypto.randomUUID(), name: plan.categoryName, color: swatchAt(categories.length) };
    categories.push(category);
  }
  let total = 0;
  for (const row of plan.activities) {
    let activity = activities.find(
      (item) => item.categoryId === category.id && item.name.toLowerCase() === row.name.toLowerCase(),
    );
    if (!activity) {
      activity = {
        id: crypto.randomUUID(),
        categoryId: category.id,
        name: row.name,
        color: swatchAt(activities.length + 1),
      };
      activities.push(activity);
    }
    const prefix = `${plan.year}-`;
    entries = entries.filter((entry) => !(entry.activityId === activity.id && entry.date.startsWith(prefix)));
    row.months.forEach((count, month) => {
      total += count;
      for (const piece of spreadMonth(plan.year, month, count, `${plan.categoryName}:${row.name}`)) {
        const date = `${plan.year}-${String(month + 1).padStart(2, "0")}-${String(piece.day).padStart(2, "0")}`;
        entries.push({ id: crypto.randomUUID(), activityId: activity.id, date, count: piece.count });
      }
    });
  }
  return { categories, activities, entries, total };
}
