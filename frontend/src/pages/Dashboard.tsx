import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Clapperboard,
  FileText,
  MousePointerClick,
  Sparkles,
  Wallet2,
  Zap,
} from 'lucide-react';
import { api, errorMessage } from '../api';
import {
  PageHead,
  ProgressRow,
  StatCard,
  TrendChart,
  formatMoney,
  formatNumber,
} from '../components/ui';

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [series, setSeries] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [days, setDays] = useState(14);

  useEffect(() => {
    api
      .get('/dashboard/summary')
      .then(response => setSummary(response.data))
      .catch(err => setError(errorMessage(err)));
    api
      .get('/dashboard/series')
      .then(response => setSeries(response.data))
      .catch(() => setSeries([]));
    api
      .get('/dashboard/recent')
      .then(response => setRecent(response.data))
      .catch(() => setRecent([]));
  }, []);

  const visible = series.slice(-days);
  const chart = visible.map(item => ({
    label: new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    value: Number(item.commission || 0),
  }));

  const totals = {
    content: Number(summary?.totalContent || 0),
    video: Number(summary?.totalVideo || 0),
    clicks: Number(summary?.totalClicks || 0),
    conversions: Number(summary?.totalConversions || 0),
  };
  const channelMax = Math.max(1, totals.content, totals.video, totals.clicks, totals.conversions);

  return (
    <>
      <PageHead
        title="Overview"
        subtitle="Selamat datang kembali! Berikut ringkasan performa kreator Anda."
        actions={
          <select value={days} onChange={event => setDays(Number(event.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
          </select>
        }
      />

      {error && <div className="alert error">{error}</div>}

      <div className="grid-4" style={{ marginBottom: 16 }}>
        <StatCard
          label="Klik affiliate"
          value={formatNumber(summary?.totalClicks)}
          icon={MousePointerClick}
          values={series.map(item => item.clicks)}
          id="clicks"
          tone="blue"
          foot={<span className="chip up">akumulasi</span>}
        />
        <StatCard
          label="Konten AI"
          value={formatNumber(summary?.totalContent)}
          icon={FileText}
          values={series.map(item => item.content)}
          id="content"
          foot={<span className="chip neutral">studio</span>}
        />
        <StatCard
          label="Video dirender"
          value={formatNumber(summary?.totalVideo)}
          icon={Clapperboard}
          values={series.map(item => item.conversions)}
          id="video"
          tone="amber"
          foot={<span className="chip neutral">AI worker</span>}
        />
        <StatCard
          label="Total komisi"
          value={formatMoney(summary?.totalCommission)}
          icon={Sparkles}
          values={series.map(item => item.commission)}
          id="commission"
          tone="green"
          foot={<span className="chip up">14 hari</span>}
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card card-pad-lg">
          <div className="card-head">
            <div>
              <div className="card-title">Commission</div>
              <div className="muted" style={{ marginTop: 3 }}>
                Komisi harian dari affiliate & campaign
              </div>
            </div>
            <span className="chip neutral">Daily</span>
          </div>
          <TrendChart data={chart} />
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Saldo wallet</div>
              <Wallet2 size={17} color="#b9a9ff" />
            </div>
            <div className="stat-value" style={{ marginTop: 0 }}>
              {formatMoney(summary?.balance)}
            </div>
            <div className="stat-foot" style={{ marginBottom: 14 }}>
              <span className="chip warn">Pending {formatMoney(summary?.pending)}</span>
            </div>
            <Link to="/wallet" className="btn ghost sm" style={{ width: '100%' }}>
              Ajukan pencairan <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Performa kanal</div>
              <Zap size={16} color="#f3cd8a" />
            </div>
            <ProgressRow
              name="Konten"
              value={formatNumber(totals.content)}
              percent={(totals.content / channelMax) * 100}
            />
            <ProgressRow
              name="Video"
              value={formatNumber(totals.video)}
              percent={(totals.video / channelMax) * 100}
              alt
            />
            <ProgressRow
              name="Klik"
              value={formatNumber(totals.clicks)}
              percent={(totals.clicks / channelMax) * 100}
            />
            <ProgressRow
              name="Konversi"
              value={formatNumber(totals.conversions)}
              percent={(totals.conversions / channelMax) * 100}
              alt
            />
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-pad-lg">
          <div className="card-head">
            <div className="card-title">Aktivitas AI terbaru</div>
            <Link to="/content" className="card-link">
              Content Studio
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="muted" style={{ padding: '18px 0' }}>
              Belum ada job AI. Mulai dari Content Studio atau AI Video Studio.
            </div>
          ) : (
            <div className="activity">
              {recent.map(job => (
                <div className="activity-item" key={job.id}>
                  <div
                    className={`activity-icon ${
                      job.type?.includes('video') ? 'amber' : job.status === 'failed' ? 'purple' : ''
                    }`}
                  >
                    {job.type?.includes('video') ? <Clapperboard size={15} /> : <FileText size={15} />}
                  </div>
                  <div>
                    <div className="activity-title">
                      {job.type?.includes('video') ? 'Render video' : 'Generate konten'} ·{' '}
                      {job.provider?.name || 'AI provider'}
                    </div>
                    <div className="activity-sub">
                      Status: {job.status} · {job.type}
                    </div>
                  </div>
                  <div className="activity-time">
                    {new Date(job.createdAt).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad-lg">
          <div className="card-head">
            <div className="card-title">Progress workspace</div>
            <span className="chip up">aktif</span>
          </div>
          <div className="activity">
            <div className="activity-item">
              <div className="activity-icon purple">
                <Sparkles size={15} />
              </div>
              <div>
                <div className="activity-title">AI provider siap</div>
                <div className="activity-sub">Mock provider aktif untuk text & video</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">
                <Zap size={15} />
              </div>
              <div>
                <div className="activity-title">Worker BullMQ berjalan</div>
                <div className="activity-sub">Job diproses otomatis lewat Redis</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon amber">
                <Clapperboard size={15} />
              </div>
              <div>
                <div className="activity-title">Video studio siap dipakai</div>
                <div className="activity-sub">Render video 9:16, 16:9 dan 1:1</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
