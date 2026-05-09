import { createFileRoute } from "@tanstack/react-router";
import Settings from "@/pages/Settings";
import RequireAuth from "@/components/RequireAuth";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/settings")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><Settings /></AppLayout></RequireAuth>;
}
