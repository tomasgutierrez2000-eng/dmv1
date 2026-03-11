import TheLivingBlueprint from '@/components/executive-summary/TheLivingBlueprint';
import Breadcrumb from '@/components/ui/Breadcrumb';

export default function BlueprintPage() {
  return (
    <>
      <div className="bg-slate-950 border-b border-slate-800 px-6 py-3">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Executive Summary', href: '/executive-summary' },
          { label: 'Living Blueprint' },
        ]} />
      </div>
      <TheLivingBlueprint />
    </>
  );
}
