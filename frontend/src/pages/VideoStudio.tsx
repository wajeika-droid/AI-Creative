import { useState } from 'react';
import {
  BarChart3,
  Clapperboard,
  Download,
  FileText,
  FolderOpen,
  Images,
  Layers,
  Mic,
  Music,
  Palette,
  Pause,
  Play,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Subtitles,
  Type,
  UserRound,
  Wand2,
} from 'lucide-react';
import { api, errorMessage } from '../api';
import { PageHead } from '../components/ui';

const tools = [
  { id: 'script', label: 'Script to Video', icon: FileText },
  { id: 'avatar', label: 'AI Avatar', icon: UserRound, tag: 'New' },
  { id: 'scenes', label: 'Scenes', icon: Images },
  { id: 'media', label: 'Media Library', icon: FolderOpen },
  { id: 'subtitle', label: 'Text & Subtitle', icon: Type },
  { id: 'voice', label: 'Voiceover', icon: Mic },
  { id: 'transitions', label: 'Transitions', icon: Shuffle },
  { id: 'brand', label: 'Brand Kit', icon: Palette },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const sceneLabels = ['Scene 01', 'Scene 02', 'Scene 03', 'Scene 04', 'Scene 05'];
const bars = Array.from({ length: 52 }, (_, index) => 5 + ((index * 7) % 24));

export default function VideoStudio() {
  const [activeTool, setActiveTool] = useState('scenes');
  const [scene, setScene] = useState(1);
  const [project, setProject] = useState('AI Product Explainer');
  const [ratio, setRatio] = useState('16:9');
  const [caption, setCaption] = useState('AI is transforming the way we create, connect, and grow.');
  const [voice, setVoice] = useState('Ava (Neutral)');
  const [language, setLanguage] = useState('English (US)');
  const [speed, setSpeed] = useState(1);
  const [mood, setMood] = useState('Neutral');
  const [transition, setTransition] = useState('Fade');
  const [resolution, setResolution] = useState('Full HD (1920x1080)');
  const [fps, setFps] = useState('30 FPS');
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 3500);
  };

  async function exportVideo() {
    setExporting(true);
    setError('');
    try {
      const { data } = await api.post('/video/render', {
        source: 'text',
        text: caption,
        script: caption,
        format: ratio,
      });
      notify(`Render video dikirim ke worker (job ${data.jobId}).`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHead
        title="AI Video Studio"
        subtitle="Create. Edit. Publish."
        actions={
          <>
            <select value={project} onChange={event => setProject(event.target.value)}>
              <option>AI Product Explainer</option>
              <option>Promo Skincare 30s</option>
              <option>Tutorial Series Ep. 1</option>
            </select>
            <select value={ratio} onChange={event => setRatio(event.target.value)}>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="1:1">1:1</option>
            </select>
            <button className="btn ghost" onClick={() => notify('Project disimpan.')}>
              Save
            </button>
            <button className="btn" onClick={exportVideo} disabled={exporting}>
              <Download size={15} />
              {exporting ? 'Exporting...' : 'Export Video'}
            </button>
          </>
        }
      />

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert ok">{message}</div>}

      <div className="studio">
        <aside className="card studio-rail">
          {tools.map(tool => (
            <button
              key={tool.id}
              className={`rail-item${activeTool === tool.id ? ' active' : ''}`}
              onClick={() => {
                setActiveTool(tool.id);
                if (['brand', 'analytics', 'media'].includes(tool.id)) {
                  notify(`${tool.label}: modul segera tersedia.`);
                }
              }}
            >
              <tool.icon size={15} />
              {tool.label}
              {tool.tag && <span className="nav-badge">{tool.tag}</span>}
              {activeTool === tool.id && <span className="rail-dot" />}
            </button>
          ))}

          <div className="plan-card" style={{ marginTop: 14 }}>
            <div className="plan-label">AI Assistant</div>
            <div className="plan-name" style={{ marginBottom: 10 }}>
              Butuh bantuan video?
            </div>
            <button
              className="btn sm"
              style={{ width: '100%' }}
              onClick={() => {
                setActiveTool('script');
                notify('Tulis prompt di panel script untuk mulai.');
              }}
            >
              <Sparkles size={13} /> Ask AI
            </button>
          </div>
        </aside>

        <section className="studio-center">
          <div className="scene-strip">
            {sceneLabels.map((label, index) => (
              <div
                key={label}
                className={`scene-thumb${scene === index ? ' active' : ''}`}
                onClick={() => setScene(index)}
                role="button"
              >
                <i />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="preview">
            <img src="/images/video-preview.png" alt="AI video preview" />
            <div className="preview-caption">{caption}</div>
            <div className="preview-bar">
              <button className="play-btn" onClick={() => setPlaying(!playing)}>
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <SkipBack size={14} />
              <SkipForward size={14} />
              <span>00:15:23 / 01:25:00</span>
              <span className="spacer" />
              <span className="chip neutral">{ratio}</span>
              <span className="chip neutral">CC</span>
              <span className="chip neutral">HD</span>
            </div>
          </div>

          <div className="card timeline">
            <div className="track">
              <div className="track-label">
                <Clapperboard size={12} /> Video
              </div>
              <div className="track-lane">
                <div className="clip violet" style={{ width: '22%' }} />
                <div className="clip violet" style={{ width: '18%' }} />
                <div className="clip violet" style={{ width: '26%' }} />
              </div>
            </div>
            <div className="track">
              <div className="track-label">
                <Subtitles size={12} /> Subtitle
              </div>
              <div className="track-lane">
                <div className="clip" style={{ width: '12%' }} />
                <div className="clip" style={{ width: '14%' }} />
                <div className="clip" style={{ width: '14%' }} />
                <div className="clip" style={{ width: '18%' }} />
                <div className="clip" style={{ width: '12%' }} />
              </div>
            </div>
            <div className="track">
              <div className="track-label">
                <Music size={12} /> Audio
              </div>
              <div className="track-lane">
                <div className="clip cyan wide" />
              </div>
            </div>
            <div className="track">
              <div className="track-label">
                <Layers size={12} /> B-Roll
              </div>
              <div className="track-lane">
                <div className="clip" style={{ width: '16%' }} />
                <div className="clip" style={{ width: '16%' }} />
                <div className="clip" style={{ width: '16%' }} />
                <div className="clip" style={{ width: '16%' }} />
              </div>
            </div>
          </div>
        </section>

        <aside className="studio-side">
          <div className="card side-card">
            <div className="side-title">
              <b>AI Avatar</b>
              <span className="card-link">Edit Avatar</span>
            </div>
            <div className="avatar-card">
              <img className="avatar-photo" src="/images/ai-presenter.png" alt="AI avatar" />
              <div>
                <div className="avatar-name">Ava — AI Presenter</div>
                <div className="avatar-status">
                  <span className="dot" /> Active
                </div>
              </div>
            </div>
            <div className="avatar-actions">
              <button className="btn subtle sm" onClick={() => notify('Ganti avatar: pilih dari media library.')}>
                Change Avatar
              </button>
              <button className="btn subtle sm" onClick={() => notify('Edit look: pengaturan tampilan avatar.')}>
                Edit Look
              </button>
            </div>
            <div className="segmented" style={{ marginTop: 12 }}>
              {['Neutral', 'Happy', 'Serious', 'Excited'].map(item => (
                <button
                  key={item}
                  className={mood === item ? 'active' : ''}
                  onClick={() => setMood(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="card side-card">
            <div className="side-title">
              <b>Voiceover</b>
              <span className="card-link">Edit Voice</span>
            </div>
            <div className="waveform">
              {bars.map((height, index) => (
                <span key={index} style={{ height }} />
              ))}
            </div>
            <div className="side-meta">
              <span>00:00 / 01:25</span>
              <span>{speed.toFixed(1)}x</span>
            </div>
            <div className="form-row" style={{ marginTop: 12, marginBottom: 8 }}>
              <label>Voice</label>
              <select value={voice} onChange={event => setVoice(event.target.value)}>
                <option>Ava (Neutral)</option>
                <option>Raka (Warm)</option>
                <option>Nadia (Energetic)</option>
              </select>
            </div>
            <div className="form-row" style={{ marginBottom: 10 }}>
              <label>Language</label>
              <select value={language} onChange={event => setLanguage(event.target.value)}>
                <option>English (US)</option>
                <option>Bahasa Indonesia</option>
                <option>English (UK)</option>
              </select>
            </div>
            <div className="side-meta" style={{ marginBottom: 4 }}>
              <span>Speed</span>
              <span>{speed.toFixed(1)}x</span>
            </div>
            <input
              className="range"
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={speed}
              onChange={event => setSpeed(Number(event.target.value))}
            />
          </div>

          <div className="card side-card">
            <div className="side-title">
              <b>Scene Settings</b>
              <span className="muted">{sceneLabels[scene]}</span>
            </div>
            <div className="form-row" style={{ marginBottom: 10 }}>
              <label>Resolution</label>
              <select value={resolution} onChange={event => setResolution(event.target.value)}>
                <option>Full HD (1920x1080)</option>
                <option>HD (1280x720)</option>
                <option>4K (3840x2160)</option>
              </select>
            </div>
            <div className="form-row" style={{ marginBottom: 10 }}>
              <label>Frame rate</label>
              <select value={fps} onChange={event => setFps(event.target.value)}>
                <option>30 FPS</option>
                <option>24 FPS</option>
                <option>60 FPS</option>
              </select>
            </div>
            <div className="form-row" style={{ marginBottom: 12 }}>
              <label>Caption / script</label>
              <input value={caption} onChange={event => setCaption(event.target.value)} />
            </div>
            <div className="side-meta" style={{ marginBottom: 6 }}>
              <span>Transitions</span>
              <span>{transition}</span>
            </div>
            <div className="segmented">
              {['None', 'Fade', 'Slide', 'Zoom'].map(item => (
                <button
                  key={item}
                  className={transition === item ? 'active' : ''}
                  onClick={() => setTransition(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="card side-card">
            <div className="side-title">
              <b>Render</b>
              <Wand2 size={14} color="#b9a9ff" />
            </div>
            <div className="muted" style={{ marginBottom: 12 }}>
              Job akan diproses worker BullMQ. Hasil tersimpan otomatis setelah selesai.
            </div>
            <button className="btn" style={{ width: '100%' }} onClick={exportVideo} disabled={exporting}>
              <Download size={14} /> {exporting ? 'Mengirim...' : 'Render video'}
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
