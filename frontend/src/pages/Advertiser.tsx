import { FormEvent, useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { EmptyRow, PageHead } from '../components/ui';

export default function Advertiser() {
  const [form, setForm] = useState({ name: '', budget: '1000000', commissionRate: '5' });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () =>
    api
      .get('/advertiser/campaign')
      .then(response => setCampaigns(response.data))
      .catch(err => setError(errorMessage(err)));

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await api.post('/advertiser/campaign', {
        name: form.name,
        budget: form.budget,
        commissionRate: Number(form.commissionRate),
      });
      setMessage('Campaign berhasil dibuat.');
      setForm({ name: '', budget: '1000000', commissionRate: '5' });
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
        title="Advertiser"
        subtitle="Kelola campaign dan komisi untuk affiliate."
      />
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert ok">{message}</div>}
      <form className="panel" onSubmit={submit}>
        <h3>Campaign baru</h3>
        <div className="form-grid">
          <div className="form-row">
            <label>Nama campaign</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-row">
            <label>Budget</label>
            <input
              value={form.budget}
              onChange={e => setForm({ ...form, budget: e.target.value })}
              pattern="^\d+(\.\d{1,2})?$"
              required
            />
          </div>
          <div className="form-row">
            <label>Commission rate (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.commissionRate}
              onChange={e => setForm({ ...form, commissionRate: e.target.value })}
              required
            />
          </div>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Menyimpan...' : 'Buat campaign'}
        </button>
      </form>
      <div className="panel">
        <h3>Campaign saya</h3>
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Budget</th>
              <th>Komisi</th>
              <th>Dibuat</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(campaign => (
              <tr key={campaign.id}>
                <td>{campaign.name}</td>
                <td>{Number(campaign.budget).toLocaleString('id-ID')}</td>
                <td>{campaign.commissionRate}%</td>
                <td>{new Date(campaign.createdAt).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  Belum ada campaign.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
