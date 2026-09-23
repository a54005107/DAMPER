import seed from '../data/seed.json';
import type { Database, User, Role } from '../domain/types';
export const STORAGE_KEY = 'damper-demo-v1';
const users: User[] = [
  {
    id: 'admin',
    name: '김민수',
    email: 'admin@damper.demo',
    company: '대한산업',
    companyId: 'DAMPER-001',
    role: 'admin',
    status: 'approved',
  },
  {
    id: 'editor',
    name: '이지은',
    email: 'editor@damper.demo',
    company: '대한산업',
    companyId: 'DAMPER-001',
    role: 'editor',
    status: 'approved',
  },
  {
    id: 'viewer',
    name: '박서연',
    email: 'viewer@damper.demo',
    company: '대한산업',
    companyId: 'DAMPER-001',
    role: 'viewer',
    status: 'approved',
  },
  {
    id: 'pending',
    name: '박지훈',
    email: 'pending@damper.demo',
    company: '대한산업',
    companyId: 'DAMPER-001',
    role: 'viewer',
    status: 'pending',
  },
];
export const initialDatabase = (): Database => ({
  revision: 0,
  ...structuredClone(seed),
  days: {},
  users: structuredClone(users),
});
export class ConflictError extends Error {
  constructor(public latest: Database) {
    super('다른 사용자가 데이터를 수정했습니다. 입력은 보존되어 있습니다.');
  }
}
let failNext = false;
export const api = {
  read(): Database {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : initialDatabase();
  },
  async load() {
    await new Promise((r) => setTimeout(r, 180));
    return this.read();
  },
  async login(email: string, password: string) {
    await new Promise((r) => setTimeout(r, 150));
    const u = this.read().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!u || password !== 'Damper123!')
      throw new Error('이메일 또는 데모 비밀번호가 올바르지 않습니다.');
    return u.id;
  },
  async save(
    next: Database,
    expected: number,
    userId: string,
    scope: 'inventory' | 'admin' = 'inventory',
  ) {
    await new Promise((r) => setTimeout(r, 180));
    if (failNext) {
      failNext = false;
      throw new Error('데모 저장 실패입니다. 입력을 유지했습니다. 다시 저장하세요.');
    }
    const current = this.read(),
      user = current.users.find((u) => u.id === userId);
    if (
      !user ||
      user.status !== 'approved' ||
      user.role === 'viewer' ||
      (scope === 'admin' && user.role !== 'admin')
    )
      throw new Error('수정 권한이 없습니다.');
    if (current.revision !== expected) throw new ConflictError(current);
    const saved = { ...next, revision: expected + 1 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    return saved;
  },
  async register(input: Omit<User, 'id' | 'role' | 'status'>) {
    const current = this.read();
    if (current.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase()))
      throw new Error('이미 신청된 이메일입니다.');
    const u: User = { ...input, id: crypto.randomUUID(), role: 'viewer', status: 'pending' };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...current, revision: current.revision + 1, users: [...current.users, u] }),
    );
    return u.id;
  },
  failNext() {
    failNext = true;
  },
  simulateConflict() {
    const db = this.read();
    db.revision++;
    db.materials[0].opening += 1;
    db.materials[0].modifiedBy = '동료 (충돌 데모)';
    db.materials[0].modifiedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  },
  reset() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
export const canEdit = (u: User) =>
  u.status === 'approved' && (u.role === 'editor' || u.role === 'admin');
export const canAccess = (u: User, path: string) =>
  u.status === 'approved' && (path !== '/permissions' || u.role === 'admin');
export const demoRole = (role: Role) => users.find((u) => u.role === role)!;
