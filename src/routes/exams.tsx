import { createFileRoute } from "@tanstack/react-router";
import { Exams } from "@/pages/Crud";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/exams")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><Exams /></RequireAcademicYear></AppLayout></RequireAuth>;
}
