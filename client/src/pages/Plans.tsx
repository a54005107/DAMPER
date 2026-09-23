import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Save } from 'lucide-react';
import { useStore } from '../context';
import { emptyFilters } from '../domain/types';
import { fmt, previewRequired, required, stock, nonnegative } from '../domain/calculations';
import { PageHeader, Tabs, Field, NumberField, Button, ErrorMessage } from '../components/UI';
export default function Plans() {
  const { month } = useStore();
  return <PlanForm key={month} month={month} />;
}
function PlanForm({ month }: { month: string }) {
  const { db, setMonth, save, busy, editable, error, setFilters } = useStore(),
    navigate = useNavigate();
  const [group, setGroup] = useState('ICER'),
    [draft, setDraft] = useState({ ...db.plans[month] });
  const dirty = JSON.stringify(draft) !== JSON.stringify(db.plans[month] || {});
  const materials = db.materials.filter(
    (m) =>
      m.bom.some((b) => db.models.find((x) => x.id === b.modelId)?.group === group) &&
      previewRequired(m, Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v || 0]))) >
        0,
  );
  async function submit() {
    await save((d) => {
      Object.values(draft).forEach((v) => {
        nonnegative(v);
        if (!Number.isInteger(v)) throw new Error('생산계획은 정수 수량으로 입력하세요.');
      });
      d.materials.forEach((m) => required(m, draft));
      return { ...d, plans: { ...d.plans, [month]: draft } };
    });
  }
  const action = (
    <Button primary disabled={!editable || busy || !dirty} onClick={submit}>
      <Save size={16} />
      {busy ? '저장 중…' : '계획 저장'}
    </Button>
  );
  return (
    <>
      <PageHeader title="생산계획" description="월간 생산계획과 자재 소요량을 함께 관리하세요.">
        <span className="desktopOnly">{action}</span>
      </PageHeader>
      <div className="toolbar">
        <Field label="계획월">
          <input
            type="month"
            value={month}
            onChange={(e) => {
              if (
                e.target.value &&
                (!dirty || window.confirm('미저장 계획을 버리고 월을 변경할까요?'))
              )
                setMonth(e.target.value);
            }}
          />
        </Field>
        <small>현재 재고와 선택한 월의 전체 계획을 비교합니다.</small>
      </div>
      <Tabs items={['SCR-LP', 'ICER']} value={group} onChange={setGroup} />
      {Object.values(draft).some(
        (v) => !Number.isFinite(v) || v < 0 || v > 1e9 || !Number.isInteger(v),
      ) && (
        <ErrorMessage text="계획수량은 0 이상 10억 이하의 정수로 입력하세요. 잘못된 입력은 미리보기에 반영하지 않습니다." />
      )}
      {!editable && <p className="notice">조회 권한 · 계획은 읽기 전용입니다.</p>}
      <div className="planLayout">
        <section>
          <div className="listHeader">
            <span>모델</span>
            <span>월간 계획수량</span>
          </div>
          {db.models
            .filter((m) => m.group === group)
            .map((m) => (
              <div className="planRow" key={m.id}>
                <label htmlFor={`plan-${m.id}`}>{m.name}</label>
                <div className="unitInput">
                  <NumberField
                    id={`plan-${m.id}`}
                    label={`${m.name} 계획수량`}
                    step="1"
                    disabled={!editable}
                    value={Number.isNaN(draft[m.id]) ? '' : (draft[m.id] ?? 0)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [m.id]: e.target.value === '' ? NaN : Number(e.target.value),
                      })
                    }
                  />
                  <span>대</span>
                </div>
              </div>
            ))}
          <div className="total">
            <b>제품군 합계</b>
            <strong>
              {fmt(
                db.models
                  .filter((m) => m.group === group)
                  .reduce((n, m) => n + (draft[m.id] || 0), 0),
              )}
              <small>대</small>
            </strong>
          </div>
        </section>
        <section className="planPreview">
          <h2>필요한 자재</h2>
          <small>
            {dirty ? '미저장 계획 미리보기' : '저장된 계획 기준'} · 공용 자재는 전체 제품군 합산
          </small>
          <div className="tableWrap desktopOnly">
            <table>
              <thead>
                <tr>
                  <th>자재 / 규격</th>
                  <th className="numeric">현재재고</th>
                  <th className="numeric">계획 필요</th>
                  <th className="numeric">과부족</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const n = previewRequired(
                      m,
                      Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v || 0])),
                    ),
                    b = stock(db, m) - n;
                  return (
                    <tr key={m.id}>
                      <td>
                        {m.name}
                        <small>
                          {m.spec} · {m.id}
                        </small>
                      </td>
                      <td className="numeric">{fmt(stock(db, m))}</td>
                      <td className="numeric">{fmt(n)}</td>
                      <td className={`numeric ${b < 0 ? 'danger' : ''}`}>{fmt(b)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mobileOnly previewList">
            {materials.map((m) => {
              const b =
                stock(db, m) -
                previewRequired(
                  m,
                  Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v || 0])),
                );
              return (
                <div key={m.id}>
                  <span>
                    {m.name}
                    <small>
                      {m.spec} · {m.id}
                    </small>
                  </span>
                  <span className={b < 0 ? 'danger' : ''}>
                    {fmt(b)}
                    <small>과부족</small>
                  </span>
                </div>
              );
            })}
          </div>
          {materials.length === 0 && (
            <p className="notice">계획수량을 입력하면 필요한 자재가 표시됩니다.</p>
          )}
        </section>
      </div>
      <ErrorMessage text={error} />
      <div className="mobileSave">{action}</div>
      <Button
        onClick={() => {
          if (
            dirty &&
            !window.confirm('목록에는 저장된 계획이 적용됩니다. 미저장 계획을 두고 이동할까요?')
          )
            return;
          setFilters({ ...emptyFilters, shortage: true });
          navigate('/inventory');
        }}
      >
        자재 과부족 확인
        <ArrowRight size={16} />
      </Button>
    </>
  );
}
