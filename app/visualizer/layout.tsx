import { Monitor } from 'lucide-react';

export default function VisualizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Mobile notice — visualizer needs a wide viewport */}
      <div className="md:hidden flex items-center justify-center min-h-screen bg-slate-900 p-8 text-center">
        <div className="space-y-4 max-w-xs">
          <Monitor className="w-10 h-10 text-slate-500 mx-auto" />
          <h2 className="text-lg font-semibold text-white">Best on Desktop</h2>
          <p className="text-sm text-slate-400">
            The interactive visualizer needs a wider screen to display the data model. Please switch to a desktop or tablet in landscape mode.
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-[#D04A02] text-white text-sm rounded-md hover:bg-[#E87722] transition-colors"
          >
            Back to Overview
          </a>
        </div>
      </div>
      <div className="hidden md:contents">{children}</div>
    </>
  );
}
