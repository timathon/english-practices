export const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? '' 
  : 'https://ttsapi.vibequizzing.com';

export const PUBLIC_R2_BASE = 'https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev';

export async function checkR2AudioExists(book: string, hash: string): Promise<{ exists: boolean; url: string }> {
  const url = `${PUBLIC_R2_BASE}/ep/${book}/${hash}.mp3`;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return { exists: res.ok, url };
  } catch {
    return { exists: false, url };
  }
}
