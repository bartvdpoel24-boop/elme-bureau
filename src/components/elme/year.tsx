import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mondayIndex, monthDays, monthName, yearMonths } from "@/lib/elme/dates";
import { isoDate } from "@/lib/elme/model";
import { useElme } from "@/lib/elme/store";
import { swatchBg } from "@/components/elme/swatches";

const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

export function YearView({ today }: { today: string }) {
  const current = Number(today.slice(0, 4));
  const [year, setYear] = useState(current);
  const categories = useElme((state) => state.categories);
  const activities = useElme((state) => state.activities);
  const entries = useElme((state) => state.entries);
  const inYear = entries.filter((entry) => entry.date.startsWith(String(year)));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl">Jaaroverzicht</h2>
          <p className="text-muted">{inYear.length} afgevinkte dagen in {year}.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Vorig jaar"
            onClick={() => setYear((value) => value - 1)}
            className="flex size-11 items-center justify-center rounded-lg border border-line bg-paper"
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="min-w-16 text-center font-display text-2xl">{year}</p>
          <button
            type="button"
            aria-label="Volgend jaar"
            disabled={year >= current}
            onClick={() => setYear((value) => Math.min(current, value + 1))}
            className="flex size-11 items-center justify-center rounded-lg border border-line bg-paper disabled:opacity-40"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {activities.map((activity) => {
          const count = inYear.filter((entry) => entry.activityId === activity.id).length;
          return (
            <li key={activity.id} className="flex items-center gap-2 font-semibold">
              <span className={`size-3 rounded-full ${swatchBg(activity.color)}`} />
              {activity.name}
              <span className="font-normal text-muted">{count}×</span>
            </li>
          );
        })}
      </ul>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {yearMonths(year).map((month) => {
          const key = isoDate(month).slice(0, 7);
          const days = monthDays(month);
          const pad = mondayIndex(days[0] ?? month);
          const future = key > today.slice(0, 7);
          return (
            <section key={key} className="rounded-lg border border-line bg-paper p-3">
              <h3 className="font-display text-xl">{monthName(month)}</h3>
              <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs text-muted">
                {WEEKDAYS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {Array.from({ length: pad }, (_, index) => (
                  <span key={`pad-${key}-${index}`} />
                ))}
                {days.map((day) => {
                  const date = isoDate(day);
                  const logged = inYear.filter((entry) => entry.date === date);
                  const names = logged
                    .map((entry) => activities.find((activity) => activity.id === entry.activityId)?.name)
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <div
                      key={date}
                      title={names ? `${date}: ${names}` : date}
                      className={`flex h-8 flex-col items-center justify-center rounded-md ${logged.length ? "bg-pine-soft" : "bg-canvas"} ${date > today ? "opacity-40" : ""}`}
                    >
                      <span className="text-xs leading-none text-ink">{day.getDate()}</span>
                      {logged.length > 0 ? (
                        <span className="mt-0.5 flex gap-0.5">
                          {logged.slice(0, 3).map((entry) => {
                            const activity = activities.find((item) => item.id === entry.activityId);
                            if (!activity) return null;
                            return <span key={entry.id} className={`size-1.5 rounded-full ${swatchBg(activity.color)}`} />;
                          })}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {!future ? (
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {categories.map((category) =>
                    activities
                      .filter((activity) => activity.categoryId === category.id)
                      .map((activity) => {
                        const count = inYear.filter(
                          (entry) => entry.activityId === activity.id && entry.date.startsWith(key),
                        ).length;
                        if (count === 0) return null;
                        return (
                          <li key={activity.id} className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className={`size-2.5 shrink-0 rounded-full ${swatchBg(activity.color)}`} />
                              <span className="truncate">{activity.name}</span>
                            </span>
                            <span className="font-semibold">{count}×</span>
                          </li>
                        );
                      }),
                  )}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
