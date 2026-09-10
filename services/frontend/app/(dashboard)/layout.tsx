import ResponsiveDashboardLayout from '@/components/layout/responsive-dashboard-layout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveDashboardLayout>{children}</ResponsiveDashboardLayout>;
}
