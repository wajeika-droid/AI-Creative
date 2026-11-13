import {
  ChangeEvent,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  BarChart3,
  Check,
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
  Pencil,
  Play,
  Plus,
  RefreshCcw,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Subtitles,
  Trash2,
  Type,
  Upload,
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

const initialScenes = [
  { id: 's1', label: 'Scene 01', duration: 8, mediaId: 'studio' },
  { id: 's2', label: 'Scene 02', duration: 10, mediaId: 'presenter' },
  { id: 's3', label: 'Scene 03', duration: 12, mediaId: 'skincare' },
  { id: 's4', label: 'Scene 04', duration: 8, mediaId: 'workspace' },
  { id: 's5', label: 'Scene 05', duration: 15, mediaId: 'studio' },
];

const mediaItems = [
  { id: 'studio', name: 'Studio Product', kind: 'Video still', src: '/images/video-preview.png' },
  { id: 'presenter', name: 'AI Presenter', kind: 'Image', src: '/images/ai-presenter.png' },
  { id: 'skincare', name: 'Skincare Close-up', kind: 'Image', src: '/images/media-skincare.png' },
  { id: 'workspace', name: 'Creator Workspace', kind: 'Image', src: '/images/media-workspace.png' },
  { id: 'raka', name: 'Avatar Raka', kind: 'Avatar', src: '/images/avatar-raka.png' },
  { id: 'nadia', name: 'Avatar Nadia', kind: 'Avatar', src: '/images/avatar-nadia.png' },
];

const avatarPresets = [
  { name: 'Ava', photo: '/images/ai-presenter.png' },
  { name: 'Raka', photo: '/images/avatar-raka.png' },
  { name: 'Nadia', photo: '/images/avatar-nadia.png' },
];

const lookFilters = ['none', 'saturate(1.08) contrast(1.06)', 'brightness(1.08) saturate(0.92)'];
const looks = ['Natural', 'Cinematic', 'Bright'];
const subtitleSizes: Record<string, number> = { Small: 11, Medium: 12.5, Large: 16 };
const brandFonts = ['Inter', 'Georgia', 'Courier New'];

const defaultScript =
  'Scene 1 — Hook: Perkenalkan masalah yang dialami audiens.\nScene 2 — Solusi: Tunjukkan produk dan manfaat utamanya.\nScene 3 — Bukti: Tampilkan testimoni singkat.\nScene 4 — CTA: Ajak audiens mencoba hari ini.';

const bars = Array.from({ length: 52 }, (_, index) => 5 + ((index * 7) % 24));
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function VideoStudio() {
  const [activeTool, setActiveTool] = useState('script');
  const [scenes, setScenes] = useState(initialScenes);
  const [scene, setScene] = useState(0);
  const [project, setProject] = useState('AI Product Explainer');
  const [ratio, setRatio] = useState('16:9');
  const [caption, setCaption] = useState('AI is transforming the way we create, connect, and grow.');
  const [scriptText, setScriptText] = useState(defaultScript);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [subtitleSize, setSubtitleSize] = useState('Medium');
  const [subtitlePosition, setSubtitlePosition] = useState('Bottom');
  const [voice, setVoice] = useState('Ava (Neutral)');
  const [language, setLanguage] = useState('English (US)');
  const [speed, setSpeed] = useState(1);
  const [mood, setMood] = useState('Neutral');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [avatarLook, setAvatarLook] = useState('Natural');
  const [transition, setTransition] = useState('Fade');
  const [transitionDuration, setTransitionDuration] = useState(0.6);
  const [resolution, setResolution] = useState('Full HD (1920x1080)');
  const [fps, setFps] = useState('30 FPS');
  const [brandName, setBrandName] = useState('Creative Partner');
  const [brandColor, setBrandColor] = useState('#7c5cff');
  const [brandFont, setBrandFont] = useState('Inter');
  const [mediaId, setMediaId] = useState('studio');
  const [previewSrc, setPreviewSrc] = useState('/images/video-preview.png');
  const [uploadedSrc, setUploadedSrc] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [scriptError, setScriptError] = useState('');
  const [scriptLoading, setScriptLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [renders, setRenders] = useState<any[]>([]);

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 3500);
  };

  const loadRenders = () =>
    api
      .get('/video')
      .then(response => setRenders(response.data))
      .catch(() => setRenders([]));

  useEffect(() => {
    loadRenders();
    const saved = localStorage.getItem('cpai_video_draft');
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setProject(draft.project ?? 'AI Product Explainer');
        setRatio(draft.ratio ?? '16:9');
        setCaption(draft.caption ?? '');
        setScriptText(draft.scriptText ?? defaultScript);
        setShowSubtitles(draft.showSubtitles ?? true);
        setSubtitleSize(draft.subtitleSize ?? 'Medium');
        setSubtitlePosition(draft.subtitlePosition ?? 'Bottom');
        setVoice(draft.voice ?? 'Ava (Neutral)');
        setLanguage(draft.language ?? 'English (US)');
        setSpeed(Number(draft.speed ?? 1));
        setMood(draft.mood ?? 'Neutral');
        setAvatarIndex(Number(draft.avatarIndex ?? 0));
        setAvatarLook(draft.avatarLook ?? 'Natural');
        setTransition(draft.transition ?? 'Fade');
        setTransitionDuration(Number(draft.transitionDuration ?? 0.6));
        setResolution(draft.resolution ?? 'Full HD (1920x1080)');
        setFps(draft.fps ?? '30 FPS');
        setBrandName(draft.brandName ?? 'Creative Partner');
        setBrandColor(draft.brandColor ?? '#7c5cff');
        setBrandFont(draft.brandFont ?? 'Inter');
        if (Array.isArray(draft.scenes) && draft.scenes.length) {
          setScenes(
            draft.scenes.map((item: any, index: number) => ({
              id: String(item?.id ?? `s${index + 1}`),
              label: String(item?.label ?? `Scene ${String(index + 1).padStart(2, '0')}`),
              duration: Math.min(120, Math.max(1, Number(item?.duration) || 8)),
              mediaId:
                typeof item?.mediaId === 'string'
                  ? item.mediaId
                  : mediaItems[index % mediaItems.length].id,
            }))
          );
        }
        const media = mediaItems.find(item => item.id === draft.mediaId);
        if (media) {
          setMediaId(media.id);
          setPreviewSrc(media.src);
        }
      } catch {
        localStorage.removeItem('cpai_video_draft');
      }
    }
  }, []);

  const totalSeconds = scenes.reduce((sum, item) => sum + item.duration, 0);
  const durationLabel = `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(
    totalSeconds % 60
  ).padStart(2, '0')}`;
  const sceneStarts: number[] = [];
  let cursor = 0;
  for (const item of scenes) {
    sceneStarts.push(cursor);
    cursor += item.duration;
  }
  const playbackIndex = scenes.findIndex(
    (item, index) => currentTime < sceneStarts[index] + item.duration
  );
  const activeScene = scenes[scene] ?? scenes[0];

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(0.5, (now - last) / 1000);
      last = now;
      setCurrentTime(previous => Math.min(totalSeconds, previous + delta));
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, totalSeconds]);

  useEffect(() => {
    if (playing && currentTime >= totalSeconds) setPlaying(false);
  }, [playing, currentTime, totalSeconds]);

  useEffect(() => {
    if (playing && playbackIndex >= 0 && playbackIndex !== scene) setScene(playbackIndex);
  }, [playing, playbackIndex, scene]);

  useEffect(() => {
    setCurrentTime(previous => Math.min(previous, totalSeconds));
  }, [totalSeconds]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const progressPercent = totalSeconds ? Math.min(100, (currentTime / totalSeconds) * 100) : 0;
  const formatTime = (value: number) => {
    const seconds = Math.max(0, Math.floor(value));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(
      2,
      '0'
    )}`;
  };

  function editRender(item: any) {
    const input = item?.job?.input || {};
    if (['16:9', '9:16', '1:1'].includes(input.format)) setRatio(input.format);
    if (Array.isArray(input.scenes) && input.scenes.length) {
      setScenes(
        input.scenes.map((entry: any, index: number) => ({
          id: `s${index + 1}`,
          label: `Scene ${String(index + 1).padStart(2, '0')}`,
          duration: Math.min(120, Math.max(1, Number(entry?.duration) || 8)),
          mediaId:
            typeof entry?.mediaId === 'string'
              ? entry.mediaId
              : mediaItems[index % mediaItems.length].id,
        }))
      );
      setScene(0);
      setPlaying(false);
      currentTimeRef.current = 0;
      setCurrentTime(0);
    }
    if (typeof input.caption === 'string') setCaption(input.caption);
    setShowSubtitles(input.showSubtitles !== false);
    if (input.subtitleSize) setSubtitleSize(input.subtitleSize);
    if (input.subtitlePosition) setSubtitlePosition(input.subtitlePosition);
    if (input.transition) setTransition(input.transition);
    if (input.brandName) setBrandName(input.brandName);
    if (input.brandColor) setBrandColor(input.brandColor);
    notify('Pengaturan render dimuat ke editor. Sesuaikan lalu render ulang.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteRender(item: any) {
    if (!window.confirm('Hapus render ini? File MP4 ikut dihapus dan tidak bisa dikembalikan.')) {
      return;
    }
    try {
      await api.delete(`/video/${item.id}`);
      notify('Render dihapus.');
      loadRenders();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function saveProject() {
    localStorage.setItem(
      'cpai_video_draft',
      JSON.stringify({
        project,
        ratio,
        caption,
        scriptText,
        showSubtitles,
        subtitleSize,
        subtitlePosition,
        voice,
        language,
        speed,
        mood,
        avatarIndex,
        avatarLook,
        transition,
        transitionDuration,
        resolution,
        fps,
        brandName,
        brandColor,
        brandFont,
        mediaId,
        scenes,
      })
    );
    notify('Draft project disimpan di browser.');
  }

  function sceneMediaSrc(item: { mediaId?: string }) {
    if (item.mediaId === 'upload') return uploadedSrc || previewSrc;
    return mediaItems.find(media => media.id === item.mediaId)?.src ?? previewSrc;
  }

  function selectScene(index: number) {
    setScene(index);
    setCurrentTime(sceneStarts[index] ?? 0);
    setPlaying(false);
  }

  function togglePlay() {
    if (!playing && currentTime >= totalSeconds - 0.05) {
      currentTimeRef.current = 0;
      setCurrentTime(0);
      setScene(0);
    }
    setPlaying(value => !value);
  }

  function seekTo(time: number) {
    const next = Math.min(totalSeconds, Math.max(0, time));
    currentTimeRef.current = next;
    setCurrentTime(next);
    const index = scenes.findIndex(
      (item, position) => next < sceneStarts[position] + item.duration
    );
    setScene(index === -1 ? scenes.length - 1 : index);
  }

  function skip(seconds: number) {
    seekTo(currentTimeRef.current + seconds);
  }

  function handleSeek(event: ReactMouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    seekTo(((event.clientX - rect.left) / rect.width) * totalSeconds);
  }

  function applyMedia(id: string, src: string) {
    setMediaId(id);
    setPreviewSrc(src);
    setScenes(scenes.map((item, index) => (index === scene ? { ...item, mediaId: id } : item)));
    notify(`Media diterapkan ke ${scenes[scene]?.label ?? 'scene'}.`);
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return;
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setUploadedSrc(dataUrl);
        setUploadName(file.name);
        setMediaId('upload');
        setPreviewSrc(dataUrl);
        setScenes(
          scenes.map((item, index) => (index === scene ? { ...item, mediaId: 'upload' } : item))
        );
        notify(`Media ${file.name} diunggah ke ${scenes[scene]?.label ?? 'scene'}.`);
      };
      image.src = result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  function addScene() {
    if (scenes.length >= 8) {
      notify('Maksimal 8 scene per project.');
      return;
    }
    const next = {
      id: `s${Date.now()}`,
      label: `Scene ${String(scenes.length + 1).padStart(2, '0')}`,
      duration: 8,
      mediaId: mediaItems[scenes.length % mediaItems.length].id,
    };
    setScenes([...scenes, next]);
    setScene(scenes.length);
    notify(`${next.label} ditambahkan.`);
  }

  function removeScene(index: number) {
    if (scenes.length <= 1) {
      notify('Project minimal memiliki satu scene.');
      return;
    }
    const next = scenes.filter((_, itemIndex) => itemIndex !== index);
    setScenes(next);
    setScene(Math.min(index, next.length - 1));
    notify('Scene dihapus.');
  }

  function updateSceneDuration(value: number) {
    const duration = Math.min(120, Math.max(1, value || 1));
    setScenes(scenes.map((item, index) => (index === scene ? { ...item, duration } : item)));
  }

  function applyScriptToCaption() {
    if (!scriptText.trim()) {
      setScriptError('Script masih kosong.');
      return;
    }
    setCaption(scriptText.trim());
    setScriptError('');
    notify('Script diterapkan ke subtitle dan siap dirender.');
  }

  async function generateScript() {
    setScriptLoading(true);
    setScriptError('');
    try {
      const { data } = await api.post('/content/generate', {
        niche: project,
        audience: 'Target audience campaign',
        platform: 'Instagram',
        language: 'Indonesia',
        tone: 'Friendly',
        duration: 30,
        type: 'script',
      });
      for (let attempt = 0; attempt < 30; attempt++) {
        await sleep(1500);
        const { data: job } = await api.get(`/content/jobs/${data.jobId}`);
        if (job.status === 'success') {
          const output: any = job.output;
          const result = typeof output?.result === 'string' ? output.result : JSON.stringify(output ?? {});
          setScriptText(result);
          notify('Script AI siap. Terapkan ke subtitle untuk digunakan.');
          return;
        }
        if (job.status === 'failed') {
          setScriptError('Generate script gagal diproses worker.');
          return;
        }
      }
      setScriptError('Generate script melewati batas waktu. Coba lagi.');
    } catch (err) {
      setScriptError(errorMessage(err));
    } finally {
      setScriptLoading(false);
    }
  }

  async function exportVideo() {
    const text = caption.trim() || scriptText.trim();
    if (!text) {
      setError('Caption atau script tidak boleh kosong.');
      return;
    }
    setExporting(true);
    setPlaying(false);
    setError('');
    try {
      const { data } = await api.post('/video/render', {
        source: 'text',
        text,
        script: text,
        format: ratio,
        scenes: scenes.map(item => ({
          mediaId: item.mediaId ?? 'studio',
          duration: item.duration,
          ...(item.mediaId === 'upload' && uploadedSrc ? { dataUrl: uploadedSrc } : {}),
        })),
        caption,
        showSubtitles,
        subtitleSize,
        subtitlePosition,
        transition,
        transitionDuration,
        brandName,
        brandColor,
        brandFont,
        resolution,
        fps,
      });
      notify(`Render video dikirim ke worker (job ${data.jobId}). Proses 30-180 detik.`);

      let finished = false;
      for (let attempt = 0; attempt < 180; attempt++) {
        await sleep(2000);
        const { data: job } = await api.get(`/video/jobs/${data.jobId}`);
        if (job.status === 'success') {
          notify('Render selesai. Video siap diputar di daftar render terbaru.');
          finished = true;
          break;
        }
        if (job.status === 'failed') {
          setError('Render video gagal diproses. Coba lagi.');
          finished = true;
          break;
        }
      }
      if (!finished) notify('Render masih diproses di worker. Cek daftar render beberapa saat lagi.');
      loadRenders();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  const successfulRenders = renders.filter(item => item.job?.status === 'success').length;
  const failedRenders = renders.filter(item => item.job?.status === 'failed').length;
  const formats: Record<string, number> = {};
  for (const item of renders) {
    const key = item.job?.input?.format || 'unknown';
    formats[key] = (formats[key] ?? 0) + 1;
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
            <button className="btn ghost" onClick={saveProject}>
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
              onClick={() => setActiveTool(tool.id)}
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
            {scenes.map((item, index) => (
              <div
                key={item.id}
                className={`scene-thumb${scene === index ? ' active' : ''}`}
                onClick={() => selectScene(index)}
                role="button"
              >
                <i
                  style={{
                    backgroundImage: `url(${sceneMediaSrc(item)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <span>
                  {item.label} · {item.duration}s
                </span>
              </div>
            ))}
          </div>

          <div className="preview" style={{ aspectRatio: ratio.replace(':', ' / ') }}>
            <div
              key={activeScene.id}
              className={`scene-stage t-${transition.toLowerCase()}${playing ? ' playing' : ''}`}
            >
              <img
                className="scene-media"
                src={sceneMediaSrc(activeScene)}
                alt={`Preview ${activeScene.label}`}
                style={{ animationDuration: `${Math.max(2, activeScene.duration)}s` }}
              />
            </div>
            {brandName && (
              <div className="preview-brand" style={{ color: brandColor, fontFamily: brandFont }}>
                {brandName}
              </div>
            )}
            {showSubtitles && caption && (
              <div
                className={`preview-caption ${subtitlePosition.toLowerCase()}`}
                style={{
                  color: brandColor,
                  fontFamily: brandFont,
                  fontSize: subtitleSizes[subtitleSize],
                }}
              >
                {caption}
              </div>
            )}
            <div className="preview-progress" onClick={handleSeek} title="Seek timeline">
              <i style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="preview-bar">
              <button
                className="play-btn"
                onClick={togglePlay}
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button
                className="bar-icon"
                onClick={() => skip(-5)}
                aria-label="Mundur 5 detik"
              >
                <SkipBack size={14} />
              </button>
              <button
                className="bar-icon"
                onClick={() => skip(5)}
                aria-label="Maju 5 detik"
              >
                <SkipForward size={14} />
              </button>
              <span>
                {formatTime(currentTime)} / {durationLabel}
              </span>
              <span className="spacer" />
              <span className="chip neutral">
                {activeScene.label} · {playing ? 'Playing' : 'Paused'}
              </span>
              <span className="chip neutral">{ratio}</span>
              <span className="chip neutral">{showSubtitles ? 'CC' : 'CC off'}</span>
              <span className="chip neutral">HD</span>
            </div>
          </div>

          <div className="card timeline">
            <div className="track">
              <div className="track-label">
                <Clapperboard size={12} /> Video
              </div>
              <div className="track-lane">
                {scenes.map((item, index) => (
                  <div
                    key={item.id}
                    className={`clip violet${scene === index ? ' selected' : ''}`}
                    style={{ flexGrow: item.duration, width: 0 }}
                    title={`${item.label} · ${item.duration}s`}
                    onClick={() => selectScene(index)}
                  />
                ))}
              </div>
            </div>
            <div className="track">
              <div className="track-label">
                <Subtitles size={12} /> Subtitle
              </div>
              <div className="track-lane">
                {showSubtitles &&
                  scenes.map(item => (
                    <div
                      key={item.id}
                      className="clip"
                      style={{ flexGrow: item.duration, width: 0 }}
                    />
                  ))}
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
          {activeTool === 'script' && (
            <div className="card side-card">
              <div className="side-title">
                <b>Script to Video</b>
                <span className="muted">{scriptText.length} karakter</span>
              </div>
              <textarea
                className="script-area"
                rows={9}
                value={scriptText}
                onChange={event => setScriptText(event.target.value)}
                placeholder="Tulis script video per scene..."
              />
              {scriptError && (
                <div className="muted" style={{ color: 'var(--red)', fontSize: 11, marginBottom: 8 }}>
                  {scriptError}
                </div>
              )}
              <div className="side-meta" style={{ marginBottom: 10 }}>
                <span>{scenes.length} scene</span>
                <span>{durationLabel} total</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn subtle sm" style={{ flex: 1 }} onClick={applyScriptToCaption}>
                  Pakai sebagai subtitle
                </button>
                <button
                  className="btn sm"
                  style={{ flex: 1 }}
                  onClick={generateScript}
                  disabled={scriptLoading}
                >
                  <Sparkles size={13} /> {scriptLoading ? 'Menyusun...' : 'Generate AI'}
                </button>
              </div>
            </div>
          )}

          {activeTool === 'avatar' && (
            <div className="card side-card">
              <div className="side-title">
                <b>AI Avatar</b>
                <span className="card-link">{avatarLook}</span>
              </div>
              <div className="avatar-card">
                <img
                  className="avatar-photo"
                  src={avatarPresets[avatarIndex]?.photo}
                  alt="AI avatar"
                  style={{ filter: lookFilters[looks.indexOf(avatarLook)] }}
                />
                <div>
                  <div className="avatar-name">{avatarPresets[avatarIndex]?.name} — AI Presenter</div>
                  <div className="avatar-status">
                    <span className="dot" /> Active
                  </div>
                </div>
              </div>
              <div className="avatar-actions">
                <button
                  className="btn subtle sm"
                  onClick={() => {
                    const next = (avatarIndex + 1) % avatarPresets.length;
                    setAvatarIndex(next);
                    notify(`Avatar diganti ke ${avatarPresets[next].name}.`);
                  }}
                >
                  Change Avatar
                </button>
                <button
                  className="btn subtle sm"
                  onClick={() => {
                    const next = (looks.indexOf(avatarLook) + 1) % looks.length;
                    setAvatarLook(looks[next]);
                    notify(`Look avatar: ${looks[next]}.`);
                  }}
                >
                  Edit Look
                </button>
              </div>
              <div className="side-meta" style={{ margin: '12px 0 6px' }}>
                <span>Ekspresi</span>
                <span>{mood}</span>
              </div>
              <div className="segmented">
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
          )}

          {activeTool === 'scenes' && (
            <>
              <div className="card side-card">
                <div className="side-title">
                  <b>Scenes</b>
                  <span className="muted">{scenes.length} / 8</span>
                </div>
                {scenes.map((item, index) => (
                  <div key={item.id} className={`scene-row${scene === index ? ' active' : ''}`}>
                    <button className="scene-pick" onClick={() => setScene(index)}>
                      {item.label}
                      <small>{item.duration}s</small>
                    </button>
                    <button
                      className="icon-btn"
                      title={`Hapus ${item.label}`}
                      onClick={() => removeScene(index)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button className="btn subtle sm" style={{ width: '100%' }} onClick={addScene}>
                  <Plus size={13} /> Tambah scene
                </button>
              </div>

              <div className="card side-card">
                <div className="side-title">
                  <b>Scene Settings</b>
                  <span className="muted">{activeScene?.label}</span>
                </div>
                <div className="form-row" style={{ marginBottom: 10 }}>
                  <label>Durasi (detik)</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={activeScene?.duration ?? 8}
                    onChange={event => updateSceneDuration(Number(event.target.value))}
                  />
                </div>
                <div className="form-row" style={{ marginBottom: 10 }}>
                  <label>Resolution</label>
                  <select value={resolution} onChange={event => setResolution(event.target.value)}>
                    <option>Full HD (1920x1080)</option>
                    <option>HD (1280x720)</option>
                    <option>4K (3840x2160)</option>
                  </select>
                </div>
                <div className="form-row" style={{ marginBottom: 12 }}>
                  <label>Frame rate</label>
                  <select value={fps} onChange={event => setFps(event.target.value)}>
                    <option>30 FPS</option>
                    <option>24 FPS</option>
                    <option>60 FPS</option>
                  </select>
                </div>
                <div className="form-row" style={{ marginBottom: 4 }}>
                  <label>Caption / script</label>
                  <input value={caption} onChange={event => setCaption(event.target.value)} />
                </div>
                <div className="side-meta">
                  <span>Total durasi</span>
                  <span>{durationLabel}</span>
                </div>
              </div>
            </>
          )}

          {activeTool === 'media' && (
            <div className="card side-card">
              <div className="side-title">
                <b>Media Library</b>
                <span className="muted">{mediaItems.length + (uploadedSrc ? 1 : 0)} aset</span>
              </div>
              <div className="media-grid">
                {mediaItems.map(item => (
                  <button
                    key={item.id}
                    className={`media-item${mediaId === item.id ? ' active' : ''}`}
                    onClick={() => applyMedia(item.id, item.src)}
                  >
                    <img className="media-thumb" src={item.src} alt={item.name} />
                    {item.name}
                    <small>{item.kind}</small>
                    {mediaId === item.id && <Check size={12} className="media-check" />}
                  </button>
                ))}
                {uploadedSrc && (
                  <button
                    className={`media-item${mediaId === 'upload' ? ' active' : ''}`}
                    onClick={() => applyMedia('upload', uploadedSrc)}
                  >
                    <img className="media-thumb" src={uploadedSrc} alt={uploadName} />
                    {uploadName}
                    <small>Upload</small>
                  </button>
                )}
              </div>
              <label className="btn subtle sm upload-btn">
                <Upload size={13} /> Upload media
                <input type="file" accept="image/*" onChange={handleUpload} hidden />
              </label>
            </div>
          )}

          {activeTool === 'subtitle' && (
            <div className="card side-card">
              <div className="side-title">
                <b>Text &amp; Subtitle</b>
                <span className="muted">{subtitleSizes[subtitleSize]}pt</span>
              </div>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <label>Teks subtitle</label>
                <textarea
                  className="script-area"
                  rows={4}
                  value={caption}
                  onChange={event => setCaption(event.target.value)}
                />
              </div>
              <div className="side-meta" style={{ marginBottom: 6 }}>
                <span>Tampilkan</span>
                <span>{showSubtitles ? 'Aktif' : 'Nonaktif'}</span>
              </div>
              <div className="segmented" style={{ marginBottom: 12 }}>
                <button
                  className={showSubtitles ? 'active' : ''}
                  onClick={() => setShowSubtitles(true)}
                >
                  Tampil
                </button>
                <button
                  className={!showSubtitles ? 'active' : ''}
                  onClick={() => setShowSubtitles(false)}
                >
                  Sembunyi
                </button>
              </div>
              <div className="side-meta" style={{ marginBottom: 6 }}>
                <span>Ukuran</span>
                <span>{subtitleSize}</span>
              </div>
              <div className="segmented" style={{ marginBottom: 12 }}>
                {['Small', 'Medium', 'Large'].map(item => (
                  <button
                    key={item}
                    className={subtitleSize === item ? 'active' : ''}
                    onClick={() => setSubtitleSize(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="side-meta" style={{ marginBottom: 6 }}>
                <span>Posisi</span>
                <span>{subtitlePosition}</span>
              </div>
              <div className="segmented">
                {['Bottom', 'Top'].map(item => (
                  <button
                    key={item}
                    className={subtitlePosition === item ? 'active' : ''}
                    onClick={() => setSubtitlePosition(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTool === 'voice' && (
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
                <span>00:00 / {durationLabel}</span>
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
          )}

          {activeTool === 'transitions' && (
            <div className="card side-card">
              <div className="side-title">
                <b>Transitions</b>
                <span className="muted">{transition}</span>
              </div>
              <div className="segmented" style={{ marginBottom: 14 }}>
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
              <div className="side-meta" style={{ marginBottom: 4 }}>
                <span>Durasi transisi</span>
                <span>{transitionDuration.toFixed(1)}s</span>
              </div>
              <input
                className="range"
                type="range"
                min={0.2}
                max={2}
                step={0.1}
                value={transitionDuration}
                onChange={event => setTransitionDuration(Number(event.target.value))}
              />
              <div className="muted" style={{ marginTop: 10, fontSize: 11 }}>
                Transisi diterapkan di antara {scenes.length} scene saat render.
              </div>
            </div>
          )}

          {activeTool === 'brand' && (
            <div className="card side-card">
              <div className="side-title">
                <b>Brand Kit</b>
                <span className="muted">{brandFont}</span>
              </div>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <label>Nama brand</label>
                <input value={brandName} onChange={event => setBrandName(event.target.value)} />
              </div>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <label>Warna utama</label>
                <div className="brand-color-row">
                  <input
                    className="brand-color"
                    type="color"
                    value={brandColor}
                    onChange={event => setBrandColor(event.target.value)}
                  />
                  <input value={brandColor} onChange={event => setBrandColor(event.target.value)} />
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <label>Font</label>
                <select value={brandFont} onChange={event => setBrandFont(event.target.value)}>
                  {brandFonts.map(item => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div
                className="brand-preview"
                style={{ borderColor: brandColor, color: brandColor, fontFamily: brandFont }}
              >
                {brandName || 'Nama brand'}
              </div>
            </div>
          )}

          {activeTool === 'analytics' && (
            <div className="card side-card">
              <div className="side-title">
                <b>Analytics</b>
                <span className="muted">{renders.length} render</span>
              </div>
              <div className="mini-stats">
                <div className="mini-stat">
                  <b>{successfulRenders}</b>
                  <span>Sukses</span>
                </div>
                <div className="mini-stat">
                  <b>{failedRenders}</b>
                  <span>Gagal</span>
                </div>
                <div className="mini-stat">
                  <b>{totalSeconds}s</b>
                  <span>Durasi</span>
                </div>
              </div>
              <div className="side-meta" style={{ marginBottom: 8 }}>
                <span>Format render</span>
                <span>{Object.keys(formats).length || 0} tipe</span>
              </div>
              <div className="format-chips">
                {Object.entries(formats).map(([format, count]) => (
                  <span key={format} className="chip neutral">
                    {format} · {count}
                  </span>
                ))}
                {renders.length === 0 && <span className="muted">Belum ada data render.</span>}
              </div>
            </div>
          )}

          <div className="card side-card">
            <div className="side-title">
              <b>Render</b>
              <Wand2 size={14} color="#b9a9ff" />
            </div>
            <div className="muted" style={{ marginBottom: 12 }}>
              Worker merender MP4 asli (scene, transisi, caption, brand) dalam 30-180 detik. Hasil tersimpan otomatis.
            </div>
            <button className="btn" style={{ width: '100%' }} onClick={exportVideo} disabled={exporting}>
              <Download size={14} /> {exporting ? 'Mengirim...' : 'Render video'}
            </button>
          </div>
        </aside>
      </div>

      <div className="card card-pad-lg" style={{ marginTop: 16 }}>
        <div className="card-head">
          <div className="card-title">Render terbaru</div>
          <button className="btn ghost sm" onClick={loadRenders}>
            <RefreshCcw size={13} /> Refresh
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Format</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Dibuat</th>
              <th>Hasil</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {renders.map(item => (
              <tr key={item.id}>
                <td>{item.job?.input?.format || '-'}</td>
                <td>{item.job?.provider?.name || '-'}</td>
                <td>
                  <span className={`badge ${item.job?.status === 'success' ? 'ok' : item.job?.status === 'failed' ? 'failed' : 'pending'}`}>
                    {item.job?.status || 'success'}
                  </span>
                </td>
                <td>{new Date(item.createdAt).toLocaleString('id-ID')}</td>
                <td>
                  {item.url ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <video
                        src={`${item.url}#t=0.1`}
                        controls
                        preload="metadata"
                        style={{ height: 56, borderRadius: 6, background: '#05070c' }}
                      />
                      <a
                        href={`/api/v1/video/watch/${item.jobId}.mp4`}
                        target="_blank"
                        rel="noreferrer"
                        className="card-link"
                      >
                        Buka
                      </a>
                    </div>
                  ) : (
                    <span className="muted">belum tersedia</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn subtle sm"
                      title="Edit pengaturan render"
                      onClick={() => editRender(item)}
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      className="btn ghost sm"
                      title="Hapus render"
                      style={{ color: '#ff7b8a' }}
                      onClick={() => deleteRender(item)}
                    >
                      <Trash2 size={12} /> Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {renders.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: '18px 8px' }}>
                  Belum ada render. Klik Export Video untuk mencoba.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
