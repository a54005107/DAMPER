import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Provider, useStore } from './context';
import { Shell } from './components/Shell';
import { Login, Signup, Pending } from './pages/Auth';
import Usage from './pages/Usage';
import Inventory from './pages/Inventory';
import Plans from './pages/Plans';
import Permissions from './pages/Permissions';
import More from './pages/More';
import { canAccess } from './services/api';
function Protected() {
  const { user } = useStore();
  const { pathname } = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  if (user.status !== 'approved') return <Navigate to="/pending" replace />;
  if (!canAccess(user, pathname))
    return (
      <div className="auth">
        <h1>접근 권한이 없습니다</h1>
        <p>관리자만 권한 관리에 접근할 수 있습니다.</p>
        <a href="/usage">금일 사용 입력으로 돌아가기</a>
      </div>
    );
  return <Outlet />;
}
export default function App() {
  return (
    <BrowserRouter>
      <Provider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pending" element={<Pending />} />
          <Route element={<Protected />}>
            <Route element={<Shell />}>
              <Route path="/usage" element={<Usage />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/permissions" element={<Permissions />} />
              <Route path="/more" element={<More />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/usage" replace />} />
        </Routes>
      </Provider>
    </BrowserRouter>
  );
}
