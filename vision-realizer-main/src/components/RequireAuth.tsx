import { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">در حال بارگذاری...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  return <>{children}</>;
}
