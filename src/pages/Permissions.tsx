import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useStore } from '../context';
import { roleLabel, type Role, type User } from '../domain/types';
import { PageHeader, Tabs, Button, Empty, ErrorMessage, Modal } from '../components/UI';
export default function Permissions() {
  const { db, user, save, busy, error } = useStore();
  const [tab, setTab] = useState('승인 요청'),
    [roles, setRoles] = useState<Record<string, Role>>({}),
    [detail, setDetail] = useState<User | null>(null);
  if (user?.role !== 'admin')
    return (
      <>
        <PageHeader title="접근 권한이 없습니다" />
        <p>권한 관리는 관리자만 이용할 수 있습니다.</p>
      </>
    );
  const rows = db.users.filter((u) =>
    tab === '승인 요청' ? u.status === 'pending' : u.status !== 'pending',
  );
  const update = async (u: User, status: User['status']) => {
    if (status === 'rejected' && !window.confirm(`${u.name}님의 신청을 거절할까요?`)) return;
    await save((d) => {
      if (u.companyId !== user.companyId && status === 'approved')
        throw new Error('회사 식별정보가 다릅니다. 현재 회사의 사용자만 승인할 수 있습니다.');
      return {
        ...d,
        users: d.users.map((x) =>
          x.id === u.id
            ? { ...x, status, role: roles[u.id] || u.role, modifiedAt: new Date().toISOString() }
            : x,
        ),
      };
    }, 'admin');
  };
  return (
    <>
      <PageHeader title="권한 관리" description="회사정보를 확인하고 사용자 권한을 관리하세요." />
      <Tabs items={['승인 요청', '사용자 관리']} value={tab} onChange={setTab} />
      <div className="tableFoot">
        <h2>{tab}</h2>
        <small>{rows.length}명</small>
      </div>
      {rows.length ? (
        <div className="userList">
          {rows.map((u) => (
            <div className="userRow" key={u.id}>
              <div className="userIdentity">
                <span className="avatar">{u.name[0]}</span>
                <div>
                  <b>{u.name}</b>
                  <small>{u.email}</small>
                </div>
              </div>
              <button className="textButton" onClick={() => setDetail(u)}>
                {u.company} · 회사정보 확인
              </button>
              <span className={u.status === 'pending' ? 'warningText' : 'muted'}>
                {u.status === 'pending'
                  ? '승인 대기'
                  : u.status === 'approved'
                    ? '승인됨'
                    : '거절됨'}
              </span>
              <select
                aria-label={`${u.name} 권한`}
                disabled={u.id === user.id || u.status === 'rejected'}
                value={roles[u.id] || u.role}
                onChange={(e) => setRoles({ ...roles, [u.id]: e.target.value as Role })}
              >
                {(['viewer', 'editor', 'admin'] as Role[])
                  .filter((r) => tab !== '승인 요청' || r !== 'admin')
                  .map((r) => (
                    <option key={r} value={r}>
                      {roleLabel[r]}
                    </option>
                  ))}
              </select>
              <div className="actions">
                {tab === '승인 요청' ? (
                  <>
                    <Button disabled={busy} onClick={() => update(u, 'rejected')}>
                      거절
                    </Button>
                    <Button primary disabled={busy} onClick={() => update(u, 'approved')}>
                      승인
                    </Button>
                  </>
                ) : u.status === 'approved' ? (
                  <Button
                    disabled={busy || u.id === user.id || !roles[u.id] || roles[u.id] === u.role}
                    onClick={() => update(u, 'approved')}
                  >
                    권한 저장
                  </Button>
                ) : (
                  <span>신청 거절</span>
                )}
              </div>
              <small>
                {u.modifiedAt ? new Date(u.modifiedAt).toLocaleString('ko-KR') : '변경 이력 없음'}
              </small>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="대기 중인 승인 요청이 없습니다." />
      )}
      <p className="help">
        <ShieldCheck size={16} />
        관리자 본인의 권한은 이 화면에서 변경할 수 없습니다.
      </p>
      <ErrorMessage text={error} />
      {detail && (
        <Modal title="회사정보 확인" onClose={() => setDetail(null)}>
          <dl className="details">
            <div>
              <dt>이름</dt>
              <dd>{detail.name}</dd>
            </div>
            <div>
              <dt>회사명</dt>
              <dd>{detail.company}</dd>
            </div>
            <div>
              <dt>회사 식별정보</dt>
              <dd>{detail.companyId}</dd>
            </div>
            <div>
              <dt>이메일</dt>
              <dd>{detail.email}</dd>
            </div>
          </dl>
        </Modal>
      )}
    </>
  );
}
