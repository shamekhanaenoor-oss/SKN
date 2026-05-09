import { createFileRoute } from "@tanstack/react-router";
import StudentList from "@/pages/StudentList";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/student-list")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><StudentList /></RequireAcademicYear></AppLayout></RequireAuth>;
}
