import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { useStore } from '../context';
import { emptyFilters, type Filters } from '../domain/types';
import { filterMaterials, stock, required, fmt } from '../domain/calculations';
import { PageHeader, Button, Field, Modal, Empty } from '../components/UI';
import { ExportDialog } from '../components/ExportDialog';
import { MaterialDetail } from '../components/MaterialDetail';
import { MaterialEditor } from '../components/MaterialEditor';
export default function Inventory() {
  const { db, filters, setFilters, month, setMonth, editable, presence } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false),
    [exportOpen, setExportOpen] = useState(false),
    [add, setAdd] = useState(false),
    [page, setPage] = useState(0),
    [sort, setSort] = useState(false);
  const rows = filterMaterials(db, filters, month);
  const sorted = sort ? [...rows].sort((a, b) => a.name.localeCompare(b.name)) : rows;
  const maxPage = Math.max(0, Math.ceil(rows.length / 20) - 1);
  const currentPage = Math.min(page, maxPage);
  const shown = sorted.slice(currentPage * 20, currentPage * 20 + 20);
  const detail = searchParams.get('material');
  function update(f: Filters) {
    setFilters(f);
    setPage(0);
  }
  const open = (id: string) => setSearchParams({ material: id });
  return (
    <>
      <PageHeader
        title="재고관리"
        description={`전체 ${db.materials.length}개 자재 · 공용 재고 통합 관리`}
      >
        <Button onClick={() => setExportOpen(true)}>
          <Download size={16} />
          <span className="desktopOnly">엑셀 내보내기</span>
          <span className="mobileOnly">내보내기</span>
        </Button>
        {editable && (
          <Button primary onClick={() => setAdd(true)}>
            <Plus size={16} />
            자재 추가
          </Button>
        )}
      </PageHeader>
      <div className="toolbar">
        <div className="searchInput">
          <Search size={18} />
          <input
            aria-label="자재명·규격 검색"
            placeholder="자재명·규격 검색"
            value={filters.query}
            onChange={(e) => update({ ...filters, query: e.target.value })}
          />
        </div>
        <div className="desktopOnly">
          <select
            aria-label="재질 필터"
            value={filters.substance}
            onChange={(e) => update({ ...filters, substance: e.target.value })}
          >
            <option value="">재질 전체</option>
            {[...new Set(db.materials.map((m) => m.substance))].sort().map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <div className="desktopOnly">
          <select
            aria-label="적용모델 필터"
            value={filters.model}
            onChange={(e) => update({ ...filters, model: e.target.value })}
          >
            <option value="">적용모델 전체</option>
            {db.models.map((m) => (
              <option value={m.id} key={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => setFilterOpen(true)}>
          <SlidersHorizontal size={16} />
          필터
          {Object.entries(filters).filter(([k, v]) => k !== 'query' && v).length > 0
            ? ` ${Object.entries(filters).filter(([k, v]) => k !== 'query' && v).length}`
            : ''}
        </Button>
        <label className="check">
          <input
            type="checkbox"
            checked={filters.shortage}
            onChange={(e) => update({ ...filters, shortage: e.target.checked })}
          />
          부족 자재만
        </label>
      </div>
      <div className="tableFoot">
        <span>
          <b>{rows.length}</b>개 자재{' '}
          {Object.values(filters).some(Boolean) && (
            <button className="textButton" onClick={() => update(emptyFilters)}>
              필터 초기화
            </button>
          )}
        </span>
        <label className="inlineField">
          계획 기준{' '}
          <input
            aria-label="재고 계획월"
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
          />
        </label>
      </div>
      {rows.length ? (
        <>
          <div className="tableWrap desktopOnly">
            <table>
              <thead>
                <tr>
                  <th aria-sort={sort ? 'ascending' : 'none'}>
                    <button className="textButton" onClick={() => setSort(!sort)}>
                      자재 {sort ? '↑' : '↕'}
                    </button>
                  </th>
                  <th>재질</th>
                  <th>규격</th>
                  <th className="numeric">현재재고</th>
                  <th className="numeric">계획 필요</th>
                  <th className="numeric">과부족</th>
                  <th>편집 · 마지막 수정</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((m, i) => {
                  const st = stock(db, m),
                    need = required(m, db.plans[month] || {}),
                    diff = st - need;
                  return (
                    <tr key={m.id} className={presence && i === 0 ? 'editingRow' : ''}>
                      <td>
                        <button className="rowLink" onClick={() => open(m.id)}>
                          {m.name}
                        </button>
                        <small>
                          {m.id}
                          {m.review ? ' · 소요량 검토' : ''}
                        </small>
                      </td>
                      <td>{m.substance}</td>
                      <td>{m.spec}</td>
                      <td className="numeric">
                        <b>{fmt(st)}</b>
                      </td>
                      <td className="numeric">{fmt(need)}</td>
                      <td className={`numeric ${diff < 0 ? 'danger' : ''}`}>{fmt(diff)}</td>
                      <td>
                        {presence && i === 0 && (
                          <small className="presence">동료 (데모) 편집 중</small>
                        )}
                        <small>
                          {m.modifiedBy} ·{' '}
                          {m.modifiedBy === '엑셀 가져오기'
                            ? '09.14'
                            : new Date(m.modifiedAt).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                        </small>
                      </td>
                      <td>
                        <Button aria-label={`${m.id} 상세`} onClick={() => open(m.id)}>
                          <MoreHorizontal size={18} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mobileOnly inventoryList">
            {shown.map((m, i) => {
              const st = stock(db, m),
                need = required(m, db.plans[month] || {}),
                diff = st - need;
              return (
                <button key={m.id} onClick={() => open(m.id)}>
                  <div>
                    <b>
                      {m.name} · {m.spec}
                    </b>
                    <small>
                      {m.substance} · {m.id}
                    </small>
                    <small>
                      {db.models.find((x) => x.id === m.bom[0]?.modelId)?.name}
                      {m.bom.length > 1 ? ` 외 ${m.bom.length - 1}개 모델` : ''}
                    </small>
                    {m.review && <small className="warningText">소요량 검토 필요</small>}
                    {presence && i === 0 && <small className="presence">동료 (데모) 편집 중</small>}
                    <small>
                      {m.modifiedBy} · {new Date(m.modifiedAt).toLocaleDateString('ko-KR')}
                    </small>
                  </div>
                  <div className="numeric">
                    <strong>{fmt(st)}</strong>
                    <small>계획 {fmt(need)}</small>
                    <small className={diff < 0 ? 'danger' : ''}>
                      {diff < 0 ? `부족 ${fmt(-diff)}` : `여유 ${fmt(diff)}`}
                    </small>
                  </div>
                  <ChevronRight size={18} />
                </button>
              );
            })}
          </div>
          <div className="tableFoot">
            <small>공용 자재의 필요량은 적용모델 전체 기준입니다.</small>
            <div className="actions">
              <Button
                aria-label="이전 페이지"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft size={16} />
              </Button>
              <span>
                {currentPage * 20 + 1}–{Math.min((currentPage + 1) * 20, rows.length)} /{' '}
                {rows.length}
              </span>
              <Button
                aria-label="다음 페이지"
                disabled={currentPage === maxPage}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Empty
          text={db.materials.length ? '조건에 맞는 자재가 없습니다.' : '등록된 자재가 없습니다.'}
        >
          <Button onClick={() => update(emptyFilters)}>필터 초기화</Button>
        </Empty>
      )}
      {filterOpen && <FilterSheet onClose={() => setFilterOpen(false)} onApply={update} />}{' '}
      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}{' '}
      {add && <MaterialEditor onClose={() => setAdd(false)} />}{' '}
      {detail && db.materials.some((m) => m.id === detail) && (
        <MaterialDetail key={detail} materialId={detail} onClose={() => setSearchParams({})} />
      )}
    </>
  );
}
function FilterSheet({ onClose, onApply }: { onClose: () => void; onApply: (f: Filters) => void }) {
  const { db, filters } = useStore();
  const [draft, setDraft] = useState(filters);
  const fields = [
    ['name', '자재명'],
    ['substance', '재질'],
    ['model', '적용모델'],
    ['spec', '규격'],
  ] as const;
  return (
    <Modal
      title="필터"
      kind="sheet"
      onClose={onClose}
      footer={
        <>
          <Button onClick={() => setDraft(emptyFilters)}>초기화</Button>
          <Button
            primary
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            필터 적용
          </Button>
        </>
      }
    >
      <div className="stack">
        {fields.map(([key, label]) => (
          <Field key={key} label={label}>
            <select
              value={draft[key]}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            >
              <option value="">전체</option>
              {key === 'model'
                ? db.models.map((m) => (
                    <option value={m.id} key={m.id}>
                      {m.name}
                    </option>
                  ))
                : [...new Set(db.materials.map((m) => m[key]))]
                    .sort()
                    .map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
        ))}
        <label className="check">
          <input
            type="checkbox"
            checked={draft.shortage}
            onChange={(e) => setDraft({ ...draft, shortage: e.target.checked })}
          />
          부족 자재만
        </label>
      </div>
    </Modal>
  );
}
