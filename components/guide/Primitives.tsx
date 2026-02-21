/**
 * Guide Primitives
 * ────────────────
 * Reusable building blocks for guide sections.
 * Use these to keep sections consistent and easy to author.
 */

import { ReactNode } from 'react'
import { Info, AlertTriangle, Lightbulb, FileCode2, ArrowRight } from 'lucide-react'

/* ── Section wrapper — renders the scroll-target id ─────────── */
export function Section({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 mb-20">
      {children}
    </section>
  )
}

/* ── Sub-section wrapper ───────────────────────────────────────── */
export function SubSection({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-20 mb-12">
      {children}
    </div>
  )
}

/* ── Headings ──────────────────────────────────────────────────── */
export function SectionTitle({ children, badge }: { children: ReactNode; badge?: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
        {children}
      </h2>
      {badge && (
        <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono uppercase">
          {badge}
        </span>
      )}
    </div>
  )
}

export function SubTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 tracking-tight">
      {children}
    </h3>
  )
}

export function SubSubTitle({ children }: { children: ReactNode }) {
  return (
    <h4 className="text-base font-semibold text-slate-200 mb-3">
      {children}
    </h4>
  )
}

/* ── Body text ─────────────────────────────────────────────────── */
export function P({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-slate-300 leading-relaxed mb-4">
      {children}
    </p>
  )
}

export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="text-base text-slate-200 leading-relaxed mb-6">
      {children}
    </p>
  )
}

/* ── Callout boxes ─────────────────────────────────────────────── */
const CALLOUT_STYLES = {
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Info, iconColor: 'text-blue-400', title: 'text-blue-300' },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle, iconColor: 'text-amber-400', title: 'text-amber-300' },
  tip: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: Lightbulb, iconColor: 'text-emerald-400', title: 'text-emerald-300' },
  code: { bg: 'bg-slate-800/60', border: 'border-slate-600/40', icon: FileCode2, iconColor: 'text-slate-400', title: 'text-slate-200' },
}

export function Callout({
  type = 'info',
  title,
  children,
}: {
  type?: keyof typeof CALLOUT_STYLES
  title?: string
  children: ReactNode
}) {
  const s = CALLOUT_STYLES[type]
  const Icon = s.icon
  return (
    <div className={`${s.bg} border ${s.border} rounded-lg p-4 mb-6`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${s.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          {title && <p className={`text-sm font-semibold ${s.title} mb-1`}>{title}</p>}
          <div className="text-sm text-slate-300 leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  )
}

/* ── Code block ────────────────────────────────────────────────── */
export function CodeBlock({
  title,
  language,
  children,
}: {
  title?: string
  language?: string
  children: string
}) {
  return (
    <div className="mb-6 rounded-lg overflow-hidden border border-slate-700/60">
      {title && (
        <div className="bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-slate-700/60">
          <FileCode2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-400 font-mono">{title}</span>
          {language && (
            <span className="ml-auto text-[10px] text-slate-500 font-mono uppercase">{language}</span>
          )}
        </div>
      )}
      <pre className="bg-slate-900/80 p-4 overflow-x-auto">
        <code className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre">
          {children}
        </code>
      </pre>
    </div>
  )
}

/* ── Annotated code — lines with comments ──────────────────────── */
export interface AnnotatedLine {
  code: string
  comment?: string
}

export function AnnotatedCode({
  title,
  lines,
}: {
  title?: string
  lines: AnnotatedLine[]
}) {
  return (
    <div className="mb-6 rounded-lg overflow-hidden border border-slate-700/60">
      {title && (
        <div className="bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-slate-700/60">
          <FileCode2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-400 font-mono">{title}</span>
        </div>
      )}
      <div className="bg-slate-900/80 divide-y divide-slate-800/60">
        {lines.map((line, i) => (
          <div key={i} className="px-4 py-2 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
            <code className="text-xs text-slate-300 font-mono flex-shrink-0 whitespace-pre">
              {line.code}
            </code>
            {line.comment && (
              <span className="text-xs text-slate-500 italic sm:ml-auto flex-shrink-0">
                {line.comment}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Diagram box — container for visual diagrams ───────────────── */
export function DiagramBox({
  title,
  children,
  caption,
}: {
  title?: string
  children: ReactNode
  caption?: string
}) {
  return (
    <div className="mb-8 rounded-xl border border-slate-700/60 bg-slate-900/40 overflow-hidden">
      {title && (
        <div className="px-5 py-3 border-b border-slate-700/40 bg-slate-800/40">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">{title}</p>
        </div>
      )}
      <div className="p-5 sm:p-8 overflow-x-auto">{children}</div>
      {caption && (
        <div className="px-5 py-3 border-t border-slate-700/40 bg-slate-800/20">
          <p className="text-xs text-slate-500 italic">{caption}</p>
        </div>
      )}
    </div>
  )
}

/* ── Flow arrow ────────────────────────────────────────────────── */
export function FlowArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 mx-2 flex-shrink-0">
      <ArrowRight className="w-5 h-5 text-slate-500" />
      {label && <span className="text-[10px] text-slate-500 font-mono">{label}</span>}
    </div>
  )
}

/* ── Card grid ─────────────────────────────────────────────────── */
export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {children}
    </div>
  )
}

export function Card({
  title,
  subtitle,
  children,
  accent,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  accent?: string
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-5 hover:border-slate-600 transition-colors">
      {accent && (
        <div className={`w-8 h-1 rounded-full mb-3 ${accent}`} />
      )}
      <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
      {subtitle && <p className="text-[11px] text-slate-500 font-mono mb-2">{subtitle}</p>}
      <div className="text-xs text-slate-400 leading-relaxed">{children}</div>
    </div>
  )
}

/* ── Table ─────────────────────────────────────────────────────── */
export function DataTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: (string | ReactNode)[][]
}) {
  return (
    <div className="mb-6 overflow-x-auto rounded-lg border border-slate-700/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800/60">
            {headers.map((h, i) => (
              <th key={i} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-800/30 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-xs text-slate-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Divider ───────────────────────────────────────────────────── */
export function Divider() {
  return <hr className="border-slate-800 my-10" />
}

/* ── Steps (for recipes) ───────────────────────────────────────── */
export function Steps({ children }: { children: ReactNode }) {
  return <div className="space-y-6 mb-8">{children}</div>
}

export function Step({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
        <span className="text-xs font-bold text-blue-300">{number}</span>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-white mb-2">{title}</p>
        <div className="text-sm text-slate-300 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

/* ── File path badge ───────────────────────────────────────────── */
export function FilePath({ children }: { children: string }) {
  return (
    <code className="text-[11px] bg-slate-800 text-amber-300/80 px-1.5 py-0.5 rounded font-mono">
      {children}
    </code>
  )
}

/* ── Inline code ───────────────────────────────────────────────── */
export function InlineCode({ children }: { children: string }) {
  return (
    <code className="text-[11px] bg-slate-800 text-cyan-300/80 px-1.5 py-0.5 rounded font-mono">
      {children}
    </code>
  )
}
