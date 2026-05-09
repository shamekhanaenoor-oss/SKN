import { createFileRoute } from "@tanstack/react-router";
import { BookLoans } from "@/pages/Crud";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/book-loans")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><BookLoans /></RequireAcademicYear></AppLayout></RequireAuth>;
}
