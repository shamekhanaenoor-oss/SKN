import { createFileRoute } from "@tanstack/react-router";
import { ExamResults } from "@/pages/Crud";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/exam-results")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><ExamResults /></RequireAcademicYear></AppLayout></RequireAuth>;
}
