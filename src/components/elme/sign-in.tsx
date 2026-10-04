import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";

export function SignInCard() {
  const google = GROK_PROVIDERS.find((provider) => provider.idp === "google");
  const rest = GROK_PROVIDERS.filter((provider) => provider.idp !== "google");
  return (
    <div className="w-full max-w-md rounded-lg border border-line bg-paper p-6">
      <p className="text-sm font-semibold text-pine">TelMe</p>
      <h2 className="mt-1 font-display text-3xl">Log in om je activiteiten te bewaren</h2>
      <p className="mt-2 text-muted">Met Google blijft je log in de cloud staan, ook op een ander apparaat.</p>
      <div className="mt-5 flex flex-col gap-2">
        {google ? (
          <button
            type="button"
            onClick={() => signIn(google.providerId, { callbackURL: "/" })}
            className="h-11 rounded-lg bg-pine px-4 font-semibold text-paper"
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
