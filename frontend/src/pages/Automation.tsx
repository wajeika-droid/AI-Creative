import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  Check,
  Pencil,
  Play,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  Video,
} from 'lucide-react';
import { api, errorMessage } from '../api';
import { EmptyRow, PageHead } from '../components/ui';

type AutomationItem = {
  id: string;
  name: string;
  scheduleType: 'daily' | 'weekly';
  timeOfDay: string;
  dayOfWeek: number | null;
  enabled: boolean;
  lastRunAt: string | null;
  lastJobId: string | null;
  lastJobStatus: string | null;
  nextRunAt: string | null;
  input: any;
};

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const initialForm = {
  name: 'Render harian produk',
  caption: 'Temukan cara AI membantu bisnis Anda tumbuh lebih cepat dan efisien.',
  voiceScript: '',
  format: '16:9',
  voice: 'Ava (Neutral)',
  language: 'Bahasa Indonesia',
  speed: 1,
  mood: 'Neutral',
  musicStyle: 'Soft Ambient',
  musicVolume: 0.3,
  autoSubtitles: true,
  scheduleType: 'daily' as 'daily' | 'weekly',
  timeOfDay: '09:00',
  dayOfWeek: 1,
  enabled: true,
};

function jakartaDate(value?: string | null) {
  if (!value) return '-';
  return `${new Date(value).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })} WIB`;
}

function scheduleLabel(item: { scheduleType: string; timeOfDay: string; dayOfWeek: number | null }) {
  if (item.scheduleType === 'weekly') {
    return `${DAYS[item.dayOfWeek ?? 0]} · ${item.timeOfDay} WIB`;
  }
  return `Setiap hari · ${item.timeOfDay} WIB`;
}

export default function Automation() {
  const [items, setItems] = useState<AutomationItem[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () =>
    api
      .get('/automation')
      .then(response => setItems(response.data))
      .catch(err => setError(errorMessage(err)));

  useEffect(() => {
    load();
  }, []);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function edit(item: AutomationItem) {
    const input = item.input || {};
    setForm({
      name: item.name,
      caption: input.caption ?? '',
      voiceScript: input.voiceScript ?? '',
      format: input.format ?? '16:9',
      voice: input.voice ?? 'Ava (Neutral)',
      language: input.language ?? 'Bahasa Indonesia',
      speed: Number(input.speed ?? 1),
      mood: input.mood ?? 'Neutral',
      musicStyle: input.musicStyle ?? 'Soft Ambient',
      musicVolume: Number(input.musicVolume ?? 0.3),
      autoSubtitles: input.autoSubtitles !== false,
      scheduleType: item.scheduleType,
      timeOfDay: item.timeOfDay,
      dayOfWeek: item.dayOfWeek ?? 1,
      enabled: item.enabled,
    });
    setEditingId(item.id);
    setMessage('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        name: form.name,
        scheduleType: form.scheduleType,
        timeOfDay: form.timeOfDay,
        dayOfWeek: form.scheduleType === 'weekly' ? form.dayOfWeek : null,
        enabled: form.enabled,
        input: {
          format: form.format,
          caption: form.caption,
          ...(form.voiceScript.trim() ? { voiceScript: form.voiceScript } : {}),
          voice: form.voice,
          language: form.language,
          speed: form.speed,
          mood: form.mood,
          musicStyle: form.musicStyle,
          musicVolume: form.musicVolume,
          autoSubtitles: form.autoSubtitles,
          showSubtitles: true,
          voiceEnabled: true,
          transition: 'Fade',
          brandName: 'Creative Partner',
          brandColor: '#7c5cff',
          scenes: [
            { mediaId: 'studio', duration: 6 },
            { mediaId: 'skincare', duration: 6 },
            { mediaId: 'workspace', duration: 6 },
          ],
        },
      };
      if (editingId) {
        await api.patch(`/automation/${editingId}`, payload);
        setMessage('Otomasi diperbarui.');
      } else {
        await api.post('/automation', payload);
        setMessage('Otomasi dibuat dan akan berjalan sesuai jadwal WIB.');
      }
      resetForm();
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function toggle(item: AutomationItem) {
    try {
      await api.patch(`/automation/${item.id}`, { enabled: !item.enabled });
      setMessage(item.enabled ? 'Otomasi dijeda.' : 'Otomasi diaktifkan kembali.');
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function runNow(item: AutomationItem) {
    setRunningId(item.id);
    setError('');
    setMessage('');
    try {
      const { data } = await api.post(`/automation/${item.id}/run`);
      setMessage(`Render otomatis dikirim ke worker (job ${data.jobId}). Cek hasilnya di AI Video Studio.`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRunningId(null);
    }
  }

  async function remove(item: AutomationItem) {
    if (!window.confirm(`Hapus otomasi "${item.name}"?`)) return;
    try {
      await api.delete(`/automation/${item.id}`);
      if (editingId === item.id) resetForm();
      setMessage('Otomasi dihapus.');
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHead
        title="Automation"
        subtitle="Jadwalkan render video otomatis harian atau mingguan (zona waktu Asia/Jakarta)."
        actions={
          <button className="btn ghost" onClick={load}>
            <RefreshCcw size={14} /> Refresh
          </button>
        }
      />

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert ok">{message}</div>}

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <form className="card card-pad-lg" onSubmit={submit}>
          <div className="card-head">
            <div className="card-title">{editingId ? 'Edit otomasi' : 'Buat otomasi baru'}</div>
            <span className="muted">{form.scheduleType === 'weekly' ? 'Mingguan' : 'Harian'}</span>
          </div>

          <div className="form-row">
            <label>Nama otomasi</label>
            <input
              value={form.name}
              maxLength={120}
              onChange={event => setField('name', event.target.value)}
              placeholder="Render harian produk"
            />
          </div>

          <div className="form-row">
            <label>Teks / narasi video</label>
            <textarea
              className="script-area"
              rows={4}
              maxLength={2000}
              value={form.caption}
              onChange={event => setField('caption', event.target.value)}
            />
          </div>

          <div className="form-row">
            <label>Voice script (opsional, default mengikuti narasi)</label>
            <input
              value={form.voiceScript}
              maxLength={1500}
              onChange={event => setField('voiceScript', event.target.value)}
              placeholder="Kosongkan untuk memakai narasi di atas"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-row">
              <label>Format</label>
              <select value={form.format} onChange={event => setField('format', event.target.value)}>
                <option>16:9</option>
                <option>9:16</option>
                <option>1:1</option>
              </select>
            </div>
            <div className="form-row">
              <label>Bahasa</label>
              <select value={form.language} onChange={event => setField('language', event.target.value)}>
                <option>Bahasa Indonesia</option>
                <option>English (US)</option>
                <option>English (UK)</option>
              </select>
            </div>
            <div className="form-row">
              <label>Suara</label>
              <select value={form.voice} onChange={event => setField('voice', event.target.value)}>
                <option>Ava (Neutral)</option>
                <option>Nadia (Warm)</option>
                <option>Raka (Energetic)</option>
              </select>
            </div>
            <div className="form-row">
              <label>Mood</label>
              <select value={form.mood} onChange={event => setField('mood', event.target.value)}>
                <option>Neutral</option>
                <option>Warm</option>
                <option>Energetic</option>
                <option>Calm</option>
              </select>
            </div>
            <div className="form-row">
              <label>Musik latar</label>
              <select value={form.musicStyle} onChange={event => setField('musicStyle', event.target.value)}>
                <option>Soft Ambient</option>
                <option>Upbeat</option>
                <option>Cinematic</option>
                <option>None</option>
              </select>
            </div>
            <div className="form-row">
              <label>Volume musik</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={form.musicVolume}
                disabled={form.musicStyle === 'None'}
                onChange={event => setField('musicVolume', Number(event.target.value))}
              />
            </div>
          </div>

          <div className="form-row">
            <label>Subtitle otomatis dari voiceover</label>
            <button
              type="button"
              className={form.autoSubtitles ? 'btn sm' : 'btn ghost sm'}
              style={{ alignSelf: 'flex-start' }}
              onClick={() => setField('autoSubtitles', !form.autoSubtitles)}
            >
              {form.autoSubtitles && <Check size={12} />}
              {form.autoSubtitles ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-row">
              <label>Jadwal</label>
              <select
                value={form.scheduleType}
                onChange={event => setField('scheduleType', event.target.value as 'daily' | 'weekly')}
              >
                <option value="daily">Harian</option>
                <option value="weekly">Mingguan</option>
              </select>
            </div>
            <div className="form-row">
              <label>Jam (WIB)</label>
              <input
                type="time"
                value={form.timeOfDay}
                onChange={event => setField('timeOfDay', event.target.value)}
              />
            </div>
            {form.scheduleType === 'weekly' && (
              <div className="form-row">
                <label>Hari</label>
                <select
                  value={form.dayOfWeek}
                  onChange={event => setField('dayOfWeek', Number(event.target.value))}
                >
                  {DAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-row">
              <label>Status</label>
              <select
                value={form.enabled ? 'on' : 'off'}
                onChange={event => setField('enabled', event.target.value === 'on')}
              >
                <option value="on">Aktif</option>
                <option value="off">Dijeda</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn" type="submit" disabled={loading}>
              {editingId ? <Save size={14} /> : <Plus size={14} />}
              {loading ? 'Menyimpan...' : editingId ? 'Simpan perubahan' : 'Buat otomasi'}
            </button>
            {editingId && (
              <button className="btn ghost" type="button" onClick={resetForm}>
                Batal
              </button>
            )}
          </div>
        </form>

        <aside className="card card-pad-lg">
          <div className="card-head">
            <div className="card-title">Ringkasan</div>
            <CalendarClock size={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span className="muted">Jadwal</span>
              <b>{form.scheduleType === 'weekly' ? `${DAYS[form.dayOfWeek]} · ${form.timeOfDay} WIB` : `Setiap hari · ${form.timeOfDay} WIB`}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span className="muted">Durasi video</span>
              <b>18 detik · 3 scene</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span className="muted">Voiceover</span>
              <b>{form.voice} · {form.language}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span className="muted">Musik</span>
              <b>{form.musicStyle === 'None' ? 'Tanpa musik' : `${form.musicStyle} · ${Math.round(form.musicVolume * 100)}%`}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span className="muted">Subtitle</span>
              <b>{form.autoSubtitles ? 'Otomatis dari TTS + SRT' : 'Nonaktif'}</b>
            </div>
          </div>
          <p className="muted" style={{ fontSize: 11.5, marginTop: 16, marginBottom: 0 }}>
            Scheduler berjalan di worker dan mengecek antrean setiap 60 detik. Render otomatis memakai kuota
            yang sama dengan render manual.
          </p>
        </aside>
      </div>

      <div className="card card-pad-lg">
        <div className="card-head">
          <div className="card-title">Daftar otomasi</div>
          <span className="muted">{items.length} otomasi</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Jadwal</th>
              <th>Berikutnya</th>
              <th>Terakhir</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>
                  <div>{item.name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {item.input?.format || '16:9'} · {item.input?.autoSubtitles === false ? 'tanpa subtitle otomatis' : 'subtitle otomatis'}
                  </div>
                </td>
                <td>{scheduleLabel(item)}</td>
                <td className="muted">{item.enabled ? jakartaDate(item.nextRunAt) : 'Dijeda'}</td>
                <td className="muted">
                  {jakartaDate(item.lastRunAt)}
                  {item.lastJobId && (
                    <div style={{ fontSize: 11 }}>
                      <Link to="/video" className="card-link">
                        job {item.lastJobId.slice(0, 8)} · {item.lastJobStatus || 'queued'}
                      </Link>
                    </div>
                  )}
                </td>
                <td>
                  <span className={`badge ${item.enabled ? 'ok' : 'pending'}`}>
                    {item.enabled ? 'Aktif' : 'Dijeda'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      className="btn subtle sm"
                      onClick={() => runNow(item)}
                      disabled={runningId === item.id}
                      title="Render sekarang"
                    >
                      <Play size={12} /> {runningId === item.id ? '...' : 'Run'}
                    </button>
                    <button className="btn subtle sm" onClick={() => toggle(item)}>
                      {item.enabled ? 'Jeda' : 'Aktifkan'}
                    </button>
                    <button className="btn subtle sm" onClick={() => edit(item)}>
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      className="btn ghost sm"
                      style={{ color: '#ff7b8a' }}
                      onClick={() => remove(item)}
                    >
                      <Trash2 size={12} /> Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <EmptyRow colSpan={6} text="Belum ada otomasi. Buat yang pertama di form atas." />}
          </tbody>
        </table>
      </div>

      <div className="card card-pad-lg" style={{ marginTop: 16 }}>
        <div className="card-head">
          <div className="card-title">Cara kerja</div>
          <Video size={16} />
        </div>
        <div className="grid-3">
          <div>
            <b>1. Susun render</b>
            <p className="muted" style={{ fontSize: 12 }}>
              Tentukan narasi, format, voiceover, musik, dan subtitle. Payload ini disimpan bersama otomasi.
            </p>
          </div>
          <div>
            <b>2. Scheduler worker</b>
            <p className="muted" style={{ fontSize: 12 }}>
              Worker memeriksa jadwal tiap menit dengan zona Asia/Jakarta dan mengklaim otomasi yang jatuh tempo
              agar tidak dobel.
            </p>
          </div>
          <div>
            <b>3. Hasil otomatis</b>
            <p className="muted" style={{ fontSize: 12 }}>
              MP4 dan SRT muncul di daftar render AI Video Studio. Kegagalan kuota atau render dikirim sebagai
              notifikasi.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
