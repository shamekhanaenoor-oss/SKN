import { createFileRoute } from "@tanstack/react-router";
import TransportListPage from "@/pages/TransportListPage";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/transport-list")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><TransportListPage /></RequireAcademicYear></AppLayout></RequireAuth>;
}
