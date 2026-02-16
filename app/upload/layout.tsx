import DashboardWrapper from '@/components/dashboard/DashboardWrapper';

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardWrapper>
      <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', color: '#111827' }}>
        {children}
      </div>
    </DashboardWrapper>
  );
}
