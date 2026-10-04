import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { longDay, shiftDay } from "@/lib/elme/dates";
import { isoDate, type Activity, type Category } from "@/lib/elme/model";
import { useElme } from "@/lib/elme/store";
import { swatchBg } from "@/components/elme/swatches";

export function Today({ today }: { today: string }) {
  const categories = useElme((state) => state.categories);
  const activities = useElme((state) => state.activities);
  const entries = useElme((state) => state.entries);
  const toggleEntry = useElme((state) => state.toggleEntry);
  const moveEntry = useElme((state) => state.moveEntry);
  const removeEntry = useElme((state) => state.removeEntry);
  const setView = useElme((state) => state.setView);
  const [day, setDay] = useState(today);

  const selected = day > today ? today : day;
  const onDay = entries.filter((entry) => entry.date === selected);
  const weekStart = shiftDay(today, -((new Date(`${today}T12:00:00`).getDay() + 6) % 7));
  const monthStart = `${today.slice(0, 8)}01`;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-line bg-paper p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-muted">Vastleggen op</p>
            <h2 className="font-display text-3xl">{longDay(selected)}</h2>
          </div>
          {selected === today ? (
            <p className="text-sm font-semibold text-pine">Vandaag</p>
          ) : (
            <button type="button" className="h-11 font-semibold text-pine" onClick={() => setDay(today)}>
              Terug naar vandaag
            </button>
          )}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            aria-label="Vorige dag"
            onClick={() => setDay(shiftDay(selected, -1))}
            className="flex size-11 items-center justify-center rounded-lg border border-line bg-canvas"
          >
            <ChevronLeft className="size-5" />
          </button>
          <label className="block min-w-0 flex-1">
            <span className="sr-only">Datum</span>
            <input
              type="date"
              value={selected}
              max={today}
              onChange={(event) => {
                if (event.target.value) setDay(event.target.value);
              }}
              className="h-11 w-full rounded-lg border border-line bg-canvas px-3 text-ink"
            />
          </label>
          <button
            type="button"
            aria-label="Volgende dag"
            disabled={selected >= today}
            onClick={() => setDay(shiftDay(selected, 1))}
            className="flex size-11 items-center justify-center rounded-lg border border-line bg-canvas disabled:opacity-40"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <Empty onSettings={() => setView("instellingen")} />
      ) : (
        categories.map((category) => (
          <CategoryBlock
            key={category.id}
            category={category}
            activities={activities.filter((activity) => activity.categoryId === category.id)}
            selected={selected}
            entries={entries}
            weekStart={weekStart}
            monthStart={monthStart}
            today={today}
            onToggle={(activityId) => toggleEntry(activityId, selected)}
          />
        ))
      )}

      <section className="rounded-lg border border-line bg-paper p-4">
        <h2 className="font-display text-2xl">Op deze dag</h2>
        {onDay.length === 0 ? (
          <p className="mt-2 text-muted">Nog niets afgevinkt. Kies een activiteit hierboven.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {onDay.map((entry) => {
              const activity = activities.find((item) => item.id === entry.activityId);
              if (!activity) return null;
              return (
                <li key={entry.id} className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center">
                  <p className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
                    <span className={`size-3 shrink-0 rounded-full ${swatchBg(activity.color)}`} />
                    <span className="truncate">{activity.name}</span>
                  </p>
                  <label className="block sm:w-48">
                    <span className="sr-only">Datum van {activity.name}</span>
                    <input
                      type="date"
                      value={entry.date}
                      max={today}
                      onChange={(event) => {
                        if (event.target.value) moveEntry(entry.id, event.target.value);
                      }}
                      className="h-11 w-full rounded-lg border border-line bg-canvas px-3"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="h-11 font-semibold text-copper"
                  >
                    Verwijder
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function CategoryBlock({
  category,
  activities,
  selected,
  entries,
  weekStart,
  monthStart,
  today,
  onToggle,
}: {
  category: Category;
  activities: Activity[];
  selected: string;
  entries: { activityId: string; date: string }[];
  weekStart: string;
  monthStart: string;
  today: string;
  onToggle: (activityId: string) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-display text-2xl">
        <span className={`size-3 rounded-full ${swatchBg(category.color)}`} />
        {category.name}
      </h2>
      {activities.length === 0 ? (
        <p className="text-muted">Nog geen activiteiten in deze categorie.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {activities.map((activity) => {
            const done = entries.some((entry) => entry.activityId === activity.id && entry.date === selected);
            const week = entries.filter(
              (entry) => entry.activityId === activity.id && entry.date >= weekStart && entry.date <= today,
            ).length;
            const month = entries.filter(
              (entry) => entry.activityId === activity.id && entry.date >= monthStart && entry.date <= today,
            ).length;
            return (
              <li key={activity.id}>
                <button
                  type="button"
                  aria-pressed={done}
                  onClick={() => onToggle(activity.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left ${done ? "border-pine bg-pine-soft" : "border-line bg-paper"}`}
                >
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full ${done ? `${swatchBg(activity.color)} text-paper` : "border border-line bg-canvas"}`}
                  >
                    {done ? <Check className="size-5" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-semibold">{activity.name}</span>
                    <span className="block text-sm text-muted">
                      Deze week {week}× · deze maand {month}×
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-pine">{done ? "Gedaan" : "Afvinken"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Empty({ onSettings }: { onSettings: () => void }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-6">
      <h2 className="font-display text-2xl">Nog geen categorieën</h2>
      <p className="mt-2 text-muted">Maak eerst een categorie, en daaronder de activiteiten die je wilt tellen.</p>
      <button
        type="button"
        onClick={onSettings}
        className="mt-4 inline-flex h-11 items-center rounded-lg bg-pine px-4 font-semibold text-paper"
      >
        Naar instellingen
      </button>
    </div>
  );
}
