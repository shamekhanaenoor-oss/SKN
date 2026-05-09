import { createFileRoute } from "@tanstack/react-router";
import UniformsPage from "@/pages/UniformsPage";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/uniforms")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><UniformsPage /></RequireAcademicYear></AppLayout></RequireAuth>;
}
