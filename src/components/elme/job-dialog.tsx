import { useEffect, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  PEOPLE,
  PRIORITIES,
  PRIORITY_LABEL,
  STATUSES,
  STATUS_LABEL,
  isoFromToday,
  type Job,
  type JobInput,
  type Priority,
  type Status,
} from "@/lib/elme/model";

const fieldClass =
  "h-11 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none placeholder:text-muted";

export type Draft = { mode: "new" } | { mode: "edit"; job: Job };

type Props = {
  draft: Draft | null;
  onClose: () => void;
  onSave: (input: JobInput, id?: string) => void;
  onDelete: (id: string) => void;
};

function blank(): JobInput {
  return {
    title: "",
    client: "",
    ownerId: PEOPLE[0]?.id ?? "noor",
    status: "nieuw",
    priority: "normaal",
    due: isoFromToday(1),
    hours: 2,
    note: "",
  };
}

export function JobDialog({ draft, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState<JobInput>(blank);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!draft) return;
    setError("");
    setConfirmDelete(false);
    setForm(draft.mode === "edit" ? { ...draft.job } : blank());
  }, [draft]);

  function update<K extends keyof JobInput>(key: K, value: JobInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const title = form.title.trim();
    const client = form.client.trim();
    if (!title) {
      setError("Geef de opdracht een naam.");
      return;
    }
    if (!client) {
      setError("Vul een klant of ‘Intern’ in.");
      return;
    }
    if (!form.due) {
      setError("Kies een deadline.");
      return;
    }
    if (!Number.isFinite(form.hours) || form.hours <= 0) {
      setError("Uren moet meer dan nul zijn.");
      return;
    }
    onSave(
      { ...form, title, client, note: form.note.trim(), hours: Math.round(form.hours * 2) / 2 },
      draft?.mode === "edit" ? draft.job.id : undefined,
    );
  }

  return (
    <Dialog.Root open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="fixed inset-x-4 top-4 bottom-4 z-50 mx-auto flex w-full max-w-lg flex-col overflow-hidden rounded-lg border border-line bg-paper sm:inset-x-auto sm:top-16 sm:bottom-16 sm:left-1/2 sm:-translate-x-1/2">
          <form onSubmit={submit} className="flex min-h-0 flex-col">
            <div className="border-b border-line px-5 py-4">
              <Dialog.Title className="font-display text-2xl text-ink">
                {draft?.mode === "edit" ? "Opdracht bewerken" : "Nieuwe opdracht"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                Zichtbaar voor iedereen die deze werktafel opent in deze browser.
              </Dialog.Description>
            </div>
            <div className="grid gap-4 overflow-y-auto px-5 py-4 sm:grid-cols-2">
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-sm font-semibold">Opdracht</span>
                <input
                  className={fieldClass}
                  value={form.title}
                  maxLength={80}
                  onChange={(event) => update("title", event.target.value)}
                  autoFocus
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-semibold">Klant</span>
                <input
                  className={fieldClass}
                  value={form.client}
                  maxLength={60}
                  onChange={(event) => update("client", event.target.value)}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-semibold">Eigenaar</span>
                <select
                  className={fieldClass}
                  value={form.ownerId}
                  onChange={(event) => update("ownerId", event.target.value)}
                >
                  {PEOPLE.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-semibold">Status</span>
                <select
                  className={fieldClass}
                  value={form.status}
                  onChange={(event) => update("status", event.target.value as Status)}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABEL[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-semibold">Prioriteit</span>
                <select
                  className={fieldClass}
                  value={form.priority}
                  onChange={(event) => update("priority", event.target.value as Priority)}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {PRIORITY_LABEL[priority]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-semibold">Deadline</span>
                <input
                  type="date"
                  className={fieldClass}
                  value={form.due}
                  onChange={(event) => update("due", event.target.value)}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-semibold">Uren</span>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  className={`${fieldClass} tabular-nums`}
                  value={form.hours}
                  onChange={(event) => update("hours", event.target.valueAsNumber)}
                />
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-sm font-semibold">Notitie</span>
                <textarea
                  className="min-h-24 w-full rounded-lg border border-line bg-paper px-3 py-2 text-ink outline-none"
                  value={form.note}
                  maxLength={280}
                  onChange={(event) => update("note", event.target.value)}
                />
              </label>
              {error ? (
                <p className="text-sm font-semibold text-copper sm:col-span-2" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4">
              {draft?.mode === "edit" ? (
                confirmDelete ? (
                  <button
                    type="button"
                    className="h-11 rounded-lg bg-copper px-4 font-semibold text-paper"
                    onClick={() => onDelete(draft.job.id)}
                  >
                    Ja, verwijderen
                  </button>
                ) : (
                  <button
                    type="button"
                    className="h-11 rounded-lg px-3 font-semibold text-copper"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Verwijderen
                  </button>
                )
              ) : null}
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  className="h-11 rounded-lg border border-line bg-paper px-4 font-semibold"
                  onClick={onClose}
                >
                  Annuleren
                </button>
                <button type="submit" className="h-11 rounded-lg bg-pine px-4 font-semibold text-paper">
                  Opslaan
                </button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
