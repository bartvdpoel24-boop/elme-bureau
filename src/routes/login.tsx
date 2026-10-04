import { createFileRoute } from "@tanstack/react-router";
import { SignInCard } from "@/components/elme/sign-in";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6 text-ink">
      <SignInCard />
    </main>
  );
}
