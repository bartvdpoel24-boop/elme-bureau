import { PEOPLE, initials, todayISO, weekHours } from "@/lib/elme/model";
import { useElme } from "@/lib/elme/store";

export function Team() {
  const jobs = useElme((state) => state.jobs);
  const ownerFilter = useElme((state) => state.ownerFilter);
  const setOwnerFilter = useElme((state) => state.setOwnerFilter);
  const setView = useElme((state) => state.setView);
  const today = todayISO();

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {PEOPLE.map((person) => {
        const booked = weekHours(person.id, jobs, today);
        const ratio = person.capacity === 0 ? 0 : booked / person.capacity;
        const over = booked - person.capacity;
        const active = ownerFilter === person.id;
        return (
          <li key={person.id}>
            <button
              type="button"
              onClick={() => {
                setOwnerFilter(active ? "alle" : person.id);
                setView("bord");
              }}
              className={`flex w-full flex-col gap-4 rounded-lg border bg-paper p-4 text-left transition-colors ${
                active ? "border-pine" : "border-line hover:border-pine"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-pine font-semibold text-paper">
                  {initials(person.name)}
                </span>
                <span>
                  <span className="block font-semibold">{person.name}</span>
                  <span className="block text-sm text-muted">{person.role}</span>
                </span>
              </span>
              <span>
                <span className="flex items-baseline justify-between text-sm">
                  <span className="text-muted">Deze week</span>
                  <span className="tabular-nums font-semibold">
                    {booked} / {person.capacity} u
                  </span>
                </span>
                <span className="mt-2 block h-2 overflow-hidden rounded-full bg-pine-soft">
                  <span
                    className={`block h-full ${over > 0 ? "bg-copper" : "bg-pine"}`}
                    style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
                  />
                </span>
                <span className={`mt-2 block text-sm ${over > 0 ? "font-semibold text-copper" : "text-muted"}`}>
                  {over > 0 ? `${over} uur boven capaciteit` : "Binnen de weekcapaciteit"}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
