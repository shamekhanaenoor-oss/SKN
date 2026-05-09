import { createFileRoute } from "@tanstack/react-router";
import { Attendance } from "@/pages/Crud";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/attendance")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><Attendance /></RequireAcademicYear></AppLayout></RequireAuth>;
}
