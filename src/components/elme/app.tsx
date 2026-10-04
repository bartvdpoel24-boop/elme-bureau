import { useEffect } from "react";
import { BarChart3, CalendarRange, CheckCheck, Settings } from "lucide-react";
import { Insights } from "@/components/elme/insights";
import { Settings as SettingsView } from "@/components/elme/settings";
import { Today } from "@/components/elme/today";
import { YearView } from "@/components/elme/year";
import { isoDate } from "@/lib/elme/model";
import { useElme, type View } from "@/lib/elme/store";

const VIEWS: { id: View; label: string; icon: typeof CheckCheck }[] = [
  { id: "vandaag", label: "Vandaag", icon: CheckCheck },
  { id: "inzicht", label: "Inzicht", icon: BarChart3 },
  { id: "jaar", label: "Jaar", icon: CalendarRange },
  { id: "instellingen", label: "Instellingen", icon: Settings },
];

export function ElmeApp() {
  useEffect(() => {
    void useElme.persist.rehydrate();
  }, []);

  const today = isoDate(new Date());
  return <Desk today={today} />;
}

function Desk({ today }: { today: string }) {
  const view = useElme((state) => state.view);
  const setView = useElme((state) => state.setView);
  const reset = useElme((state) => state.reset);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="bg-pine text-paper">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-5 sm:px-6">
          <Mark />
          <div>
            <p className="text-sm text-pine-soft">Activiteiten bijhouden</p>
            <h1 className="font-display text-4xl leading-none">Elme</h1>
          </div>
        </div>
      </header>

      <div className="border-b border-line bg-canvas">
        <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6">
          <nav className="flex gap-2 overflow-x-auto" aria-label="Onderdelen">
            {VIEWS.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-lg px-4 font-semibold ${
                    active ? "bg-pine text-paper" : "border border-line bg-paper text-ink"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {view === "vandaag" ? <Today today={today} /> : null}
        {view === "inzicht" ? <Insights today={today} /> : null}
        {view === "jaar" ? <YearView today={today} /> : null}
        {view === "instellingen" ? <SettingsView /> : null}
        <footer className="mt-8 flex flex-col gap-2 border-t border-line pt-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Je log blijft in deze browser staan.</p>
          <button type="button" className="h-11 text-left font-semibold text-pine" onClick={() => reset()}>
            Zet het voorbeeld terug
          </button>
        </footer>
      </main>
    </div>
  );
}

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="size-11 text-pine" aria-hidden>
      <rect width="32" height="32" rx="7" className="fill-paper" />
      <path d="M9 8h14v3.2H12.4v3.4h8.8v3H12.4V20.8H23V24H9V8z" className="fill-pine" />
    </svg>
  );
}
