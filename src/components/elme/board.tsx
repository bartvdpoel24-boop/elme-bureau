import { ArrowLeft, ArrowRight } from "lucide-react";
import { formatDay } from "@/components/elme/format";
import {
  PRIORITY_LABEL,
  STATUSES,
  STATUS_LABEL,
  initials,
  isOverdue,
  personById,
  todayISO,
  type Job,
  type Priority,
  type Status,
} from "@/lib/elme/model";
import { useElme } from "@/lib/elme/store";

type Props = { onOpen: (job: Job) => void };

const PRIORITY_RANK: Record<Priority, number> = { hoog: 0, normaal: 1, laag: 2 };

function matches(job: Job, query: string, ownerFilter: string): boolean {
  if (ownerFilter !== "alle" && job.ownerId !== ownerFilter) return false;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const owner = personById(job.ownerId)?.name ?? "";
  return `${job.title} ${job.client} ${job.note} ${owner}`.toLowerCase().includes(needle);
}

export function Board({ onOpen }: Props) {
  const jobs = useElme((state) => state.jobs);
  const query = useElme((state) => state.query);
  const ownerFilter = useElme((state) => state.ownerFilter);
  const moveJob = useElme((state) => state.moveJob);
  const today = todayISO();
  const visible = jobs.filter((job) => matches(job, query, ownerFilter));

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {STATUSES.map((status) => {
        const column = visible
          .filter((job) => job.status === status)
          .sort((a, b) => compareJobs(a, b, status, today));
        return (
          <section key={status} className="min-w-0" aria-label={STATUS_LABEL[status]}>
            <header className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl">{STATUS_LABEL[status]}</h2>
              <span className="tabular-nums text-sm text-muted">{column.length}</span>
            </header>
            <ul className="grid gap-3">
              {column.length === 0 ? (
                <li className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-muted">
                  Geen opdrachten
                </li>
              ) : (
                column.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    today={today}
                    onOpen={onOpen}
                    onMove={moveJob}
                  />
                ))
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function compareJobs(a: Job, b: Job, status: Status, today: string): number {
  if (status === "klaar") return b.due.localeCompare(a.due);
  const lateA = isOverdue(a, today) ? 0 : 1;
  const lateB = isOverdue(b, today) ? 0 : 1;
  if (lateA !== lateB) return lateA - lateB;
  if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) {
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  }
  return a.due.localeCompare(b.due);
}

function JobCard({
  job,
  today,
  onOpen,
  onMove,
}: {
  job: Job;
  today: string;
  onOpen: (job: Job) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const owner = personById(job.ownerId);
  const late = isOverdue(job, today);
  const index = STATUSES.indexOf(job.status);

  return (
    <li className="rounded-lg border border-line bg-paper p-3">
      <button type="button" onClick={() => onOpen(job)} className="block w-full text-left">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <PriorityDot priority={job.priority} />
          {PRIORITY_LABEL[job.priority]}
        </span>
        <span className="mt-1 block font-semibold">{job.title}</span>
        <span className="mt-1 block text-sm text-muted">{job.client}</span>
        <span className="mt-3 flex items-center gap-2 text-sm">
          <span className="grid size-7 place-items-center rounded-full bg-pine text-xs font-semibold text-paper">
            {initials(owner?.name ?? "?")}
          </span>
          <span className="min-w-0 truncate text-muted">{owner?.name}</span>
          <span className="ml-auto shrink-0 tabular-nums text-muted">{job.hours} u</span>
        </span>
        <span className={`mt-2 block text-sm ${late ? "font-semibold text-copper" : "text-muted"}`}>
          {late ? "Te laat · " : ""}
          {formatDay(job.due)}
        </span>
      </button>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="grid size-11 place-items-center rounded-lg border border-line disabled:opacity-40"
          aria-label="Naar vorige kolom"
          disabled={index <= 0}
          onClick={() => onMove(job.id, -1)}
        >
          <ArrowLeft className="size-4" />
        </button>
        <button
          type="button"
          className="grid size-11 flex-1 place-items-center rounded-lg border border-line text-sm font-semibold disabled:opacity-40"
          aria-label="Naar volgende kolom"
          disabled={index >= STATUSES.length - 1}
          onClick={() => onMove(job.id, 1)}
        >
          <ArrowRight className="size-4" />
        </button>
      </div>
    </li>
  );
}

function PriorityDot({ priority }: { priority: Priority }) {
  const tone =
    priority === "hoog" ? "bg-copper" : priority === "normaal" ? "bg-pine" : "bg-line";
  return <span className={`size-2 rounded-full ${tone}`} aria-hidden />;
}
