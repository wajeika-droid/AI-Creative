import { FormEvent, useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { PageHead } from '../components/ui';

export default function Wallet() {
  const [wallet, setWallet] = useState<any>(null);
  const [form, setForm] = useState({ amount: '', bankAccount: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () =>
    api
      .get('/wallet/balance')
      .then(response => setWallet(response.data))
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
      const { data } = await api.post('/wallet/withdraw', form);
      setMessage(data.message || 'Permintaan withdraw diterima.');
      setForm({ amount: '', bankAccount: '' });
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHead title="Wallet" subtitle="Saldo komisi dan permintaan pencairan." />
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert ok">{message}</div>}
      <div className="grid" style={{ marginBottom: 22 }}>
        <div className="card">
          <div className="stat-label">Saldo</div>
          <div className="stat-value">{Number(wallet?.balance ?? 0).toLocaleString('id-ID')}</div>
        </div>
        <div className="card">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{Number(wallet?.pending ?? 0).toLocaleString('id-ID')}</div>
        </div>
      </div>
      <form className="panel" onSubmit={submit}>
        <h3>Permintaan withdraw</h3>
        <div className="form-grid">
          <div className="form-row">
            <label>Jumlah</label>
            <input
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              pattern="^\d+(\.\d{1,2})?$"
              required
            />
          </div>
          <div className="form-row">
            <label>Rekening bank</label>
            <input
              value={form.bankAccount}
              onChange={e => setForm({ ...form, bankAccount: e.target.value })}
              required
            />
          </div>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Mengirim...' : 'Ajukan withdraw'}
        </button>
      </form>
    </>
  );
}
