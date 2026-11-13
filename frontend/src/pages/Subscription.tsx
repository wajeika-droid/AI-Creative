import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { PageHead } from '../components/ui';

const plans = [
  { name: 'Free', quota: 5000 },
  { name: 'Creator', quota: 50000 },
  { name: 'Professional', quota: 200000 },
  { name: 'Agency', quota: 500000 },
];

export default function Subscription() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState('');

  const load = () =>
    api
      .get('/subscription')
      .then(response => setData(response.data))
      .catch(err => setError(errorMessage(err)));

  useEffect(() => {
    load();
  }, []);

  async function choose(plan: string) {
    setLoading(plan);
    setError('');
    setMessage('');
    try {
      await api.post('/subscription', { plan });
      setMessage(`Paket ${plan} berhasil diaktifkan.`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading('');
    }
  }

  const usedTokens = data?.usage?.reduce((sum: number, item: any) => sum + item.usedTokens, 0) ?? 0;

  return (
    <>
      <PageHead
        title="Langganan"
        subtitle={`Paket aktif: ${data?.subscription?.plan ?? '-'} · Kuota token: ${Number(
          data?.subscription?.tokenQuota ?? 0
        ).toLocaleString('id-ID')} · Terpakai: ${Number(usedTokens).toLocaleString('id-ID')}`}
      />
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert ok">{message}</div>}
      <div className="grid">
        {plans.map(plan => (
          <div className="card" key={plan.name}>
            <div className="stat-label">{plan.name}</div>
            <div className="stat-value">{plan.quota.toLocaleString('id-ID')}</div>
            <div className="muted" style={{ marginBottom: 14 }}>
              token / bulan
            </div>
            <button
              onClick={() => choose(plan.name)}
              disabled={loading === plan.name || data?.subscription?.plan === plan.name}
            >
              {data?.subscription?.plan === plan.name ? 'Aktif' : loading === plan.name ? 'Memproses...' : 'Pilih paket'}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
