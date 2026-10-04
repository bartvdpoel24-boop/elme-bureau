import { createFileRoute } from "@tanstack/react-router";
import { ElmeApp } from "@/components/elme/app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <ElmeApp />;
}
