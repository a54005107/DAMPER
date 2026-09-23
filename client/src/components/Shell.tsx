import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  ClipboardPenLine,
  Package,
  CalendarDays,
  UsersRound,
  Ellipsis,
  Bell,
  Menu,
  ChevronDown,
  LogOut,
  X,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../context';
import { roleLabel } from '../domain/types';
import { balance, stock, required, fmt } from '../domain/calculations';
import { Button, Modal, Empty } from './UI';
import s from './Shell.module.css';
const nav = [
  { path: '/usage', label: '금일 사용 입력', short: '사용 입력', Icon: ClipboardPenLine },
  { path: '/inventory', label: '재고관리', short: '재고', Icon: Package },
  { path: '/plans', label: '생산계획', short: '계획', Icon: CalendarDays },
  { path: '/permissions', label: '권한 관리', short: '권한 관리', Icon: UsersRound },
];
export function Shell() {
  const { user, db, month, logout } = useStore();
  const [menu, setMenu] = useState(false),
    [alerts, setAlerts] = useState(false),
    [online, setOnline] = useState(navigator.onLine);
  const navigate = useNavigate(),
    location = useLocation();
  useEffect(() => {
    setMenu(false);
  }, [location.pathname]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const shortages = db.materials.filter((m) => balance(db, m, month) < 0);
  const navItems = nav.filter((n) => n.path !== '/permissions' || user!.role === 'admin');
  return (
    <div className={s.shell}>
      <aside className={`${s.sidebar} ${menu ? s.open : ''}`}>
        <div className={s.brand}>
          DAMPER <span className="demoBadge">DEMO</span>
          <button className={s.close} aria-label="메뉴 닫기" onClick={() => setMenu(false)}>
            <X size={20} />
          </button>
        </div>
        <div className={s.company}>
          {user!.company}
          <small>재고관리 시스템</small>
        </div>
        <nav>
          {navItems.map(({ path, label, Icon }) => (
            <NavLink to={path} key={path} className={({ isActive }) => (isActive ? s.active : '')}>
              <Icon size={20} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className={s.bottom}>
          <button onClick={() => navigate('/more')}>
            <span className="avatar">{user!.name[0]}</span>
            <span>
              {user!.name}
              <small>{roleLabel[user!.role]}</small>
            </span>
            <ChevronDown size={16} />
          </button>
          <button onClick={logout}>
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </aside>
      {menu && <button className={s.scrim} aria-label="메뉴 닫기" onClick={() => setMenu(false)} />}
      <div className={s.body}>
        <header className={s.header}>
          <div className={s.mobileBrand}>
            <Button aria-label="메뉴 열기" onClick={() => setMenu(true)}>
              <Menu size={20} />
            </Button>
            <b>DAMPER</b>
          </div>
          <span className={s.breadcrumb}>
            {nav.find((n) => n.path === location.pathname)?.label || '계정 관리'}
          </span>
          <div className="actions">
            <span className="demoBadge">데모 환경</span>
            <Button
              aria-label={`부족 알림 ${shortages.length}건`}
              title="부족 알림"
              onClick={() => setAlerts(true)}
            >
              <Bell size={20} strokeWidth={1.75} />
              {shortages.length > 0 && <span className={s.badge}>{shortages.length}</span>}
            </Button>
            <span className={`avatar ${s.headerAvatar}`}>{user!.name[0]}</span>
          </div>
        </header>
        {!online && (
          <div className="offline" role="status">
            네트워크 연결이 끊겼습니다. 데모 데이터는 이 브라우저에만 저장됩니다.
          </div>
        )}
        <main className={s.main}>
          <Outlet />
        </main>
      </div>
      <nav className={s.bottomNav}>
        {[...nav.slice(0, 3), { path: '/more', short: '더보기', Icon: Ellipsis }].map(
          ({ path, short, Icon }) => (
            <NavLink to={path} key={path} className={({ isActive }) => (isActive ? s.active : '')}>
              <Icon size={20} strokeWidth={1.75} />
              <span>{short}</span>
            </NavLink>
          ),
        )}
      </nav>
      {alerts && (
        <Modal
          title={`부족 알림 · ${shortages.length}건`}
          kind="drawer"
          onClose={() => setAlerts(false)}
        >
          <p className="muted">{month.replace('-', '.')} 생산계획 기준</p>
          {shortages.length ? (
            <div className="notificationList">
              {shortages.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setAlerts(false);
                    navigate(`/inventory?material=${m.id}`);
                  }}
                >
                  <div>
                    <b>
                      {m.name} · {m.spec}
                    </b>
                    <small>
                      현재 {fmt(stock(db, m))} / 필요 {fmt(required(m, db.plans[month] || {}))}
                    </small>
                    <span className="danger">
                      {fmt(-balance(db, m, month))}
                      {m.unit} 부족
                    </span>
                  </div>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          ) : (
            <Empty text="부족한 자재가 없습니다." />
          )}
        </Modal>
      )}
    </div>
  );
}
