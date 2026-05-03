import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import BackupPanel from "@/components/BackupPanel";
import IdSettingsPanel from "@/components/IdSettingsPanel";
import LocationSettingsPanel from "@/components/LocationSettingsPanel";
import SchoolProfilePanel from "@/components/SchoolProfilePanel";
import StudentImportPanel from "@/components/StudentImportPanel";

export default function Settings() {
  const { user, roles } = useAuth();
  return (
    <div className="space-y-6">
      <PageHeader title="تنظیمات" description="اطلاعات حساب و پشتیبان‌گیری" />
      <Card className="shadow-card max-w-2xl">
        <CardHeader><CardTitle>حساب کاربری</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">ایمیل</p>
            <p className="font-medium" dir="ltr">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">شناسه کاربر (User ID)</p>
            <p className="font-mono text-xs break-all" dir="ltr">{user?.id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">نقش‌ها</p>
            <div className="flex gap-2 flex-wrap">
              {roles.length === 0 && <Badge variant="outline">هیچ نقشی تخصیص داده نشده</Badge>}
              {roles.map((r) => <Badge key={r}>{r}</Badge>)}
            </div>
          </div>
        </CardContent>
      </Card>

      <SchoolProfilePanel />
      <LocationSettingsPanel />
      <IdSettingsPanel />
      <StudentImportPanel />
      <BackupPanel />
    </div>
  );
}

