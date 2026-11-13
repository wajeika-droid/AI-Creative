import { FormEvent, useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { EmptyRow, PageHead, formatMoney, formatNumber } from '../components/ui';

export default function Advertiser() {
  const [form, setForm] = useState({ name: '', budget: '1000000', commissionRate: '5' });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productForm, setProductForm] = useState({ campaignId: '', name: '', price: '150000', affiliateCommission: '15000', url: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [productLoading, setProductLoading] = useState(false);

  const load = () => {
    api
      .get('/advertiser/campaign')
      .then(response => {
        setCampaigns(response.data);
        setProductForm(prev => ({ ...prev, campaignId: prev.campaignId || response.data[0]?.id || '' }));
      })
      .catch(err => setError(errorMessage(err)));
    api
      .get('/advertiser/products')
      .then(response => setProducts(response.data))
      .catch(() => setProducts([]));
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

  async function submitProduct(event: FormEvent) {
    event.preventDefault();
    setProductLoading(true);
    setError('');
    setMessage('');
    try {
      await api.post(`/advertiser/campaign/${productForm.campaignId}/product`, {
        name: productForm.name,
        price: productForm.price,
        affiliateCommission: productForm.affiliateCommission,
        ...(productForm.url ? { url: productForm.url } : {}),
      });
      setMessage('Produk berhasil ditambahkan. Creator kini bisa membuat link affiliate untuk produk ini.');
      setProductForm(prev => ({ ...prev, name: '', url: '' }));
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProductLoading(false);
    }
  }

  return (
    <>
      <PageHead
        title="Advertiser"
        subtitle="Kelola campaign, produk, dan komisi untuk affiliate."
      />
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert ok">{message}</div>}

      <form className="panel" onSubmit={submit}>
        <h3>Campaign baru</h3>
        <div className="form-grid">
          <div className="form-row">
            <label>Nama campaign</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required minLength={2} />
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

      <form className="panel" onSubmit={submitProduct}>
        <h3>Produk baru</h3>
        {campaigns.length === 0 ? (
          <div className="muted">Buat campaign terlebih dahulu untuk menambahkan produk.</div>
        ) : (
          <>
            <div className="form-grid">
              <div className="form-row">
                <label>Campaign</label>
                <select
                  value={productForm.campaignId}
                  onChange={e => setProductForm({ ...productForm, campaignId: e.target.value })}
                  required
                >
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>Nama produk</label>
                <input
                  value={productForm.name}
                  onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                  required
                  minLength={2}
                />
              </div>
              <div className="form-row">
                <label>Harga (Rp)</label>
                <input
                  value={productForm.price}
                  onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                  pattern="^\d+(\.\d{1,2})?$"
                  required
                />
              </div>
              <div className="form-row">
                <label>Komisi affiliate (Rp)</label>
                <input
                  value={productForm.affiliateCommission}
                  onChange={e => setProductForm({ ...productForm, affiliateCommission: e.target.value })}
                  pattern="^\d+(\.\d{1,2})?$"
                  required
                />
              </div>
              <div className="form-row">
                <label>URL produk (opsional)</label>
                <input
                  type="url"
                  placeholder="https://tokosaya.com/produk"
                  value={productForm.url}
                  onChange={e => setProductForm({ ...productForm, url: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" disabled={productLoading}>
              {productLoading ? 'Menyimpan...' : 'Tambah produk'}
            </button>
          </>
        )}
      </form>

      <div className="panel">
        <h3>Campaign saya</h3>
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Budget</th>
              <th>Komisi</th>
              <th>Produk</th>
              <th>Dibuat</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(campaign => (
              <tr key={campaign.id}>
                <td>{campaign.name}</td>
                <td>{formatMoney(campaign.budget)}</td>
                <td>{campaign.commissionRate}%</td>
                <td>{formatNumber(campaign._count?.products)}</td>
                <td>{new Date(campaign.createdAt).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
            {campaigns.length === 0 && <EmptyRow colSpan={5} text="Belum ada campaign." />}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Produk saya</h3>
        <table>
          <thead>
            <tr>
              <th>Produk</th>
              <th>Campaign</th>
              <th>Harga</th>
              <th>Komisi affiliate</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.campaign?.name || '-'}</td>
                <td>{formatMoney(product.price)}</td>
                <td>{formatMoney(product.affiliateCommission)}</td>
                <td className="muted">
                  {product.url ? (
                    <a href={product.url} target="_blank" rel="noreferrer" className="card-link">
                      Buka
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
            {products.length === 0 && <EmptyRow colSpan={5} text="Belum ada produk." />}
          </tbody>
        </table>
      </div>
    </>
  );
}
