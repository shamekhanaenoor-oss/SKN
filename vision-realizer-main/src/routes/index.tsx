import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/pages/Dashboard";
import RequireAuth from "@/components/RequireAuth";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><Dashboard /></AppLayout></RequireAuth>;
}
