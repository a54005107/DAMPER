import { useState } from 'react';
import { Plus, Trash2, Info, Save } from 'lucide-react';
import { useStore } from '../context';
import { blankDay } from '../domain/types';
import { today, fmt, previous, previewRequired, setUsage } from '../domain/calculations';
import {
  Button,
  Field,
  NumberField,
  Tabs,
  PageHeader,
  ErrorMessage,
  Modal,
} from '../components/UI';
export default function Usage() {
  const [date, setDate] = useState(today());
  return <UsageForm key={date} date={date} setDate={setDate} />;
}
function UsageForm({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const { db, editable, save, busy, error, user } = useStore();
  const day = db.days[date] || blankDay();
  const [tab, setTab] = useState(day.source === 'assembly' ? '조립수량으로 계산' : '직접 입력'),
    [direct, setDirect] = useState<Record<string, number>>({ ...day.usage }),
    [assembly, setAssembly] = useState<Record<string, number>>({ ...day.assembly }),
    [group, setGroup] = useState('ICER'),
    [model, setModel] = useState('J9'),
    [selected, setSelected] = useState('R311'),
    [rows, setRows] = useState<string[]>(() => {
      const used = Object.keys(day.usage).filter((id) => day.usage[id] > 0);
      return used.length ? used : ['R311', 'R312', 'R316'];
    }),
    [confirm, setConfirm] = useState(false),
    [localError, setLocalError] = useState('');
  const isDirect = tab === '직접 입력';
  const source = isDirect ? 'direct' : 'assembly';
  const values = isDirect ? direct : assembly;
  const dirty =
    source !== day.source ||
    JSON.stringify(values) !== JSON.stringify(isDirect ? day.usage : day.assembly);
  const models = db.models.filter((m) => m.group === group);
  const active = db.materials.find((m) => m.id === selected)!;
  const change = (id: string, value: string) => {
    const n = value === '' ? NaN : Number(value);
    isDirect ? setDirect((v) => ({ ...v, [id]: n })) : setAssembly((v) => ({ ...v, [id]: n }));
  };
  const preview = (id: string) => {
    const m = db.materials.find((m) => m.id === id)!;
    return (
      previous(db, m, date) + (day.incoming[id] || 0) - (day.loss[id] || 0) - (direct[id] || 0)
    );
  };
  async function submit() {
    setLocalError('');
    const success = await save((d) => {
      const next = setUsage(d, date, source, values);
      return {
        ...next,
        materials: next.materials.map((m) =>
          (next.days[date].usage[m.id] || 0) !== (d.days[date]?.usage[m.id] || 0)
            ? { ...m, modifiedBy: user!.name, modifiedAt: new Date().toISOString() }
            : m,
        ),
      };
    });
    if (success) setConfirm(false);
  }
  function requestSave() {
    if (Object.values(values).some((n) => !Number.isFinite(n) || n < 0)) {
      setLocalError('0 이상의 수량을 입력하세요.');
      return;
    }
    if (source !== day.source && Object.values(day.usage).some((v) => v > 0)) setConfirm(true);
    else void submit();
  }
  const saveButton = (
    <Button primary disabled={!editable || busy || !dirty} onClick={requestSave}>
      <Save size={16} />
      {busy ? '저장 중…' : isDirect ? '사용수량 저장' : '조립실적 저장'}
    </Button>
  );
  return (
    <>
      <PageHeader
        title="금일 사용 입력"
        description="사용한 수량을 입력하고, 반영 후 재고를 확인하세요."
      >
        <span className="desktopOnly">{saveButton}</span>
      </PageHeader>
      <div className="toolbar">
        <Field label="사용일">
          <input
            type="date"
            min="2026-09-15"
            max={today()}
            value={date}
            onChange={(e) => {
              if (
                e.target.value &&
                (!dirty || window.confirm('미저장 입력을 버리고 날짜를 변경할까요?'))
              )
                setDate(e.target.value);
            }}
          />
        </Field>
        <span className="muted">{date.replaceAll('-', '.')} · 오늘 누적 합계 기준</span>
      </div>
      <Tabs items={['직접 입력', '조립수량으로 계산']} value={tab} onChange={setTab} />
      {!editable && (
        <div className="notice">
          조회 권한으로 열람 중입니다. 사용량 수정은 편집 권한이 필요합니다.
        </div>
      )}
      {isDirect ? (
        <>
          <div className="toolbar desktopOnly">
            <Field label="자재 선택">
              <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                {db.materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.spec} · {m.id}
                  </option>
                ))}
              </select>
            </Field>
            <Button onClick={() => setRows((x) => (x.includes(selected) ? x : [...x, selected]))}>
              <Plus size={16} />
              입력 행 추가
            </Button>
          </div>
          <div className="tableWrap desktopOnly">
            <table>
              <thead>
                <tr>
                  <th>자재</th>
                  <th>규격</th>
                  <th className="numeric">전일재고</th>
                  <th className="numeric">입고</th>
                  <th className="numeric">분실</th>
                  <th className="numeric">오늘 사용</th>
                  <th className="numeric">반영 후 재고</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((id) => {
                  const m = db.materials.find((m) => m.id === id)!;
                  return (
                    <tr key={id}>
                      <td>
                        <b>{m.name}</b>
                        <small>
                          {m.substance} · {m.id}
                        </small>
                      </td>
                      <td>{m.spec}</td>
                      <td className="numeric">{fmt(previous(db, m, date))}</td>
                      <td className="numeric">{fmt(day.incoming[id] || 0)}</td>
                      <td className="numeric">{fmt(day.loss[id] || 0)}</td>
                      <td className="numeric">
                        <NumberField
                          label={`${m.id} 오늘 사용`}
                          disabled={!editable}
                          value={Number.isNaN(direct[id]) ? '' : (direct[id] ?? 0)}
                          onChange={(e) => change(id, e.target.value)}
                        />
                      </td>
                      <td className={`numeric ${preview(id) < 0 ? 'danger' : ''}`}>
                        {fmt(preview(id))}
                      </td>
                      <td>
                        <Button
                          aria-label={`${id} 입력 행 숨기기`}
                          title="입력값은 유지하고 행 숨기기"
                          onClick={() => setRows((x) => x.filter((v) => v !== id))}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mobileOnly stack">
            <Field label="자재">
              <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                {db.materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.spec} · {m.id}
                  </option>
                ))}
              </select>
            </Field>
            <small>
              전일재고 {fmt(previous(db, active, date))} · 입고 {fmt(day.incoming[selected] || 0)} ·
              분실 {fmt(day.loss[selected] || 0)}
            </small>
            <Field label="오늘 누적 사용량">
              <div className="unitInput">
                <NumberField
                  label="오늘 누적 사용량"
                  disabled={!editable}
                  value={Number.isNaN(direct[selected]) ? '' : (direct[selected] ?? 0)}
                  onChange={(e) => change(selected, e.target.value)}
                />
                <span>{active.unit}</span>
              </div>
            </Field>
            <div className="total">
              <b>반영 후 재고</b>
              <strong className={preview(selected) < 0 ? 'danger' : ''}>
                {fmt(preview(selected))}
                <small>{active.unit}</small>
              </strong>
            </div>
          </div>
          <div className="tableFoot">
            <small>오늘 사용한 총수량으로 수정합니다. 반복 저장해도 중복 차감되지 않습니다.</small>
            <small className={dirty ? 'danger' : ''}>
              {dirty ? '미저장 변경 있음' : '모든 변경사항 저장됨'}
            </small>
          </div>
        </>
      ) : (
        <>
          <div className="formWidth stack">
            <Field label="제품군">
              <select
                value={group}
                onChange={(e) => {
                  setGroup(e.target.value);
                  setModel(db.models.find((m) => m.group === e.target.value)!.id);
                }}
              >
                <option>SCR-LP</option>
                <option>ICER</option>
              </select>
            </Field>
            <Field label="모델">
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="금일 누적 조립수량">
              <div className="unitInput">
                <NumberField
                  label="금일 누적 조립수량"
                  step="1"
                  disabled={!editable}
                  value={Number.isNaN(assembly[model]) ? '' : (assembly[model] ?? 0)}
                  onChange={(e) => change(model, e.target.value)}
                />
                <span>대</span>
              </div>
            </Field>
            <small>
              모델을 바꾸며 여러 모델의 실적을 입력할 수 있습니다. 총{' '}
              {fmt(Object.values(assembly).reduce((a, b) => a + (b || 0), 0))}대
            </small>
          </div>
          <h2 className="sectionTitle">소요 자재 · 사용량 미리보기</h2>
          <div className="previewList">
            {db.materials
              .filter(
                (m) =>
                  m.bom.some((b) => b.modelId === model) || (m.reviewModels || []).includes(model),
              )
              .map((m) => (
                <div key={m.id}>
                  <span>
                    {m.name}
                    <small>
                      {m.spec} · {m.id}
                      {m.review ? ' · 소요량 검토 필요' : ''}
                    </small>
                  </span>
                  <b>
                    {fmt(
                      previewRequired(
                        m,
                        Object.fromEntries(Object.entries(assembly).map(([k, v]) => [k, v || 0])),
                      ),
                    )}{' '}
                    {m.unit}
                  </b>
                </div>
              ))}
          </div>
        </>
      )}
      <p className="help">
        <Info size={16} />
        직접 입력과 조립 계산은 같은 날짜의 사용량 전체를 교체합니다. 두 입력을 합산하지 않습니다.
      </p>
      <ErrorMessage text={localError || error} />
      <div className="mobileSave">{saveButton}</div>
      {confirm && (
        <Modal
          title="사용량 입력 방식 변경"
          onClose={() => setConfirm(false)}
          footer={
            <>
              <Button onClick={() => setConfirm(false)}>취소</Button>
              <Button primary disabled={busy} onClick={submit}>
                기존 사용량 교체
              </Button>
            </>
          }
        >
          <p>
            {date}에 저장한 {day.source === 'direct' ? '직접 입력' : '조립 계산'} 사용량을 현재 입력
            전체로 교체합니다.
          </p>
          <p>기존 사용량은 되돌린 후 새 누적 사용량을 적용하므로 중복 차감되지 않습니다.</p>
          <ErrorMessage text={error} />
        </Modal>
      )}
    </>
  );
}
