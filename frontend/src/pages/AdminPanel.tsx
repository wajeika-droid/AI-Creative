import { FormEvent, useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { EmptyRow, PageHead, formatMoney } from '../components/ui';

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', type: 'text', endpoint: '', apiKey: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    api.get('/admin/users').then(r => setUsers(r.data)).catch(err => setError(errorMessage(err)));
    api.get('/admin/roles').then(r => setRoles(r.data)).catch(() => setRoles([]));
    api.get('/admin/providers').then(r => setProviders(r.data)).catch(() => setProviders([]));
    api.get('/admin/payouts').then(r => setPayouts(r.data)).catch(() => setPayouts([]));
    api.get('/admin/audit-logs').then(r => setLogs(r.data)).catch(() => setLogs([]));
  };

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await api.post('/admin/providers', {
        name: form.name,
        type: form.type,
        ...(form.endpoint ? { endpoint: form.endpoint } : {}),
        ...(form.apiKey ? { apiKey: form.apiKey } : {}),
      });
      setMessage('AI provider ditambahkan.');
      setForm({ name: '', type: 'text', endpoint: '', apiKey: '' });
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function toggleProvider(provider: any) {
    setError('');
    setMessage('');
    try {
      await api.patch(`/admin/providers/${provider.id}`, { enabled: !provider.enabled });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function processPayout(payoutId: string, status: 'approved' | 'paid' | 'rejected') {
    setError('');
    setMessage('');
    try {
      const { data } = await api.patch(`/admin/payouts/${payoutId}`, { status });
      setMessage(data.message || `Payout ${status}.`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHead
        title="Admin Panel"
        subtitle="Manajemen pengguna, AI provider, payout, dan audit log (khusus Super Admin)."
      />
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert ok">{message}</div>}

      <div className="panel">
        <h3>Pengguna</h3>
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Saldo</th>
              <th>Terdaftar</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.role?.name}</td>
                <td>
                  {formatMoney(user.wallet?.balance)}{' '}
                  <span className="muted">(+{formatMoney(user.wallet?.pending)} pending)</span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
            {users.length === 0 && <EmptyRow colSpan={4} text="Belum ada pengguna." />}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Permintaan payout</h3>
        <table>
          <thead>
            <tr>
              <th>Pengguna</th>
              <th>Jumlah</th>
              <th>Status</th>
              <th>Diajukan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map(payout => (
              <tr key={payout.id}>
                <td>{payout.wallet?.user?.email || '-'}</td>
                <td>{formatMoney(payout.amount)}</td>
                <td>
                  <span className={`badge ${payout.status === 'paid' ? 'ok' : payout.status === 'rejected' ? 'failed' : 'pending'}`}>
                    {payout.status}
                  </span>
                </td>
                <td>{new Date(payout.requestedAt).toLocaleString('id-ID')}</td>
                <td>
                  {payout.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn ghost sm" onClick={() => processPayout(payout.id, 'approved')}>
                        Approve
                      </button>
                      <button className="btn ghost sm" onClick={() => processPayout(payout.id, 'paid')}>
                        Tandai dibayar
                      </button>
                      <button className="btn ghost sm" onClick={() => processPayout(payout.id, 'rejected')}>
                        Tolak
                      </button>
                    </div>
                  ) : (
                    <span className="muted">selesai</span>
                  )}
                </td>
              </tr>
            ))}
            {payouts.length === 0 && <EmptyRow colSpan={5} text="Belum ada permintaan payout." />}
          </tbody>
        </table>
      </div>

      <form className="panel" onSubmit={submit}>
        <h3>Tambah AI provider</h3>
        <div className="form-grid">
          <div className="form-row">
            <label>Nama</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required minLength={2} />
          </div>
          <div className="form-row">
            <label>Tipe</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="text">text</option>
              <option value="image">image</option>
              <option value="video">video</option>
              <option value="voice">voice</option>
            </select>
          </div>
          <div className="form-row">
            <label>Endpoint (opsional)</label>
            <input
              type="url"
              value={form.endpoint}
              onChange={e => setForm({ ...form, endpoint: e.target.value })}
              placeholder="https://api.provider.com/generate"
            />
          </div>
          <div className="form-row">
            <label>API key (opsional)</label>
            <input
              value={form.apiKey}
              onChange={e => setForm({ ...form, apiKey: e.target.value })}
              type="password"
            />
          </div>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Menyimpan...' : 'Tambah provider'}
        </button>
      </form>

      <div className="panel">
        <h3>AI provider</h3>
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Tipe</th>
              <th>Endpoint</th>
              <th>API key</th>
              <th>Job</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {providers.map(provider => (
              <tr key={provider.id}>
                <td>{provider.name}</td>
                <td>{provider.type}</td>
                <td className="muted">{provider.endpoint || 'mock / lokal'}</td>
                <td className="muted">{provider.hasApiKey ? 'tersimpan' : '-'}</td>
                <td>{provider.jobCount ?? 0}</td>
                <td>
                  <span className={`badge ${provider.enabled ? 'ok' : 'pending'}`}>
                    {provider.enabled ? 'aktif' : 'nonaktif'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn ghost sm" onClick={() => toggleProvider(provider)}>
                    {provider.enabled ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </td>
              </tr>
            ))}
            {providers.length === 0 && <EmptyRow colSpan={7} text="Belum ada provider." />}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Role & permission</h3>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Pengguna</th>
              <th>Permission</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id}>
                <td>{role.name}</td>
                <td>{role._count?.users ?? 0}</td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(role.permissions ?? []).map((perm: any) => (
                      <span key={perm.name} className="chip neutral">
                        {perm.name}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Audit log terbaru</h3>
        <table>
          <thead>
            <tr>
              <th>Aksi</th>
              <th>Oleh</th>
              <th>Detail</th>
              <th>Waktu</th>
            </tr>
          </thead>
          <tbody>
            {logs.slice(0, 20).map(log => (
              <tr key={log.id}>
                <td>{log.action}</td>
                <td>{log.user?.email || 'sistem'}</td>
                <td className="muted">{log.details ? JSON.stringify(log.details) : '-'}</td>
                <td>{new Date(log.createdAt).toLocaleString('id-ID')}</td>
              </tr>
            ))}
            {logs.length === 0 && <EmptyRow colSpan={4} text="Belum ada aktivitas admin." />}
          </tbody>
        </table>
      </div>
    </>
  );
}
