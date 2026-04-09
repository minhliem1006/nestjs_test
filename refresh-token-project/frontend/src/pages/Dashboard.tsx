import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { clearAccessToken } from '../api/tokenManager';
import { disconnectSocket } from '../api/socket';
import { useSocket } from '../socket/SocketContext';
import { useSocketEvent } from '../socket/useSocketEvent';

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showChangePass, setShowChangePass] = useState(false);
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', revokeAll: true });
  const [formMsg, setFormMsg] = useState('');
  const [newLoginAlert, setNewLoginAlert] = useState('');
  const navigate = useNavigate();
  const { getSocketId, isConnected, emit } = useSocket();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    callApi();
  }, []);

  // Lắng nghe NEW_LOGIN — tự cleanup khi Dashboard unmount
  useSocketEvent('NEW_LOGIN', (info: { ip: string; time: string }) => {
    setNewLoginAlert(`Có thiết bị khác vừa đăng nhập lúc ${info.time} từ IP ${info.ip}`);
  });

  // Lắng nghe TOKEN_REFRESHED — hiện log mỗi khi bất kỳ session nào refresh token
  useSocketEvent('TOKEN_REFRESHED', (info: { ip: string; time: string }) => {
    setNewLoginAlert(`Token refreshed lúc ${info.time} từ IP ${info.ip}`);
  });

  const addLog = (msg: string) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 9)]);

  const callApi = async () => {
    setLoading(true);
    addLog('Gọi GET /auth/me...');
    try {
      const { data } = await api.get('/auth/me');
      setProfile(data);
      addLog('Thành công! Nhận được profile.');
    } catch {
      addLog('Thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {});
    disconnectSocket();
    clearAccessToken();
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg('');
    try {
      const { data } = await api.post('/auth/change-password', {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
        revokeAll: form.revokeAll,
        socketId: getSocketId(), // gửi socketId để BE biết giữ lại socket này
      });
      setFormMsg(data.message);
      setForm({ oldPassword: '', newPassword: '', revokeAll: true });
      addLog(`Đổi mật khẩu thành công. revokeAll=${form.revokeAll}`);
    } catch (err: any) {
      setFormMsg(err.response?.data?.message || 'Thất bại');
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <span style={{ fontSize: 12, color: isConnected ? '#52c41a' : '#ff4d4f' }}>
            ● {isConnected ? 'Socket connected' : 'Socket disconnected'}
          </span>
        </div>
        {newLoginAlert && (
          <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {newLoginAlert}</span>
            <span style={{ cursor: 'pointer', color: '#aaa', marginLeft: 8 }} onClick={() => setNewLoginAlert('')}>✕</span>
          </div>
        )}

        <p style={{ color: '#555', marginBottom: 16 }}>
          Xin chào <b>{user.name}</b> — Role: <span style={s.badge}>{user.role}</span>
        </p>

        {profile && (
          <div style={s.profileBox}>
            <b>Profile từ API:</b>
            <pre style={{ marginTop: 6, fontSize: 12 }}>{JSON.stringify(profile, null, 2)}</pre>
          </div>
        )}

        <div style={s.logBox}>
          <b style={{ fontSize: 12 }}>Log:</b>
          {log.map((l, i) => (
            <p key={i} style={{ fontSize: 12, margin: '2px 0', color: '#333' }}>{l}</p>
          ))}
        </div>

        <button style={s.btn} onClick={callApi} disabled={loading}>
          {loading ? 'Đang gọi...' : 'Gọi API /auth/me'}
        </button>

        <button
          style={{ ...s.btn, background: '#13c2c2', marginTop: 8 }}
          onClick={() => { emit('ping', { time: new Date().toISOString() }); addLog('Gửi event ping lên BE'); }}
        >
          Test emit ping
        </button>

        <button
          style={{ ...s.btn, background: '#722ed1', marginTop: 8 }}
          onClick={() => setShowChangePass(!showChangePass)}
        >
          {showChangePass ? 'Đóng' : 'Đổi mật khẩu'}
        </button>

        {showChangePass && (
          <form onSubmit={handleChangePassword} style={{ marginTop: 12 }}>
            <input
              style={s.input} type="password" placeholder="Mật khẩu cũ"
              value={form.oldPassword} onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
            />
            <input
              style={s.input} type="password" placeholder="Mật khẩu mới"
              value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            />
            <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <input
                type="checkbox" checked={form.revokeAll}
                onChange={(e) => setForm({ ...form, revokeAll: e.target.checked })}
              />
              Đăng xuất khỏi tất cả thiết bị khác
            </label>
            {formMsg && <p style={{ fontSize: 13, color: formMsg.includes('thành công') ? 'green' : 'red' }}>{formMsg}</p>}
            <button style={{ ...s.btn, background: '#722ed1' }} type="submit">Xác nhận</button>
          </form>
        )}

        {user.role === 'admin' && (
          <button
            style={{ ...s.btn, background: '#fa8c16', marginTop: 8 }}
            onClick={() => navigate('/audit-logs')}
          >
            Xem Audit Logs
          </button>
        )}

        <button style={{ ...s.btn, background: '#ff4d4f', marginTop: 8 }} onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' },
  card: { background: '#fff', padding: 28, borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', width: 420 },
  badge: { background: '#e6f4ff', color: '#1677ff', padding: '2px 8px', borderRadius: 4, fontSize: 12 },
  profileBox: { background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, padding: '10px 14px', marginBottom: 14 },
  logBox: { background: '#fafafa', border: '1px solid #eee', borderRadius: 6, padding: '10px 14px', marginBottom: 14, maxHeight: 160, overflowY: 'auto' },
  btn: { width: '100%', padding: '10px 0', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500, display: 'block' },
  input: { width: '100%', padding: '10px 12px', marginBottom: 10, border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' },
};
