/**
 * Metric Studio layout — full-bleed, no sidebar.
 * The studio canvas needs maximum screen real estate.
 */

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      {children}
    </div>
  );
}
