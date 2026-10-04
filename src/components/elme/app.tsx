import { useEffect, useState } from "react";
import { BarChart3, CalendarRange, CheckCheck, Settings } from "lucide-react";
import { Insights } from "@/components/elme/insights";
import { Settings as SettingsView } from "@/components/elme/settings";
import { SignInCard } from "@/components/elme/sign-in";
import { Today } from "@/components/elme/today";
import { YearView } from "@/components/elme/year";
import { loadLog, saveLog, type LogSnapshot } from "@/lib/elme/api";
import { seedActivities, seedCategories, seedEntries, isoDate } from "@/lib/elme/model";
import { useElme, type View } from "@/lib/elme/store";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const VIEWS: { id: View; label: string; icon: typeof CheckCheck }[] = [
  { id: "vandaag", label: "Vandaag", icon: CheckCheck },
  { id: "inzicht", label: "Inzicht", icon: BarChart3 },
  { id: "jaar", label: "Jaar", icon: CalendarRange },
  { id: "instellingen", label: "Instellingen", icon: Settings },
];

const OWNER_KEY = "elme-cloud-user";

function snapshot(state: { categories: LogSnapshot["categories"]; activities: LogSnapshot["activities"]; entries: LogSnapshot["entries"] }): LogSnapshot {
  return {
    categories: state.categories,
    activities: state.activities,
    entries: state.entries,
  };
}

export function ElmeApp() {
  const { user, isPending } = useCurrentUserState();
  const [ready, setReady] = useState(false);
  const [cloudNote, setCloudNote] = useState("Je log wordt in je account bewaard.");

  const userId = user?.id;

  useEffect(() => {
    if (isPending) return;
    if (!userId) {
      setReady(false);
      return;
    }
    let cancel = false;
    setReady(false);
    const run = async () => {
      if (!useElme.persist.hasHydrated()) await useElme.persist.rehydrate();
      const remote = await loadLog();
      if (cancel) return;
      const owner = window.localStorage.getItem(OWNER_KEY);
      const empty = remote.categories.length === 0 && remote.activities.length === 0 && remote.entries.length === 0;
      if (empty && owner && owner !== userId) {
        const fresh = { categories: seedCategories(), activities: seedActivities(), entries: seedEntries() };
        useElme.getState().replace(fresh);
        await saveLog({ data: fresh });
      } else if (empty) {
        await saveLog({ data: snapshot(useElme.getState()) });
      } else {
        useElme.getState().replace(remote);
      }
      window.localStorage.setItem(OWNER_KEY, userId);
      if (!cancel) {
        setCloudNote("Je log staat in je account.");
        setReady(true);
      }
    };
    void run().catch(() => {
      if (!cancel) setCloudNote("Opslaan in de cloud lukt nu niet. Je wijzigingen blijven in deze browser.");
      if (!cancel) setReady(true);
    });
    return () => {
      cancel = true;
    };
  }, [isPending, userId]);

  useEffect(() => {
    if (!ready || !userId) return;
    let timer = 0;
    const unsubscribe = useElme.subscribe((state, previous) => {
      if (state.categories === previous.categories && state.activities === previous.activities && state.entries === previous.entries) {
        return;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void saveLog({ data: snapshot(state) })
          .then(() => setCloudNote("Je log staat in je account."))
          .catch(() => setCloudNote("Opslaan in de cloud lukt nu niet. Je wijzigingen blijven in deze browser."));
      }, 400);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [ready, userId]);

  const today = isoDate(new Date());

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="bg-pine text-paper">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-5 sm:px-6">
          <Mark />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-pine-soft">Tellen en vertellen</p>
            <h1 className="font-display text-4xl leading-none">TelMe</h1>
          </div>
          {user ? (
            <div className="rounded-lg bg-paper px-2 py-1 text-ink">
              <UserButton />
            </div>
          ) : null}
        </div>
      </header>
      {isPending ? <Loading /> : null}
      {!isPending && !user ? (
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <SignInCard />
        </main>
      ) : null}
      {!isPending && user && !ready ? <Loading /> : null}
      {!isPending && user && ready ? <Desk today={today} cloudNote={cloudNote} /> : null}
    </div>
  );
}

function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="h-11 w-48 animate-pulse rounded-lg bg-line" />
      <div className="mt-6 h-40 animate-pulse rounded-lg bg-paper" />
    </main>
  );
}

function Desk({ today, cloudNote }: { today: string; cloudNote: string }) {
  const view = useElme((state) => state.view);
  const setView = useElme((state) => state.setView);
  const reset = useElme((state) => state.reset);

  return (
    <>
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
          <p>{cloudNote}</p>
          <button type="button" className="h-11 text-left font-semibold text-pine" onClick={() => reset()}>
            Zet het voorbeeld terug
          </button>
        </footer>
      </main>
    </>
  );
}

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="size-11 text-pine" aria-hidden>
      <rect width="32" height="32" rx="7" className="fill-paper" />
      <path d="M6.5 7h19v4.6h-7.2V25h-4.6V11.6H6.5V7z" className="fill-pine" />
    </svg>
  );
}
