import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { monthDays, shortMonth, weekDays, yearMonths } from "@/lib/elme/dates";
import { isoDate, type Activity, type SwatchId } from "@/lib/elme/model";
import { useElme } from "@/lib/elme/store";
import { swatchBg, swatchFill } from "@/components/elme/swatches";

type Row = { label: string } & Record<string, number | string>;

export function Insights({ today }: { today: string }) {
  const activities = useElme((state) => state.activities);
  const entries = useElme((state) => state.entries);
  const [focus, setFocus] = useState("alle");
  const anchor = new Date(`${today}T12:00:00`);
  const shown = focus === "alle" ? activities : activities.filter((activity) => activity.id === focus);

  const week = build(weekDays(anchor), (day) => day.toLocaleDateString("nl-NL", { weekday: "short" }).replace(".", ""), shown, entries);
  const month = build(monthDays(anchor), (day) => String(day.getDate()), shown, entries);
  const year = build(yearMonths(anchor.getFullYear()), (day) => shortMonth(day), shown, entries, "month");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-3xl">Hoe vaak</h2>
        <p className="text-muted">Deze week, deze maand en dit jaar. Elke afgevinkte dag telt één keer.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Activiteit">
        <FilterChip active={focus === "alle"} onClick={() => setFocus("alle")}>
          Alles
        </FilterChip>
        {activities.map((activity) => (
          <FilterChip key={activity.id} active={focus === activity.id} onClick={() => setFocus(activity.id)}>
            <span className={`size-3 rounded-full ${swatchBg(activity.color)}`} />
            {activity.name}
          </FilterChip>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-lg border border-line bg-paper p-4 text-muted">
          Nog geen activiteiten. Voeg ze toe bij Instellingen.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Deze week" total={total(week, shown)} rows={week} activities={shown} />
          <ChartCard title="Deze maand" total={total(month, shown)} rows={month} activities={shown} />
          <div className="lg:col-span-2">
            <ChartCard title="Dit jaar" total={total(year, shown)} rows={year} activities={shown} />
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
  entries: { activityId: string; date: string }[],
  grain: "day" | "month" = "day",
): Row[] {
  return days.map((day) => {
    const key = isoDate(day);
    const row: Row = { label: labelFor(day).replace(".", "") };
    for (const activity of activities) {
      row[activity.id] = entries.filter((entry) => {
        if (entry.activityId !== activity.id) return false;
        return grain === "month" ? entry.date.slice(0, 7) === key.slice(0, 7) : entry.date === key;
      }).length;
    }
    return row;
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
}: {
  title: string;
  total: number;
  rows: Row[];
  activities: Activity[];
}) {
  const peak = Math.max(1, ...rows.flatMap((row) => activities.map((activity) => Number(row[activity.id] ?? 0))));
  const yMax = peak <= 1 ? 1 : Math.ceil(peak * 1.25);
  return (
    <section className="min-w-0 rounded-lg border border-line bg-paper p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-2xl">{title}</h3>
        <p className="text-sm font-semibold text-pine">{count}×</p>
      </div>
      <div className="h-56 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
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
                const activity = activities.find((row) => row.id === item?.dataKey);
                return [`${value ?? 0}×`, activity?.name ?? ""];
              }}
            />
            {activities.map((activity) => (
              <Bar
                key={activity.id}
                dataKey={activity.id}
                fill={swatchFill(activity.color)}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {activities.map((activity) => (
          <li key={activity.id} className="flex items-center gap-2">
            <span className={`size-3 rounded-full ${swatchBg(activity.color as SwatchId)}`} />
            {activity.name}
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
