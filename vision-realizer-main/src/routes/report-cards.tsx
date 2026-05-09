import { createFileRoute } from "@tanstack/react-router";
import { ReportCards } from "@/pages/Crud";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/report-cards")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><ReportCards /></RequireAcademicYear></AppLayout></RequireAuth>;
}
