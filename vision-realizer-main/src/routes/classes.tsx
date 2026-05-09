import { createFileRoute } from "@tanstack/react-router";
import { Classes } from "@/pages/Crud";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/classes")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><Classes /></RequireAcademicYear></AppLayout></RequireAuth>;
}
