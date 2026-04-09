import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const ACTION_COLORS: Record<string, string> = {
  LOGIN_SUCCESS:   '#52c41a',
  LOGIN_FAILED:    '#ff4d4f',
  LOGOUT:          '#faad14',
  REFRESH_SUCCESS: '#1677ff',
  REFRESH_FAILED:  '#ff4d4f',
  REGISTER:        '#13c2c2',
  CHANGE_PASSWORD: '#722ed1',
  SESSION_REVOKED: '#ff7875',
};

const PAGE_SIZE = 15;

export default function AuditLogs() {
  const [logs, setLogs]   = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(0);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLogs();
  }, [page, action]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit:  String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        ...(action ? { action } : {}),
      });
      const { data } = await api.get(`/audit/logs?${params}`);
      setLogs(data.data);
      setTotal(data.total);
    } catch {
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Audit Logs</h2>
          <button style={s.backBtn} onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </div>

        {/* Filter */}
        <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
          <select
            style={s.select}
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(0); }}
          >
            <option value="">Tất cả action</option>
            {Object.keys(ACTION_COLORS).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: '#888', alignSelf: 'center' }}>
            {total} bản ghi
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#888' }}>Đang tải...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={s.th}>Thời gian</th>
                  <th style={s.th}>Action</th>
                  <th style={s.th}>User ID</th>
                  <th style={s.th}>IP</th>
                  <th style={s.th}>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={s.td}>{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: ACTION_COLORS[log.action] + '20', color: ACTION_COLORS[log.action] }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>{log.userId ?? '—'}</td>
                    <td style={s.td}>{log.ip}</td>
                    <td style={s.td}>
                      {log.metadata
                        ? <code style={{ fontSize: 11 }}>{JSON.stringify(log.metadata)}</code>
                        : '—'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#aaa' }}>Không có dữ liệu</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
            <button style={s.pageBtn} disabled={page === 0} onClick={() => setPage(page - 1)}>←</button>
            <span style={{ alignSelf: 'center', fontSize: 13 }}>{page + 1} / {totalPages}</span>
            <button style={s.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>→</button>
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:    { minHeight: '100vh', background: '#f0f2f5', padding: '24px 16px' },
  card:    { background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 24, maxWidth: 900, margin: '0 auto' },
  backBtn: { background: 'none', border: '1px solid #d9d9d9', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13 },
  select:  { padding: '6px 10px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 13 },
  table:   { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:      { padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '1px solid #eee' },
  td:      { padding: '8px 12px', verticalAlign: 'middle' },
  badge:   { padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500 },
  pageBtn: { padding: '4px 12px', borderRadius: 6, border: '1px solid #d9d9d9', cursor: 'pointer', background: '#fff' },
};
