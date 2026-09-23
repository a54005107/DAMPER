import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const url = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await mkdir('artifacts', { recursive: true });
await page.goto(url);
await page.getByRole('button', { name: '로그인', exact: true }).click();
await page.getByRole('heading', { name: '금일 사용 입력', exact: true }).waitFor();
await page.getByRole('spinbutton', { name: 'R311 오늘 사용', exact: true }).fill('12');
await page
  .getByRole('button', { name: '사용수량 저장', exact: true })
  .filter({ visible: true })
  .click();
await page.getByRole('status').filter({ hasText: '저장했습니다' }).waitFor();
await page.getByRole('spinbutton', { name: 'R311 오늘 사용', exact: true }).fill('15');
await page
  .getByRole('button', { name: '사용수량 저장', exact: true })
  .filter({ visible: true })
  .click();
await page.waitForFunction(() =>
  Object.values(JSON.parse(localStorage.getItem('damper-demo-v1')).days).some(
    (d) => d.usage.R311 === 15,
  ),
);
const stock = await page
  .locator('tr')
  .filter({ has: page.getByRole('spinbutton', { name: 'R311 오늘 사용', exact: true }) })
  .innerText();
if (!stock.includes('217')) throw new Error('Cumulative usage preview incorrect: ' + stock);
await page.screenshot({ path: 'artifacts/usage-1440.png', fullPage: true });
for (const width of [1440, 768, 390, 320]) {
  await page.setViewportSize({ width, height: 900 });
  for (const route of ['/usage', '/inventory', '/plans', '/permissions', '/more']) {
    await page.goto(url + route);
    await page.locator('main h1').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw new Error(`Page overflow ${route} ${width}`);
    if (width !== 320)
      await page.screenshot({ path: `artifacts/${route.slice(1)}-${width}.png`, fullPage: true });
  }
}
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(url + '/inventory');
await page.getByRole('textbox', { name: '자재명·규격 검색' }).fill('NUT');
const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: '엑셀 내보내기', exact: true }).click();
await page.getByRole('button', { name: '다운로드', exact: true }).click();
const download = await downloadPromise;
await download.saveAs('artifacts/filtered-inventory.xlsx');
await page.getByRole('textbox', { name: '자재명·규격 검색' }).fill('xyz-nothing');
await page.getByText('조건에 맞는 자재가 없습니다.').waitFor();
await page.getByRole('button', { name: '필터 초기화', exact: true }).last().click();
await page.goto(url + '/inventory?material=R311');
await page.getByRole('dialog').waitFor();
await page.getByRole('spinbutton', { name: '입고수량', exact: true }).fill('8');
await page.getByRole('button', { name: '재고 저장', exact: true }).click();
await page.waitForFunction(() =>
  Object.values(JSON.parse(localStorage.getItem('damper-demo-v1')).days).some(
    (d) => d.incoming.R311 === 8,
  ),
);
await page.screenshot({ path: 'artifacts/detail-1440.png' });
await page.getByRole('button', { name: '닫기', exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole('button', { name: '필터', exact: true }).click();
await page.screenshot({ path: 'artifacts/filter-390.png' });
await page.getByRole('button', { name: '닫기', exact: true }).click();
await page.goto(url + '/inventory?material=R311');
await page.getByRole('dialog').waitFor();
await page.getByRole('button', { name: '자재정보 · 계산식 편집' }).click();
await page.getByRole('heading', { name: '자재정보 · 계산식 편집' }).waitFor();
const modalWidth = await page
  .getByRole('dialog')
  .evaluate((el) => el.getBoundingClientRect().width);
if (modalWidth !== 390) throw new Error(`Mobile editor must fill viewport: ${modalWidth}`);
await page.keyboard.press('Shift+Tab');
if (!(await page.getByRole('dialog').evaluate((el) => el.contains(document.activeElement))))
  throw new Error('Modal focus escaped');
await page.screenshot({ path: 'artifacts/editor-390.png' });
await page.getByRole('button', { name: '닫기', exact: true }).click();
await page.getByRole('button', { name: '닫기', exact: true }).click();
await context.close();
for (const role of ['viewer', 'pending']) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(url + '/login');
  await p.getByLabel('이메일', { exact: true }).fill(role + '@damper.demo');
  await p.getByRole('button', { name: '로그인', exact: true }).click();
  await p.waitForURL(role === 'pending' ? '**/pending' : '**/usage');
  if (role === 'viewer') {
    await p.goto(url + '/permissions');
    await p.getByRole('heading', { name: '접근 권한이 없습니다' }).waitFor();
  } else {
    await p.goto(url + '/inventory');
    await p.waitForURL('**/pending');
  }
  await ctx.close();
}
await writeFile(
  'artifacts/browser-results.json',
  JSON.stringify(
    {
      status: 'passed',
      widths: [320, 390, 768, 1440],
      screens: ['usage', 'inventory', 'plans', 'permissions', 'more'],
      errors,
    },
    null,
    2,
  ),
);
await browser.close();
await server.close();
if (errors.length) throw new Error(errors.join('\n'));
console.log('Browser checks passed; screenshots and filtered .xlsx in artifacts/');
