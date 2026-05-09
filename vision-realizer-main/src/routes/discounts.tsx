import { createFileRoute } from "@tanstack/react-router";
import DiscountsPage from "@/pages/DiscountsPage";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/discounts")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><DiscountsPage /></RequireAcademicYear></AppLayout></RequireAuth>;
}
