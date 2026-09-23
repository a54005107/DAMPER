import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useStore } from '../context';
import type { Material } from '../domain/types';
import { formula, validateFormula } from '../domain/formula';
import { nonnegative, fmt, required } from '../domain/calculations';
import { Modal, Field, NumberField, Button, ErrorMessage } from './UI';
export function MaterialEditor({
  material,
  onClose,
}: {
  material?: Material;
  onClose: () => void;
}) {
  const { db, save, busy, error, user, editable } = useStore();
  const [initial] = useState<Material>(
    () =>
      material || {
        id: crypto.randomUUID(),
        name: '',
        substance: '',
        spec: '',
        unit: '개',
        opening: 0,
        bom: [],
        formula: 'q * rate',
        review: false,
        modifiedBy: '',
        modifiedAt: '',
      },
  );
  const [draft, setDraft] = useState<Material>(structuredClone(initial)),
    [testQty, setTestQty] = useState(1),
    [checked, setChecked] = useState(false),
    [localError, setLocalError] = useState('');
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  function change<K extends keyof Material>(key: K, value: Material[K]) {
    setDraft({ ...draft, [key]: value });
    setChecked(false);
  }
  let formulaError = '',
    results: number[] = [];
  try {
    validateFormula(draft.formula, draft.bom.length ? draft.bom.map((b) => b.rate) : [1]);
    results = draft.bom.map((b) => formula(draft.formula, testQty, b.rate));
  } catch (e) {
    formulaError = (e as Error).message;
  }
  async function submit() {
    setLocalError('');
    try {
      if (!draft.name.trim() || !draft.substance.trim() || !draft.spec.trim() || !draft.unit.trim())
        throw new Error('자재명, 재질, 규격, 단위를 모두 입력하세요.');
      if (draft.opening !== initial.opening || !material) nonnegative(draft.opening);
      if (new Set(draft.bom.map((b) => b.modelId)).size !== draft.bom.length)
        throw new Error('같은 모델을 중복 추가할 수 없습니다.');
      if (
        draft.bom.length === 0 ||
        draft.bom.some((b) => !b.modelId || !Number.isFinite(b.rate) || b.rate <= 0 || b.rate > 1e9)
      )
        throw new Error('적용모델과 0보다 큰 소요량을 입력하세요.');
      validateFormula(
        draft.formula,
        draft.bom.map((b) => b.rate),
      );
      Object.values(db.plans).forEach((plan) => required(draft, plan));
      if (draft.review && !checked)
        throw new Error('원본 불일치를 검토한 후 계산 기준 확정에 체크하세요.');
      const ok = await save((d) => ({
        ...d,
        materials: material
          ? d.materials.map((m) =>
              m.id === draft.id
                ? {
                    ...draft,
                    review: checked ? false : draft.review,
                    modifiedBy: user!.name,
                    modifiedAt: new Date().toISOString(),
                  }
                : m,
            )
          : [
              ...d.materials,
              { ...draft, modifiedBy: user!.name, modifiedAt: new Date().toISOString() },
            ],
      }));
      if (ok) onClose();
    } catch (e) {
      setLocalError((e as Error).message);
    }
  }
  return (
    <Modal
      title={material ? '자재정보 · 계산식 편집' : '자재 추가'}
      kind="full"
      dirty={dirty || checked}
      onClose={onClose}
      footer={
        <>
          <Button
            onClick={() => {
              if (!dirty || window.confirm('수정 내용을 버릴까요?')) onClose();
            }}
          >
            취소
          </Button>
          <Button
            primary
            disabled={!editable || busy || !!formulaError || (!dirty && !checked)}
            onClick={submit}
          >
            {busy ? '저장 중…' : '저장'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="formGrid">
          {(
            [
              ['name', '자재명'],
              ['substance', '재질'],
              ['spec', '규격'],
              ['unit', '단위'],
            ] as const
          ).map(([k, label]) => (
            <Field key={k} label={label}>
              <input required value={draft[k]} onChange={(e) => change(k, e.target.value)} />
            </Field>
          ))}
          <Field label="기초재고" hint="2026.09.14 종료 기준. 이후 입출고는 별도로 계산합니다.">
            <NumberField
              label="기초재고"
              value={Number.isNaN(draft.opening) ? '' : draft.opening}
              onChange={(e) =>
                change('opening', e.target.value === '' ? NaN : Number(e.target.value))
              }
            />
          </Field>
        </div>
        <h2>적용모델 · 1대당 소요량</h2>
        {draft.bom.map((b, i) => (
          <div className="bomRow" key={i}>
            <Field label={`적용모델 ${i + 1}`}>
              <select
                value={b.modelId}
                onChange={(e) =>
                  change(
                    'bom',
                    draft.bom.map((x, j) => (j === i ? { ...x, modelId: e.target.value } : x)),
                  )
                }
              >
                {db.models.map((m) => (
                  <option value={m.id} key={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="소요량">
              <NumberField
                label={`모델 ${i + 1} 소요량`}
                min="0.000001"
                value={Number.isNaN(b.rate) ? '' : b.rate}
                onChange={(e) =>
                  change(
                    'bom',
                    draft.bom.map((x, j) =>
                      j === i
                        ? { ...x, rate: e.target.value === '' ? NaN : Number(e.target.value) }
                        : x,
                    ),
                  )
                }
              />
            </Field>
            <Button
              aria-label={`적용모델 ${i + 1} 삭제`}
              onClick={() =>
                change(
                  'bom',
                  draft.bom.filter((_, j) => j !== i),
                )
              }
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
        <div>
          <Button
            disabled={draft.bom.length >= db.models.length}
            onClick={() =>
              change('bom', [
                ...draft.bom,
                {
                  modelId: db.models.find((m) => !draft.bom.some((b) => b.modelId === m.id))!.id,
                  rate: 1,
                },
              ])
            }
          >
            <Plus size={16} />
            모델 추가
          </Button>
        </div>
        <h2>계산식</h2>
        <Field
          label="모델별 사용량 · 계획 필요량"
          hint="q = 조립수량 또는 계획수량, rate = 모델별 1대당 소요량. 숫자와 + − * / ( ) 지원. q에 비례하는 수식만 허용합니다."
        >
          <input
            value={draft.formula}
            spellCheck={false}
            onChange={(e) => change('formula', e.target.value)}
            aria-invalid={!!formulaError}
          />
        </Field>
        <small>
          각 모델의 계산 결과를 합산합니다. 저장한 실적 사용량은 유지하고, 이후 조립 입력 및 계획
          계산에 적용합니다.
        </small>
        <Field label="미리보기 수량 q">
          <NumberField
            label="계산식 미리보기 수량"
            value={testQty}
            onChange={(e) => setTestQty(Number(e.target.value))}
          />
        </Field>
        <ErrorMessage text={formulaError} />
        {!formulaError && (
          <div className="previewList">
            {draft.bom.map((b, i) => (
              <div key={i}>
                <span>{db.models.find((m) => m.id === b.modelId)?.name}</span>
                <b>
                  {fmt(results[i])} {draft.unit}
                </b>
              </div>
            ))}
          </div>
        )}
        {draft.review && (
          <div className="notice warning">
            <b>원본 수식 확인 필요 · {draft.id}</b>
            <p>
              사용량: {draft.source?.usage}
              <br />
              계획: {draft.source?.plan}
            </p>
            <p>
              현재 모델·소요량은 계획(M열) 기준 임시값입니다. 확인한 값으로 수정하고 확정하세요.
            </p>
            <label className="check">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              계산 기준을 검토했으며 이 값으로 확정합니다.
            </label>
          </div>
        )}
        <ErrorMessage text={localError || error} />
      </div>
    </Modal>
  );
}
