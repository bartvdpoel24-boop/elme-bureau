import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isSwatch, isTargetPeriod, type Activity, type Category, type Entry, type SwatchId, type TargetPeriod } from "@/lib/elme/model";

export type LogSnapshot = {
  categories: Category[];
  activities: Activity[];
  entries: Entry[];
};

function cleanName(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 40) : "";
}

function readTarget(item: Activity): { targetCount?: number; targetPeriod?: TargetPeriod } {
  const count = Number(item.targetCount);
  if (!Number.isInteger(count) || count < 1 || count > 999) return {};
  if (!item.targetPeriod || !isTargetPeriod(item.targetPeriod)) return {};
  return { targetCount: count, targetPeriod: item.targetPeriod };
}

function asSnapshot(value: unknown): LogSnapshot {
  if (!value || typeof value !== "object") throw new Error("Ongeldige log");
  const data = value as Partial<LogSnapshot>;
  if (!Array.isArray(data.categories) || !Array.isArray(data.activities) || !Array.isArray(data.entries)) {
    throw new Error("Ongeldige log");
  }
  if (data.categories.length > 40 || data.activities.length > 200 || data.entries.length > 20000) {
    throw new Error("Te veel gegevens");
  }
  const categories = data.categories.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Category;
    const name = cleanName(item.name);
    if (!item.id || !name || !isSwatch(String(item.color))) return [];
    return [{ id: String(item.id).slice(0, 80), name, color: item.color }];
  });
  const categoryIds = new Set(categories.map((category) => category.id));
  const activities = data.activities.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Activity;
    const name = cleanName(item.name);
    if (!item.id || !name || !categoryIds.has(item.categoryId) || !isSwatch(String(item.color))) return [];
    const target = readTarget(item);
    return [{ id: String(item.id).slice(0, 80), categoryId: item.categoryId, name, color: item.color as SwatchId, ...target }];
  });
  const activityIds = new Set(activities.map((activity) => activity.id));
  const entries = data.entries.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Entry;
    const count = Number(item.count);
    if (!item.id || !activityIds.has(item.activityId) || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return [];
    if (!Number.isInteger(count) || count < 1 || count > 400) return [];
    return [{ id: String(item.id).slice(0, 80), activityId: item.activityId, date: item.date, count }];
  });
  return { categories, activities, entries };
}

export const loadLog = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LogSnapshot> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const categories = await sql<{ id: string; name: string; color: SwatchId }>`
      select id, name, color from elme_categories where user_id = ${context.userId} order by position, name
    `;
    const activities = await sql<{
      id: string;
      category_id: string;
      name: string;
      color: SwatchId;
      target_count: number | null;
      target_period: string | null;
    }>`
      select id, category_id, name, color, target_count, target_period
      from elme_activities where user_id = ${context.userId} order by position, name
    `;
    const entries = await sql<{ id: string; activity_id: string; day: string; count: number }>`
      select id, activity_id, day, count from elme_entries where user_id = ${context.userId} order by day
    `;
    return {
      categories: categories.filter((row) => isSwatch(row.color)).map((row) => ({ id: row.id, name: row.name, color: row.color })),
      activities: activities
        .filter((row) => isSwatch(row.color))
        .map((row) => {
          const period = row.target_period && isTargetPeriod(row.target_period) ? row.target_period : undefined;
          const count = Number(row.target_count);
          const target = period && Number.isInteger(count) && count > 0 ? { targetCount: count, targetPeriod: period } : {};
          return { id: row.id, categoryId: row.category_id, name: row.name, color: row.color, ...target };
        }),
      entries: entries.map((row) => ({ id: row.id, activityId: row.activity_id, date: row.day, count: Number(row.count) })),
    };
  });

export const saveLog = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((value: unknown) => asSnapshot(value))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const userId = context.userId;
    await sql`delete from elme_entries where user_id = ${userId}`;
    await sql`delete from elme_activities where user_id = ${userId}`;
    await sql`delete from elme_categories where user_id = ${userId}`;
    for (const [index, category] of data.categories.entries()) {
      await sql`insert into elme_categories (id, user_id, name, color, position) values (${category.id}, ${userId}, ${category.name}, ${category.color}, ${index})`;
    }
    for (const [index, activity] of data.activities.entries()) {
      await sql`insert into elme_activities (id, user_id, category_id, name, color, position, target_count, target_period) values (${activity.id}, ${userId}, ${activity.categoryId}, ${activity.name}, ${activity.color}, ${index}, ${activity.targetCount ?? null}, ${activity.targetPeriod ?? null})`;
    }
    const size = 40;
    for (let start = 0; start < data.entries.length; start += size) {
      const slice = data.entries.slice(start, start + size);
      const values: unknown[] = [];
      const tuples = slice.map((entry, index) => {
        const base = index * 5;
        values.push(entry.id, userId, entry.activityId, entry.date, entry.count);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::date, $${base + 5})`;
      });
      await sql.query(
        `insert into elme_entries (id, user_id, activity_id, day, count) values ${tuples.join(", ")}`,
        values,
      );
    }
    return { ok: true as const };
  });
