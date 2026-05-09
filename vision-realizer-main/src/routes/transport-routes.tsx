import { createFileRoute } from "@tanstack/react-router";
import { TransportRoutes } from "@/pages/Crud";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/transport-routes")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><TransportRoutes /></RequireAcademicYear></AppLayout></RequireAuth>;
}
