import { createFileRoute } from "@tanstack/react-router";
import { StudentParents } from "@/pages/Crud";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/student-parents")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><StudentParents /></RequireAcademicYear></AppLayout></RequireAuth>;
}
