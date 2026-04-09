import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { setAccessToken } from '../api/tokenManager';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRevoked = searchParams.get('reason') === 'session_revoked';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        { username, password },
        { withCredentials: true },
      );

      console.log("data:::",data);
      

      setAccessToken(data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      // Navigate → SocketProvider mount → tự connect + register handlers
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h2 style={{ marginBottom: 4 }}>Refresh Token Demo</h2>
        {isRevoked && (
          <p style={{ color: '#ff4d4f', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>
            Phiên đăng nhập bị thu hồi từ thiết bị khác.
          </p>
        )}
        <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
          Tài khoản: <b>admin / admin123</b> hoặc <b>user / user123</b>
        </p>
        <form onSubmit={handleLogin}>
          <input style={s.input} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input style={s.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p style={{ color: '#ff4d4f', fontSize: 13 }}>{error}</p>}
          <button style={s.btn} type="submit">Đăng nhập</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#888' }}>
          Chưa có tài khoản? <Link to="/register" style={{ color: '#1677ff' }}>Đăng ký</Link>
        </p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' },
  card: { background: '#fff', padding: 32, borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', width: 340 },
  input: { width: '100%', padding: '10px 12px', marginBottom: 12, border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' },
  btn: { width: '100%', padding: '10px 0', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 15, fontWeight: 500 },
};
