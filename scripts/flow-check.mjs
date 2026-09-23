import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import { writeFile, mkdir } from 'node:fs/promises';
const server = await createServer({ server: { host: '127.0.0.1', port: 5174, strictPort: true } });
await server.listen();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
const url = 'http://127.0.0.1:5174';
await mkdir('artifacts', { recursive: true });
async function login(email = 'admin@damper.demo') {
  await page.goto(url + '/login');
  await page.getByLabel('이메일', { exact: true }).fill(email);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
}
async function saved() {
  await page.getByRole('status').filter({ hasText: '저장했습니다' }).waitFor();
}
async function goto(path) {
  await page.goto(url + path);
  await page.locator('main h1').waitFor();
}
await login();
await page.getByRole('heading', { name: '금일 사용 입력' }).waitFor();
// Source switch and material formula validation / resolution.
await goto('/inventory?material=R321');
await page.getByRole('button', { name: '자재정보 · 계산식 편집' }).click();
await page.getByLabel('모델별 사용량 · 계획 필요량').fill('q.constructor');
await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
await page.getByLabel('모델별 사용량 · 계획 필요량').fill('q * rate');
await page.getByRole('checkbox', { name: '계산 기준을 검토했으며 이 값으로 확정합니다.' }).check();
await page.getByRole('button', { name: '저장', exact: true }).click();
await saved();
await goto('/usage');
await page.getByRole('tab', { name: '조립수량으로 계산', exact: true }).click();
await page.getByLabel('모델', { exact: true }).selectOption('J6');
await page.getByRole('spinbutton', { name: '금일 누적 조립수량' }).fill('2');
await page
  .getByRole('button', { name: '조립실적 저장', exact: true })
  .filter({ visible: true })
  .click();
await saved();
let db = await page.evaluate(() => JSON.parse(localStorage.getItem('damper-demo-v1')));
if (!Object.values(db.days).some((d) => d.assembly.J6 === 2 && d.usage.R312 === 24))
  throw new Error('Assembly usage failed');
await page.getByRole('tab', { name: '직접 입력', exact: true }).click();
await page.getByRole('spinbutton', { name: 'R312 오늘 사용', exact: true }).fill('15');
await page
  .getByRole('button', { name: '사용수량 저장', exact: true })
  .filter({ visible: true })
  .click();
await page.getByRole('heading', { name: '사용량 입력 방식 변경' }).waitFor();
await page.getByRole('button', { name: '기존 사용량 교체' }).click();
await page.waitForFunction(() =>
  Object.values(JSON.parse(localStorage.getItem('damper-demo-v1')).days).some(
    (d) => d.source === 'direct' && d.usage.R312 === 15,
  ),
);
// Plan save and alerts update.
await goto('/plans');
await page.getByRole('spinbutton', { name: 'ICER 1000A 계획수량', exact: true }).fill('-1');
await page.getByRole('alert').filter({ hasText: '정수로 입력하세요' }).waitFor();
await page.getByRole('heading', { name: '생산계획', exact: true }).waitFor();
await page.getByRole('spinbutton', { name: 'ICER 1000A 계획수량', exact: true }).fill('20');
await page
  .getByRole('button', { name: '계획 저장', exact: true })
  .filter({ visible: true })
  .click();
await page.waitForFunction(
  () => JSON.parse(localStorage.getItem('damper-demo-v1')).plans['2026-10'].J9 === 20,
);
await page.getByRole('button', { name: /부족 알림/ }).click();
await page.getByRole('dialog').waitFor();
await expect(page.getByRole('dialog')).toContainText('생산계획 기준');
await page.getByRole('button', { name: '닫기', exact: true }).click();
// A failed save preserves input and permits retry.
await goto('/more');
await page.getByText('데모 환경 설정', { exact: true }).click();
await page.getByRole('button', { name: '다음 저장 실패 재현' }).click();
await page.getByRole('link', { name: '금일 사용 입력', exact: true }).click();
await page.getByRole('spinbutton', { name: 'R312 오늘 사용', exact: true }).fill('16');
await page
  .getByRole('button', { name: '사용수량 저장', exact: true })
  .filter({ visible: true })
  .click();
await page.getByRole('alert').filter({ hasText: '데모 저장 실패' }).waitFor();
await expect(page.getByRole('spinbutton', { name: 'R312 오늘 사용', exact: true })).toHaveValue(
  '16',
);
await page
  .getByRole('button', { name: '사용수량 저장', exact: true })
  .filter({ visible: true })
  .click();
await saved();
// Conflict never silently overwrites and drafts survive explicit refresh.
await page.getByRole('spinbutton', { name: 'R312 오늘 사용', exact: true }).fill('17');
await page.evaluate(() => {
  const key = 'damper-demo-v1',
    d = JSON.parse(localStorage.getItem(key));
  d.revision++;
  d.materials[0].opening = 1;
  d.materials[0].modifiedBy = '동료';
  localStorage.setItem(key, JSON.stringify(d));
});
await page
  .getByRole('button', { name: '사용수량 저장', exact: true })
  .filter({ visible: true })
  .click();
await page.getByRole('heading', { name: '편집 충돌' }).waitFor();
await page.getByText('최신 내용 확인', { exact: true }).click();
await page.screenshot({ path: 'artifacts/conflict-1440.png' });
await page.getByRole('button', { name: '최신 내용 반영 · 내 입력 유지' }).click();
await expect(page.getByRole('spinbutton', { name: 'R312 오늘 사용', exact: true })).toHaveValue(
  '17',
);
await page
  .getByRole('button', { name: '사용수량 저장', exact: true })
  .filter({ visible: true })
  .click();
await saved();
// New material with working formula and BOM.
await goto('/inventory');
await page.getByRole('button', { name: '자재 추가', exact: true }).click();
await page.getByLabel('자재명', { exact: true }).fill('테스트 자재');
await page.getByLabel('재질', { exact: true }).fill('SUS304');
await page.getByLabel('규격', { exact: true }).fill('TEST-M8');
await page.getByRole('spinbutton', { name: '기초재고', exact: true }).fill('100');
await page.getByRole('button', { name: '모델 추가', exact: true }).click();
await page.getByRole('spinbutton', { name: '모델 1 소요량', exact: true }).fill('2');
await page.getByRole('button', { name: '저장', exact: true }).click();
await saved();
await page.getByRole('textbox', { name: '자재명·규격 검색' }).fill('테스트 자재');
await expect(page.getByRole('button', { name: '테스트 자재', exact: true })).toBeVisible();
// Approval and role changes.
await goto('/permissions');
await page.getByRole('button', { name: '승인', exact: true }).click();
await saved();
await expect(page.getByText('대기 중인 승인 요청이 없습니다.')).toBeVisible();
await page.getByRole('tab', { name: '사용자 관리' }).click();
await page.getByRole('combobox', { name: '박지훈 권한' }).selectOption('editor');
await page
  .locator('.userRow')
  .filter({ hasText: '박지훈' })
  .getByRole('button', { name: '권한 저장' })
  .click();
await saved();
// Signup validation and approval gating in separate browser state.
const fresh = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p = await fresh.newPage();
await p.goto(url + '/signup');
await p.getByLabel('이름', { exact: true }).fill('홍테스트');
await p.getByLabel('이메일', { exact: true }).fill('new@damper.demo');
await p.getByLabel('비밀번호', { exact: true }).fill('MyPrivatePassword123');
await p.getByLabel('비밀번호 확인', { exact: true }).fill('mismatch');
await p.getByLabel('회사명', { exact: true }).fill('대한산업');
await p.getByLabel('회사 식별정보', { exact: true }).fill('DAMPER-001');
await p.getByRole('button', { name: '가입 · 권한 신청' }).click();
await p.getByRole('alert').filter({ hasText: '일치하지 않습니다' }).waitFor();
await p.getByLabel('비밀번호 확인', { exact: true }).fill('MyPrivatePassword123');
await p.getByRole('button', { name: '가입 · 권한 신청' }).click();
await p.waitForURL('**/pending');
if (
  (await p.evaluate(() => localStorage.getItem('damper-demo-v1'))).includes('MyPrivatePassword123')
)
  throw new Error('Password persisted');
await p.goto(url + '/inventory');
await p.waitForURL('**/pending');
await p.screenshot({ path: 'artifacts/pending-390.png' });
await writeFile(
  'artifacts/flow-results.json',
  JSON.stringify(
    {
      status: 'passed',
      checks: [
        'formula validation and confirmation',
        'assembly calculation',
        'source switch',
        'plan and alerts',
        'save failure retry',
        'conflict draft recovery',
        'new material',
        'approval and role changes',
        'signup validation',
        'pending access protection',
        'no stored passwords',
      ],
      errors,
    },
    null,
    2,
  ),
);
await browser.close();
await server.close();
if (errors.length) throw new Error(errors.join('\n'));
console.log('Extended workflow checks passed.');
