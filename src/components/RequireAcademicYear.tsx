import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Loader2 } from "lucide-react";
import { useAcademicYear } from "@/lib/academic-year";

export default function RequireAcademicYear({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { hasYear, loading } = useAcademicYear();

  // در حال بارگیری — صبر کن
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // سال تحصیلی وجود ندارد
  if (!hasYear) {
    return (
      <div className="flex justify-center items-center h-64">
        <Card className="max-w-md w-full shadow-elegant">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <CalendarDays className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-bold">سال تحصیلی تعریف نشده</h2>
            <p className="text-sm text-muted-foreground">
              برای استفاده از این بخش، ابتدا باید یک سال تحصیلی ایجاد کنید.
            </p>
            <Button onClick={() => navigate("/academic-years")} className="w-full">
              <CalendarDays className="w-4 h-4 ml-2" />
              رفتن به سال تحصیلی
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
