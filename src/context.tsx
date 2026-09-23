import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Database, User, Filters } from './domain/types';
import { emptyFilters } from './domain/types';
import { api, ConflictError, canEdit } from './services/api';
import { Modal, Button, Toast, ErrorMessage } from './components/UI';
type Store = {
  db: Database;
  user: User | null;
  login: (id: string) => void;
  logout: () => void;
  save: (fn: (db: Database) => Database, scope?: 'inventory' | 'admin') => Promise<boolean>;
  busy: boolean;
  error: string;
  setError: (s: string) => void;
  month: string;
  setMonth: (s: string) => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  notify: (s: string) => void;
  editable: boolean;
  presence: boolean;
  setPresence: (v: boolean) => void;
};
const Context = createContext<Store>(null!);
export const useStore = () => useContext(Context);
export function Provider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database | null>(null),
    [id, setId] = useState<string | null>(() => sessionStorage.getItem('damper-user')),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [conflict, setConflict] = useState<Database | null>(null),
    [month, setMonth] = useState('2026-10'),
    [filters, setFilters] = useState(emptyFilters),
    [presence, setPresence] = useState(false);
  useEffect(() => {
    api
      .load()
      .then(setDb)
      .catch((e) => setError(String(e)));
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const user = db?.users.find((u) => u.id === id) || null;
  async function save(fn: (d: Database) => Database, scope: 'inventory' | 'admin' = 'inventory') {
    if (!db || !id || busy) return false;
    setBusy(true);
    setError('');
    try {
      const next = await api.save(fn(db), db.revision, id, scope);
      setDb(next);
      setToast('저장했습니다');
      return true;
    } catch (e) {
      if (e instanceof ConflictError) setConflict(e.latest);
      else setError(e instanceof Error ? e.message : '저장에 실패했습니다.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  function login(value: string) {
    setDb(api.read());
    setId(value);
    sessionStorage.setItem('damper-user', value);
    setError('');
  }
  function logout() {
    setId(null);
    sessionStorage.removeItem('damper-user');
    setError('');
    setFilters(emptyFilters);
  }
  if (!db)
    return (
      <div className="loading" role="status">
        <strong>DAMPER</strong>
        <p>{error || '재고 데이터를 불러오는 중…'}</p>
        <div />
        <div />
        <div />
        {error && <Button onClick={() => location.reload()}>다시 시도</Button>}
      </div>
    );
  return (
    <Context.Provider
      value={{
        db,
        user,
        login,
        logout,
        save,
        busy,
        error,
        setError,
        month,
        setMonth,
        filters,
        setFilters,
        notify: setToast,
        editable: !!user && canEdit(user),
        presence,
        setPresence,
      }}
    >
      {children}
      <Toast text={toast} />
      {conflict && (
        <Modal
          title="편집 충돌"
          onClose={() => setConflict(null)}
          footer={
            <Button
              primary
              onClick={() => {
                setDb(conflict);
                setConflict(null);
                setError(
                  '최신 데이터가 반영되었습니다. 보존된 내 입력을 확인한 후 다시 저장하세요.',
                );
              }}
            >
              최신 내용 반영 · 내 입력 유지
            </Button>
          }
        >
          <ErrorMessage text="다른 사용자가 데이터를 수정했습니다. 자동으로 덮어쓰지 않았습니다." />
          <p>
            현재 버전 {db.revision} → 최신 버전 {conflict.revision}
          </p>
          <p>최신 내용과 내 입력을 비교한 후 다시 저장할 수 있습니다.</p>
          <details>
            <summary>최신 내용 확인</summary>
            <pre className="jsonPreview">
              {JSON.stringify(
                {
                  materials: conflict.materials.filter(
                    (m) =>
                      JSON.stringify(m) !== JSON.stringify(db.materials.find((x) => x.id === m.id)),
                  ),
                  days: conflict.days,
                  plans: conflict.plans,
                },
                null,
                2,
              )}
            </pre>
          </details>
          <Button
            onClick={() => {
              const inputs = Array.from(
                document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select'),
              ).map((x) => ({
                field: x.getAttribute('aria-label') || x.name || x.type,
                value: x.value,
              }));
              const blob = new Blob([JSON.stringify(inputs, null, 2)], {
                type: 'application/json',
              });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'damper-my-input.json';
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            내 입력 복구 파일 다운로드
          </Button>
        </Modal>
      )}
    </Context.Provider>
  );
}
