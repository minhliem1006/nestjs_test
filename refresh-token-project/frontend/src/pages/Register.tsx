import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/register`,
        { username, password, name },
      );
      setSuccess(`${data.message} — chuyển trang đăng nhập sau 2 giây...`);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      // ValidationPipe trả mảng message, ConflictException trả string
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Đăng ký thất bại');
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h2 style={{ marginBottom: 4 }}>Đăng ký tài khoản</h2>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
          Tạo tài khoản mới để trải nghiệm demo
        </p>
        <form onSubmit={handleRegister}>
          <input
            style={s.input}
            placeholder="Họ tên"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            style={s.input}
            placeholder="Username (3–20 ký tự, chữ/số/_)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            style={s.input}
            type="password"
            placeholder="Password (tối thiểu 6 ký tự)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p style={s.error}>{error}</p>}
          {success && <p style={s.success}>{success}</p>}
          <button style={s.btn} type="submit">Đăng ký</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#888' }}>
          Đã có tài khoản? <Link to="/login" style={{ color: '#1677ff' }}>Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:    { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' },
  card:    { background: '#fff', padding: 32, borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', width: 340 },
  input:   { width: '100%', padding: '10px 12px', marginBottom: 12, border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' },
  btn:     { width: '100%', padding: '10px 0', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 15, fontWeight: 500 },
  error:   { color: '#ff4d4f', fontSize: 13, marginBottom: 8 },
  success: { color: '#52c41a', fontSize: 13, marginBottom: 8 },
};
