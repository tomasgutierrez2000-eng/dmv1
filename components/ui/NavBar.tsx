'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  Activity,
  Layers,
  Library,
  Columns3,
  MessageCircle,
  BookOpen,
  Target,
  Telescope,
  Cpu,
  Map,
  Database,
  GitBranch,
  Sun,
  Moon,
} from 'lucide-react';

// Pages where the global nav should be hidden (they have their own chrome)
const HIDDEN_ON = ['/visualizer'];

interface DropdownItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function NavDropdown({
  label,
  icon: Icon,
  bg,
  hoverBg,
  accentColor,
  items,
  isActive,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  hoverBg: string;
  accentColor: string;
  items: DropdownItem[];
  isActive: boolean;
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        aria-haspopup="true"
        className={`${bg} group-hover:${hoverBg} group-focus-within:${hoverBg} text-white rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 py-1.5 px-2.5 cursor-pointer whitespace-nowrap ${isActive ? 'ring-1 ring-white/30' : ''}`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </button>
      <div className="absolute top-full left-0 pt-1 z-[60] opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-150">
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden min-w-[180px]">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 transition-colors"
            >
              <item.icon className={`w-3.5 h-3.5 ${accentColor} flex-shrink-0`} />
              <span className="text-xs text-white">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Hide on specific pages
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) {
    return null;
  }

  const isActive = (prefix: string) => pathname.startsWith(prefix);

  return (
    <nav className="theme-stable border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-50">
      {/* Skip to content — keyboard a11y */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[70] focus:px-3 focus:py-1.5 focus:bg-[#D04A02] focus:text-white focus:rounded-md focus:text-sm"
      >
        Skip to content
      </a>
      <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center gap-2 flex-wrap">
        {/* Logo / Home link */}
        <Link
          href="/"
          className={`text-sm font-semibold text-white hover:text-orange-300 transition-colors mr-3 whitespace-nowrap ${pathname === '/' ? 'text-orange-300' : ''}`}
        >
          Bank Data Model
        </Link>

        <div className="w-px h-5 bg-slate-700 mr-1 hidden sm:block" />

        {/* Executive Summary dropdown */}
        <NavDropdown
          label="Executive Summary"
          icon={Activity}
          bg="bg-[#D04A02]"
          hoverBg="bg-[#E87722]"
          accentColor="text-[#E87722]"
          isActive={isActive('/executive-summary')}
          items={[
            { href: '/executive-summary', icon: Activity, label: 'The Pulse' },
            { href: '/executive-summary/pick-a-metric', icon: Target, label: 'Pick a Metric' },
            { href: '/executive-summary/telescope', icon: Telescope, label: 'The Telescope' },
            { href: '/executive-summary/blueprint', icon: Cpu, label: 'Living Blueprint' },
          ]}
        />

        {/* Architecture dropdown */}
        <NavDropdown
          label="Architecture"
          icon={Layers}
          bg="bg-teal-600"
          hoverBg="bg-teal-500"
          accentColor="text-teal-400"
          isActive={isActive('/architecture')}
          items={[
            { href: '/architecture', icon: Layers, label: 'Pipeline' },
            { href: '/architecture/overview', icon: Map, label: 'Data Model Overview' },
            { href: '/architecture/reference-data', icon: Database, label: 'Reference Data' },
            { href: '/visualizer', icon: Map, label: 'Interactive Visualizer' },
          ]}
        />

        {/* Metrics */}
        <Link
          href="/metrics/library"
          className={`bg-violet-600 hover:bg-violet-500 text-white rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 py-1.5 px-2.5 whitespace-nowrap ${isActive('/metrics') ? 'ring-1 ring-white/30' : ''}`}
        >
          <Library className="w-3.5 h-3.5" />
          <span>Metrics</span>
        </Link>

        {/* Data Elements dropdown */}
        <NavDropdown
          label="Data Elements"
          icon={Columns3}
          bg="bg-cyan-600"
          hoverBg="bg-cyan-500"
          accentColor="text-cyan-400"
          isActive={isActive('/data-elements') || isActive('/db-status') || isActive('/taxonomy')}
          items={[
            { href: '/data-elements', icon: Columns3, label: 'Data Elements' },
            { href: '/db-status', icon: Database, label: 'DB Status' },
            { href: '/taxonomy', icon: GitBranch, label: 'Enterprise Taxonomy' },
          ]}
        />

        {/* Ask AI */}
        <Link
          href="/agent"
          className={`bg-slate-700 hover:bg-slate-600 text-white rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 py-1.5 px-2.5 whitespace-nowrap ${isActive('/agent') ? 'ring-1 ring-white/30' : ''}`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Ask AI</span>
        </Link>

        {/* Playbook */}
        <Link
          href="/guide"
          className={`bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 py-1.5 px-2.5 whitespace-nowrap ${isActive('/guide') ? 'ring-1 ring-white/30' : ''}`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Playbook</span>
        </Link>

        {/* Theme toggle */}
        <button
          type="button"
          aria-label={mounted ? (theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') : 'Toggle theme'}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="ml-auto bg-slate-700 hover:bg-slate-600 text-white rounded-md p-1.5 transition-colors cursor-pointer"
        >
          {mounted ? (
            theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />
          ) : (
            <Sun className="w-3.5 h-3.5 opacity-0" />
          )}
        </button>
      </div>
    </nav>
  );
}
