import type { Database, Material, Filters, Day } from './types';
import { formula } from './formula';
export const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
export const fmt = (v: number) =>
  new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(v);
export const required = (m: Material, quantities: Record<string, number>) =>
  m.bom.reduce((n, b) => n + formula(m.formula, quantities[b.modelId] || 0, b.rate), 0);
export function previewRequired(m: Material, quantities: Record<string, number>) {
  try {
    Object.values(quantities).forEach(nonnegative);
    return required(m, quantities);
  } catch {
    return 0;
  }
}
export const delta = (d: Day, id: string) =>
  (d.incoming[id] || 0) - (d.usage[id] || 0) - (d.loss[id] || 0);
export const stock = (db: Database, m: Material, date = '9999-99-99') =>
  m.opening +
  Object.entries(db.days)
    .filter(([d]) => d <= date)
    .reduce((n, [, day]) => n + delta(day, m.id), 0);
export const previous = (db: Database, m: Material, date: string) =>
  m.opening +
  Object.entries(db.days)
    .filter(([d]) => d < date)
    .reduce((n, [, day]) => n + delta(day, m.id), 0);
export const balance = (db: Database, m: Material, month: string) =>
  stock(db, m) - required(m, db.plans[month] || {});
export function filterMaterials(db: Database, filters: Filters, month: string) {
  const f = filters;
  return db.materials.filter(
    (m) =>
      (!f.query || `${m.name} ${m.spec}`.toLowerCase().includes(f.query.toLowerCase())) &&
      (!f.name || m.name === f.name) &&
      (!f.substance || m.substance === f.substance) &&
      (!f.spec || m.spec === f.spec) &&
      (!f.model || m.bom.some((b) => b.modelId === f.model)) &&
      (!f.shortage || balance(db, m, month) < 0),
  );
}
export function nonnegative(v: number) {
  if (!Number.isFinite(v) || v < 0 || v > 1e9)
    throw new Error('0 이상 10억 이하의 수량을 입력하세요.');
}
export function setUsage(
  db: Database,
  date: string,
  source: Day['source'],
  quantities: Record<string, number>,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    date < '2026-09-15' ||
    date > today()
  )
    throw new Error('2026.09.15부터 오늘까지 올바른 날짜를 선택하세요.');
  Object.values(quantities).forEach(nonnegative);
  const d = db.days[date] ?? { source: 'direct', usage: {}, assembly: {}, incoming: {}, loss: {} };
  if (source === 'assembly') {
    if (Object.values(quantities).some((n) => !Number.isInteger(n)))
      throw new Error('조립수량은 정수로 입력하세요.');
    const disputed = db.materials.filter(
      (m) =>
        m.review &&
        (m.reviewModels || m.bom.map((b) => b.modelId)).some((id) => (quantities[id] || 0) > 0),
    );
    if (disputed.length)
      throw new Error(
        `소요량 검토가 필요한 자재 ${disputed.length}개가 있습니다. 재고관리에서 계산식을 확인·확정하세요.`,
      );
  }
  const usage =
    source === 'direct'
      ? { ...quantities }
      : Object.fromEntries(db.materials.map((m) => [m.id, required(m, quantities)]));
  return {
    ...db,
    days: {
      ...db.days,
      [date]: { ...d, source, usage, assembly: source === 'assembly' ? { ...quantities } : {} },
    },
  };
}
