import { createFileRoute } from "@tanstack/react-router";
import UsersPage from "@/pages/UsersPage";
import RequireAuth from "@/components/RequireAuth";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/users")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><UsersPage /></AppLayout></RequireAuth>;
}
