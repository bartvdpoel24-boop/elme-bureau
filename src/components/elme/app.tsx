import { useEffect, useState, useSyncExternalStore } from "react";
import { BarChart3, CalendarRange, CheckCheck, Menu } from "lucide-react";
import { Insights } from "@/components/elme/insights";
import { Settings as SettingsView } from "@/components/elme/settings";
import { SignInCard } from "@/components/elme/sign-in";
import { Today } from "@/components/elme/today";
import { YearView } from "@/components/elme/year";
import { FeedbackDialog } from "@/components/elme/feedback";
import { loadLog, saveLog, type LogSnapshot } from "@/lib/elme/api";
import { isoDate } from "@/lib/elme/model";
import { useElme, type View } from "@/lib/elme/store";
import { authEnabled, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";

const VIEWS: { id: View; label: string; icon: typeof CheckCheck }[] = [
  { id: "vandaag", label: "Vandaag", icon: CheckCheck },
  { id: "inzicht", label: "Inzicht", icon: BarChart3 },
  { id: "jaar", label: "Jaar", icon: CalendarRange },
];

const OWNER_KEY = "elme-cloud-user";
const GUEST_KEY = "telme-guest";

function snapshot(state: LogSnapshot): LogSnapshot {
  return {
    categories: state.categories,
    activities: state.activities,
    entries: state.entries,
    labels: state.labels ?? [],
  };
}

const emptyLog: LogSnapshot = { categories: [], activities: [], entries: [], labels: [] };

export function ElmeApp() {
  const { user, isPending } = useCurrentUserState();
  const [ready, setReady] = useState(false);
  const [guest, setGuest] = useState(false);
  const [bootChecked, setBootChecked] = useState(false);
  const [cloudNote, setCloudNote] = useState("Je log wordt in je account bewaard.");

  const userId = user?.id;

  useEffect(() => {
    if (isPending) return;
    if (userId) {
      window.localStorage.removeItem(GUEST_KEY);
      setGuest(false);
      setBootChecked(true);
      return;
    }
    const flag = window.localStorage.getItem(GUEST_KEY);
    if (flag !== "1" && flag !== "demo") {
      setGuest(false);
      setBootChecked(true);
      return;
    }
    let cancel = false;
    void (async () => {
      if (!useElme.persist.hasHydrated()) await useElme.persist.rehydrate();
      if (cancel) return;
      if (flag === "demo") useElme.getState().loadDemo();
      window.localStorage.setItem(GUEST_KEY, "1");
      setGuest(true);
      setCloudNote("Alleen in deze browser. Log in om het in de cloud te bewaren.");
      setBootChecked(true);
    })();
    return () => {
      cancel = true;
    };
  }, [isPending, userId]);

  async function begin(kind: "local" | "demo") {
    if (!useElme.persist.hasHydrated()) await useElme.persist.rehydrate();
    if (kind === "demo") useElme.getState().loadDemo();
    window.localStorage.setItem(GUEST_KEY, "1");
    setGuest(true);
    setCloudNote("Alleen in deze browser. Log in om het in de cloud te bewaren.");
    setBootChecked(true);
  }

  function leaveGuest() {
    window.localStorage.removeItem(GUEST_KEY);
    setGuest(false);
  }

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
        useElme.getState().replace(emptyLog);
        await saveLog({ data: emptyLog });
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
      if (state.categories === previous.categories && state.activities === previous.activities && state.entries === previous.entries && state.labels === previous.labels) {
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
  const showDesk = Boolean(user && ready) || (guest && !user);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="relative z-20 bg-pine text-paper">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-5 sm:px-6">
          <Mark />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-4xl leading-none">TelMe</h1>
          </div>
          <AppMenu signedIn={Boolean(user)} showDesk={showDesk} onLogin={leaveGuest} />
        </div>
      </header>
      {!bootChecked || isPending ? <Loading /> : null}
      {bootChecked && !isPending && !user && !guest ? (
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <SignInCard onLocal={() => void begin("local")} onDemo={() => void begin("demo")} />
        </main>
      ) : null}
      {bootChecked && !isPending && user && !ready ? <Loading /> : null}
      {bootChecked && !isPending && showDesk ? <Desk today={today} cloudNote={cloudNote} signedIn={Boolean(user)} /> : null}
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

function Desk({ today, cloudNote, signedIn }: { today: string; cloudNote: string; signedIn: boolean }) {
  const view = useElme((state) => state.view);
  const setView = useElme((state) => state.setView);
  const loadDemo = useElme((state) => state.loadDemo);
  const clear = useElme((state) => state.clear);

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
        {view === "vandaag" ? <Today today={today} signedIn={signedIn} /> : null}
        {view === "inzicht" ? <Insights today={today} /> : null}
        {view === "jaar" ? <YearView today={today} /> : null}
        {view === "instellingen" ? <SettingsView /> : null}
        <footer className="mt-8 flex flex-col gap-2 border-t border-line pt-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{cloudNote}</p>
          <div className="flex gap-4">
            {signedIn ? null : (
              <button type="button" className="h-11 font-semibold text-pine" onClick={() => loadDemo()}>
                Laad demo
              </button>
            )}
            <button
              type="button"
              className="h-11 font-semibold text-pine"
              onClick={() => {
                if (window.confirm("Alle categorieën en tellingen wissen?")) clear();
              }}
            >
              Maak leeg
            </button>
          </div>
        </footer>
      </main>
    </>
  );
}

function AppMenu({ signedIn, showDesk, onLogin }: { signedIn: boolean; showDesk: boolean; onLogin: () => void }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const user = useCurrentUser();
  const setView = useElme((state) => state.setView);
  const gateSession = useSyncExternalStore(subscribeNothing, hasGateSessionMarker, () => false);
  const name = user?.displayName ?? user?.primaryEmail ?? "";

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex size-11 items-center justify-center rounded-lg border border-pine-soft text-paper"
      >
        <Menu className="size-5" />
      </button>
      {open ? (
        <>
          <button type="button" aria-label="Sluit menu" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-2 w-60 rounded-lg border border-line bg-paper p-2 text-ink">
            {name ? <p className="truncate px-3 py-2 text-sm text-muted">{name}</p> : null}
            {showDesk ? (
              <button
                type="button"
                className="flex h-11 w-full items-center rounded-lg px-3 text-left font-semibold"
                onClick={() => {
                  setView("instellingen");
                  setOpen(false);
                }}
              >
                Instellingen
              </button>
            ) : null}
            <button
              type="button"
              className="flex h-11 w-full items-center rounded-lg px-3 text-left font-semibold"
              onClick={() => {
                setFeedback(true);
                setOpen(false);
              }}
            >
              Feedback
            </button>
            {signedIn && authEnabled && !gateSession ? (
              <button
                type="button"
                disabled={signingOut}
                className="flex h-11 w-full items-center rounded-lg px-3 text-left font-semibold disabled:opacity-60"
                onClick={() => {
                  setSigningOut(true);
                  void signOut().catch(() => setSigningOut(false));
                }}
              >
                {signingOut ? "Bezig…" : "Uitloggen"}
              </button>
            ) : null}
            {!signedIn && showDesk ? (
              <button
                type="button"
                className="flex h-11 w-full items-center rounded-lg px-3 text-left font-semibold"
                onClick={() => {
                  setOpen(false);
                  onLogin();
                }}
              >
                Inloggen
              </button>
            ) : null}
          </div>
        </>
      ) : null}
      <FeedbackDialog open={feedback} onClose={() => setFeedback(false)} />
    </div>
  );
}

const subscribeNothing = () => () => {};

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="size-11" aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-paper" />
      <path d="M5.2 6.1h21.6v5H19.3V26H12.7V11.1H5.2V6.1z" className="fill-pine" />
      <path d="M20.5 14.2h2.1v9.2h-2.1zM23.4 16.6h2.1v6.8h-2.1zM26.3 19h2.1v4.4h-2.1z" className="fill-copper" />
    </svg>
  );
}
