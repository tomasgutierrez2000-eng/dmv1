'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Rocket,
  Map,
  Layers,
  FileCode2,
  BarChart3,
  FolderTree,
  Plug,
  LayoutDashboard,
  ChefHat,
  BookOpen,
} from 'lucide-react'
import { GUIDE_SECTIONS, type GuideSection } from './registry'

/* ── Icon resolver ─────────────────────────────────────────────── */
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Rocket, Map, Layers, FileCode2, BarChart3,
  FolderTree, Plug, LayoutDashboard, ChefHat, BookOpen,
}

function SectionIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name]
  return Icon ? <Icon className={className} /> : null
}

/* ── Sidebar ───────────────────────────────────────────────────── */
function Sidebar({
  activeId,
  onNavigate,
  expandedSections,
  toggleSection,
}: {
  activeId: string
  onNavigate: (id: string) => void
  expandedSections: Set<string>
  toggleSection: (id: string) => void
}) {
  return (
    <nav className="space-y-1">
      {GUIDE_SECTIONS.map((section, idx) => {
        const isActive = activeId === section.id ||
          section.subsections?.some(s => activeId === s.id)
        const isExpanded = expandedSections.has(section.id)

        return (
          <div key={section.id}>
            {/* Section header */}
            <button
              onClick={() => {
                onNavigate(section.id)
                if (section.subsections?.length) toggleSection(section.id)
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors group ${
                isActive
                  ? 'bg-slate-700/60 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className="text-[10px] font-mono text-slate-500 w-5 text-right flex-shrink-0">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <SectionIcon name={section.icon} className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate font-medium">{section.title}</span>
              {section.badge && (
                <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                  {section.badge}
                </span>
              )}
              {section.subsections?.length ? (
                isExpanded
                  ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              ) : null}
            </button>

            {/* Subsections */}
            {isExpanded && section.subsections && (
              <div className="ml-[30px] pl-3 border-l border-slate-700/60 mt-1 mb-2 space-y-0.5">
                {section.subsections.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => onNavigate(sub.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                      activeId === sub.id
                        ? 'text-white bg-slate-700/40'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {sub.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

/* ── Progress bar ──────────────────────────────────────────────── */
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-0.5 bg-slate-800 w-full">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

/* ── Main layout ───────────────────────────────────────────────── */
export default function GuideLayout({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState(GUIDE_SECTIONS[0]?.id ?? '')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(GUIDE_SECTIONS.map(s => s.id)) // start all expanded
  )
  const [progress, setProgress] = useState(0)

  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const navigateTo = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveId(id)
    }
    setMobileOpen(false)
  }, [])

  /* Scroll-spy: track which section is in view */
  useEffect(() => {
    const allIds = GUIDE_SECTIONS.flatMap(s => [
      s.id,
      ...(s.subsections?.map(sub => sub.id) ?? []),
    ])

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )

    allIds.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  /* Progress tracking */
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="flex items-center justify-between px-4 lg:px-6 h-14">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Platform</span>
            </Link>
            <div className="h-5 w-px bg-slate-700" />
            <h1 className="font-semibold text-white text-sm sm:text-base tracking-tight">
              Team Playbook
            </h1>
            <span className="hidden sm:inline text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono">
              v1.0
            </span>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        <ProgressBar progress={progress} />
      </header>

      <div className="flex pt-14">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block fixed left-0 top-14 bottom-0 w-72 overflow-y-auto border-r border-slate-800 bg-slate-900/60 px-3 py-6 scrollbar-thin">
          <div className="mb-4 px-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">
              Table of Contents
            </p>
          </div>
          <Sidebar
            activeId={activeId}
            onNavigate={navigateTo}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          />
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40 pt-14">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <aside className="relative w-72 h-full bg-slate-900 border-r border-slate-800 overflow-y-auto px-3 py-6 scrollbar-thin">
              <Sidebar
                activeId={activeId}
                onNavigate={navigateTo}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
              />
            </aside>
          </div>
        )}

        {/* Content area */}
        <main className="flex-1 lg:ml-72 min-h-screen">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-32">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
