import { createFileRoute } from "@tanstack/react-router";
import StudentsPage from "@/pages/StudentsPage";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/students")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><StudentsPage /></RequireAcademicYear></AppLayout></RequireAuth>;
}
