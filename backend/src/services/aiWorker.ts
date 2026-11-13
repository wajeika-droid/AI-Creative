import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../lib/prisma';
import { muxAudio, resolveMusicStyle, fitTempo } from './audioTrack';
import { probeDuration, resolveVoice, shiftSubtitles, synthesizeSpeech } from './tts';

const connection = new IORedis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: null,
});

const execFileAsync = promisify(execFile);
const STORAGE_DIR = process.env.VIDEO_STORAGE_DIR || '/app/storage';
const FONT_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const builtinAssets: Record<string, string> = {
  studio: '/app/public/images/video-preview.png',
  presenter: '/app/public/images/ai-presenter.png',
  skincare: '/app/public/images/media-skincare.png',
  workspace: '/app/public/images/media-workspace.png',
  raka: '/app/public/images/avatar-raka.png',
  nadia: '/app/public/images/avatar-nadia.png',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function plainText(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function renderVideoFile(jobId: string, input: any) {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  const outPath = path.join(STORAGE_DIR, `${jobId}.mp4`);
  await fs.rm(outPath, { force: true });
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cpai-render-'));

  try {
    const rawScenes: any[] =
      Array.isArray(input?.scenes) && input.scenes.length
        ? input.scenes
        : [{ mediaId: 'studio', duration: clamp(Number(input?.duration) || 8, 1, 120) }];

    const scenes = rawScenes.slice(0, 8).map(scene => ({
      mediaId: typeof scene?.mediaId === 'string' ? scene.mediaId : 'studio',
      duration: clamp(Number(scene?.duration) || 8, 1, 120),
      dataUrl: typeof scene?.dataUrl === 'string' ? scene.dataUrl : undefined,
    }));

    const files: string[] = [];
    for (let index = 0; index < scenes.length; index++) {
      const scene = scenes[index];
      let file = builtinAssets[scene.mediaId];
      if (!file && scene.dataUrl?.startsWith('data:image/')) {
        const base64 = scene.dataUrl.slice(scene.dataUrl.indexOf(',') + 1);
        if (base64) {
          file = path.join(tmpDir, `scene-${index}.png`);
          await fs.writeFile(file, Buffer.from(base64, 'base64'));
        }
      }
      files.push(file && existsSync(file) ? file : builtinAssets.studio);
    }

    const format = String(input?.format || '16:9');
    const [width, height] =
      format === '9:16' ? [540, 960] : format === '1:1' ? [720, 720] : [960, 540];
    const fps = 20;
    const durations = scenes.map(scene => scene.duration);
    const total = durations.reduce((sum, value) => sum + value, 0);
    const requestedTransition = ['Fade', 'Slide', 'Zoom'].includes(String(input?.transition))
      ? String(input.transition)
      : 'None';
    const fadeDuration =
      requestedTransition === 'None' || files.length < 2
        ? 0
        : Math.min(0.4, Math.min(...durations) / 4);

    const caption = plainText(input?.caption || input?.text || input?.script).slice(0, 260);
    const voiceEnabled = input?.voiceEnabled !== false;
    const voiceText = plainText(input?.voiceScript || caption || input?.script || input?.text).slice(
      0,
      1200
    );
    // Start TTS while scenes encode; the worker waits for it only before muxing audio.
    const speechPromise =
      voiceEnabled && voiceText
        ? synthesizeSpeech({
            text: voiceText,
            voice: input?.voice,
            language: input?.language,
            speed: input?.speed,
            mood: input?.mood,
          }).catch(error => {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`TTS gagal, render tanpa voiceover: ${message}`);
            return null;
          })
        : Promise.resolve(null);

    // Auto subtitles reuse the TTS word timing. When they will be burned, the
    // static caption must be skipped so the two texts do not overlap.
    const wantsAutoSubtitles =
      voiceEnabled &&
      input?.autoSubtitles !== false &&
      input?.showSubtitles !== false &&
      !!voiceText;
    const earlySpeech = wantsAutoSubtitles ? await speechPromise : null;
    const autoSubtitles = !!earlySpeech?.subtitleFile;
    const showCaption = !autoSubtitles && input?.showSubtitles !== false && caption.length > 0;
    const captionSize = input?.subtitleSize === 'Large' ? 34 : input?.subtitleSize === 'Small' ? 22 : 27;
    const brand = plainText(input?.brandName).slice(0, 40);
    const brandColor = /^#[0-9a-f]{6}$/i.test(String(input?.brandColor || ''))
      ? String(input.brandColor).replace('#', '0x')
      : '0x7c5cff';

    let captionFile = '';
    if (showCaption) {
      captionFile = path.join(tmpDir, 'caption.txt');
      await fs.writeFile(captionFile, caption);
    }

    let brandFile = '';
    if (brand) {
      brandFile = path.join(tmpDir, 'brand.txt');
      await fs.writeFile(brandFile, brand);
    }

    const musicStyle =
      input?.musicStyle === undefined ? 'Soft Ambient' : resolveMusicStyle(input.musicStyle);
    const musicVolume = clamp(Number(input?.musicVolume ?? 0.3), 0, 1);

    const textFilters: string[] = [];
    if (showCaption) {
      const position = input?.subtitlePosition === 'Top' ? '48' : 'h-text_h-84';
      textFilters.push(
        `drawtext=fontfile=${FONT_PATH}:textfile=${captionFile}:fontsize=${captionSize}:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=12:x=(w-text_w)/2:y=${position}:line_spacing=8`
      );
    }
    if (brand) {
      textFilters.push(
        `drawtext=fontfile=${FONT_PATH}:textfile=${brandFile}:fontsize=24:fontcolor=${brandColor}:box=1:boxcolor=black@0.45:boxborderw=10:x=w-text_w-32:y=32`
      );
    }

    const concatList = path.join(tmpDir, 'concat.txt');
    const concatEntries: string[] = [];
    const ffmpegOptions = { timeout: 180000, maxBuffer: 16 * 1024 * 1024 };

    // Caption/brand are baked into one still per scene, then the still is looped
    // in memory. Re-running drawtext per frame made renders ~4x slower.
    for (let index = 0; index < files.length; index++) {
      const still = path.join(tmpDir, `still-${index}.jpg`);
      await execFileAsync(
        'ffmpeg',
        [
          '-loglevel',
          'error',
          '-i',
          files[index],
          '-vf',
          [
            `scale=${width}:${height}:force_original_aspect_ratio=increase`,
            `crop=${width}:${height}`,
            ...textFilters,
          ].join(','),
          '-frames:v',
          '1',
          '-q:v',
          '2',
          '-y',
          still,
        ],
        ffmpegOptions
      );

      const duration = durations[index];
      const filters = [
        `loop=loop=${Math.max(1, Math.round(duration * fps) - 1)}:size=1:start=0`,
        `setpts=N/(${fps}*TB)`,
        `fps=${fps}`,
        'format=yuv420p',
      ];
      if (fadeDuration > 0) {
        filters.push(
          `fade=t=in:st=0:d=${fadeDuration.toFixed(2)}`,
          `fade=t=out:st=${(duration - fadeDuration).toFixed(2)}:d=${fadeDuration.toFixed(2)}`
        );
      }
      const scenePath = path.join(tmpDir, `scene-${index}.mp4`);
      await execFileAsync(
        'ffmpeg',
        [
          '-loglevel',
          'error',
          '-i',
          still,
          '-vf',
          filters.join(','),
          '-t',
          String(duration),
          '-c:v',
          'libx264',
          '-preset',
          'ultrafast',
          '-crf',
          '28',
          '-pix_fmt',
          'yuv420p',
          '-r',
          String(fps),
          '-threads',
          '2',
          '-an',
          '-y',
          scenePath,
        ],
        ffmpegOptions
      );
      concatEntries.push(`file '${scenePath.replace(/'/g, "'\\''")}'`);
    }

    await fs.writeFile(concatList, concatEntries.join('\n'));
    const silentVideo = path.join(tmpDir, 'silent.mp4');
    await execFileAsync(
      'ffmpeg',
      ['-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', '-an', '-y', silentVideo],
      ffmpegOptions
    );

    const speech = earlySpeech ?? (await speechPromise);
    const voiceDuration = speech ? await probeDuration(speech.file) : 0;
    const tempo = speech ? fitTempo(voiceDuration, total) : 1;
    let videoForMux = silentVideo;
    let subtitleUrl: string | null = null;
    let cueCount = 0;

    if (autoSubtitles && speech?.subtitleFile) {
      try {
        const rawSrt = await fs.readFile(speech.subtitleFile, 'utf8');
        const adjusted = shiftSubtitles(rawSrt, tempo, 0.25, total);
        cueCount = (adjusted.match(/-->/g) || []).length;
        if (cueCount > 0) {
          const srtPath = path.join(tmpDir, 'subtitles.srt');
          await fs.writeFile(srtPath, adjusted);
          const subFontSize =
            input?.subtitleSize === 'Large' ? 22 : input?.subtitleSize === 'Small' ? 14 : 18;
          const captioned = path.join(tmpDir, 'captioned.mp4');
          await execFileAsync(
            'ffmpeg',
            [
              '-loglevel', 'error',
              '-i', silentVideo,
              '-vf',
              `subtitles=${srtPath.replace(/\\/g, '/').replace(/:/g, '\\:')}:force_style='FontName=DejaVu Sans,FontSize=${subFontSize},PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BorderStyle=3,Outline=1,Shadow=0,Alignment=2,MarginV=26'`,
              '-c:v', 'libx264',
              '-preset', 'ultrafast',
              '-crf', '26',
              '-pix_fmt', 'yuv420p',
              '-an',
              '-y', captioned,
            ],
            ffmpegOptions
          );
          videoForMux = captioned;
          await fs.writeFile(path.join(STORAGE_DIR, `${jobId}.srt`), adjusted);
          subtitleUrl = `/api/v1/video/subtitles/${jobId}.srt`;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Subtitle otomatis gagal, render tanpa subtitle: ${message}`);
      }
    }

    await muxAudio({
      silentVideo: videoForMux,
      outPath,
      duration: total,
      voiceFile: speech?.file,
      voiceDuration,
      musicStyle,
      musicVolume,
    });

    const stat = await fs.stat(outPath);
    if (!stat.size) throw new Error('Hasil render kosong');

    return {
      mock: false,
      type: 'video_render',
      url: `/api/v1/video/files/${jobId}.mp4`,
      size: stat.size,
      duration: total,
      width,
      height,
      fps,
      scenes: files.length,
      audio: {
        voiceover: speech
          ? {
              enabled: true,
              voice: resolveVoice(input?.voice, input?.language),
              duration: Number(voiceDuration.toFixed(2)),
            }
          : { enabled: false },
        music: { style: musicStyle, volume: musicVolume },
      },
      subtitles: subtitleUrl
        ? { url: subtitleUrl, cues: cueCount, source: 'auto' }
        : { url: null, cues: 0, source: 'none' },
      generatedAt: new Date().toISOString(),
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function estimateTokens(input: unknown, output: unknown) {
  const raw = `${JSON.stringify(input ?? {})}${JSON.stringify(output ?? {})}`;
  return Math.max(1, Math.ceil(raw.length / 4));
}

async function callProvider(endpoint: string, apiKey: string | undefined, body: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Provider responded with ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function processJob(data: any) {
  const { jobId, userId, providerId, type, input } = data;
  const existing = await prisma.aIJob.findUnique({ where: { id: jobId } });
  if (!existing) throw new Error(`Job ${jobId} tidak ditemukan`);
  if (existing.status === 'success') return existing.output;

  const provider = await prisma.aIProvider.findUniqueOrThrow({ where: { id: providerId } });
  const config = (provider.config || {}) as any;

  await prisma.aIJob.update({ where: { id: jobId }, data: { status: 'running' } });

  let output: any;
  if (config.endpoint) {
    output = await callProvider(config.endpoint, config.apiKey, { type, input });
  } else if (type.includes('video')) {
    output = await renderVideoFile(jobId, input);
  } else {
    const niche = (input as any)?.niche || 'topik Anda';
    const format = (input as any)?.type || 'konten';
    output = {
      mock: true,
      type,
      result: `[Mock] ${format} untuk niche ${niche}: ide konten siap dikembangkan bersama tim kreatif.`,
      echoedInput: input,
      generatedAt: new Date().toISOString(),
    };
  }

  await prisma.$transaction(async tx => {
    if (type.includes('video')) {
      await tx.generatedVideo.upsert({
        where: { jobId },
        update: { url: output.url ?? null, metadata: output },
        create: { userId, jobId, url: output.url ?? null, metadata: output },
      });
    } else {
      await tx.generatedContent.upsert({
        where: { jobId },
        update: { content: output },
        create: { userId, jobId, content: output },
      });
    }
    await tx.tokenUsage.upsert({
      where: { jobId },
      update: {},
      create: { userId, jobId, usedTokens: estimateTokens(input, output) },
    });
    await tx.aIJob.update({ where: { id: jobId }, data: { status: 'success', output } });
  });

  return output;
}

export const aiWorker = new Worker(
  'ai-jobs',
  async job => {
    try {
      return await processJob(job.data);
    } catch (err) {
      const attempts = job.opts.attempts ?? 1;
      if (job.attemptsMade + 1 >= attempts) {
        await prisma.aIJob
          .updateMany({
            where: { id: job.data.jobId, status: { not: 'success' } },
            data: { status: 'failed' },
          })
          .catch(() => undefined);
        const automationId = (job.data.input as any)?.automationId;
        if (automationId) {
          const automation = await prisma.automation
            .findUnique({
              where: { id: automationId },
              select: { userId: true, name: true },
            })
            .catch(() => null);
          if (automation) {
            await prisma.notification
              .create({
                data: {
                  userId: automation.userId,
                  title: 'Render otomasi gagal',
                  body: `"${automation.name}" gagal dirender. Periksa AI Video Studio untuk detailnya.`,
                },
              })
              .catch(() => undefined);
          }
        }
      }
      throw err;
    }
  },
  { connection, concurrency: 2, lockDuration: 360000 }
);

aiWorker.on('completed', job => console.log(`Job ${job.id} selesai`));
aiWorker.on('failed', (job, err) => console.error(`Job ${job?.id} gagal: ${err.message}`));
