import { createFileRoute } from "@tanstack/react-router";
import RevenuePage from "@/pages/RevenuePage";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/revenue")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><RevenuePage /></RequireAcademicYear></AppLayout></RequireAuth>;
}
