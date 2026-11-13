import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const STORAGE_DIR = process.env.VIDEO_STORAGE_DIR || '/app/storage';
const TTS_BIN = process.env.EDGE_TTS_BIN || '/opt/tts/bin/edge-tts';
const CACHE_DIR = path.join(STORAGE_DIR, 'tts');

type SpeechOptions = {
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
  mood?: string;
};

const voiceMap: Record<string, Record<string, string>> = {
  'Bahasa Indonesia': {
    ava: 'id-ID-GadisNeural',
    nadia: 'id-ID-GadisNeural',
    raka: 'id-ID-ArdiNeural',
  },
  'English (US)': {
    ava: 'en-US-AriaNeural',
    nadia: 'en-US-JennyNeural',
    raka: 'en-US-GuyNeural',
  },
  'English (UK)': {
    ava: 'en-GB-SoniaNeural',
    nadia: 'en-GB-LibbyNeural',
    raka: 'en-GB-RyanNeural',
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function voiceKey(value: unknown) {
  const name = String(value ?? 'Ava').trim().split(/[\s(]/)[0].toLowerCase();
  return ['ava', 'nadia', 'raka'].includes(name) ? name : 'ava';
}

export function resolveVoice(voice: unknown, language: unknown) {
  const languageKey = typeof language === 'string' && voiceMap[language] ? language : 'Bahasa Indonesia';
  return voiceMap[languageKey][voiceKey(voice)];
}

export function voiceRate(speed: unknown) {
  const value = clamp(Number.isFinite(Number(speed)) ? Number(speed) : 1, 0.5, 2);
  const percent = Math.round((value - 1) * 100);
  return `${percent >= 0 ? '+' : ''}${percent}%`;
}

export function voicePitch(mood: unknown) {
  const map: Record<string, number> = { Warm: -3, Energetic: 4, Calm: -6, Neutral: 0 };
  const value = map[String(mood ?? 'Neutral')] ?? 0;
  return `${value >= 0 ? '+' : ''}${value}Hz`;
}

function cleanText(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);
}

export async function synthesizeSpeech(options: SpeechOptions) {
  const text = cleanText(options.text);
  if (!text) return null;

  const edgeVoice = resolveVoice(options.voice, options.language);
  const rate = voiceRate(options.speed);
  const pitch = voicePitch(options.mood);
  const hash = crypto.createHash('sha256').update(`${edgeVoice}|${rate}|${pitch}|${text}`).digest('hex').slice(0, 32);

  await fs.mkdir(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, `${hash}.mp3`);
  const subtitleFile = path.join(CACHE_DIR, `${hash}.srt`);
  if (existsSync(file) && existsSync(subtitleFile)) {
    try {
      const stat = await fs.stat(file);
      if (stat.size > 512) return { file, subtitleFile, voice: edgeVoice, rate, pitch, cached: true };
    } catch {
      // regenerate below
    }
  }

  const partial = `${file}.part`;
  const partialSubtitle = `${subtitleFile}.part`;
  try {
    await execFileAsync(
      TTS_BIN,
      [
        '--voice', edgeVoice,
        '--text', text,
        `--rate=${rate}`,
        `--pitch=${pitch}`,
        '--write-media', partial,
        '--write-subtitles', partialSubtitle,
      ],
      { timeout: 60000, maxBuffer: 4 * 1024 * 1024 }
    );
    const stat = await fs.stat(partial);
    if (stat.size < 512) throw new Error('TTS menghasilkan audio kosong');
    await fs.rename(partial, file);

    let savedSubtitle: string | null = null;
    try {
      const subStat = await fs.stat(partialSubtitle);
      if (subStat.size > 10) {
        await fs.rename(partialSubtitle, subtitleFile);
        savedSubtitle = subtitleFile;
      }
    } catch {
      // subtitles are optional
    }
    return { file, subtitleFile: savedSubtitle, voice: edgeVoice, rate, pitch, cached: false };
  } catch (error) {
    await fs.rm(partial, { force: true }).catch(() => undefined);
    await fs.rm(partialSubtitle, { force: true }).catch(() => undefined);
    throw error;
  }
}

function formatTimestamp(milliseconds: number) {
  const value = Math.max(0, Math.round(milliseconds));
  const hours = Math.floor(value / 3600000);
  const minutes = Math.floor((value % 3600000) / 60000);
  const seconds = Math.floor((value % 60000) / 1000);
  const millis = value % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    seconds
  ).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

// TTS cues are relative to the original MP3. Rendered narration is sped up by
// `tempo` and delayed 250 ms, so cue timings have to follow the same transform.
export function shiftSubtitles(
  content: string,
  tempo: number,
  delaySeconds: number,
  maxSeconds: number
) {
  const factor = tempo > 0 ? tempo : 1;
  const limit = Math.max(1, maxSeconds) * 1000;
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of content.replace(/\r/g, '').split('\n')) {
    if (line.trim()) {
      current.push(line);
    } else if (current.length) {
      blocks.push(current);
      current = [];
    }
  }
  if (current.length) blocks.push(current);

  const output: string[] = [];
  let index = 1;
  const pattern =
    /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})/;

  for (const block of blocks) {
    const timeLine = block[0].includes('-->') ? block[0] : block[1];
    const match = timeLine?.match(pattern);
    if (!match) continue;
    const start =
      ((Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])) * 1000 +
        Number(match[4])) /
        factor +
      delaySeconds * 1000;
    const end =
      ((Number(match[5]) * 3600 + Number(match[6]) * 60 + Number(match[7])) * 1000 +
        Number(match[8])) /
        factor +
      delaySeconds * 1000;
    const clampedEnd = Math.min(end, limit);
    if (start >= limit || clampedEnd <= start) continue;

    const textStart = block[0].includes('-->') ? 1 : 2;
    output.push(
      String(index++),
      `${formatTimestamp(start)} --> ${formatTimestamp(clampedEnd)}`,
      ...block.slice(textStart),
      ''
    );
  }

  return output.join('\n');
}

export async function probeDuration(file: string) {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', file],
      { timeout: 15000 }
    );
    return Number(stdout.trim()) || 0;
  } catch {
    return 0;
  }
}
