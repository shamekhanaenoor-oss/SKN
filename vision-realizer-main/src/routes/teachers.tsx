import { createFileRoute } from "@tanstack/react-router";
import { Teachers } from "@/pages/Crud";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/teachers")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><Teachers /></RequireAcademicYear></AppLayout></RequireAuth>;
}
