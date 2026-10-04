import { useEffect, useState } from "react";
import { Columns3, LayoutDashboard, Plus, Search, Users } from "lucide-react";
import { Board } from "@/components/elme/board";
import { formatLong } from "@/components/elme/format";
import { JobDialog, type Draft } from "@/components/elme/job-dialog";
import { Overview } from "@/components/elme/overview";
import { Team } from "@/components/elme/team";
import { PEOPLE, type Job } from "@/lib/elme/model";
import { useElme, type View } from "@/lib/elme/store";

const VIEWS: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overzicht", label: "Overzicht", icon: LayoutDashboard },
  { id: "bord", label: "Bord", icon: Columns3 },
  { id: "team", label: "Team", icon: Users },
];

export function ElmeApp() {
  useEffect(() => {
    void useElme.persist.rehydrate();
  }, []);

  return <Desk />;
}

function Desk() {
  const view = useElme((state) => state.view);
  const setView = useElme((state) => state.setView);
  const query = useElme((state) => state.query);
  const setQuery = useElme((state) => state.setQuery);
  const ownerFilter = useElme((state) => state.ownerFilter);
  const setOwnerFilter = useElme((state) => state.setOwnerFilter);
  const addJob = useElme((state) => state.addJob);
  const updateJob = useElme((state) => state.updateJob);
  const removeJob = useElme((state) => state.removeJob);
  const reset = useElme((state) => state.reset);
  const [draft, setDraft] = useState<Draft | null>(null);

  function openJob(job: Job) {
    setDraft({ mode: "edit", job });
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="bg-pine text-paper">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Mark />
            <div>
              <p className="text-sm text-pine-soft">Bureau · interne werktafel</p>
              <h1 className="font-display text-4xl leading-none">Elme</h1>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <p className="text-sm capitalize text-pine-soft">{formatLong()}</p>
            <button
              type="button"
              onClick={() => setDraft({ mode: "new" })}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-paper px-4 font-semibold text-pine"
            >
              <Plus className="size-4" />
              Nieuwe opdracht
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-line bg-canvas">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6">
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
          <div className="grid gap-2 sm:grid-cols-4">
            <label className="relative block sm:col-span-3">
              <span className="sr-only">Zoeken</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Zoek opdracht, klant of notitie"
                className="h-11 w-full rounded-lg border border-line bg-paper pr-3 pl-10 text-ink outline-none placeholder:text-muted"
              />
            </label>
            <label className="block">
              <span className="sr-only">Filter op persoon</span>
              <select
                value={ownerFilter}
                onChange={(event) => setOwnerFilter(event.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none"
              >
                <option value="alle">Iedereen</option>
                {PEOPLE.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {view === "overzicht" ? <Overview onOpen={openJob} /> : null}
        {view === "bord" ? <Board onOpen={openJob} /> : null}
        {view === "team" ? <Team /> : null}
        <footer className="mt-8 flex flex-col gap-2 border-t border-line pt-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Opdrachten blijven in deze browser staan.</p>
          <button type="button" className="h-11 text-left font-semibold text-pine" onClick={() => reset()}>
            Zet demodata terug
          </button>
        </footer>
      </main>

      <JobDialog
        draft={draft}
        onClose={() => setDraft(null)}
        onSave={(input, id) => {
          if (id) updateJob(id, input);
          else addJob(input);
          setDraft(null);
        }}
        onDelete={(id) => {
          removeJob(id);
          setDraft(null);
        }}
      />
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
