'use client';

import React from 'react';

export interface LineageSection {
  id: string;
  title: string;
  children: React.ReactNode;
}

export interface LineagePageLayoutProps {
  title: string;
  /** Optional subtitle or one-liner. */
  subtitle?: React.ReactNode;
  sections: LineageSection[];
  /** Optional class for the outer container. */
  className?: string;
}

/**
 * Shared layout for metric lineage pages: title, optional subtitle, and a list of sections.
 * Use this to avoid duplicating the same structure across DSCRLineageView, WABRLineageView, etc.
 * Each lineage view supplies sections (e.g. "Definition", "L1/L2/L3 tables", "Formula", "Demo").
 */
export default function LineagePageLayout({ title, subtitle, sections, className = '' }: LineagePageLayoutProps) {
  return (
    <div className={`space-y-10 pb-12 ${className}`}>
      <header>
        <h1 className="text-2xl font-bold text-pwc-white">{title}</h1>
        {subtitle && <p className="mt-1 text-pwc-gray-light text-sm">{subtitle}</p>}
      </header>
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-pwc-white mb-3">{section.title}</h2>
          <div className="text-pwc-gray-light">{section.children}</div>
        </section>
      ))}
    </div>
  );
}
