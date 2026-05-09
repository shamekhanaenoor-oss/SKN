import { createFileRoute } from "@tanstack/react-router";
import LibraryPage from "@/pages/LibraryPage";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/library-books")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><LibraryPage /></RequireAcademicYear></AppLayout></RequireAuth>;
}
