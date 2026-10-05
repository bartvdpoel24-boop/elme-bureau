import { useState } from "react";

const ISSUE = "https://github.com/bartvdpoel24-boop/elme-bureau/issues/new";

export function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState("");

  function send() {
    const body = text.trim();
    if (!body) return;
    const url = new URL(ISSUE);
    url.searchParams.set("title", "TelMe feedback");
    url.searchParams.set("body", body.slice(0, 6000));
    window.open(url.toString(), "_blank", "noopener,noreferrer");
    setText("");
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-ink/40 p-4 sm:place-items-center" role="presentation" onClick={onClose}>
      <form
        role="dialog"
        aria-labelledby="feedback-title"
        className="w-full max-w-md rounded-lg bg-paper p-5 text-ink"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <h2 id="feedback-title" className="font-display text-2xl">
          Feedback
        </h2>
        <p className="mt-1 text-sm text-muted">
          Je bericht opent als issue in GitHub. Bevestig het daar, dan staat het in de repo.
        </p>
        <label className="mt-4 block">
          <span className="sr-only">Je feedback</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={5}
            maxLength={6000}
            required
            placeholder="Wat werkt niet, of wat mis je?"
            className="w-full rounded-lg border border-line bg-canvas px-3 py-2"
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={!text.trim()} className="h-11 rounded-lg bg-pine px-4 font-semibold text-paper disabled:opacity-40">
            Naar GitHub
          </button>
          <button type="button" className="h-11 px-3 font-semibold" onClick={onClose}>
            Annuleer
          </button>
        </div>
      </form>
    </div>
  );
}
