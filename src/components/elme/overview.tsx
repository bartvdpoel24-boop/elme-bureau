import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDay } from "@/components/elme/format";
import {
  PEOPLE,
  STATUS_LABEL,
  initials,
  isOpen,
  isOverdue,
  isThisWeek,
  isoFromToday,
  personById,
  todayISO,
  weekHours,
  type Job,
} from "@/lib/elme/model";
import { useElme } from "@/lib/elme/store";

type Props = { onOpen: (job: Job) => void };

export function Overview({ onOpen }: Props) {
  const jobs = useElme((state) => state.jobs);
  const query = useElme((state) => state.query);
  const ownerFilter = useElme((state) => state.ownerFilter);
  const today = todayISO();

  const open = jobs.filter(isOpen);
  const busy = jobs.filter((job) => job.status === "bezig");
  const late = jobs.filter((job) => isOverdue(job, today));
  const hours = jobs.filter((job) => isThisWeek(job, today)).reduce((sum, job) => sum + job.hours, 0);

  const chart = PEOPLE.map((person) => {
    const booked = weekHours(person.id, jobs, today);
    return {
      id: person.id,
      name: person.name.split(" ")[0] ?? person.name,
      ingepland: booked,
      capaciteit: person.capacity,
      over: booked > person.capacity,
    };
  });
  const peak = Math.max(8, ...chart.map((row) => Math.max(row.ingepland, row.capaciteit)));
  const yMax = Math.ceil((peak * 1.25) / 4) * 4;

  const needle = query.trim().toLowerCase();
  const attention = jobs
    .filter((job) => isOpen(job) && (isOverdue(job, today) || job.due <= today))
    .filter((job) => ownerFilter === "alle" || job.ownerId === ownerFilter)
    .filter((job) => {
      if (!needle) return true;
      const owner = personById(job.ownerId)?.name ?? "";
      return `${job.title} ${job.client} ${job.note} ${owner}`.toLowerCase().includes(needle);
    })
    .sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title, "nl"));

  const stats = [
    { label: "Open", value: String(open.length), warn: false },
    { label: "Bezig", value: String(busy.length), warn: false },
    { label: "Uren deze week", value: String(hours), warn: false },
    { label: "Te laat", value: String(late.length), warn: late.length > 0 },
  ];

  return (
    <div className="grid gap-6">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-paper px-4 py-4">
            <dt className="text-sm text-muted">{stat.label}</dt>
            <dd
              className={`mt-1 font-display text-4xl tabular-nums ${stat.warn ? "text-copper" : "text-ink"}`}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="min-w-0 rounded-lg border border-line bg-paper p-4 lg:col-span-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">Bezetting deze week</h2>
              <p className="text-sm text-muted">Open uren tot en met {formatDay(isoFromToday(6))}.</p>
            </div>
            <div className="flex gap-4 text-sm text-muted">
              <span className="inline-flex items-center gap-2">
                <span className="size-3 bg-pine" /> Ingepland
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-3 bg-pine-soft" /> Capaciteit
              </span>
            </div>
          </div>
          <div className="mt-4 h-64" role="img" aria-label="Uren per persoon deze week">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--color-line)" />
                <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  width={36}
                  domain={[0, yMax]}
                  tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-pine-soft)" }}
                  contentStyle={{
                    background: "var(--color-paper)",
                    border: "1px solid var(--color-line)",
                    borderRadius: 12,
                    color: "var(--color-ink)",
                  }}
                />
                <Bar dataKey="capaciteit" fill="var(--color-pine-soft)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ingepland" radius={[4, 4, 0, 0]}>
                  {chart.map((row) => (
                    <Cell key={row.id} fill={row.over ? "var(--color-copper)" : "var(--color-pine)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-paper p-4 lg:col-span-2">
          <h2 className="font-display text-2xl">Vandaag</h2>
          <p className="text-sm text-muted">Open werk dat vandaag of eerder af moet.</p>
          <ul className="mt-4 grid gap-2">
            {attention.length === 0 ? (
              <li className="rounded-lg bg-canvas px-3 py-4 text-sm text-muted">Niets dat nu aandacht vraagt.</li>
            ) : (
              attention.map((job) => {
                const owner = personById(job.ownerId);
                const lateJob = isOverdue(job, today);
                return (
                  <li key={job.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(job)}
                      className="flex w-full items-start gap-3 rounded-lg border border-line px-3 py-3 text-left transition-colors hover:border-pine"
                    >
                      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-pine text-xs font-semibold text-paper">
                        {initials(owner?.name ?? "?")}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{job.title}</span>
                        <span className="block text-sm text-muted">
                          {job.client} · {STATUS_LABEL[job.status]} · {job.hours} u
                        </span>
                        <span className={`block text-sm ${lateJob ? "font-semibold text-copper" : "text-muted"}`}>
                          {lateJob ? "Te laat · " : ""}
                          {formatDay(job.due)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
