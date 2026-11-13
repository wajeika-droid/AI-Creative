import { FormEvent, useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { EmptyRow, PageHead, formatMoney } from '../components/ui';

export default function Wallet() {
  const [wallet, setWallet] = useState<any>(null);
  const [form, setForm] = useState({ amount: '', bankAccount: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () =>
    api
      .get('/wallet')
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
      <PageHead title="Wallet" subtitle="Saldo komisi, riwayat transaksi, dan permintaan pencairan." />
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert ok">{message}</div>}
      <div className="grid" style={{ marginBottom: 22 }}>
        <div className="card">
          <div className="stat-label">Saldo</div>
          <div className="stat-value">{formatMoney(wallet?.balance)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{formatMoney(wallet?.pending)}</div>
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
              minLength={4}
            />
          </div>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Mengirim...' : 'Ajukan withdraw'}
        </button>
      </form>

      <div className="panel">
        <h3>Riwayat transaksi</h3>
        <table>
          <thead>
            <tr>
              <th>Tipe</th>
              <th>Jumlah</th>
              <th>Catatan</th>
              <th>Waktu</th>
            </tr>
          </thead>
          <tbody>
            {(wallet?.transactions ?? []).map((trx: any) => (
              <tr key={trx.id}>
                <td>{trx.type}</td>
                <td style={{ color: Number(trx.amount) >= 0 ? 'var(--green)' : 'var(--amber)' }}>
                  {Number(trx.amount) >= 0 ? '+' : ''}
                  {formatMoney(trx.amount)}
                </td>
                <td className="muted">{trx.note || '-'}</td>
                <td>{new Date(trx.createdAt).toLocaleString('id-ID')}</td>
              </tr>
            ))}
            {(wallet?.transactions ?? []).length === 0 && (
              <EmptyRow colSpan={4} text="Belum ada transaksi." />
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Riwayat pencairan</h3>
        <table>
          <thead>
            <tr>
              <th>Jumlah</th>
              <th>Status</th>
              <th>Diajukan</th>
              <th>Diproses</th>
            </tr>
          </thead>
          <tbody>
            {(wallet?.payouts ?? []).map((payout: any) => (
              <tr key={payout.id}>
                <td>{formatMoney(payout.amount)}</td>
                <td>
                  <span className={`badge ${payout.status === 'paid' ? 'ok' : payout.status === 'rejected' ? 'failed' : 'pending'}`}>
                    {payout.status}
                  </span>
                </td>
                <td>{new Date(payout.requestedAt).toLocaleString('id-ID')}</td>
                <td className="muted">
                  {payout.processedAt ? new Date(payout.processedAt).toLocaleString('id-ID') : '-'}
                </td>
              </tr>
            ))}
            {(wallet?.payouts ?? []).length === 0 && (
              <EmptyRow colSpan={4} text="Belum ada permintaan pencairan." />
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
