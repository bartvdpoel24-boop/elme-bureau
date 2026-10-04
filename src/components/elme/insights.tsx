import { useState, type ReactNode } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { monthDays, shortMonth, weekDays, yearMonths } from "@/lib/elme/dates";
import { isoDate, amount, targetForBucket, type Activity, type Category, type SwatchId } from "@/lib/elme/model";
import { useElme } from "@/lib/elme/store";
import { swatchBg, swatchFill, swatchText } from "@/components/elme/swatches";

type Row = { label: string; iso: string } & Record<string, number | string | null>;

export function Insights({ today }: { today: string }) {
  const categories = useElme((state) => state.categories);
  const activities = useElme((state) => state.activities);
  const entries = useElme((state) => state.entries);
  const [focus, setFocus] = useState("alle");
  const anchor = new Date(`${today}T12:00:00`);
  const active = focus !== "alle" && categories.some((category) => category.id === focus) ? focus : "alle";
  const shown = active === "alle" ? activities : activities.filter((activity) => activity.categoryId === active);
  const lineCategories = categories.filter((category) => shown.some((activity) => activity.categoryId === category.id));

  const week = withTargets(withAverages(build(weekDays(anchor), (day) => day.toLocaleDateString("nl-NL", { weekday: "short" }).replace(".", ""), shown, entries), shown, lineCategories, today, "day"), shown, "day");
  const month = withTargets(withAverages(build(monthDays(anchor), (day) => String(day.getDate()), shown, entries), shown, lineCategories, today, "day"), shown, "day");
  const year = withTargets(withAverages(build(yearMonths(anchor.getFullYear()), (day) => shortMonth(day), shown, entries, "month"), shown, lineCategories, today, "month"), shown, "month");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-3xl">Hoe vaak</h2>
        <p className="text-muted">Eén staaf per dag of maand. Stippellijn is het gemiddelde, de vaste lijn je doel.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Categorie">
        <FilterChip active={active === "alle"} onClick={() => setFocus("alle")}>
          Alles
        </FilterChip>
        {categories.map((category) => (
          <FilterChip key={category.id} active={active === category.id} onClick={() => setFocus(category.id)}>
            <span className={`size-3 rounded-full ${swatchBg(category.color)}`} />
            {category.name}
          </FilterChip>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-lg border border-line bg-paper p-4 text-muted">
          Nog geen activiteiten. Voeg ze toe bij Instellingen.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Deze week" total={total(week, shown)} rows={week} activities={shown} categories={lineCategories} />
          <ChartCard title="Deze maand" total={total(month, shown)} rows={month} activities={shown} categories={lineCategories} />
          <div className="lg:col-span-2">
            <ChartCard title="Dit jaar" total={total(year, shown)} rows={year} activities={shown} categories={lineCategories} />
          </div>
        </div>
      )}
    </div>
  );
}

function build(
  days: Date[],
  labelFor: (day: Date) => string,
  activities: Activity[],
  entries: { activityId: string; date: string; count?: number }[],
  grain: "day" | "month" = "day",
): Row[] {
  return days.map((day) => {
    const key = isoDate(day);
    const row: Row = { label: labelFor(day).replace(".", ""), iso: key };
    for (const activity of activities) {
      row[activity.id] = entries
        .filter((entry) => {
          if (entry.activityId !== activity.id) return false;
          return grain === "month" ? entry.date.slice(0, 7) === key.slice(0, 7) : entry.date === key;
        })
        .reduce((sum, entry) => sum + amount(entry), 0);
    }
    return row;
  });
}

function withTargets(rows: Row[], activities: Activity[], grain: "day" | "month"): Row[] {
  return rows.map((row) => {
    const next: Row = { ...row };
    for (const activity of activities) {
      next[`target:${activity.id}`] = targetForBucket(activity, String(row.iso), grain);
    }
    return next;
  });
}

function withAverages(rows: Row[], activities: Activity[], categories: Category[], today: string, grain: "day" | "month"): Row[] {
  const running = new Map(categories.map((category) => [category.id, 0]));
  let seen = 0;
  return rows.map((row) => {
    const next: Row = { ...row };
    const key = String(row.iso);
    const future = grain === "month" ? key.slice(0, 7) > today.slice(0, 7) : key > today;
    if (future) {
      for (const category of categories) next[`avg:${category.id}`] = null;
      return next;
    }
    seen += 1;
    for (const category of categories) {
      const bucket = activities
        .filter((activity) => activity.categoryId === category.id)
        .reduce((sum, activity) => sum + Number(row[activity.id] ?? 0), 0);
      const soFar = (running.get(category.id) ?? 0) + bucket;
      running.set(category.id, soFar);
      next[`avg:${category.id}`] = Math.round((soFar / seen) * 10) / 10;
    }
    return next;
  });
}

function total(rows: Row[], activities: Activity[]): number {
  return rows.reduce((sum, row) => sum + activities.reduce((inner, activity) => inner + Number(row[activity.id] ?? 0), 0), 0);
}

function ChartCard({
  title,
  total: count,
  rows,
  activities,
  categories,
}: {
  title: string;
  total: number;
  rows: Row[];
  activities: Activity[];
  categories: Category[];
}) {
  const aimed = activities.filter((activity) => (activity.targetCount ?? 0) > 0);
  const peak = Math.max(
    1,
    ...rows.map((row) => {
      const stack = activities.reduce((sum, activity) => sum + Number(row[activity.id] ?? 0), 0);
      const goal = aimed.reduce((max, activity) => Math.max(max, Number(row[`target:${activity.id}`] ?? 0)), 0);
      return Math.max(stack, goal);
    }),
  );
  const yMax = peak <= 1 ? 1 : Math.ceil(peak * 1.25);
  return (
    <section className="min-w-0 rounded-lg border border-line bg-paper p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-2xl">{title}</h3>
        <p className="text-sm font-semibold text-pine">{count}×</p>
      </div>
      <div className="h-56 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={rows.length > 16 ? 2 : 0}
              tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              width={28}
              domain={[0, yMax]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "var(--color-pine-soft)" }}
              contentStyle={{
                background: "var(--color-paper)",
                border: "1px solid var(--color-line)",
                borderRadius: 8,
                color: "var(--color-ink)",
              }}
              formatter={(value, _name, item) => {
                const key = String(item?.dataKey ?? "");
                if (key.startsWith("avg:")) {
                  const category = categories.find((row) => row.id === key.slice(4));
                  const shown = typeof value === "number" ? value.toLocaleString("nl-NL", { maximumFractionDigits: 1 }) : value;
                  return [`${shown ?? 0}`, `Gemiddelde ${category?.name ?? ""}`];
                }
                if (key.startsWith("target:")) {
                  const activity = activities.find((row) => row.id === key.slice(7));
                  const shown = typeof value === "number" ? value.toLocaleString("nl-NL", { maximumFractionDigits: 1 }) : value;
                  return [`${shown ?? 0}`, `Doel ${activity?.name ?? ""}`];
                }
                const activity = activities.find((row) => row.id === key);
                return [`${value ?? 0}×`, activity?.name ?? ""];
              }}
            />
            {activities.map((activity, index) => (
              <Bar
                key={activity.id}
                dataKey={activity.id}
                stackId="totaal"
                fill={swatchFill(activity.color)}
                radius={index === activities.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                maxBarSize={36}
              />
            ))}
            {aimed.map((activity) => (
              <Line
                key={`target-${activity.id}`}
                type="monotone"
                dataKey={`target:${activity.id}`}
                stroke={swatchFill(activity.color)}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
            {categories.map((category) => (
              <Line
                key={category.id}
                type="monotone"
                dataKey={`avg:${category.id}`}
                stroke={swatchFill(category.color)}
                strokeDasharray="4 4"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {activities.map((activity) => (
          <li key={activity.id} className="flex items-center gap-2">
            <span className={`size-3 rounded-full ${swatchBg(activity.color as SwatchId)}`} />
            {activity.name}
          </li>
        ))}
        {aimed.map((activity) => (
          <li key={`target-${activity.id}`} className={`flex items-center gap-2 ${swatchText(activity.color)}`}>
            <span className="inline-block w-5 border-t-2" />
            Doel {activity.name}
          </li>
        ))}
        {categories.map((category) => (
          <li key={`avg-${category.id}`} className={`flex items-center gap-2 ${swatchText(category.color)}`}>
            <span className="inline-block w-5 border-t-2 border-dashed" />
            Gemiddelde {category.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-lg px-4 font-semibold ${active ? "bg-pine text-paper" : "border border-line bg-paper text-ink"}`}
    >
      {children}
    </button>
  );
}
