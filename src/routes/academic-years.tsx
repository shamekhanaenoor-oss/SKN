import { createFileRoute } from "@tanstack/react-router";
import { AcademicYears } from "@/pages/Crud";
import RequireAuth from "@/components/RequireAuth";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/academic-years")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><AcademicYears /></AppLayout></RequireAuth>;
}
