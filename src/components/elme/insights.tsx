import { useState, type ReactNode } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { shortMonth, weekDays, yearMonths } from "@/lib/elme/dates";
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

  const year = withTargets(withAverages(build(yearMonths(anchor.getFullYear()), (day) => shortMonth(day), shown, entries, "month"), shown, lineCategories, today, "month"), shown, "month");
  const history = yearlyTotals(today, active === "alle" ? categories : [categories.find((category) => category.id === active)].filter((category): category is Category => Boolean(category)), shown, entries, active !== "alle");
  const weekCategories = lineCategories;
  const monthKey = today.slice(0, 7);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-3xl">Hoe vaak</h2>
        <p className="text-muted">De week is een overzicht per dag. De maand telt per categorie. In de jaargrafieken is de stippellijn het gemiddelde en de vaste lijn je doel.</p>
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
          <WeekBoard today={today} anchor={anchor} categories={weekCategories} activities={shown} entries={entries} />
          <MonthBoard monthKey={monthKey} categories={weekCategories} activities={shown} entries={entries} />
          <div className="lg:col-span-2">
            <ChartCard title="Dit jaar" total={total(year, shown)} rows={year} activities={shown} categories={lineCategories} />
          </div>
          <div className="lg:col-span-2">
            <ChartCard
              title={history.title}
              total={total(history.rows, history.series)}
              rows={history.rows}
              activities={history.series}
              categories={[]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function countIn(entries: { activityId: string; date: string; count?: number }[], activityId: string, matches: (date: string) => boolean): number {
  return entries.filter((entry) => entry.activityId === activityId && matches(entry.date)).reduce((sum, entry) => sum + amount(entry), 0);
}

function WeekBoard({
  today,
  anchor,
  categories,
  activities,
  entries,
}: {
  today: string;
  anchor: Date;
  categories: Category[];
  activities: Activity[];
  entries: { activityId: string; date: string; count?: number }[];
}) {
  const days = weekDays(anchor);
  const weekTotal = activities.reduce(
    (sum, activity) => sum + countIn(entries, activity.id, (date) => days.some((day) => isoDate(day) === date)),
    0,
  );
  return (
    <section className="min-w-0 rounded-lg border border-line bg-paper p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-2xl">Deze week</h3>
        <p className="text-sm font-semibold text-pine">{weekTotal}×</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className="pb-2 text-left font-semibold text-muted">Activiteit</th>
              {days.map((day) => {
                const iso = isoDate(day);
                const label = day.toLocaleDateString("nl-NL", { weekday: "short" }).replace(".", "");
                return (
                  <th key={iso} className={`w-12 pb-2 text-center font-semibold capitalize ${iso === today ? "text-pine" : "text-muted"}`}>
                    {label}
                    <span className="mt-0.5 block text-xs font-normal">{day.getDate()}</span>
                  </th>
                );
              })}
              <th className="w-14 pb-2 text-right font-semibold text-muted">Totaal</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const rows = activities.filter((activity) => activity.categoryId === category.id);
              if (rows.length === 0) return null;
              return (
                <CategoryWeekRows key={category.id} category={category} activities={rows} days={days} today={today} entries={entries} />
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CategoryWeekRows({
  category,
  activities,
  days,
  today,
  entries,
}: {
  category: Category;
  activities: Activity[];
  days: Date[];
  today: string;
  entries: { activityId: string; date: string; count?: number }[];
}) {
  return (
    <>
      <tr>
        <th colSpan={9} className="pt-3 pb-1 text-left font-display text-lg font-normal">
          <span className="inline-flex items-center gap-2">
            <span className={`size-3 rounded-full ${swatchBg(category.color)}`} />
            {category.name}
          </span>
        </th>
      </tr>
      {activities.map((activity) => {
        const counts = days.map((day) => countIn(entries, activity.id, (date) => date === isoDate(day)));
        const sum = counts.reduce((total, value) => total + value, 0);
        return (
          <tr key={activity.id} className="border-t border-line">
            <th className="py-2 pr-3 text-left font-semibold">
              <span className="inline-flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${swatchBg(activity.color)}`} />
                {activity.name}
              </span>
            </th>
            {counts.map((value, index) => {
              const iso = isoDate(days[index]);
              return (
                <td key={iso} className={`py-2 text-center tabular-nums ${iso === today ? "bg-pine-soft font-semibold" : ""}`}>
                  {value > 0 ? value : <span className="text-line">·</span>}
                </td>
              );
            })}
            <td className="py-2 text-right font-semibold tabular-nums">{sum}×</td>
          </tr>
        );
      })}
    </>
  );
}

function MonthBoard({
  monthKey,
  categories,
  activities,
  entries,
}: {
  monthKey: string;
  categories: Category[];
  activities: Activity[];
  entries: { activityId: string; date: string; count?: number }[];
}) {
  const rows = categories
    .map((category) => {
      const members = activities.filter((activity) => activity.categoryId === category.id);
      const parts = members.map((activity) => ({
        activity,
        count: countIn(entries, activity.id, (date) => date.startsWith(monthKey)),
      }));
      return { category, parts, total: parts.reduce((sum, part) => sum + part.count, 0) };
    })
    .filter((row) => row.parts.length > 0);
  const monthTotal = rows.reduce((sum, row) => sum + row.total, 0);
  return (
    <section className="min-w-0 rounded-lg border border-line bg-paper p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-2xl">Deze maand</h3>
        <p className="text-sm font-semibold text-pine">{monthTotal}×</p>
      </div>
      <ul className="flex flex-col gap-4">
        {rows.map((row) => (
          <li key={row.category.id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
            <div className="flex items-baseline justify-between gap-3">
              <h4 className="flex items-center gap-2 font-display text-xl">
                <span className={`size-3 rounded-full ${swatchBg(row.category.color)}`} />
                {row.category.name}
              </h4>
              <p className="text-lg font-semibold tabular-nums">{row.total}×</p>
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {row.parts.map((part) => (
                <li key={part.activity.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`size-2.5 shrink-0 rounded-full ${swatchBg(part.activity.color)}`} />
                    <span className="truncate">{part.activity.name}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-muted">{part.count}×</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

function yearlyTotals(today: string, categories: Category[], activities: Activity[], entries: { activityId: string; date: string; count?: number }[], byActivity: boolean): { title: string; rows: Row[]; series: Activity[] } {
  const yearNow = Number(today.slice(0, 4));
  const ids = new Set(activities.map((activity) => activity.id));
  let first = yearNow;
  for (const entry of entries) {
    if (!ids.has(entry.activityId)) continue;
    const year = Number(entry.date.slice(0, 4));
    if (year >= 1970 && year < first) first = year;
  }
  if (yearNow - first > 24) first = yearNow - 24;
  const years = Array.from({ length: yearNow - first + 1 }, (_, index) => first + index);
  const series: Activity[] = byActivity
    ? activities
    : categories.map((category) => ({ id: category.id, categoryId: category.id, name: category.name, color: category.color }));
  const rows = years.map((year) => {
    const row: Row = { label: String(year), iso: `${year}-01-01` };
    if (byActivity) {
      for (const activity of activities) {
        row[activity.id] = entries
          .filter((entry) => entry.activityId === activity.id && entry.date.startsWith(`${year}-`))
          .reduce((sum, entry) => sum + amount(entry), 0);
      }
    } else {
      for (const category of categories) {
        const members = new Set(activities.filter((activity) => activity.categoryId === category.id).map((activity) => activity.id));
        row[category.id] = entries
          .filter((entry) => members.has(entry.activityId) && entry.date.startsWith(`${year}-`))
          .reduce((sum, entry) => sum + amount(entry), 0);
      }
    }
    return row;
  });
  const title = byActivity && categories[0] ? `Totalen per jaar · ${categories[0].name}` : "Totalen per jaar";
  return { title, rows, series };
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
