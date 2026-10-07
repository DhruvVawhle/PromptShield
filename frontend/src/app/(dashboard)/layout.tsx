import { ProtectedDashboardLayout } from "@/components/auth/ProtectedDashboardLayout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedDashboardLayout>{children}</ProtectedDashboardLayout>;
}