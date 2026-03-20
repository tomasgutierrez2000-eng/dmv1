/** Injected CSS for the Facility Summary walkthrough. */

export const WALKTHROUGH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
:root{--navy-900:#0C1222;--navy-800:#111A2E;--navy-700:#1A2542;--navy-600:#243356;--slate-400:#94A3B8;--slate-300:#CBD5E1;--slate-200:#E2E8F0;--white:#FFFFFF;--blue:#3B82F6;--green:#10B981;--amber:#F59E0B;--purple:#8B5CF6;--coral:#EF4444;--teal:#06B6D4}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:var(--navy-900);color:var(--slate-200);-webkit-font-smoothing:antialiased}
.mono{font-family:'JetBrains Mono',monospace}
.app-root{min-height:100vh;background:linear-gradient(180deg,var(--navy-900),#0A0F1C);position:relative;overflow-x:hidden}
.app-root::before{content:'';position:fixed;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse 800px 600px at 20% 20%,rgba(59,130,246,.04) 0%,transparent 70%),radial-gradient(ellipse 600px 400px at 80% 80%,rgba(139,92,246,.03) 0%,transparent 70%);pointer-events:none;z-index:0}
.step-nav{position:sticky;top:0;z-index:100;background:rgba(12,18,34,.92);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.06);padding:16px 24px 14px}
.step-nav-inner{display:flex;align-items:center;justify-content:center;gap:8px;max-width:900px;margin:0 auto}
.step-item{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;flex:1;max-width:160px;transition:all .2s}
.step-circle{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;transition:all .3s;border:2px solid rgba(255,255,255,.12);color:var(--slate-400);background:transparent}
.step-item.active .step-circle{background:var(--blue);border-color:var(--blue);color:white;box-shadow:0 0 20px rgba(59,130,246,.3)}
.step-item.completed .step-circle{background:var(--green);border-color:var(--green);color:white}
.step-label{font-size:11px;color:var(--slate-400);text-align:center;font-weight:500;line-height:1.3}
.step-item.active .step-label{color:var(--white)}
.step-connector{width:40px;height:2px;background:rgba(255,255,255,.08);margin-bottom:20px}
.step-connector.done{background:var(--green)}
.main-content{max-width:1100px;margin:0 auto;padding:32px 24px 100px;position:relative;z-index:1}
.step-title{font-size:28px;font-weight:700;color:var(--white);margin-bottom:8px}
.step-intro{font-size:16px;color:var(--slate-300);line-height:1.65;margin-bottom:32px;max-width:800px}
.source-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.source-card{background:var(--navy-800);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:20px;cursor:pointer;transition:all .4s cubic-bezier(.16,1,.3,1);opacity:0;transform:translateY(20px);position:relative;overflow:hidden}
.source-card.visible{opacity:1;transform:translateY(0)}
.source-card-header{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.source-icon{font-size:24px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:10px;flex-shrink:0}
.source-name{font-size:17px;font-weight:600;color:var(--white)}
.source-desc{font-size:14px;color:var(--slate-400);line-height:1.5}
.source-fields{display:grid;gap:8px}
.source-field{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.source-field-name{font-size:13px;color:var(--slate-400)}
.source-field-value{font-size:13px;color:var(--white);font-weight:500;font-family:'JetBrains Mono',monospace;text-align:right}
.timeline-container{background:var(--navy-800);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:32px 28px 28px;overflow-x:auto}
.snapshot-chart{display:flex;align-items:flex-end;gap:6px;height:140px;margin-bottom:20px;padding:0 4px}
.snapshot-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative}
.snapshot-bar{width:100%;border-radius:4px 4px 0 0;transition:all .4s ease;min-height:4px;cursor:pointer;opacity:0;transform:scaleY(0);transform-origin:bottom}
.snapshot-bar.visible{opacity:1;transform:scaleY(1)}
.snapshot-bar:hover{filter:brightness(1.3)}
.snapshot-bar-label{font-size:10px;color:var(--slate-400);text-align:center;white-space:nowrap}
.snapshot-bar.current{box-shadow:0 0 12px rgba(245,158,11,.3)}
.timeline-line{width:100%;height:2px;background:rgba(255,255,255,.08);position:relative;margin:12px 0 24px}
.timeline-today-marker{position:absolute;right:0;top:-6px;width:14px;height:14px;background:var(--amber);border-radius:50%;border:2px solid var(--navy-800)}
.events-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
.event-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px 16px;display:flex;gap:12px;align-items:flex-start;flex:1;min-width:280px;opacity:0;transform:translateY(10px);transition:all .5s}
.event-card.visible{opacity:1;transform:translateY(0)}
.event-pin{width:10px;height:10px;border-radius:50%;margin-top:4px;flex-shrink:0}
.event-type{font-size:14px;font-weight:600;color:var(--white);margin-bottom:2px}
.event-date{font-size:12px;color:var(--slate-400);margin-bottom:4px}
.event-detail{font-size:13px;color:var(--slate-300);line-height:1.4}
.assembly-container{display:flex;gap:20px;align-items:stretch;min-height:500px}
.assembly-sources{flex:0 0 280px;display:flex;flex-direction:column;gap:8px}
.assembly-source-card{padding:12px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:var(--navy-800);transition:all .4s;cursor:pointer}
.assembly-source-card.active{border-color:currentColor;box-shadow:0 0 16px rgba(59,130,246,.15);transform:scale(1.02)}
.assembly-source-card.connected{opacity:.6}
.assembly-source-name{font-size:14px;font-weight:600;color:var(--white);display:flex;align-items:center;gap:8px}
.assembly-source-id{font-size:11px;font-family:'JetBrains Mono',monospace;padding:2px 8px;border-radius:4px;margin-top:6px;display:inline-block}
.assembly-result{flex:1;background:var(--navy-800);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;overflow:auto}
.assembly-result-title{font-size:16px;font-weight:700;color:var(--white);margin-bottom:4px}
.assembly-result-counter{font-size:13px;color:var(--slate-400);margin-bottom:16px;font-family:'JetBrains Mono',monospace}
.assembled-field{display:flex;justify-content:space-between;align-items:baseline;padding:8px 12px;border-radius:6px;margin-bottom:4px;opacity:0;transform:translateX(10px);transition:all .3s ease}
.assembled-field.visible{opacity:1;transform:translateX(0)}
.assembled-field:hover{background:rgba(255,255,255,.03)}
.assembled-field-name{font-size:13px;color:var(--slate-300)}
.assembled-field-value{font-size:13px;font-weight:500;font-family:'JetBrains Mono',monospace}
.assembly-controls{display:flex;gap:10px;margin-top:20px;justify-content:center;flex-wrap:wrap}
.assembly-annotation{text-align:center;margin-top:16px;padding:12px 20px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.15);border-radius:10px;font-size:14px;color:var(--slate-200);line-height:1.5;opacity:0;transition:opacity .4s}
.assembly-annotation.visible{opacity:1}
.calc-grid{display:grid;gap:14px}
.calc-card{background:var(--navy-800);border:1px solid rgba(255,255,255,.07);border-radius:12px;overflow:hidden;transition:all .3s}
.calc-card-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;cursor:pointer}
.calc-card-header:hover{background:rgba(255,255,255,.02)}
.calc-field-name{font-size:15px;font-weight:600;color:var(--white);display:flex;align-items:center;gap:8px}
.calc-badge{font-size:10px;padding:2px 8px;border-radius:99px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;background:rgba(245,158,11,.15);color:var(--amber)}
.calc-result{font-size:18px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--white)}
.calc-explanation{font-size:14px;color:var(--slate-300);font-style:italic;padding:0 20px 12px}
.calc-breakdown{padding:16px 20px 20px;border-top:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.15)}
.calc-formula-visual{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;padding:12px 0}
.calc-input-chip{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 16px;border-radius:10px;border:1px solid;cursor:pointer;transition:all .2s}
.calc-input-chip:hover{transform:scale(1.05)}
.calc-input-value{font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--white)}
.calc-input-label{font-size:11px;font-weight:500}
.calc-operator{font-size:22px;font-weight:700;color:var(--slate-400)}
.calc-result-chip{padding:10px 20px;border-radius:10px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3)}
.calc-result-value{font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--green)}
.final-toggle{display:flex;gap:2px;background:var(--navy-700);border-radius:8px;padding:3px;margin-bottom:24px;width:fit-content}
.final-toggle-btn{padding:8px 18px;border-radius:6px;border:none;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;color:var(--slate-400);background:transparent}
.final-toggle-btn.active{background:var(--blue);color:var(--white)}
.final-sections{display:grid;gap:16px}
.final-section{background:var(--navy-800);border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden}
.final-section-header{padding:14px 20px;font-size:14px;font-weight:700;color:var(--white);background:rgba(255,255,255,.02);letter-spacing:.3px}
.final-fields{padding:4px 12px 12px}
.final-field{display:flex;justify-content:space-between;align-items:baseline;padding:10px 8px;border-radius:6px;transition:all .2s;cursor:default;position:relative}
.final-field:hover{background:rgba(255,255,255,.03)}
.final-field-name{font-size:14px;color:var(--slate-300);display:flex;align-items:center;gap:8px}
.final-field-value{font-size:14px;font-weight:500;font-family:'JetBrains Mono',monospace;color:var(--white)}
.final-field-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.final-field-badge{font-size:9px;padding:1px 6px;border-radius:99px;font-weight:600;text-transform:uppercase;letter-spacing:.3px}
.badge-calculated{background:rgba(245,158,11,.15);color:var(--amber)}
.badge-direct{background:rgba(16,185,129,.12);color:var(--green)}
.final-tooltip{position:absolute;top:100%;left:20px;z-index:50;padding:12px 16px;background:var(--navy-700);border:1px solid rgba(255,255,255,.12);border-radius:10px;min-width:260px;box-shadow:0 8px 24px rgba(0,0,0,.4)}
.final-tooltip-row{display:flex;gap:8px;font-size:12px;margin-bottom:4px}
.final-tooltip-label{color:var(--slate-400);min-width:60px}
.final-tooltip-value{color:var(--white);font-weight:500}
.final-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:24px}
.final-stat-card{background:var(--navy-800);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:16px;text-align:center}
.final-stat-number{font-size:28px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--white)}
.final-stat-label{font-size:12px;color:var(--slate-400);margin-top:4px}
.legend{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px}
.legend-item{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--slate-400)}
.legend-dot{width:10px;height:10px;border-radius:50%}
.btn{padding:10px 24px;border-radius:8px;border:none;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:8px}
.btn-primary{background:var(--blue);color:var(--white)}
.btn-primary:hover{background:#2563EB;transform:translateY(-1px)}
.btn-secondary{background:rgba(255,255,255,.06);color:var(--slate-300);border:1px solid rgba(255,255,255,.1)}
.btn-secondary:hover{background:rgba(255,255,255,.1)}
.btn-ghost{background:transparent;color:var(--slate-400)}
.btn-ghost:hover{color:var(--white)}
.nav-buttons{display:flex;justify-content:space-between;align-items:center;margin-top:40px;padding-top:24px;border-top:1px solid rgba(255,255,255,.06)}
`;
