'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3, TrendingUp, Zap, Clock, CheckCircle, XCircle,
  AlertTriangle, Database, Package,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import type { AgentPerformanceSummary, PerformanceOverview } from '@/lib/agent-library/types';

const CHART_COLORS = ['#14b8a6', '#8b5cf6', '#eab308', '#3b82f6', '#f43f5e', '#22c55e'];

export default function PerformanceDashboard() {
  const [data, setData] = useState<PerformanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const url = selectedAgent
          ? `/api/agents/metrics?agent=${encodeURIComponent(selectedAgent)}&days=30`
          : '/api/agents/metrics';
        const res = await fetch(url);
        const json = await res.json();
        setData(json);
        setConnected(json.audit_connected !== false);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedAgent]);

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-4 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-1">
        <BarChart3 className="w-6 h-6 text-emerald-400" />
        <h1 className="text-2xl font-bold text-slate-50 font-mono">Performance Dashboard</h1>
      </div>
      <p className="text-sm text-slate-400 mb-6">Agent performance analytics and trend monitoring</p>

      {!connected && (
        <div className="flex items-center gap-2 text-slate-500 text-sm mb-6">
          <Database className="w-4 h-4" />
          Audit database not connected — showing empty dashboard
        </div>
      )}

      {/* Global stats */}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <GlobalStatCard label="Total Runs" value={data.global_totals.total_runs} icon={TrendingUp} />
            <GlobalStatCard label="Total Tokens" value={data.global_totals.total_tokens.toLocaleString()} icon={Zap} />
            <GlobalStatCard label="Total Artifacts" value={data.global_totals.total_artifacts} icon={Package} />
            <GlobalStatCard
              label="Avg Success Rate"
              value={`${data.global_totals.avg_success_rate}%`}
              icon={CheckCircle}
              color={data.global_totals.avg_success_rate >= 90 ? 'text-green-400' : data.global_totals.avg_success_rate >= 70 ? 'text-amber-400' : 'text-red-400'}
            />
          </div>

          {data.agents.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Runs by Agent */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-slate-300 mb-4">Runs by Agent</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.agents.slice(0, 10)}>
                    <XAxis
                      dataKey="agent_name"
                      tick={{ fill: '#94a3b8', fontSize: 9 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, fontSize: 11 }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="successful_runs" stackId="a" fill="#22c55e" name="Successful" />
                    <Bar dataKey="failed_runs" stackId="a" fill="#ef4444" name="Failed" />
                    <Bar dataKey="blocked_runs" stackId="a" fill="#eab308" name="Blocked" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Success Rate Distribution */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-slate-300 mb-4">Success Rate Distribution</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.agents.map((a, i) => ({
                        name: a.agent_name,
                        value: a.total_runs,
                        success_rate: a.success_rate,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${String(name).slice(0, 15)} (${value})`}
                      labelLine={false}
                    >
                      {data.agents.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Duration Trends */}
              {data.agents.some(a => a.avg_duration_ms !== null) && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <h2 className="text-sm font-semibold text-slate-300 mb-4">Average Duration (ms)</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.agents.filter(a => a.avg_duration_ms !== null).slice(0, 10)}>
                      <XAxis
                        dataKey="agent_name"
                        tick={{ fill: '#94a3b8', fontSize: 9 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, fontSize: 11 }}
                        formatter={(value) => [`${Math.round(Number(value))}ms`, 'Avg Duration']}
                      />
                      <Bar dataKey="avg_duration_ms" fill="#8b5cf6" name="Avg Duration" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Token Usage */}
              {data.agents.some(a => a.total_tokens > 0) && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <h2 className="text-sm font-semibold text-slate-300 mb-4">Token Usage</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.agents.filter(a => a.total_tokens > 0).slice(0, 10)}>
                      <XAxis
                        dataKey="agent_name"
                        tick={{ fill: '#94a3b8', fontSize: 9 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, fontSize: 11 }}
                        formatter={(value) => [Number(value).toLocaleString(), 'Tokens']}
                      />
                      <Bar dataKey="total_tokens" fill="#14b8a6" name="Tokens" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No performance data yet — run agents to see metrics here</p>
            </div>
          )}

          {/* Agent table */}
          {data.agents.length > 0 && (
            <div className="mt-6 bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-3 text-slate-400 font-medium">Agent</th>
                    <th className="text-right p-3 text-slate-400 font-medium">Runs</th>
                    <th className="text-right p-3 text-slate-400 font-medium">Success</th>
                    <th className="text-right p-3 text-slate-400 font-medium">Failed</th>
                    <th className="text-right p-3 text-slate-400 font-medium">Blocked</th>
                    <th className="text-right p-3 text-slate-400 font-medium">Rate</th>
                    <th className="text-right p-3 text-slate-400 font-medium">Avg Time</th>
                    <th className="text-right p-3 text-slate-400 font-medium">Tokens</th>
                    <th className="text-right p-3 text-slate-400 font-medium">Last Run</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agents.map(a => {
                    const isOutlier = a.avg_duration_ms !== null && a.p95_duration_ms !== null
                      && a.avg_duration_ms > 0 && (a.p95_duration_ms / a.avg_duration_ms) > 2;
                    return (
                      <tr key={a.agent_name} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="p-3 text-slate-200 font-mono">{a.agent_name}</td>
                        <td className="p-3 text-right text-slate-300 font-mono">{a.total_runs}</td>
                        <td className="p-3 text-right text-green-400 font-mono">{a.successful_runs}</td>
                        <td className="p-3 text-right text-red-400 font-mono">{a.failed_runs}</td>
                        <td className="p-3 text-right text-amber-400 font-mono">{a.blocked_runs}</td>
                        <td className={`p-3 text-right font-mono ${
                          a.success_rate >= 90 ? 'text-green-400' : a.success_rate >= 70 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {a.success_rate}%
                        </td>
                        <td className={`p-3 text-right font-mono ${isOutlier ? 'text-amber-400' : 'text-slate-300'}`}>
                          {a.avg_duration_ms ? `${(a.avg_duration_ms / 1000).toFixed(1)}s` : '—'}
                          {isOutlier && <AlertTriangle className="inline w-3 h-3 ml-1" />}
                        </td>
                        <td className="p-3 text-right text-slate-300 font-mono">{a.total_tokens.toLocaleString()}</td>
                        <td className="p-3 text-right text-slate-400">
                          {a.last_run_at ? new Date(a.last_run_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GlobalStatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: typeof TrendingUp; color?: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-slate-500" />
        <span className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <span className={`text-2xl font-bold font-mono ${color || 'text-slate-100'}`}>{value}</span>
    </div>
  );
}
