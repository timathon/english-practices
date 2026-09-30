export interface AudioSilence {
  start: number;
  end: number;
}

/**
 * Convert raw PCM 16-bit little-endian mono audio bytes (from Gemini TTS API)
 * into an AudioBuffer directly without needing container/wav decoding.
 */
export function pcmToAudioBuffer(
  audioCtx: AudioContext,
  bytes: Uint8Array,
  sampleRate: number = 24000
): AudioBuffer {
  // Ensure buffer length is even for 16-bit samples
  const numSamples = Math.floor(bytes.byteLength / 2);
  const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const audioBuffer = audioCtx.createBuffer(1, numSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < numSamples; i++) {
    // 16-bit signed integer in Little Endian (-32768 to 32767)
    const int16 = dataView.getInt16(i * 2, true);
    channelData[i] = int16 < 0 ? int16 / 32768 : int16 / 32767;
  }

  return audioBuffer;
}

/**
 * Detects silent intervals in an AudioBuffer.
 * Mimics FFmpeg's agate + silencedetect filter:
 * Threshold: e.g. -30dB (~ 0.031 amplitude)
 * Min Duration: e.g. 0.4s or 0.8s
 */
export function detectSilences(
  buffer: AudioBuffer,
  thresholdDb: number = -30,
  minDurationSec: number = 0.4
): AudioSilence[] {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const thresholdAmp = Math.pow(10, thresholdDb / 20); // convert dB to linear amplitude (0..1)
  
  const windowSize = Math.floor(sampleRate * 0.05); // 50ms window
  const minSamples = Math.floor(sampleRate * minDurationSec);

  const silences: AudioSilence[] = [];
  let inSilence = false;
  let silenceStartSample = 0;

  for (let i = 0; i < channelData.length; i += windowSize) {
    // calculate RMS of window
    let sumSq = 0;
    const end = Math.min(i + windowSize, channelData.length);
    for (let j = i; j < end; j++) {
      sumSq += channelData[j] * channelData[j];
    }
    const rms = Math.sqrt(sumSq / (end - i));

    const isSilent = rms < thresholdAmp;

    if (isSilent && !inSilence) {
      inSilence = true;
      silenceStartSample = i;
    } else if (!isSilent && inSilence) {
      inSilence = false;
      const durationSamples = i - silenceStartSample;
      if (durationSamples >= minSamples) {
        silences.push({
          start: silenceStartSample / sampleRate,
          end: i / sampleRate,
        });
      }
    }
  }

  if (inSilence) {
    const durationSamples = channelData.length - silenceStartSample;
    if (durationSamples >= minSamples) {
      silences.push({
        start: silenceStartSample / sampleRate,
        end: channelData.length / sampleRate,
      });
    }
  }

  return silences;
}

/**
 * Trim leading and trailing silences of an AudioBuffer slice
 */
export function trimAudioBuffer(
  audioCtx: AudioContext,
  buffer: AudioBuffer,
  thresholdDb: number = -32,
  padSec: number = 0.08
): AudioBuffer {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const thresholdAmp = Math.pow(10, thresholdDb / 20);

  let startSample = 0;
  for (let i = 0; i < channelData.length; i++) {
    if (Math.abs(channelData[i]) > thresholdAmp) {
      startSample = Math.max(0, i - Math.floor(padSec * sampleRate));
      break;
    }
  }

  let endSample = channelData.length - 1;
  for (let i = channelData.length - 1; i >= 0; i--) {
    if (Math.abs(channelData[i]) > thresholdAmp) {
      endSample = Math.min(channelData.length, i + Math.floor(padSec * sampleRate));
      break;
    }
  }

  const length = Math.max(1, endSample - startSample);
  const trimmed = audioCtx.createBuffer(buffer.numberOfChannels, length, sampleRate);

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const sourceData = buffer.getChannelData(c);
    const targetData = trimmed.getChannelData(c);
    for (let i = 0; i < length; i++) {
      targetData[i] = sourceData[startSample + i];
    }
  }

  return trimmed;
}

/**
 * Convert AudioBuffer to WAV Blob
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // write WAV header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit precision

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}
