import { createFileRoute } from "@tanstack/react-router";
import AnnouncementsPage from "@/pages/AnnouncementsPage";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/announcements")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><AnnouncementsPage /></RequireAcademicYear></AppLayout></RequireAuth>;
}
