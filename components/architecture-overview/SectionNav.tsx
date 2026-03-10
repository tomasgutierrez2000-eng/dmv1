'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Waypoints, GitBranch, Camera, Layers, Triangle } from 'lucide-react';
import { useOverviewStore } from './useOverviewStore';
import type { SectionId } from './types';

const SECTIONS: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'spine', label: 'The Spine', icon: Waypoints },
  { id: 'branches', label: 'Dimensions', icon: GitBranch },
  { id: 'l2-snapshots', label: 'Snapshots', icon: Camera },
  { id: 'l3-derived', label: 'Derived (L3)', icon: Layers },
  { id: 'rollup', label: 'Rollup', icon: Triangle },
];

export default function SectionNav() {
  const activeSection = useOverviewStore((s) => s.activeSection);
  const setActiveSection = useOverviewStore((s) => s.setActiveSection);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      // Find the most visible section
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length > 0) {
        setActiveSection(visible[0].target.id as SectionId);
      }
    },
    [setActiveSection]
  );

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: '-80px 0px -50% 0px',
      threshold: [0, 0.25, 0.5],
    });

    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [handleIntersect]);

  const scrollTo = (id: SectionId) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-1">
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        const isActive = activeSection === s.id;

        return (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
              transition-all duration-200 whitespace-nowrap
              ${isActive
                ? 'bg-slate-800 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }
            `}
          >
            <Icon className="w-3.5 h-3.5" />
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}
