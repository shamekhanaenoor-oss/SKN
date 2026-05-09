import { createFileRoute } from "@tanstack/react-router";
import { Parents } from "@/pages/Crud";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/parents")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><Parents /></RequireAcademicYear></AppLayout></RequireAuth>;
}
