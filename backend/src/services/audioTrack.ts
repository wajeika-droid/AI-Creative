import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ffmpegOptions = { timeout: 180000, maxBuffer: 16 * 1024 * 1024 };

export const musicStyles = ['Soft Ambient', 'Upbeat', 'Cinematic'] as const;
export type MusicStyle = (typeof musicStyles)[number];

export function resolveMusicStyle(value: unknown): MusicStyle | 'None' {
  return musicStyles.includes(value as MusicStyle) ? (value as MusicStyle) : 'None';
}

// Chord pads are synthesized from sine waves so renders need no licensed audio assets.
function musicExpression(style: MusicStyle) {
  if (style === 'Upbeat') {
    return [
      '0.09*sin(2*PI*261.63*t)*(0.65+0.35*sin(2*PI*2*t))+0.07*sin(2*PI*329.63*t)+0.06*sin(2*PI*392*t)*(0.6+0.4*sin(2*PI*1*t))',
      '0.09*sin(2*PI*261.63*t)*(0.65+0.35*sin(2*PI*2*t+1.2))+0.07*sin(2*PI*392*t)+0.06*sin(2*PI*523.25*t)*(0.6+0.4*sin(2*PI*1*t))',
    ].join('|');
  }
  if (style === 'Cinematic') {
    return [
      '0.12*sin(2*PI*110*t)*(0.65+0.35*sin(2*PI*0.05*t))+0.08*sin(2*PI*164.81*t)+0.05*sin(2*PI*220*t)',
      '0.12*sin(2*PI*110*t)*(0.65+0.35*sin(2*PI*0.05*t+1.6))+0.08*sin(2*PI*174.61*t)+0.05*sin(2*PI*261.63*t)',
    ].join('|');
  }
  return [
    '0.10*sin(2*PI*220*t)*(0.7+0.3*sin(2*PI*0.08*t))+0.07*sin(2*PI*277.18*t)+0.06*sin(2*PI*329.63*t)',
    '0.10*sin(2*PI*220*t)*(0.7+0.3*sin(2*PI*0.08*t+1.4))+0.07*sin(2*PI*293.66*t)+0.06*sin(2*PI*349.23*t)',
  ].join('|');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function tempoFilters(factor: number) {
  const filters: string[] = [];
  let remaining = clamp(factor, 1, 2.4);
  while (remaining > 2) {
    filters.push('atempo=2');
    remaining /= 2;
  }
  if (remaining > 1.001) filters.push(`atempo=${remaining.toFixed(3)}`);
  return filters;
}

type MixOptions = {
  silentVideo: string;
  outPath: string;
  duration: number;
  voiceFile?: string | null;
  voiceDuration?: number;
  musicStyle?: string;
  musicVolume?: number;
};

export async function muxAudio(options: MixOptions) {
  const { silentVideo, outPath, duration } = options;
  const hasVoice = !!options.voiceFile;
  const style = resolveMusicStyle(options.musicStyle);
  const hasMusic = style !== 'None';
  const musicVolume = clamp(Number(options.musicVolume ?? 0.3), 0, 1);

  if (!hasVoice && !hasMusic) {
    await execFileAsync(
      'ffmpeg',
      [
        '-loglevel', 'error',
        '-f', 'lavfi',
        '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-i', silentVideo,
        '-shortest',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '96k',
        '-movflags', '+faststart',
        '-y', outPath,
      ],
      ffmpegOptions
    );
    return;
  }

  const args = ['-loglevel', 'error', '-i', silentVideo];
  const filters: string[] = [];
  let musicIndex = -1;

  if (hasVoice) {
    const target = Math.max(1, duration - 0.3);
    const factor = options.voiceDuration ? clamp(options.voiceDuration / target, 1, 2.4) : 1;
    const voiceChain = [
      'aresample=44100',
      'aformat=sample_fmts=fltp:channel_layouts=stereo',
      ...tempoFilters(factor),
      'adelay=250|250',
      'volume=1.3',
      'apad',
    ];
    args.push('-i', options.voiceFile as string);
    filters.push(`[1:a]${voiceChain.join(',')}[vo]`);
  }

  if (hasMusic) {
    musicIndex = hasVoice ? 2 : 1;
    const fadeOut = Math.max(0, duration - 1.5);
    args.push(
      '-f', 'lavfi',
      '-i', `aevalsrc=${musicExpression(style)}:s=44100:d=${(duration + 0.5).toFixed(3)}`
    );
    filters.push(
      `[${musicIndex}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,` +
        `afade=t=in:st=0:d=1.2,afade=t=out:st=${fadeOut.toFixed(3)}:d=1.5,volume=${musicVolume.toFixed(3)}[mu]`
    );
  }

  if (hasVoice && hasMusic) {
    filters.push('[vo]asplit=2[voA][voB]');
    filters.push(
      '[mu][voA]sidechaincompress=threshold=0.04:ratio=5:attack=20:release=300[duck]'
    );
    filters.push(
      '[duck][voB]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[aud]'
    );
  } else if (hasVoice) {
    filters.push('[vo]alimiter=limit=0.95[aud]');
  } else {
    filters.push('[mu]alimiter=limit=0.95[aud]');
  }

  args.push(
    '-filter_complex', filters.join(';'),
    '-map', '0:v',
    '-map', '[aud]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest',
    '-movflags', '+faststart',
    '-y', outPath
  );

  await execFileAsync('ffmpeg', args, ffmpegOptions);
}
