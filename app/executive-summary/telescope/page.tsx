import TheTelescope from '@/components/executive-summary/TheTelescope';
import Breadcrumb from '@/components/ui/Breadcrumb';

export default function TelescopePage() {
  return (
    <>
      <div className="bg-slate-950 border-b border-slate-800 px-6 py-3">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Executive Summary', href: '/executive-summary' },
          { label: 'The Telescope' },
        ]} />
      </div>
      <TheTelescope />
    </>
  );
}
