import { createFileRoute } from "@tanstack/react-router";
import { Health } from "@/pages/Crud";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/health")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><Health /></RequireAcademicYear></AppLayout></RequireAuth>;
}
