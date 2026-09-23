import { useState } from 'react';
import { useStore } from '../context';
import { filterMaterials, today } from '../domain/calculations';

import { Modal, Field, Button, ErrorMessage } from './UI';
export function ExportDialog({ onClose }: { onClose: () => void }) {
  const { db, filters, month, notify } = useStore();
  const [scope, setScope] = useState('filtered'),
    [name, setName] = useState(`DAMPER_${today().replaceAll('-', '')}.xlsx`),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const rows = scope === 'all' ? db.materials : filterMaterials(db, filters, month);
  return (
    <Modal
      title="엑셀 내보내기"
      kind="sheet"
      onClose={onClose}
      footer={
        <Button
          primary
          disabled={busy || !name.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              if (/[\\/:*?"<>|]/.test(name))
                throw new Error('파일명에 특수문자를 사용할 수 없습니다.');
              const { downloadWorkbook } = await import('../services/export');
              downloadWorkbook(db, rows, month, name);
              notify(`${rows.length}개 자재를 내보냈습니다`);
              onClose();
            } catch (e) {
              setError(String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? '내보내는 중…' : '다운로드'}
        </Button>
      }
    >
      <div className="stack">
        <label className="check">
          <input
            type="radio"
            name="scope"
            checked={scope === 'filtered'}
            onChange={() => setScope('filtered')}
          />
          현재 필터 결과
        </label>
        <label className="check">
          <input
            type="radio"
            name="scope"
            checked={scope === 'all'}
            onChange={() => setScope('all')}
          />
          전체 자재
        </label>
        <Field label="파일명">
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <small>
          {rows.length}개 자재 · {month.replace('-', '.')} 계획 기준 · 실제 Excel 통합 문서
        </small>
        <ErrorMessage text={error} />
      </div>
    </Modal>
  );
}
