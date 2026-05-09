import { createFileRoute } from "@tanstack/react-router";
import { StaffPoints } from "@/pages/Crud";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/staff-points")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><StaffPoints /></RequireAcademicYear></AppLayout></RequireAuth>;
}
