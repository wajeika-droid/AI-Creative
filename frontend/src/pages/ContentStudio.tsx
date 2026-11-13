import { FormEvent, useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { api, errorMessage } from '../api';
import { EmptyRow, PageHead } from '../components/ui';

const types = [
  'idea',
  'script',
  'caption',
  'hashtag',
  'title',
  'description',
  'cta',
  'storytelling',
  'promo',
  'educational',
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function ContentStudio() {
  const [form, setForm] = useState({
    niche: 'Kecantikan',
    audience: 'Wanita 18-30',
    platform: 'Instagram',
    language: 'Indonesia',
    tone: 'Friendly',
    duration: 30,
    type: 'caption',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const loadResults = () =>
    api
      .get('/content')
      .then(response => setItems(response.data))
      .catch(() => setItems([]));

  useEffect(() => {
    loadResults();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/content/generate', {
        ...form,
        duration: Number(form.duration),
      });
      setMessage(`Job AI dikirim (ID: ${data.jobId}). Menunggu worker memproses…`);

      for (let attempt = 0; attempt < 20; attempt++) {
        await sleep(1500);
        const { data: job } = await api.get(`/content/jobs/${data.jobId}`);
        if (job.status === 'success') {
          setMessage('Konten berhasil dibuat dan tersimpan.');
          break;
        }
        if (job.status === 'failed') {
          setError('Job AI gagal diproses. Periksa provider lalu coba lagi.');
          break;
        }
      }
      loadResults();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHead
        title="Content Studio"
        subtitle="Generate ide, script, caption dan materi konten dengan AI."
        actions={
          <button className="btn ghost" onClick={loadResults}>
            <RefreshCcw size={14} /> Refresh hasil
          </button>
        }
      />
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert ok">{message}</div>}
      <form className="panel" onSubmit={submit}>
        <h3>Parameter konten</h3>
        <div className="form-grid">
          <div className="form-row">
            <label>Niche</label>
            <input value={form.niche} onChange={e => update('niche', e.target.value)} required />
          </div>
          <div className="form-row">
            <label>Target audience</label>
            <input value={form.audience} onChange={e => update('audience', e.target.value)} required />
          </div>
          <div className="form-row">
            <label>Platform</label>
            <input value={form.platform} onChange={e => update('platform', e.target.value)} required />
          </div>
          <div className="form-row">
            <label>Bahasa</label>
            <input value={form.language} onChange={e => update('language', e.target.value)} required />
          </div>
          <div className="form-row">
            <label>Tone</label>
            <input value={form.tone} onChange={e => update('tone', e.target.value)} required />
          </div>
          <div className="form-row">
            <label>Durasi (detik)</label>
            <input
              type="number"
              min={5}
              value={form.duration}
              onChange={e => update('duration', e.target.value)}
            />
          </div>
          <div className="form-row">
            <label>Jenis konten</label>
            <select value={form.type} onChange={e => update('type', e.target.value)}>
              {types.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Memproses…' : 'Generate konten'}
        </button>
      </form>

      <div className="panel">
        <h3>Hasil terbaru</h3>
        <table>
          <thead>
            <tr>
              <th>Jenis</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Dibuat</th>
              <th>Output</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>{item.job?.type || 'text_generation'}</td>
                <td>{item.job?.provider?.name || '-'}</td>
                <td>
                  <span className={`badge ${item.job?.status === 'success' ? 'ok' : item.job?.status === 'failed' ? 'failed' : 'pending'}`}>
                    {item.job?.status || 'success'}
                  </span>
                </td>
                <td>{new Date(item.createdAt).toLocaleString('id-ID')}</td>
                <td className="muted" style={{ maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {typeof item.content === 'string' ? item.content : JSON.stringify(item.content)}
                </td>
              </tr>
            ))}
            {items.length === 0 && <EmptyRow colSpan={5} text="Belum ada konten yang dihasilkan." />}
          </tbody>
        </table>
      </div>
    </>
  );
}
