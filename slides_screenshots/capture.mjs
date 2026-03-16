import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '/Users/tomas/120/slides_screenshots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto('http://localhost:3000/metrics/dscr-lineage', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Screenshot configs: [filename, scrollY offset or selector approach]
const shots = [
  { name: '01_header_step1.png', scrollY: 0 },
  { name: '02_step2_l1_ref.png', selector: '[data-demo="step2"]' },
  { name: '03_step3_l2_snapshot.png', selector: '[data-demo="step3"]' },
  { name: '04_step4_calculation.png', selector: '[data-demo="step4"]' },
  { name: '05_step5_l3_output.png', selector: '[data-demo="step5"]' },
  { name: '06_foundational_rule.png', selector: '[data-demo="foundational-rule"]' },
  { name: '07_rollup_hierarchy.png', selector: '[data-demo="rollup-facility"]' },
  { name: '08_step6_dashboard.png', selector: '[data-demo="step6"]' },
];

for (const shot of shots) {
  if (shot.selector) {
    const el = await page.$(shot.selector);
    if (el) {
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    }
  } else {
    await page.evaluate((y) => window.scrollTo(0, y), shot.scrollY);
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: `${OUT}/${shot.name}`, fullPage: false });
  console.log(`Captured: ${shot.name}`);
}

// Also capture a full-page screenshot for reference
await page.screenshot({ path: `${OUT}/00_full_page.png`, fullPage: true });
console.log('Captured: 00_full_page.png');

await browser.close();
console.log('Done!');
