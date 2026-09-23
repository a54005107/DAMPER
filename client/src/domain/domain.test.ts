import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initialDatabase,
  api,
  ConflictError,
  STORAGE_KEY,
  canAccess,
  canEdit,
} from '../services/api';
import { required, stock, setUsage, filterMaterials, previous } from './calculations';
import { emptyFilters, type Material } from './types';
import { formula, validateFormula } from './formula';
import { exportRows, makeWorkbook } from '../services/export';
import * as XLSX from 'xlsx';
const date = '2026-09-15';
beforeEach(() => {
  const map = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => map.get(k) || null,
    setItem: (k: string, v: string) => map.set(k, v),
    removeItem: (k: string) => map.delete(k),
  });
});
describe('원본 데이터와 재고 계산', () => {
  it('282개 자재, 40모델과 실제 원본 스냅샷', () => {
    const d = initialDatabase();
    expect(d.materials).toHaveLength(282);
    expect(d.models).toHaveLength(40);
    expect(d.materials.filter((m) => m.review)).toHaveLength(15);
    expect(d.materials.find((m) => m.id === 'R311')!.opening).toBe(232);
    expect(Object.values(d.plans['2026-10']).reduce((a, b) => a + b, 0)).toBe(133);
  });
  it('공용 NUT는 2모델 계획을 하나의 재고와 비교', () => {
    const d = initialDatabase(),
      m = d.materials.find((m) => m.id === 'R311')!;
    expect(required(m, d.plans['2026-10'])).toBe(240);
    expect(stock(d, m)).toBe(232);
    expect(required(m, { J8: 2, J9: 3 })).toBe(60);
  });
  it('12에서 15로 수정하면 3개만 추가 차감, 반복 저장 멱등', () => {
    const d = initialDatabase(),
      m = d.materials.find((m) => m.id === 'R311')!;
    const a = setUsage(d, date, 'direct', { R311: 12 });
    expect(stock(a, m)).toBe(220);
    const b = setUsage(a, date, 'direct', { R311: 15 });
    expect(stock(b, m)).toBe(217);
    expect(stock(setUsage(b, date, 'direct', { R311: 15 }), m)).toBe(217);
  });
  it('입고·분실·날짜별 전일재고 및 과거 수정 반영', () => {
    let d = setUsage(initialDatabase(), date, 'direct', { R311: 12 });
    const m = d.materials.find((m) => m.id === 'R311')!;
    d.days[date].incoming.R311 = 10;
    d.days[date].loss.R311 = 2;
    expect(stock(d, m)).toBe(228);
    expect(previous(d, m, '2026-09-16')).toBe(228);
    d = setUsage(d, '2026-09-16', 'direct', { R311: 5 });
    expect(stock(d, m)).toBe(223);
    d = setUsage(d, date, 'direct', { R311: 15 });
    expect(stock(d, m)).toBe(220);
  });
  it('입력 출처 교체시 중복 차감하지 않음', () => {
    let d = initialDatabase();
    d.materials = d.materials.map((m) => ({ ...m, review: false }));
    const m = d.materials.find((m) => m.id === 'R311')!;
    d = setUsage(d, date, 'direct', { R311: 12 });
    d = setUsage(d, date, 'assembly', { J9: 2 });
    expect(stock(d, m)).toBe(208);
    expect(d.days[date].source).toBe('assembly');
    d = setUsage(d, date, 'direct', { R311: 15 });
    expect(stock(d, m)).toBe(217);
    expect(d.days[date].assembly).toEqual({});
  });
  it('불일치 자재가 있는 조립 저장 차단', () =>
    expect(() => setUsage(initialDatabase(), date, 'assembly', { J9: 2 })).toThrow('검토'));
  it('잘못된 날짜·음수·무한대·소수 조립수량 차단', () => {
    const d = initialDatabase();
    expect(() => setUsage(d, '2026-09-01', 'direct', {})).toThrow();
    expect(() => setUsage(d, date, 'direct', { R311: -1 })).toThrow();
    expect(() => setUsage(d, date, 'direct', { R311: NaN })).toThrow();
    expect(() => setUsage(d, date, 'assembly', { J9: 1.5 })).toThrow('정수');
  });
  it('계산식 변경은 이미 저장된 실적에 소급하지 않음', () => {
    const d = setUsage(initialDatabase(), date, 'direct', { R311: 12 });
    const m = d.materials.find((m) => m.id === 'R311')!;
    m.formula = 'q * rate * 2';
    expect(stock(d, m)).toBe(220);
    expect(required(m, { J9: 2 })).toBe(48);
  });
});
describe('안전한 계산식', () => {
  it('연산 우선순위, 괄호, 소수, 변수', () => {
    expect(formula('q * (rate + 2) / 2', 10, 12)).toBe(70);
    expect(formula('q * rate * 0.5', 2, 12)).toBe(12);
  });
  it.each(['alert(1)', 'q.constructor', 'q ** 2', 'q / 0', 'unknown', 'q;1', '-q', '(q*rate'])(
    '지원 외 표현식 차단: %s',
    (s) => expect(() => formula(s, 1, 12)).toThrow(),
  );
  it('고정 상수·비선형 수식 차단', () => {
    expect(() => validateFormula('q * q', [12])).toThrow();
    expect(() => validateFormula('q + 1', [12])).toThrow();
    expect(() => validateFormula('q * rate', [12])).not.toThrow();
    expect(() => validateFormula('q*(q-1)*(q-2)*(q-10)*(q-100)', [12])).toThrow();
  });
});
describe('필터·내보내기', () => {
  it('검색+재질+모델+규격+부족 필터와 Excel 행 일치', () => {
    const d = initialDatabase();
    const f = {
      ...emptyFilters,
      query: 'NUT',
      substance: 'SUS304',
      model: 'J9',
      spec: d.materials.find((m) => m.id === 'R311')!.spec,
      shortage: true,
    };
    const rows = filterMaterials(d, f, '2026-10');
    expect(rows.map((m) => m.id)).toContain('R311');
    const exported = exportRows(d, rows, '2026-10');
    expect(exported.map((r) => r['자재코드'])).toEqual(rows.map((m) => m.id));
    const bytes = XLSX.write(makeWorkbook(d, rows, '2026-10'), {
      type: 'buffer',
      bookType: 'xlsx',
    });
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    const read = XLSX.read(bytes);
    expect(XLSX.utils.sheet_to_json(read.Sheets['재고'])).toHaveLength(rows.length);
  });
  it('모델 필터는 공용 재고를 복제하지 않음', () => {
    const d = initialDatabase();
    for (const model of ['J8', 'J9']) {
      const list = filterMaterials(d, { ...emptyFilters, model }, '2026-10');
      const m = list.find((m) => m.id === 'R311')!;
      expect(stock(d, m)).toBe(232);
      expect(required(m, d.plans['2026-10'])).toBe(240);
    }
  });
});
describe('서비스 권한·실패·충돌', () => {
  it('역할별 직접 접근과 편집 제한', async () => {
    const d = initialDatabase(),
      v = d.users.find((u) => u.id === 'viewer')!,
      p = d.users.find((u) => u.id === 'pending')!;
    expect(canAccess(v, '/permissions')).toBe(false);
    expect(canAccess(p, '/inventory')).toBe(false);
    expect(canEdit(v)).toBe(false);
    await expect(api.save(d, 0, 'viewer')).rejects.toThrow('권한');
    await expect(api.save(d, 0, 'editor', 'admin')).rejects.toThrow('권한');
  });
  it('정상 저장과 오래된 버전 충돌', async () => {
    const d = initialDatabase();
    await api.save(d, 0, 'admin');
    await expect(api.save(d, 0, 'admin')).rejects.toBeInstanceOf(ConflictError);
    expect(api.read().revision).toBe(1);
  });
  it('실패시 저장소 유지 및 재시도', async () => {
    const d = initialDatabase();
    api.failNext();
    await expect(api.save(d, 0, 'editor')).rejects.toThrow('실패');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(null);
    await api.save(d, 0, 'editor');
    expect(api.read().revision).toBe(1);
  });
  it('가입시 비밀번호·토큰 저장 없이 승인 대기', async () => {
    const id = await api.register({
      name: '테스트',
      email: 'test@company.kr',
      company: '대한산업',
      companyId: 'DAMPER-001',
    });
    expect(api.read().users.find((u) => u.id === id)?.status).toBe('pending');
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain('password');
  });
});
