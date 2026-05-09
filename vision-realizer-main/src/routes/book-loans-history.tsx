import { createFileRoute } from "@tanstack/react-router";
import BookLoansPage from "@/pages/BookLoansPage";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/book-loans-history")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><BookLoansPage /></RequireAcademicYear></AppLayout></RequireAuth>;
}
