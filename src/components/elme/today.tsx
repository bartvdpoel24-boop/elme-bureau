import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { longDay, shiftDay } from "@/lib/elme/dates";
import { amount, reminderDue, type Activity, type Category, type Label } from "@/lib/elme/model";
import { useElme } from "@/lib/elme/store";
import { swatchBg } from "@/components/elme/swatches";

export function Today({ today, signedIn = false }: { today: string; signedIn?: boolean }) {
  const categories = useElme((state) => state.categories);
  const activities = useElme((state) => state.activities);
  const labels = useElme((state) => state.labels);
  const entries = useElme((state) => state.entries);
  const changeCount = useElme((state) => state.changeCount);
  const toggleLabel = useElme((state) => state.toggleLabel);
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
        <Empty onSettings={() => setView("instellingen")} signedIn={signedIn} />
      ) : (
        categories.map((category) => (
          <CategoryBlock
            key={category.id}
            category={category}
            activities={activities.filter((activity) => activity.categoryId === category.id)}
            labels={labels.filter((label) => label.categoryId === category.id)}
            selected={selected}
            entries={entries}
            weekStart={weekStart}
            monthStart={monthStart}
            today={today}
            onChange={(activityId, delta) => changeCount(activityId, selected, delta)}
            onToggleLabel={(activityId, labelId) => toggleLabel(activityId, selected, labelId)}
          />
        ))
      )}

      <section className="rounded-lg border border-line bg-paper p-4">
        <h2 className="font-display text-2xl">Op deze dag</h2>
        {onDay.length === 0 ? (
          <p className="mt-2 text-muted">Nog niets genoteerd. Gebruik plus bij een activiteit.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {onDay.map((entry) => {
              const activity = activities.find((item) => item.id === entry.activityId);
              const picked = labels.filter((label) => entry.labelIds?.includes(label.id)).map((label) => label.name);
              if (!activity) return null;
              return (
                <li key={entry.id} className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center">
                  <p className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
                    <span className={`size-3 shrink-0 rounded-full ${swatchBg(activity.color)}`} />
                    <span className="truncate">
                      {activity.name} · {amount(entry)}×
                      {picked.length ? ` · ${picked.join(", ")}` : ""}
                    </span>
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
  labels,
  selected,
  entries,
  weekStart,
  monthStart,
  today,
  onChange,
  onToggleLabel,
}: {
  category: Category;
  activities: Activity[];
  labels: Label[];
  selected: string;
  entries: { activityId: string; date: string; count?: number; labelIds?: string[] }[];
  weekStart: string;
  monthStart: string;
  today: string;
  onChange: (activityId: string, delta: number) => void;
  onToggleLabel: (activityId: string, labelId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
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
            const dayEntries = entries.filter((entry) => entry.activityId === activity.id && entry.date === selected);
            const count = dayEntries.reduce((sum, entry) => sum + amount(entry), 0);
            const chosen = new Set(dayEntries.flatMap((entry) => entry.labelIds ?? []));
            const week = entries
              .filter((entry) => entry.activityId === activity.id && entry.date >= weekStart && entry.date <= today)
              .reduce((sum, entry) => sum + amount(entry), 0);
            const month = entries
              .filter((entry) => entry.activityId === activity.id && entry.date >= monthStart && entry.date <= today)
              .reduce((sum, entry) => sum + amount(entry), 0);
            const due = reminderDue(activity, entries, today);
            const open = openId === activity.id;
            return (
              <li
                key={activity.id}
                className={`rounded-lg border px-3 py-3 ${count > 0 ? "border-pine bg-pine-soft" : "border-line bg-paper"}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${count > 0 ? `${swatchBg(activity.color)} text-paper` : "border border-line bg-canvas"}`}
                  >
                    {count > 0 ? count : ""}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-semibold">{activity.name}</span>
                    <span className="block text-sm text-muted">
                      Deze week {week}× · deze maand {month}×
                    </span>
                    {due ? <span className="block text-sm font-semibold text-copper">Tijd om dit weer te doen</span> : null}
                  </span>
                  <span className="flex items-center gap-1">
                    {labels.length > 0 ? (
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-label={`Labels voor ${activity.name}`}
                        onClick={() => setOpenId(open ? null : activity.id)}
                        className="flex size-11 items-center justify-center rounded-lg border border-line bg-paper"
                      >
                        <ChevronDown className={`size-5 transition ${open ? "rotate-180" : ""}`} />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-label={`Minder ${activity.name}`}
                      disabled={count === 0}
                      onClick={() => onChange(activity.id, -1)}
                      className="flex size-11 items-center justify-center rounded-lg border border-line bg-paper disabled:opacity-40"
                    >
                      <Minus className="size-5" />
                    </button>
                    <span className="w-8 text-center text-lg font-semibold">{count}</span>
                    <button
                      type="button"
                      aria-label={`Meer ${activity.name}`}
                      onClick={() => onChange(activity.id, 1)}
                      className={`flex size-11 items-center justify-center rounded-lg text-paper ${swatchBg(activity.color)}`}
                    >
                      <Plus className="size-5" />
                    </button>
                  </span>
                </div>
                {open ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3" role="group" aria-label={`Labels ${activity.name}`}>
                    {labels.map((label) => {
                      const on = chosen.has(label.id);
                      return (
                        <button
                          key={label.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => onToggleLabel(activity.id, label.id)}
                          className={`h-11 rounded-lg px-3 font-semibold ${on ? "bg-pine text-paper" : "border border-line bg-paper"}`}
                        >
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Empty({ onSettings, signedIn }: { onSettings: () => void; signedIn: boolean }) {
  const loadDemo = useElme((state) => state.loadDemo);
  return (
    <div className="rounded-lg border border-line bg-paper p-6">
      <h2 className="font-display text-2xl">Nog geen categorieën</h2>
      <p className="mt-2 text-muted">
        {signedIn ? "Maak een categorie met activiteiten die je wilt tellen." : "Maak een categorie met activiteiten, of laad de demo om te zien hoe tellen werkt."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSettings}
          className="inline-flex h-11 items-center rounded-lg bg-pine px-4 font-semibold text-paper"
        >
          Naar instellingen
        </button>
        {signedIn ? null : (
          <button
            type="button"
            onClick={() => loadDemo()}
            className="inline-flex h-11 items-center rounded-lg border border-line bg-canvas px-4 font-semibold"
          >
            Laad demo
          </button>
        )}
      </div>
    </div>
  );
}
