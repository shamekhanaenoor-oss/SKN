// UI-only mode: bypass academic year check
export default function RequireAcademicYear({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
