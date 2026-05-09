// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { CategoryManager } from "@/components/CategoryManager";
import RequireAuth from "@/components/RequireAuth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/idcard-drivers")({
  head: () => ({ meta: [{ title: "راننده‌گان — کارت هویت" }] }),
  component: () => (
    <RequireAuth>
      <AppLayout>
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <Link to="/id-cards">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowRight className="w-4 h-4" /> برگشت به کارت هویت
            </Button>
          </Link>
        </div>
        <CategoryManager category="drivers" title="راننده‌گان" />
      </AppLayout>
    </RequireAuth>
  ),
});
