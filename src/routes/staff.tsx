import { createFileRoute } from "@tanstack/react-router";
import { Staff } from "@/pages/Crud";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/staff")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><Staff /></RequireAcademicYear></AppLayout></RequireAuth>;
}
