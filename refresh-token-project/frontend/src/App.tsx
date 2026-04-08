import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { getAccessToken, setAccessToken } from './api/tokenManager';
import { SocketProvider } from './socket/SocketContext';

function App() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    axios
      .post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => setAccessToken(data.accessToken))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#888' }}>
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* AuthLayout wrap toàn bộ authenticated routes
            → SocketProvider mount 1 lần duy nhất
            → thêm page mới chỉ cần thêm Route bên trong, không cần bọc lại */}
        <Route element={<AuthLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Sau này thêm page mới vào đây:
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} /> */}
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

// Layout wrap toàn bộ authenticated routes
// PrivateRoute kiểm tra token → SocketProvider connect socket
// Outlet render page con (Dashboard, Profile, Settings...)
function AuthLayout() {
  if (!getAccessToken()) return <Navigate to="/login" />;
  return (
    <SocketProvider>
      <Outlet /> {/* render page con tương ứng với route */}
    </SocketProvider>
  );
}

export default App;
