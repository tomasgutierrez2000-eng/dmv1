import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '/Users/tomas/120/slides_screenshots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto('http://localhost:3000/metrics/dscr-lineage', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Helper: scroll to Y position, wait, then clip screenshot (crop out sticky header)
async function captureSection(name, scrollY, clipOverride) {
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(400);
  // Default clip: full width, skip top 80px (sticky header)
  const clip = clipOverride || { x: 0, y: 80, width: 1400, height: 820 };
  await page.screenshot({ path: `${OUT}/${name}`, clip });
  console.log(`Captured: ${name}`);
}

// Get all step positions
const positions = await page.evaluate(() => {
  const steps = ['step1','step2','step3','step4','step5','step6'];
  const result = {};
  for (const s of steps) {
    const el = document.querySelector(`[data-demo="${s}"]`);
    if (el) result[s] = el.getBoundingClientRect().top + window.scrollY;
  }
  // Also get foundational rule and rollup
  const fr = document.querySelector('[data-demo="foundational-rule"]');
  if (fr) result['foundational-rule'] = fr.getBoundingClientRect().top + window.scrollY;
  const rf = document.querySelector('[data-demo="rollup-facility"]');
  if (rf) result['rollup-facility'] = rf.getBoundingClientRect().top + window.scrollY;
  return result;
});
console.log('Positions:', positions);

// 01: Header + Step 1 — show from very top, include header
await captureSection('01_header_step1.png', 0, { x: 0, y: 0, width: 1400, height: 900 });

// 02: Step 2 L1 Reference (scroll to show step heading + tables)
await captureSection('02_step2_l1_ref.png', positions.step2 - 20);

// 03: Step 3 L2 Snapshot
await captureSection('03_step3_l2_snapshot.png', positions.step3 - 20);

// 04: Step 4 Calculation — just the calc cards, not Step 5 bleeding in
await captureSection('04_step4_calculation.png', positions.step4 - 20);

// 05: Step 5 L3 Output Tables — scroll to just show the L3 tables section
await captureSection('05_step5_l3_output.png', positions.step5 - 20);

// 06: Foundational Rule — scroll to show it centered
await captureSection('06_foundational_rule.png', positions['foundational-rule'] - 100);

// 07: Rollup Hierarchy — show facility expanded + lower levels
await captureSection('07_rollup_hierarchy.png', positions['rollup-facility'] - 80);

// 08: Step 6 Dashboard — scroll to show it cleanly
await captureSection('08_step6_dashboard.png', positions.step6 - 20);

await browser.close();
console.log('Done!');
