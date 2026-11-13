import { FormEvent, useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { PageHead } from '../components/ui';

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', type: 'text', endpoint: '', apiKey: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    api
      .get('/admin/users')
      .then(response => setUsers(response.data))
      .catch(err => setError(errorMessage(err)));
    api
      .get('/admin/providers')
      .then(response => setProviders(response.data))
      .catch(err => setError(errorMessage(err)));
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

  return (
    <>
      <PageHead
        title="Admin Panel"
        subtitle="Manajemen pengguna dan AI provider (khusus Super Admin)."
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
              <th>Terdaftar</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.role?.name}</td>
                <td>{new Date(user.createdAt).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="panel" onSubmit={submit}>
        <h3>Tambah AI provider</h3>
        <div className="form-grid">
          <div className="form-row">
            <label>Nama</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
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
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {providers.map(provider => (
              <tr key={provider.id}>
                <td>{provider.name}</td>
                <td>{provider.type}</td>
                <td>{provider.config?.endpoint || <span className="muted">mock / lokal</span>}</td>
                <td>{provider.enabled ? 'aktif' : 'nonaktif'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
