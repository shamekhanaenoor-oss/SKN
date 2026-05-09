import { createFileRoute } from "@tanstack/react-router";
import PaymentsPage from "@/pages/PaymentsPage";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/payments")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><PaymentsPage /></RequireAcademicYear></AppLayout></RequireAuth>;
}
