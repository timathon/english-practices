import { Mp3Encoder } from '@breezystack/lamejs';

/**
 * Encodes an AudioBuffer to an MP3 Blob using lamejs in browser
 */
export function audioBufferToMp3Blob(buffer: AudioBuffer, kbps: number = 128): Blob {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const mp3encoder = new Mp3Encoder(channels, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];

  const sampleBlockSize = 1152;
  const left = buffer.getChannelData(0);
  const right = channels > 1 ? buffer.getChannelData(1) : left;

  // Convert Float32Array (-1.0 to 1.0) to Int16Array (-32768 to 32767)
  const left16 = new Int16Array(left.length);
  const right16 = new Int16Array(right.length);

  for (let i = 0; i < left.length; i++) {
    const sLeft = Math.max(-1, Math.min(1, left[i]));
    left16[i] = sLeft < 0 ? sLeft * 0x8000 : sLeft * 0x7FFF;

    const sRight = Math.max(-1, Math.min(1, right[i]));
    right16[i] = sRight < 0 ? sRight * 0x8000 : sRight * 0x7FFF;
  }

  for (let i = 0; i < left16.length; i += sampleBlockSize) {
    const leftChunk = left16.subarray(i, i + sampleBlockSize);
    let mp3buf: Uint8Array;
    if (channels === 1) {
      mp3buf = mp3encoder.encodeBuffer(leftChunk);
    } else {
      const rightChunk = right16.subarray(i, i + sampleBlockSize);
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    }
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }

  // Convert array of Uint8Array to Blob safely
  return new Blob(mp3Data.map(b => b.buffer as ArrayBuffer), { type: 'audio/mpeg' });
}
