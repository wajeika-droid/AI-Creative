import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Copy,
  Link2,
  MousePointerClick,
  Plus,
  TrendingUp,
  Wallet2,
} from 'lucide-react';
import { api, errorMessage } from '../api';
import {
  EmptyRow,
  PageHead,
  StatCard,
  TrendChart,
  formatMoney,
  formatNumber,
} from '../components/ui';

export default function Affiliate() {
  const [stats, setStats] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAll = () => {
    api
      .get('/affiliate/stats')
      .then(response => setStats(response.data))
      .catch(err => setError(errorMessage(err)));
    api
      .get('/affiliate/links')
      .then(response => setLinks(response.data))
      .catch(() => setLinks([]));
    api
      .get('/dashboard/series')
      .then(response => setSeries(response.data))
      .catch(() => setSeries([]));
    api
      .get('/affiliate/products')
      .then(response => {
        setProducts(response.data);
        setProductId(current => current || response.data[0]?.id || '');
      })
      .catch(() => setProducts([]));
  };

  useEffect(() => {
    loadAll();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/affiliate/register', { productId });
      const product = products.find(item => item.id === productId);
      setMessage(
        data.existing
          ? `Anda sudah punya link untuk ${product?.name || 'produk ini'}.`
          : `Link affiliate dibuat untuk ${product?.name || 'produk'}. Bagikan link referral Anda.`
      );
      loadAll();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setMessage('Link referral disalin.');
      window.setTimeout(() => setCopied(''), 2500);
    } catch {
      setMessage(text);
    }
  }

  const chart = series.slice(-14).map(item => ({
    label: new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    value: Number(item.conversions || 0),
  }));

  return (
    <>
      <PageHead
        title="Affiliate Center"
        subtitle="Kelola link referral, pantau konversi, dan cairkan komisi."
        actions={
          <Link to="/wallet" className="btn">
            <Wallet2 size={15} /> Withdraw
          </Link>
        }
      />

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert ok">{message}</div>}

      <div className="grid-4" style={{ marginBottom: 16 }}>
        <StatCard
          label="Klik"
          value={formatNumber(stats?.clicks)}
          icon={MousePointerClick}
          values={series.map(item => item.clicks)}
          id="aff-clicks"
          tone="blue"
          foot={<span className="chip neutral">14 hari</span>}
        />
        <StatCard
          label="Konversi"
          value={formatNumber(stats?.conversions)}
          icon={TrendingUp}
          values={series.map(item => item.conversions)}
          id="aff-conv"
          tone="green"
          foot={<span className="chip up">tracking aktif</span>}
        />
        <StatCard
          label="Total komisi"
          value={formatMoney(stats?.totalEarned)}
          icon={Wallet2}
          values={series.map(item => item.commission)}
          id="aff-earn"
          tone="amber"
          foot={<span className="chip neutral">akumulasi</span>}
        />
        <StatCard
          label="Link aktif"
          value={formatNumber(links.length)}
          icon={Link2}
          id="aff-links"
          values={series.map(item => item.conversions)}
          foot={<span className="chip neutral">referral</span>}
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card card-pad-lg">
          <div className="card-head">
            <div>
              <div className="card-title">Performa konversi</div>
              <div className="muted" style={{ marginTop: 3 }}>
                Jumlah konversi affiliate harian
              </div>
            </div>
            <span className="chip neutral">14 hari</span>
          </div>
          <TrendChart data={chart} name="Konversi" />
        </div>

        <div className="card card-pad-lg">
          <div className="card-head">
            <div className="card-title">Link referral utama</div>
            <Link2 size={16} color="#b9a9ff" />
          </div>
          {links.length === 0 ? (
            <div className="muted">
              Belum ada link. Pilih produk di form bawah untuk membuat link referral pertama Anda.
            </div>
          ) : (
            <>
              <div className="link-box">
                <code>{`${window.location.origin}/r/${links[0].token}`}</code>
                <button
                  className="btn subtle sm"
                  onClick={() =>
                    copy(`${window.location.origin}/r/${links[0].token}`, links[0].id)
                  }
                >
                  {copied === links[0].id ? <Check size={13} /> : <Copy size={13} />}
                  {copied === links[0].id ? 'Tersalin' : 'Copy'}
                </button>
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
                Bagikan link ini — setiap klik dan konversi tercatat otomatis.
              </div>
              <div className="stat-foot" style={{ marginTop: 14 }}>
                <span className="chip neutral">{links[0].product?.name || 'Produk affiliate'}</span>
                <span className="chip up">{links[0]._count?.clicks ?? 0} klik</span>
              </div>
            </>
          )}

          <div style={{ borderTop: '1px solid #171c2a', margin: '16px 0', paddingTop: 16 }}>
            <form onSubmit={submit}>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <label>Produk untuk link baru</label>
                {products.length === 0 ? (
                  <div className="muted">
                    Belum ada produk aktif. <Link to="/advertiser">Buat campaign & produk</Link> terlebih dahulu.
                  </div>
                ) : (
                  <select
                    value={productId}
                    onChange={event => setProductId(event.target.value)}
                    required
                  >
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} · {product.campaign?.name || 'Campaign'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <button
                className="btn sm"
                type="submit"
                disabled={loading || products.length === 0}
                style={{ width: '100%' }}
              >
                <Plus size={14} /> {loading ? 'Mendaftarkan...' : 'Buat link affiliate'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="card card-pad-lg">
        <div className="card-head">
          <div className="card-title">Daftar link affiliate</div>
          <span className="muted">{links.length} link</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Produk</th>
              <th>Token</th>
              <th>Klik</th>
              <th>Konversi</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {links.map(item => (
              <tr key={item.id}>
                <td>
                  {item.product?.name || item.productId}
                  <div className="muted" style={{ fontSize: 10.5 }}>
                    {item.product?.campaign?.name || 'Campaign'}
                  </div>
                </td>
                <td>
                  <code>{item.token.slice(0, 12)}…</code>
                </td>
                <td>{formatNumber(item._count?.clicks)}</td>
                <td>{formatNumber(item._count?.conversions)}</td>
                <td>
                  <span className="badge ok">aktif</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn ghost sm"
                    onClick={() => copy(`${window.location.origin}/r/${item.token}`, item.id)}
                  >
                    <Copy size={12} /> Copy
                  </button>
                </td>
              </tr>
            ))}
            {links.length === 0 && <EmptyRow colSpan={6} text="Belum ada link affiliate." />}
          </tbody>
        </table>
      </div>
    </>
  );
}
