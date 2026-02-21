'use client'

import {
  Section, SubSection, SectionTitle, SubTitle, P, Lead, Callout,
  DiagramBox, CardGrid, Card, FlowArrow, Divider,
} from '../Primitives'
import { Building2, TrendingUp, ShieldCheck, Users } from 'lucide-react'

export default function S01_WhatThisPlatformDoes() {
  return (
    <Section id="what-this-platform-does">
      <SectionTitle>What This Platform Does</SectionTitle>

      <Lead>
        This is a credit risk data platform. It takes raw banking data — facilities, counterparties,
        exposures, ratings — and transforms it into governed, traceable metrics and dashboards
        that credit risk teams use to make decisions.
      </Lead>

      {/* ── The Problem ─────────────────────────────────────────── */}
      <SubSection id="the-problem">
        <SubTitle>The Problem</SubTitle>
        <P>
          Every bank has the same challenge: critical credit data is scattered across dozens of
          source systems. Exposure data lives in one system, ratings in another, collateral in a
          third. To answer a simple question like &quot;What is our total exposure to this counterparty,
          and how is it collateralized?&quot; someone has to manually pull data from multiple places,
          reconcile it, and hope the numbers match.
        </P>
        <P>
          Meanwhile, regulators want standardized reports, risk managers want dashboards, and
          the CRO wants a single view of the portfolio. Each of these consumers needs the same
          underlying data, just sliced differently. Without a governed data layer, every team
          builds their own version of the truth — and the numbers never agree.
        </P>

        <DiagramBox title="The problem: fragmented data">
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            {['Loan System', 'Rating Engine', 'Collateral Mgmt', 'Treasury', 'Limits System'].map(s => (
              <div key={s} className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-300 text-center">
                {s}
              </div>
            ))}
          </div>
          <div className="text-center my-4 text-slate-500 text-xs font-mono">
            each system has its own version of the truth
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            {['Risk Manager\nbuilds own Excel', 'Regulatory\nteam rebuilds', 'CRO gets\nstale numbers'].map((s, i) => (
              <div key={i} className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-3 text-amber-300 text-center whitespace-pre-line">
                {s}
              </div>
            ))}
          </div>
        </DiagramBox>
      </SubSection>

      {/* ── What We Built ────────────────────────────────────────── */}
      <SubSection id="what-we-built">
        <SubTitle>What We Built</SubTitle>
        <P>
          This platform is the single governed layer between those source systems and every
          consumer. It does three things:
        </P>

        <CardGrid>
          <Card title="Organizes the data" subtitle="L1 → L2 → L3 layers" accent="bg-blue-500">
            Raw data from source systems gets organized into three clean layers: master reference
            data (L1), time-series snapshots (L2), and derived analytics (L3). Each layer has a
            clear purpose and feeds the next.
          </Card>
          <Card title="Governs the metrics" subtitle="Metric Library" accent="bg-emerald-500">
            Every metric — from simple exposure totals to complex DSCR ratios — is defined once
            in a central library with clear ownership, formulas, and rollup rules. No more
            shadow spreadsheets.
          </Card>
          <Card title="Serves the consumers" subtitle="APIs + Dashboards" accent="bg-purple-500">
            Dashboards, reports, and downstream systems all pull from the same governed data
            through APIs. Everyone sees the same numbers.
          </Card>
        </CardGrid>

        <DiagramBox title="The solution: one governed layer">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs">
            <div className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-300 text-center">
              <div className="font-semibold mb-1">Source Systems</div>
              <div className="text-[10px] text-slate-500">Loans, Ratings, Collateral...</div>
            </div>
            <FlowArrow label="ingest" />
            <div className="bg-blue-500/15 border border-blue-500/40 rounded-lg px-6 py-4 text-center">
              <div className="font-semibold text-blue-300 mb-1">This Platform</div>
              <div className="text-[10px] text-blue-400/70">L1 → L2 → L3 → Metrics</div>
            </div>
            <FlowArrow label="serve" />
            <div className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-300 text-center">
              <div className="font-semibold mb-1">Consumers</div>
              <div className="text-[10px] text-slate-500">Dashboards, Reports, APIs</div>
            </div>
          </div>
        </DiagramBox>
      </SubSection>

      {/* ── Who Uses It ──────────────────────────────────────────── */}
      <SubSection id="who-uses-it">
        <SubTitle>Who Uses It</SubTitle>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {[
            { icon: ShieldCheck, role: 'Credit Risk Teams', desc: 'Monitor portfolio exposure, credit quality, and limit utilization through dashboards and metric deep-dives.' },
            { icon: Building2, role: 'Regulatory & Compliance', desc: 'Generate standardized reports (FR2590, stress tests) from the same governed data layer.' },
            { icon: TrendingUp, role: 'Front Office / Desk Heads', desc: 'Track facility-level metrics, pipeline, and profitability at their desk or LoB level.' },
            { icon: Users, role: 'Data & Platform Teams', desc: 'Maintain the data model, add new metrics, extend the layer architecture as new use cases emerge.' },
          ].map(({ icon: Icon, role, desc }) => (
            <div key={role} className="flex items-start gap-3 bg-slate-900/40 border border-slate-700/40 rounded-lg p-4">
              <Icon className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white mb-1">{role}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Callout type="tip" title="For this team">
          You are the Data & Platform team. This guide will teach you how the system works end-to-end
          so you can maintain, extend, and scale it.
        </Callout>
      </SubSection>

      <Divider />
    </Section>
  )
}
