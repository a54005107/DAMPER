import { useState } from 'react';
import { Pencil, ArrowRight } from 'lucide-react';
import { useStore } from '../context';
import { blankDay, type Material } from '../domain/types';
import { stock, previous, required, fmt, today, nonnegative } from '../domain/calculations';
import { formula } from '../domain/formula';
import { Button, Field, NumberField, Modal, ErrorMessage } from './UI';
import { MaterialEditor } from './MaterialEditor';
export function MaterialDetail({
  materialId,
  onClose,
}: {
  materialId: string;
  onClose: () => void;
}) {
  const { db, month, editable, save, busy, error, user, presence } = useStore();
  const m = db.materials.find((m) => m.id === materialId)!;
  const [date, setDate] = useState(today());
  const day = db.days[date] || blankDay();
  const [incoming, setIncoming] = useState(day.incoming[m.id] || 0),
    [loss, setLoss] = useState(day.loss[m.id] || 0),
    [editing, setEditing] = useState(false);
  const dirty = incoming !== (day.incoming[m.id] || 0) || loss !== (day.loss[m.id] || 0);
  const need = required(m, db.plans[month] || {});
  const preview =
    stock(db, m) + incoming - (day.incoming[m.id] || 0) - loss + (day.loss[m.id] || 0);
  async function submit() {
    await save((d) => {
      nonnegative(incoming);
      nonnegative(loss);
      const before = d.days[date] || blankDay();
      return {
        ...d,
        days: {
          ...d.days,
          [date]: {
            ...before,
            incoming: { ...before.incoming, [m.id]: incoming },
            loss: { ...before.loss, [m.id]: loss },
          },
        },
        materials: d.materials.map((x) =>
          x.id === m.id
            ? { ...x, modifiedBy: user!.name, modifiedAt: new Date().toISOString() }
            : x,
        ),
      };
    });
  }
  return (
    <>
      {!editing && (
        <Modal
          title="자재 상세"
          kind="drawer"
          dirty={dirty}
          onClose={onClose}
          footer={
            editable ? (
              <Button primary disabled={busy || !dirty} onClick={submit}>
                {busy ? '저장 중…' : '재고 저장'}
              </Button>
            ) : (
              <small>조회 권한 · 읽기 전용</small>
            )
          }
        >
          <div className="stack">
            <div>
              <h2>
                {m.name} · {m.spec}
              </h2>
              <p className="muted">
                {m.substance} · {m.id}
              </p>
            </div>
            <dl className="details">
              <div>
                <dt>현재재고</dt>
                <dd>
                  <strong>{fmt(stock(db, m))}</strong> {m.unit}
                </dd>
              </div>
              <div>
                <dt>
                  계획 필요량 <small>{month}</small>
                </dt>
                <dd>{fmt(need)}</dd>
              </div>
              <div>
                <dt>과부족</dt>
                <dd className={stock(db, m) < need ? 'danger' : ''}>{fmt(stock(db, m) - need)}</dd>
              </div>
            </dl>
            {m.review && (
              <div className="notice warning">소요량 검토 필요 · 계획 수식 기준 임시 계산</div>
            )}
            <h2>적용모델 · 조립가능대수</h2>
            <small>해당 자재 기준이며, 완제품 전체 생산 가능 대수가 아닙니다.</small>
            <div className="previewList">
              {m.bom.map((b) => {
                const per = formula(m.formula, 1, b.rate);
                return (
                  <div key={b.modelId}>
                    <span>
                      {db.models.find((x) => x.id === b.modelId)?.name}
                      <small>
                        1대당 {fmt(per)} {m.unit}
                      </small>
                    </span>
                    <span>{per ? fmt(Math.max(0, stock(db, m)) / per) : '—'} 대</span>
                  </div>
                );
              })}
            </div>
            <h2>입고 · 분실 수량 수정</h2>
            <Field label="기준일">
              <input
                type="date"
                min="2026-09-15"
                max={today()}
                value={date}
                onChange={(e) => {
                  if (
                    e.target.value &&
                    e.target.value >= '2026-09-15' &&
                    e.target.value <= today() &&
                    (!dirty || window.confirm('미저장 수량을 버릴까요?'))
                  ) {
                    setDate(e.target.value);
                    setIncoming(db.days[e.target.value]?.incoming[m.id] || 0);
                    setLoss(db.days[e.target.value]?.loss[m.id] || 0);
                  }
                }}
              />
            </Field>
            <dl className="details">
              <div>
                <dt>전일재고</dt>
                <dd>{fmt(previous(db, m, date))}</dd>
              </div>
              <div>
                <dt>누적 사용량</dt>
                <dd>{fmt(day.usage[m.id] || 0)}</dd>
              </div>
            </dl>
            <Field label="입고수량 (선택일 누적)">
              <NumberField
                label="입고수량"
                disabled={!editable}
                value={Number.isNaN(incoming) ? '' : incoming}
                onChange={(e) => setIncoming(e.target.value === '' ? NaN : Number(e.target.value))}
              />
            </Field>
            <Field label="분실 / 파손 / 불용 (선택일 누적)">
              <NumberField
                label="분실 수량"
                disabled={!editable}
                value={Number.isNaN(loss) ? '' : loss}
                onChange={(e) => setLoss(e.target.value === '' ? NaN : Number(e.target.value))}
              />
            </Field>
            <div className="total">
              <b>반영 후 현재재고</b>
              <strong>{fmt(preview)}</strong>
            </div>
            {editable && (
              <Button
                onClick={() => {
                  if (!dirty || window.confirm('재고 수정 내용을 버리고 자재정보를 편집할까요?')) {
                    setIncoming(day.incoming[m.id] || 0);
                    setLoss(day.loss[m.id] || 0);
                    setEditing(true);
                  }
                }}
              >
                <Pencil size={16} />
                자재정보 · 계산식 편집
                <ArrowRight size={16} />
              </Button>
            )}
            <div className="metadata">
              {presence && <p className="presence">동료 (데모) 편집 중</p>}
              <small>
                마지막 수정: {m.modifiedBy}
                <br />
                {new Date(m.modifiedAt).toLocaleString('ko-KR')}
              </small>
            </div>
            {m.source && (
              <details>
                <summary>원본 엑셀 정보 · 2026.09.14</summary>
                <dl className="details">
                  {(
                    [
                      ['전일재고', m.source.previous],
                      ['입고', m.source.incoming],
                      ['사용량', m.source.used],
                      ['분실', m.source.loss],
                      ['현재재고', m.source.stock],
                    ] as [string, number][]
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{fmt(v)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
            <ErrorMessage text={error} />
          </div>
        </Modal>
      )}
      {editing && <MaterialEditor material={m as Material} onClose={() => setEditing(false)} />}
    </>
  );
}
