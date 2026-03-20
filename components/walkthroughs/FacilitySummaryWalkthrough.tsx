'use client';

import React, { useState, useEffect, useRef, useCallback } from "react";
import { CONFIG, STEPS, getSourceColor, getSourceName } from "./facility-summary-config";
import { WALKTHROUGH_CSS } from "./facility-summary-styles";

// ═══════════════════════════════════════════════════════════════
// Step Components
// ═══════════════════════════════════════════════════════════════

function SourceCard({ source, expanded, onToggle, delay, visible }: any) {
  return (
    <div
      className={`source-card ${visible ? "visible" : ""} ${expanded ? "expanded" : ""}`}
      style={{ transitionDelay: `${delay}ms`, borderColor: expanded ? source.color + "40" : undefined }}
      onClick={onToggle}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: source.color }} />
      <div className="source-card-header">
        <div className="source-icon" style={{ background: source.color + "18" }}>{source.icon}</div>
        <div>
          <div className="source-name">{source.name}</div>
          <div className="source-desc">{source.description}</div>
        </div>
      </div>
      <div
        className="source-fields"
        style={{
          maxHeight: expanded ? 500 : 0,
          overflow: "hidden",
          transition: "max-height .4s ease",
          paddingTop: expanded ? 14 : 0,
          marginTop: expanded ? 14 : 0,
          borderTop: expanded ? "1px solid rgba(255,255,255,.06)" : "none",
        }}
      >
        {source.fields.map((f: any, i: number) => (
          <div key={i} className="source-field">
            <span className="source-field-name">{f.name}</span>
            <span className="source-field-value" style={{ color: source.color }}>{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step1({ config }: any) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 100); return () => clearTimeout(t); }, []);
  return (
    <div>
      <div className="step-title">Where the Data Lives</div>
      <div className="step-intro">
        The information you see on the dashboard doesn&apos;t live in one place. It comes from{" "}
        <strong style={{ color: "var(--white)" }}>{config.sources.length} different sources</strong>, each
        tracking a different part of this facility. Click any card to see the data it holds for{" "}
        <span className="mono" style={{ color: "var(--amber)" }}>{config.joinValue}</span>.
      </div>
      <div className="source-grid">
        {config.sources.map((s: any, i: number) => (
          <SourceCard
            key={s.id}
            source={s}
            expanded={expandedId === s.id}
            onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
            delay={i * 120}
            visible={vis}
          />
        ))}
      </div>
    </div>
  );
}

function Step2({ config }: any) {
  const [barsVis, setBarsVis] = useState(false);
  const [evtsVis, setEvtsVis] = useState(false);
  const [hBar, setHBar] = useState<number | null>(null);
  useEffect(() => {
    const t1 = setTimeout(() => setBarsVis(true), 300);
    const t2 = setTimeout(() => setEvtsVis(true), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  const { timeline } = config;
  const maxE = Math.max(...timeline.months.map((m: any) => m.exposure));
  const minE = Math.min(...timeline.months.map((m: any) => m.exposure));
  const amberSrc = config.sources.find((s: any) => s.id === "facility_exposure_snapshot");
  return (
    <div>
      <div className="step-title">Snapshots & Events</div>
      <div className="step-intro">
        Some information changes monthly — the bank captures these as{" "}
        <strong style={{ color: "var(--white)" }}>monthly readings</strong> (L2 snapshots). Other
        information only changes when something happens — captured as{" "}
        <strong style={{ color: "var(--white)" }}>events</strong> (L2 events like amendment_event and
        counterparty_rating_observation).
      </div>
      <div className="timeline-container">
        <div style={{ fontSize: 13, color: "var(--slate-400)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: amberSrc?.color, display: "inline-block" }} />
          gross_exposure_usd — Monthly Snapshots ($M)
        </div>
        <div className="snapshot-chart">
          {timeline.months.map((m: any, i: number) => {
            const pct = ((m.exposure - minE + 5) / (maxE - minE + 10)) * 100;
            const isCurr = i === timeline.months.length - 1;
            return (
              <div key={i} className="snapshot-bar-wrap" onMouseEnter={() => setHBar(i)} onMouseLeave={() => setHBar(null)}>
                {hBar === i && (
                  <div style={{ position: "absolute", top: -40, background: "var(--navy-700)", padding: "4px 10px", borderRadius: 6, fontSize: 12, color: "var(--white)", whiteSpace: "nowrap", zIndex: 10, border: "1px solid rgba(255,255,255,.1)", fontFamily: "'JetBrains Mono',monospace" }}>
                    ${m.exposure}M
                  </div>
                )}
                <div
                  className={`snapshot-bar ${barsVis ? "visible" : ""} ${isCurr ? "current" : ""}`}
                  style={{ height: `${pct}%`, background: isCurr ? amberSrc?.color : amberSrc?.color + "60", transitionDelay: `${i * 80}ms` }}
                />
                <div className="snapshot-bar-label">{m.month.split(" ")[0]}</div>
              </div>
            );
          })}
        </div>
        <div className="timeline-line"><div className="timeline-today-marker" title="Today" /></div>
        <div style={{ fontSize: 13, color: "var(--slate-400)", marginBottom: 12, marginTop: 8 }}>Key Events</div>
        <div className="events-row">
          {timeline.events.map((evt: any, i: number) => {
            const src = config.sources.find((s: any) => s.id === evt.source);
            return (
              <div key={i} className={`event-card ${evtsVis ? "visible" : ""}`} style={{ transitionDelay: `${i * 200}ms`, borderColor: src?.color + "30" }}>
                <div className="event-pin" style={{ background: src?.color }} />
                <div>
                  <div className="event-type">{evt.type}</div>
                  <div className="event-date">{evt.date} • {src?.name}</div>
                  <div className="event-detail">{evt.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Step3({ config }: any) {
  const [ci, setCi] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<any>(null);
  const total = config.sources.length;
  const totalF = config.sources.reduce((s: number, src: any) => s + src.fields.length, 0);
  const connF = config.sources.slice(0, ci + 1).reduce((s: number, src: any) => s + src.fields.length, 0);
  const advance = useCallback(() => {
    setCi((prev) => { if (prev >= total - 1) { setPlaying(false); return prev; } return prev + 1; });
  }, [total]);
  useEffect(() => { if (playing) timerRef.current = setInterval(advance, 1400); return () => clearInterval(timerRef.current); }, [playing, advance]);
  const reset = () => { setCi(-1); setPlaying(false); clearInterval(timerRef.current); };
  const playAll = () => { reset(); setTimeout(() => { setPlaying(true); setCi(0); }, 100); };
  return (
    <div>
      <div className="step-title">Connecting the Pieces</div>
      <div className="step-intro">
        Each system knows about the same loan using:{" "}
        <span className="mono" style={{ color: "var(--amber)" }}>{config.joinValue}</span>. Watch how
        records are matched together across {total} sources.
      </div>
      <div className="assembly-controls">
        <button className="btn btn-primary" onClick={playAll}>▶ Play All</button>
        <button className="btn btn-secondary" onClick={advance} disabled={ci >= total - 1}>Next Source →</button>
        <button className="btn btn-ghost" onClick={reset}>↺ Reset</button>
      </div>
      <div className="assembly-container" style={{ marginTop: 24 }}>
        <div className="assembly-sources">
          {config.sources.map((src: any, i: number) => (
            <div
              key={src.id}
              className={`assembly-source-card ${i === ci ? "active" : ""} ${i < ci ? "connected" : ""}`}
              style={{ borderColor: i <= ci ? src.color + "40" : undefined }}
              onClick={() => { if (ci < i) setCi(i); }}
            >
              <div className="assembly-source-name" style={{ color: i <= ci ? src.color : undefined }}>
                <span>{src.icon}</span>{src.name}{i <= ci && <span style={{ marginLeft: "auto", fontSize: 14 }}>✓</span>}
              </div>
              <div className="assembly-source-id" style={{ background: src.color + "15", color: src.color }}>
                {config.joinField}: {config.joinValue}
              </div>
            </div>
          ))}
        </div>
        <div style={{ flex: "0 0 60px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ width: 3, background: `linear-gradient(180deg,${config.sources.slice(0, ci + 1).map((s: any) => s.color).join(",") || "transparent"})`, height: ci >= 0 ? "100%" : 0, transition: "height .6s", borderRadius: 2, position: "absolute", top: 0 }} />
          <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", fontSize: 24, opacity: ci >= 0 ? 1 : 0.3 }}>→</div>
        </div>
        <div className="assembly-result">
          <div className="assembly-result-title">Combined Record</div>
          <div className="assembly-result-counter">{connF} of {totalF} fields</div>
          {config.sources.map((src: any, si: number) =>
            si <= ci && (
              <div key={src.id} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: src.color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, paddingLeft: 12 }}>
                  From {src.name}
                </div>
                {src.fields.map((f: any, fi: number) => (
                  <div key={fi} className={`assembled-field ${si <= ci ? "visible" : ""}`} style={{ transitionDelay: `${fi * 80}ms`, borderLeft: `3px solid ${src.color}` }}>
                    <span className="assembled-field-name">{f.name}</span>
                    <span className="assembled-field-value" style={{ color: src.color }}>{f.value}</span>
                  </div>
                ))}
              </div>
            )
          )}
          {ci < 0 && <div style={{ color: "var(--slate-400)", fontSize: 14, textAlign: "center", padding: 40 }}>Click &quot;Play All&quot; or &quot;Next Source&quot; to begin.</div>}
        </div>
      </div>
      <div className={`assembly-annotation ${ci >= 0 ? "visible" : ""}`}>
        {ci >= 0 && ci < total && (
          <span>
            <strong style={{ color: config.sources[ci]?.color }}>{config.sources[ci]?.name}:</strong>{" "}
            {config.sources[ci]?.annotation}
          </span>
        )}
        {ci >= total - 1 && (
          <div style={{ marginTop: 8, color: "var(--amber)" }}>
            All {total} sources matched. Some fields still need to be <em>calculated</em> — particularly EAD (from position_detail) and limit_status (from limit_rule thresholds).
          </div>
        )}
      </div>
    </div>
  );
}

function Step4({ config }: any) {
  const [ei, setEi] = useState<number | null>(null);
  const gc = (sid: string) => getSourceColor(config.sources, sid);
  const gn = (sid: string) => getSourceName(config.sources, sid);
  return (
    <div>
      <div className="step-title">Calculations & Enrichment</div>
      <div className="step-intro">
        Some fields are <strong style={{ color: "var(--white)" }}>derived</strong> by combining values
        from different sources. Calculated fields (net_exposure_usd, coverage_ratio_pct, rwa_amt)
        live on L3 facility_exposure_calc, while atomic source values stay on L2. Other derived
        fields (EAD, expected_loss, limit_status) are also calculated. Click any to see the formula.
      </div>
      <div className="calc-grid">
        {config.calculations.map((c: any, i: number) => {
          const open = ei === i;
          return (
            <div key={i} className="calc-card" style={{ borderColor: open ? "rgba(245,158,11,.2)" : undefined }}>
              <div className="calc-card-header" onClick={() => setEi(open ? null : i)}>
                <div className="calc-field-name">
                  <span>🧮</span>{c.field}
                  <span className="calc-badge">
                    {c.field.includes("(derived)") || c.field.includes("derived") ? "Derived" : c.field.includes("net_exposure") || c.field.includes("coverage") ? "Now L2" : "Calculated"}
                  </span>
                </div>
                <div className="calc-result">{c.result}</div>
              </div>
              <div className="calc-explanation">&quot;{c.explanation}&quot;</div>
              {open && (
                <div className="calc-breakdown">
                  <div className="calc-formula-visual">
                    {c.inputs.map((inp: any, j: number) => (
                      <React.Fragment key={j}>
                        {j > 0 && <span className="calc-operator">{c.operator}</span>}
                        <div className="calc-input-chip" style={{ borderColor: gc(inp.source) + "50", background: gc(inp.source) + "10" }}>
                          <span className="calc-input-value">{inp.value}</span>
                          <span className="calc-input-label" style={{ color: gc(inp.source) }}>
                            {inp.label}{inp.source && <span> • {gn(inp.source)}</span>}
                          </span>
                        </div>
                      </React.Fragment>
                    ))}
                    <span className="calc-operator">=</span>
                    <div className="calc-result-chip">
                      <span className="calc-result-value">{c.result}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step5({ config, onRestart }: any) {
  const [vm, setVm] = useState("dashboard");
  const [tt, setTt] = useState<string | null>(null);
  const gc = (sid: string) => getSourceColor(config.sources, sid);
  const gn = (sid: string) => getSourceName(config.sources, sid);
  const { finalView: fv } = config;
  return (
    <div>
      <div className="step-title">The Final View</div>
      <div className="step-intro">
        All the pieces come together into one combined row — exactly what the dashboard shows. The updated
        model draws from {fv.totalSources} sources, with {fv.directFields} direct fields and{" "}
        {fv.calculatedFields} calculated fields.
      </div>
      <div className="final-toggle">
        <button className={`final-toggle-btn ${vm === "dashboard" ? "active" : ""}`} onClick={() => setVm("dashboard")}>
          Dashboard View
        </button>
        <button className={`final-toggle-btn ${vm === "lineage" ? "active" : ""}`} onClick={() => setVm("lineage")}>
          Lineage View
        </button>
      </div>
      {vm === "lineage" && (
        <div className="legend">
          {config.sources.map((s: any) => (
            <div key={s.id} className="legend-item">
              <div className="legend-dot" style={{ background: s.color }} />{s.name}
            </div>
          ))}
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "var(--amber)" }} />Calculated
          </div>
        </div>
      )}
      <div className="final-sections">
        {fv.sections.map((sec: any, si: number) => (
          <div key={si} className="final-section">
            <div className="final-section-header">{sec.title}</div>
            <div className="final-fields">
              {sec.fields.map((f: any, fi: number) => (
                <div
                  key={fi}
                  className="final-field"
                  onMouseEnter={() => setTt(`${si}-${fi}`)}
                  onMouseLeave={() => setTt(null)}
                  style={vm === "lineage" ? { borderLeft: `3px solid ${f.type === "calculated" ? "var(--amber)" : gc(f.source)}`, paddingLeft: 16 } : {}}
                >
                  <span className="final-field-name">
                    {vm === "lineage" && <span className="final-field-dot" style={{ background: f.type === "calculated" ? "var(--amber)" : gc(f.source) }} />}
                    {f.name}
                    {vm === "lineage" && (
                      <span className={`final-field-badge ${f.type === "calculated" ? "badge-calculated" : "badge-direct"}`}>
                        {f.type === "calculated" ? "Calc" : "Direct"}
                      </span>
                    )}
                  </span>
                  <span className="final-field-value">{f.value}</span>
                  {tt === `${si}-${fi}` && (
                    <div className="final-tooltip">
                      <div className="final-tooltip-row">
                        <span className="final-tooltip-label">Source:</span>
                        <span className="final-tooltip-value" style={{ color: f.source ? gc(f.source) : "var(--amber)" }}>
                          {f.source ? gn(f.source) : "Calculated"}
                        </span>
                      </div>
                      <div className="final-tooltip-row">
                        <span className="final-tooltip-label">Type:</span>
                        <span className="final-tooltip-value">{f.type === "calculated" ? "Calculated" : "Stored directly"}</span>
                      </div>
                      {f.formula && (
                        <div className="final-tooltip-row">
                          <span className="final-tooltip-label">Formula:</span>
                          <span className="final-tooltip-value">{f.formula}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="final-stats">
        <div className="final-stat-card"><div className="final-stat-number">{fv.totalSources}</div><div className="final-stat-label">Sources</div></div>
        <div className="final-stat-card"><div className="final-stat-number">{fv.directFields}</div><div className="final-stat-label">Direct Fields</div></div>
        <div className="final-stat-card"><div className="final-stat-number">{fv.calculatedFields}</div><div className="final-stat-label">Calculated</div></div>
      </div>
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button className="btn btn-primary" onClick={onRestart} style={{ fontSize: 16, padding: "12px 32px" }}>
          ↺ Restart Demo
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function FacilitySummaryWalkthrough({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState(1);
  const goNext = () => setStep((p) => Math.min(p + 1, 5));
  const goPrev = () => setStep((p) => Math.max(p - 1, 1));
  const restart = () => setStep(1);

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1 config={CONFIG} />;
      case 2: return <Step2 config={CONFIG} />;
      case 3: return <Step3 config={CONFIG} />;
      case 4: return <Step4 config={CONFIG} />;
      case 5: return <Step5 config={CONFIG} onRestart={restart} />;
      default: return null;
    }
  };

  return (
    <>
      <style>{WALKTHROUGH_CSS}</style>
      <div className="app-root">
        {onClose && (
          <div style={{ position: "fixed", top: 16, right: 16, zIndex: 200 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ background: "rgba(255,255,255,.1)" }}>
              ✕ Close
            </button>
          </div>
        )}
        <div className="step-nav">
          <div className="step-nav-inner">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.num}>
                {i > 0 && <div className={`step-connector ${step > s.num - 1 ? "done" : ""}`} />}
                <div
                  className={`step-item ${step === s.num ? "active" : ""} ${step > s.num ? "completed" : ""}`}
                  onClick={() => setStep(s.num)}
                >
                  <div className="step-circle">{step > s.num ? "✓" : s.num}</div>
                  <div className="step-label">{s.label}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="main-content">
          {renderStep()}
          <div className="nav-buttons">
            <button className="btn btn-secondary" onClick={goPrev} disabled={step === 1} style={{ opacity: step === 1 ? 0.3 : 1 }}>
              ← Previous
            </button>
            <span style={{ fontSize: 13, color: "var(--slate-400)" }}>Step {step} of 5</span>
            {step < 5 ? (
              <button className="btn btn-primary" onClick={goNext}>Next Step →</button>
            ) : (
              <button className="btn btn-primary" onClick={onClose || restart}>{onClose ? "← Back to Overview" : "↺ Restart"}</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
