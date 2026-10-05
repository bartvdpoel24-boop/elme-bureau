import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isSwatch, isTargetPeriod, type Activity, type Category, type Entry, type Label, type SwatchId, type TargetPeriod } from "@/lib/elme/model";

export type LogSnapshot = {
  categories: Category[];
  activities: Activity[];
  entries: Entry[];
  labels: Label[];
};

function cleanName(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 40) : "";
}

function readSpan(countValue: unknown, periodValue: unknown): { count?: number; period?: TargetPeriod } {
  const count = Number(countValue);
  if (!Number.isInteger(count) || count < 1 || count > 999) return {};
  if (typeof periodValue !== "string" || !isTargetPeriod(periodValue)) return {};
  return { count, period: periodValue };
}

function readTarget(item: Activity): { targetCount?: number; targetPeriod?: TargetPeriod } {
  const span = readSpan(item.targetCount, item.targetPeriod);
  return span.count ? { targetCount: span.count, targetPeriod: span.period } : {};
}

function readReminder(item: Activity): { remindAfter?: number; remindPeriod?: TargetPeriod } {
  const span = readSpan(item.remindAfter, item.remindPeriod);
  return span.count ? { remindAfter: span.count, remindPeriod: span.period } : {};
}

function asSnapshot(value: unknown): LogSnapshot {
  if (!value || typeof value !== "object") throw new Error("Ongeldige log");
  const data = value as Partial<LogSnapshot>;
  if (!Array.isArray(data.categories) || !Array.isArray(data.activities) || !Array.isArray(data.entries)) {
    throw new Error("Ongeldige log");
  }
  const rawLabels = Array.isArray(data.labels) ? data.labels : [];
  if (data.categories.length > 40 || data.activities.length > 200 || data.entries.length > 20000 || rawLabels.length > 200) {
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
  const labels = rawLabels.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Label;
    const name = cleanName(item.name);
    if (!item.id || !name || !categoryIds.has(item.categoryId)) return [];
    return [{ id: String(item.id).slice(0, 80), categoryId: item.categoryId, name }];
  });
  const labelIds = new Set(labels.map((label) => label.id));
  const activities = data.activities.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Activity;
    const name = cleanName(item.name);
    if (!item.id || !name || !categoryIds.has(item.categoryId) || !isSwatch(String(item.color))) return [];
    return [
      {
        id: String(item.id).slice(0, 80),
        categoryId: item.categoryId,
        name,
        color: item.color as SwatchId,
        ...readTarget(item),
        ...readReminder(item),
      },
    ];
  });
  const activityIds = new Set(activities.map((activity) => activity.id));
  const entries = data.entries.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Entry;
    const count = Number(item.count);
    if (!item.id || !activityIds.has(item.activityId) || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return [];
    if (!Number.isInteger(count) || count < 1 || count > 400) return [];
    const picked = Array.isArray(item.labelIds)
      ? [...new Set(item.labelIds.map((id) => String(id).slice(0, 80)).filter((id) => labelIds.has(id)))].slice(0, 12)
      : [];
    return [
      {
        id: String(item.id).slice(0, 80),
        activityId: item.activityId,
        date: item.date,
        count,
        ...(picked.length ? { labelIds: picked } : {}),
      },
    ];
  });
  return { categories, activities, entries, labels };
}

export const loadLog = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LogSnapshot> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const categories = await sql<{ id: string; name: string; color: SwatchId }>`
      select id, name, color from elme_categories where user_id = ${context.userId} order by position, name
    `;
    const labels = await sql<{ id: string; category_id: string; name: string }>`
      select id, category_id, name from elme_labels where user_id = ${context.userId} order by position, name
    `;
    const activities = await sql<{
      id: string;
      category_id: string;
      name: string;
      color: SwatchId;
      target_count: number | null;
      target_period: string | null;
      remind_after: number | null;
      remind_period: string | null;
    }>`
      select id, category_id, name, color, target_count, target_period, remind_after, remind_period
      from elme_activities where user_id = ${context.userId} order by position, name
    `;
    const entries = await sql<{ id: string; activity_id: string; day: string; count: number; label_ids: string | null }>`
      select id, activity_id, day, count, label_ids from elme_entries where user_id = ${context.userId} order by day
    `;
    const knownLabels = new Set(labels.map((row) => row.id));
    return {
      categories: categories.filter((row) => isSwatch(row.color)).map((row) => ({ id: row.id, name: row.name, color: row.color })),
      labels: labels
        .filter((row) => categories.some((category) => category.id === row.category_id))
        .map((row) => ({ id: row.id, categoryId: row.category_id, name: row.name })),
      activities: activities
        .filter((row) => isSwatch(row.color))
        .map((row) => {
          const target = readSpan(row.target_count, row.target_period);
          const reminder = readSpan(row.remind_after, row.remind_period);
          return {
            id: row.id,
            categoryId: row.category_id,
            name: row.name,
            color: row.color,
            ...(target.count ? { targetCount: target.count, targetPeriod: target.period } : {}),
            ...(reminder.count ? { remindAfter: reminder.count, remindPeriod: reminder.period } : {}),
          };
        }),
      entries: entries.map((row) => {
        const picked = String(row.label_ids ?? "")
          .split(",")
          .map((id) => id.trim())
          .filter((id) => knownLabels.has(id))
          .slice(0, 12);
        return {
          id: row.id,
          activityId: row.activity_id,
          date: row.day,
          count: Number(row.count),
          ...(picked.length ? { labelIds: picked } : {}),
        };
      }),
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
    await sql`delete from elme_labels where user_id = ${userId}`;
    await sql`delete from elme_categories where user_id = ${userId}`;
    for (const [index, category] of data.categories.entries()) {
      await sql`insert into elme_categories (id, user_id, name, color, position) values (${category.id}, ${userId}, ${category.name}, ${category.color}, ${index})`;
    }
    for (const [index, label] of data.labels.entries()) {
      await sql`insert into elme_labels (id, user_id, category_id, name, position) values (${label.id}, ${userId}, ${label.categoryId}, ${label.name}, ${index})`;
    }
    for (const [index, activity] of data.activities.entries()) {
      await sql`insert into elme_activities (id, user_id, category_id, name, color, position, target_count, target_period, remind_after, remind_period) values (${activity.id}, ${userId}, ${activity.categoryId}, ${activity.name}, ${activity.color}, ${index}, ${activity.targetCount ?? null}, ${activity.targetPeriod ?? null}, ${activity.remindAfter ?? null}, ${activity.remindPeriod ?? null})`;
    }
    const size = 40;
    for (let start = 0; start < data.entries.length; start += size) {
      const slice = data.entries.slice(start, start + size);
      const values: unknown[] = [];
      const tuples = slice.map((entry, index) => {
        const base = index * 6;
        values.push(entry.id, userId, entry.activityId, entry.date, entry.count, entry.labelIds?.join(",") || null);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::date, $${base + 5}, $${base + 6})`;
      });
      await sql.query(
        `insert into elme_entries (id, user_id, activity_id, day, count, label_ids) values ${tuples.join(", ")}`,
        values,
      );
    }
    return { ok: true as const };
  });
