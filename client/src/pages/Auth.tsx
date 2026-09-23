import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Clock3 } from 'lucide-react';
import { useStore } from '../context';
import { api } from '../services/api';
import { Button, Field, ErrorMessage } from '../components/UI';
export function Login() {
  const { user, login } = useStore();
  const [email, setEmail] = useState('admin@damper.demo'),
    [password, setPassword] = useState('Damper123!'),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  if (user) return <Navigate to={user.status === 'approved' ? '/usage' : '/pending'} replace />;
  return (
    <div className="auth">
      <div className="authBrand">
        DAMPER <span className="demoBadge">DEMO</span>
      </div>
      <h1>로그인</h1>
      <p className="muted">회사 계정으로 로그인하세요.</p>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            login(await api.login(email, password));
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="이메일">
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="비밀번호">
          <div className="passwordInput">
            <input
              type={visible ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        <ErrorMessage text={error} />
        <Button type="submit" primary disabled={busy}>
          {busy ? '로그인 중…' : '로그인'}
        </Button>
      </form>
      <div className="authFooter">
        <Link to="/signup">회원가입 · 회사 권한 신청</Link>
      </div>
      <details className="demoHelp">
        <summary>데모 계정 안내</summary>
        <p>
          관리자 admin@damper.demo
          <br />
          편집 editor@damper.demo
          <br />
          조회 viewer@damper.demo
          <br />
          승인 대기 pending@damper.demo
        </p>
        <p>공통 비밀번호: Damper123!</p>
      </details>
    </div>
  );
}
export function Signup() {
  const { login, user } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
      name: '',
      email: '',
      password: '',
      confirm: '',
      company: '',
      companyId: '',
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  if (user) return <Navigate to={user.status === 'approved' ? '/usage' : '/pending'} replace />;
  return (
    <div className="auth">
      <Link to="/login" className="back">
        <ArrowLeft size={18} />
        로그인
      </Link>
      <h1>회원가입</h1>
      <p className="muted">회사정보를 제출하고 이용 권한을 신청하세요.</p>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          if (form.password.length < 8) {
            setError('비밀번호는 8자 이상 입력하세요.');
            return;
          }
          if (form.password !== form.confirm) {
            setError('비밀번호 확인이 일치하지 않습니다.');
            return;
          }
          if (Object.values(form).some((v) => !v.trim())) {
            setError('모든 항목을 입력하세요.');
            return;
          }
          setBusy(true);
          try {
            const id = await api.register({
              name: form.name.trim(),
              email: form.email.trim(),
              company: form.company.trim(),
              companyId: form.companyId.trim(),
            });
            login(id);
            navigate('/pending');
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {(
          [
            ['name', '이름'],
            ['email', '이메일'],
            ['password', '비밀번호'],
            ['confirm', '비밀번호 확인'],
            ['company', '회사명'],
            ['companyId', '회사 식별정보'],
          ] as const
        ).map(([k, label]) => (
          <Field
            key={k}
            label={label}
            hint={k === 'companyId' ? '데모 회사 식별정보: DAMPER-001' : undefined}
          >
            <input
              required
              type={
                k === 'email' ? 'email' : k === 'password' || k === 'confirm' ? 'password' : 'text'
              }
              minLength={k === 'password' ? 8 : 1}
              autoComplete={
                k === 'password' || k === 'confirm'
                  ? 'new-password'
                  : k === 'email'
                    ? 'email'
                    : 'off'
              }
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          </Field>
        ))}
        <ErrorMessage text={error} />
        <Button primary disabled={busy}>
          {busy ? '신청 중…' : '가입 · 권한 신청'}
        </Button>
      </form>
    </div>
  );
}
export function Pending() {
  const { user, logout, login } = useStore();
  if (!user) return <Navigate to="/login" />;
  if (user.status === 'approved') return <Navigate to="/usage" />;
  return (
    <div className="auth">
      <div className="authBrand">DAMPER</div>
      <Clock3 size={28} />
      <h1>{user.status === 'rejected' ? '권한 신청 거절' : '승인 대기'}</h1>
      <p>
        {user.name}님의 {user.company} 이용 신청이{' '}
        {user.status === 'rejected'
          ? '거절되었습니다. 회사정보를 확인하고 관리자에게 문의하세요.'
          : '접수되었습니다. 관리자 승인 후 재고를 열람할 수 있습니다.'}
      </p>
      <div className="notice warning">
        {user.status === 'pending' ? '승인 대기' : '거절'} · 재고 열람 권한 없음
      </div>
      <div className="actions">
        <Button onClick={() => login(user.id)}>승인 상태 새로고침</Button>
        <Button onClick={logout}>로그아웃</Button>
      </div>
    </div>
  );
}
