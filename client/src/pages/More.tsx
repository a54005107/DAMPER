import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context';
import { roleLabel } from '../domain/types';
import { api } from '../services/api';
import { PageHeader, MenuRow, Button } from '../components/UI';
import { ExportDialog } from '../components/ExportDialog';
export default function More() {
  const { user, logout, presence, setPresence, notify, editable } = useStore(),
    navigate = useNavigate();
  const [exportOpen, setExportOpen] = useState(false);
  return (
    <>
      <PageHeader title="더보기" />
      <div className="formWidth">
        <div className="profile">
          <span className="avatar large">{user!.name[0]}</span>
          <div>
            <b>{user!.name}</b>
            <small>
              {user!.company} / {roleLabel[user!.role]}
            </small>
          </div>
        </div>
        {user!.role === 'admin' && (
          <MenuRow onClick={() => navigate('/permissions')}>권한 관리</MenuRow>
        )}
        <MenuRow onClick={() => setExportOpen(true)}>엑셀 내보내기</MenuRow>
        <MenuRow onClick={logout}>로그아웃</MenuRow>
        <details className="demoHelp">
          <summary>데모 환경 설정</summary>
          <p>
            데이터는 이 브라우저에 저장됩니다. 역할 변경은 로그아웃 후 다른 데모 계정으로
            로그인하세요.
          </p>
          {editable && (
            <div className="stack">
              <label className="check">
                <input
                  type="checkbox"
                  checked={presence}
                  onChange={(e) => setPresence(e.target.checked)}
                />
                동료 편집 중 표시 재현
              </label>
              <Button
                onClick={() => {
                  api.failNext();
                  notify('다음 저장이 실패하도록 설정했습니다');
                }}
              >
                다음 저장 실패 재현
              </Button>
              <Button
                onClick={() => {
                  api.simulateConflict();
                  notify('다음 저장에서 편집 충돌을 확인하세요');
                }}
              >
                외부 수정 · 충돌 재현
              </Button>
            </div>
          )}
          {user!.role === 'admin' && (
            <Button
              onClick={() => {
                if (
                  window.confirm('이 브라우저의 데모 재고·계획·사용자 변경을 모두 초기화할까요?')
                ) {
                  api.reset();
                  logout();
                  location.assign('/login');
                }
              }}
            >
              데모 데이터 초기화
            </Button>
          )}
        </details>
      </div>
      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
    </>
  );
}
