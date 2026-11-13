import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ExternalLink, Sparkles } from 'lucide-react';
import { api, errorMessage } from '../api';
import { formatMoney } from '../components/ui';

export default function ReferralLanding() {
  const { token = '' } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [converted, setConverted] = useState<any>(null);

  useEffect(() => {
    api
      .get(`/affiliate/track/${token}`)
      .then(response => setData(response.data))
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [token]);

  async function convert() {
    setConverting(true);
    setError('');
    try {
      const orderId = `demo-${token}-${Date.now()}`;
      const { data: result } = await api.post('/affiliate/convert', { token, orderId });
      setConverted(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-mark">
          <Sparkles size={20} />
        </div>
        <h1>Rekomendasi Produk</h1>
        <p>Link affiliate Creative Partner AI</p>

        {loading && <div className="muted">Memuat produk…</div>}
        {error && <div className="alert error">{error}</div>}

        {data && (
          <div style={{ textAlign: 'left', marginTop: 8 }}>
            <div className="stat-label">{data.campaign}</div>
            <div className="stat-value" style={{ fontSize: 22, marginBottom: 4 }}>
              {data.product.name}
            </div>
            <div className="muted" style={{ marginBottom: 12 }}>
              Harga {formatMoney(data.product.price)} · Komisi kreator {formatMoney(data.product.commission)}
            </div>

            {converted ? (
              <div className="alert ok" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <CheckCircle2 size={16} />
                Konversi tercatat. Komisi {formatMoney(converted.amount)} masuk ke wallet kreator.
              </div>
            ) : (
              <button style={{ width: '100%' }} onClick={convert} disabled={converting}>
                {converting ? 'Memproses…' : 'Selesaikan pembelian (demo)'}
              </button>
            )}

            {data.product.url && (
              <a
                className="btn ghost"
                href={data.product.url}
                target="_blank"
                rel="noreferrer"
                style={{ width: '100%', marginTop: 10 }}
              >
                Kunjungi produk <ExternalLink size={14} />
              </a>
            )}
          </div>
        )}

        <p className="muted" style={{ marginTop: 18 }}>
          <Link to="/login">
            Masuk ke studio <ArrowRight size={12} />
          </Link>
        </p>
      </div>
    </div>
  );
}
