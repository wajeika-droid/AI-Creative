import { FormEvent, useState } from 'react';
import { api, errorMessage } from '../api';
import { PageHead } from '../components/ui';

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

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

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
      setMessage(`Job AI dikirim (ID: ${data.jobId}). Hasil diproses worker dan tersimpan otomatis.`);
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
          {loading ? 'Mengirim...' : 'Generate konten'}
        </button>
      </form>
    </>
  );
}
