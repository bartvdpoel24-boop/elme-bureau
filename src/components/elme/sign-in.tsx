import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";

const GUEST_KEY = "telme-guest";

export function SignInCard({ onLocal, onDemo }: { onLocal?: () => void; onDemo?: () => void }) {
  const google = GROK_PROVIDERS.find((provider) => provider.idp === "google");
  const rest = GROK_PROVIDERS.filter((provider) => provider.idp !== "google");

  function local() {
    if (onLocal) {
      onLocal();
      return;
    }
    localStorage.setItem(GUEST_KEY, "1");
    window.location.assign("/");
  }

  function demo() {
    if (onDemo) {
      onDemo();
      return;
    }
    localStorage.setItem(GUEST_KEY, "demo");
    window.location.assign("/");
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-line bg-paper p-6">
      <p className="text-sm font-semibold text-pine">TelMe</p>
      <h2 className="mt-1 font-display text-3xl">Begin leeg, of log in</h2>
      <p className="mt-2 text-muted">
        Zonder account blijft je log in deze browser. Met Google staat het ook in de cloud.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <button type="button" onClick={local} className="h-11 rounded-lg bg-pine px-4 font-semibold text-paper">
          Doorgaan zonder login
        </button>
        <button type="button" onClick={demo} className="h-11 rounded-lg border border-line bg-canvas px-4 font-semibold">
          Bekijk de demo
        </button>
        {google ? (
          <button
            type="button"
            onClick={() => signIn(google.providerId, { callbackURL: "/" })}
            className="h-11 rounded-lg border border-line bg-canvas px-4 font-semibold"
          >
            Doorgaan met Google
          </button>
        ) : null}
        {rest.map((provider) => (
          <button
            key={provider.providerId}
            type="button"
            onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
            className="h-11 rounded-lg border border-line bg-canvas px-4 font-semibold"
          >
            Doorgaan met {provider.label}
          </button>
        ))}
      </div>
    </div>
  );
}
