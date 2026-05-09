import { createFileRoute } from "@tanstack/react-router";
import AccountingPage from "@/pages/AccountingPage";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/accounting")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><AccountingPage /></RequireAcademicYear></AppLayout></RequireAuth>;
}
